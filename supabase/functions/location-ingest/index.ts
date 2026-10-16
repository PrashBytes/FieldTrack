import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, Idempotency-Key",
};

interface LocationPointInput {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  speed?: number | null;
  is_mock?: boolean;
  captured_at: string;
  idempotency_key?: string;
}

interface IngestPayload {
  session_id: string;
  idempotency_key?: string;
  points: LocationPointInput[];
}

/**
 * Calculates distance in meters between two coordinates using the Haversine formula
 */
function calculateHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration missing (Supabase URL or Service Key)" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // 1. VALIDATE AUTHORIZATION JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "").trim();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired JWT token", details: authError?.message }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. PARSE REQUEST & IDEMPOTENCY KEY
    const batchIdempotencyKey =
      req.headers.get("Idempotency-Key") || req.headers.get("idempotency-key");

    const body: IngestPayload = await req.json();
    const { session_id, points } = body;
    const effectiveIdempotencyKey = batchIdempotencyKey || body.idempotency_key;

    if (!session_id || !points || !Array.isArray(points) || points.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: session_id and non-empty points array" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (points.length > 500) {
      return new Response(
        JSON.stringify({ error: "Payload exceeds maximum limit of 500 points per batch" }),
        { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check batch-level idempotency
    if (effectiveIdempotencyKey) {
      const { data: existingBatchPoint } = await supabase
        .from("location_points")
        .select("id")
        .eq("idempotency_key", `${effectiveIdempotencyKey}-0`)
        .maybeSingle();

      if (existingBatchPoint) {
        return new Response(
          JSON.stringify({
            success: true,
            status: "already_processed",
            message: "Duplicate batch skipped via idempotency key",
            idempotency_key: effectiveIdempotencyKey,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 3. VALIDATE ACTIVE SESSION & EMPLOYEE
    const { data: session, error: sessionError } = await supabase
      .from("attendance_sessions")
      .select("id, organization_id, employee_id, status")
      .eq("id", session_id)
      .maybeSingle();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: "Attendance session not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (session.status.toUpperCase() !== "ACTIVE") {
      return new Response(
        JSON.stringify({ error: `Session is closed and cannot accept points (status: ${session.status})` }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user owns the session or is company admin
    const { data: employee } = await supabase
      .from("employees")
      .select("id, profile_id")
      .eq("id", session.employee_id)
      .maybeSingle();

    if (!employee || employee.profile_id !== user.id) {
      // Check if user is an admin
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile || !["COMPANY_ADMIN", "SUPER_ADMIN"].includes(profile.role.toUpperCase())) {
        return new Response(
          JSON.stringify({ error: "Forbidden: user does not have permission to ingest for this session" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 4. RETRIEVE LAST RECORDED POINT FOR TELEPORTATION / SPEED CHECK
    const { data: lastStoredPoint } = await supabase
      .rpc("st_astext", {}) // In case RPC is missing, use simple query
      .catch(() => ({ data: null }));

    let previousPoint: { lat: number; lon: number; timeMs: number } | null = null;

    // Fetch the latest point from database for this session
    const { data: latestDbPoints } = await supabase
      .from("location_points")
      .select("coordinates, captured_at")
      .eq("session_id", session.id)
      .order("captured_at", { ascending: false })
      .limit(1);

    if (latestDbPoints && latestDbPoints.length > 0) {
      const dbPt = latestDbPoints[0];
      // PostGIS coordinates in JSON can be GeoJSON or string
      let dbLat: number | null = null;
      let dbLon: number | null = null;

      if (typeof dbPt.coordinates === "object" && dbPt.coordinates?.coordinates) {
        dbLon = dbPt.coordinates.coordinates[0];
        dbLat = dbPt.coordinates.coordinates[1];
      }

      if (dbLat !== null && dbLon !== null) {
        previousPoint = {
          lat: dbLat,
          lon: dbLon,
          timeMs: new Date(dbPt.captured_at).getTime(),
        };
      }
    }

    // 5. PROCESS AND VALIDATE EACH POINT
    const nowMs = Date.now();
    const clockSkewToleranceMs = 60 * 1000; // Allow up to 60 seconds future skew
    const pointsToInsert = [];
    const fraudEvents = [];
    let rejectedCount = 0;

    // Sort incoming batch chronologically
    const sortedPoints = [...points].sort(
      (a, b) => new Date(a.captured_at).getTime() - new Date(b.captured_at).getTime()
    );

    for (let i = 0; i < sortedPoints.length; i++) {
      const pt = sortedPoints[i];
      const pointTimeMs = new Date(pt.captured_at).getTime();

      // Check 1: Geographical coordinate bounds
      if (
        isNaN(pt.latitude) ||
        isNaN(pt.longitude) ||
        pt.latitude < -90 ||
        pt.latitude > 90 ||
        pt.longitude < -180 ||
        pt.longitude > 180
      ) {
        rejectedCount++;
        continue;
      }

      // Check 2: Reject future timestamps
      if (isNaN(pointTimeMs) || pointTimeMs > nowMs + clockSkewToleranceMs) {
        rejectedCount++;
        fraudEvents.push({
          organization_id: session.organization_id,
          employee_id: session.employee_id,
          session_id: session.id,
          event_type: "FUTURE_TIMESTAMP",
          severity: "HIGH",
          status: "PENDING",
          details: {
            captured_at: pt.captured_at,
            server_time: new Date(nowMs).toISOString(),
            latitude: pt.latitude,
            longitude: pt.longitude,
          },
        });
        continue;
      }

      // Check 3: Mock location signal
      if (pt.is_mock) {
        fraudEvents.push({
          organization_id: session.organization_id,
          employee_id: session.employee_id,
          session_id: session.id,
          event_type: "MOCK_LOCATION",
          severity: "HIGH",
          status: "PENDING",
          details: {
            captured_at: pt.captured_at,
            accuracy: pt.accuracy,
            latitude: pt.latitude,
            longitude: pt.longitude,
          },
        });
      }

      // Check 4: Calculate speed from last point (flag IMPOSSIBLE_MOVEMENT > 130 km/h)
      if (previousPoint && pointTimeMs > previousPoint.timeMs) {
        const timeDeltaSeconds = (pointTimeMs - previousPoint.timeMs) / 1000;
        if (timeDeltaSeconds > 0) {
          const distanceMeters = calculateHaversineDistanceMeters(
            previousPoint.lat,
            previousPoint.lon,
            pt.latitude,
            pt.longitude
          );
          const speedKmH = (distanceMeters / timeDeltaSeconds) * 3.6;

          if (speedKmH > 130) {
            fraudEvents.push({
              organization_id: session.organization_id,
              employee_id: session.employee_id,
              session_id: session.id,
              event_type: "IMPOSSIBLE_MOVEMENT",
              severity: "CRITICAL",
              status: "PENDING",
              details: {
                calculated_speed_kmh: Math.round(speedKmH),
                threshold_kmh: 130,
                distance_meters: Math.round(distanceMeters),
                time_delta_seconds: Math.round(timeDeltaSeconds),
                from: { lat: previousPoint.lat, lon: previousPoint.lon },
                to: { lat: pt.latitude, lon: pt.longitude },
                captured_at: pt.captured_at,
              },
            });
          }
        }
      }

      // Update previous point tracking
      previousPoint = {
        lat: pt.latitude,
        lon: pt.longitude,
        timeMs: pointTimeMs,
      };

      // Determine idempotency key
      const pointKey =
        pt.idempotency_key ||
        (effectiveIdempotencyKey ? `${effectiveIdempotencyKey}-${i}` : undefined);

      pointsToInsert.push({
        session_id: session.id,
        employee_id: session.employee_id,
        organization_id: session.organization_id,
        coordinates: `POINT(${pt.longitude} ${pt.latitude})`,
        accuracy: pt.accuracy ?? null,
        speed: pt.speed ?? null,
        is_mock: Boolean(pt.is_mock),
        idempotency_key: pointKey,
        captured_at: pt.captured_at,
      });
    }

    // 6. LOG DETECTED FRAUD EVENTS
    if (fraudEvents.length > 0) {
      await supabase.from("fraud_events").insert(fraudEvents);
    }

    // 7. INSERT VALID LOCATION POINTS
    let acceptedCount = 0;
    if (pointsToInsert.length > 0) {
      const { data: inserted, error: insertError } = await supabase
        .from("location_points")
        .upsert(pointsToInsert, {
          onConflict: "idempotency_key",
          ignoreDuplicates: true,
        })
        .select("id");

      if (insertError) {
        return new Response(
          JSON.stringify({ error: "Failed to persist location points", details: insertError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      acceptedCount = inserted ? inserted.length : pointsToInsert.length;
    }

    return new Response(
      JSON.stringify({
        success: true,
        session_id: session.id,
        total_received: points.length,
        accepted: acceptedCount,
        rejected: rejectedCount,
        fraud_events_logged: fraudEvents.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal server error", message: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
