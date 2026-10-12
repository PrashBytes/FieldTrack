import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

type LocationPointInput = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  speed: number | null;
  bearing: number | null;
  provider: string | null;
  is_mock: boolean;
  captured_at: string;
  monotonic_elapsed_ms: number | null;
  idempotency_key: string;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      session_id,
      location_session_id,
      device_id,
      employee_id,
      points,
    } = body;

    if (!session_id || !employee_id || !points || !Array.isArray(points) || points.length === 0) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (points.length > 200) {
      return new Response(JSON.stringify({ error: "Batch too large (max 200 points)" }), {
        status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, organization_id")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: session } = await supabase
      .from("attendance_sessions")
      .select("id, organization_id, employee_id, attendance_status")
      .eq("id", session_id)
      .maybeSingle();

    if (!session || session.organization_id !== profile.organization_id) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (session.attendance_status !== "active") {
      return new Response(JSON.stringify({ error: "Session is not active" }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orgId = session.organization_id;
    const acceptedIds: string[] = [];
    const rejectedIds: string[] = [];
    const fraudEvents: any[] = [];

    for (const pt of points as LocationPointInput[]) {
      if (pt.latitude < -90 || pt.latitude > 90 || pt.longitude < -180 || pt.longitude > 180) {
        rejectedIds.push(pt.idempotency_key);
        continue;
      }

      let trustStatus = "unverified";
      if (pt.is_mock) {
        trustStatus = "high_risk";
        fraudEvents.push({
          organization_id: orgId,
          employee_id: employee_id,
          attendance_session_id: session_id,
          location_session_id: location_session_id,
          event_type: "mock_location_signal",
          severity: "high",
          evidence: { is_mock: true, accuracy: pt.accuracy, captured_at: pt.captured_at },
          description: "Mock location signal detected in location batch",
          review_status: "open",
        });
      } else if (pt.accuracy && pt.accuracy > 200) {
        trustStatus = "review_required";
      } else {
        trustStatus = "trusted";
      }

      const { data: inserted, error: insertError } = await supabase
        .from("location_points")
        .insert({
          organization_id: orgId,
          employee_id: employee_id,
          location_session_id: location_session_id,
          attendance_session_id: session_id,
          device_id: device_id || null,
          location: `POINT(${pt.longitude} ${pt.latitude})`,
          accuracy: pt.accuracy,
          altitude: pt.altitude,
          speed: pt.speed,
          bearing: pt.bearing,
          provider: pt.provider,
          is_mock: pt.is_mock,
          captured_at: pt.captured_at,
          monotonic_elapsed_ms: pt.monotonic_elapsed_ms,
          idempotency_key: pt.idempotency_key,
          trust_status: trustStatus,
        })
        .select("id")
        .maybeSingle();

      if (insertError) {
        if (insertError.code === "23505") {
          // Duplicate idempotency key - skip silently
        } else {
          rejectedIds.push(pt.idempotency_key);
        }
      } else if (inserted) {
        acceptedIds.push(inserted.id);
      }
    }

    // Insert fraud events
    for (const fe of fraudEvents) {
      await supabase.from("fraud_events").insert(fe);
    }

    // Update location session point count
    if (acceptedIds.length > 0 && location_session_id) {
      await supabase.rpc("increment_location_point_count", {
        session_id: location_session_id,
        count: acceptedIds.length,
      }).then(({ error }) => {
        if (error) {
          // Fallback: direct update
          supabase
            .from("location_sessions")
            .update({ total_points: (acceptedIds.length) })
            .eq("id", location_session_id);
        }
      });

      // Update device last_seen
      if (device_id) {
        await supabase
          .from("devices")
          .update({ last_seen_at: new Date().toISOString() })
          .eq("id", device_id);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      accepted: acceptedIds.length,
      rejected: rejectedIds.length,
      accepted_ids: acceptedIds,
      rejected_ids: rejectedIds,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
