import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CheckInPayload {
  device_id: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  is_mock?: boolean;
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

    // 2. PARSE REQUEST BODY
    const body: CheckInPayload = await req.json();
    const { device_id, latitude, longitude, accuracy, is_mock } = body;

    if (!device_id || latitude == null || longitude == null) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: device_id, latitude, longitude" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return new Response(
        JSON.stringify({ error: "Invalid GPS coordinates out of geographical range" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. VALIDATE ACTIVE EMPLOYEE
    const { data: employee, error: empError } = await supabase
      .from("employees")
      .select("id, organization_id, profile_id, status")
      .eq("profile_id", user.id)
      .maybeSingle();

    if (empError || !employee) {
      return new Response(
        JSON.stringify({ error: "No employee record associated with authenticated user" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (employee.status.toUpperCase() !== "ACTIVE") {
      return new Response(
        JSON.stringify({ error: `Employee is not active (current status: ${employee.status})` }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. VALIDATE DEVICE_ID
    const { data: device, error: devError } = await supabase
      .from("devices")
      .select("id, employee_id, organization_id, device_identifier, status")
      .eq("id", device_id)
      .maybeSingle();

    if (devError || !device) {
      return new Response(
        JSON.stringify({ error: "Device not found or not registered" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (device.employee_id !== employee.id || device.organization_id !== employee.organization_id) {
      return new Response(
        JSON.stringify({ error: "Device binding mismatch: device does not belong to this employee" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (device.status.toUpperCase() !== "ACTIVE") {
      return new Response(
        JSON.stringify({ error: `Device is not authorized (status: ${device.status})` }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. ENSURE NO ACTIVE ATTENDANCE SESSION EXISTS
    const { data: existingSession, error: checkError } = await supabase
      .from("attendance_sessions")
      .select("id, check_in_time, status")
      .eq("employee_id", employee.id)
      .eq("status", "ACTIVE")
      .maybeSingle();

    if (checkError) {
      return new Response(
        JSON.stringify({ error: "Error checking active sessions", details: checkError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (existingSession) {
      return new Response(
        JSON.stringify({
          error: "An active attendance session already exists for this employee",
          active_session_id: existingSession.id,
          check_in_time: existingSession.check_in_time,
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. RECORD FRAUD EVENT IF MOCK LOCATION DETECTED
    if (is_mock) {
      await supabase.from("fraud_events").insert({
        organization_id: employee.organization_id,
        employee_id: employee.id,
        event_type: "MOCK_LOCATION",
        severity: "HIGH",
        status: "PENDING",
        details: {
          phase: "check-in",
          latitude,
          longitude,
          accuracy,
          device_id,
          detected_at: new Date().toISOString(),
        },
      });
    }

    // 7. INSERT ATTENDANCE SESSION WITH POSTGIS POINT
    const nowIso = new Date().toISOString();
    const { data: session, error: insertError } = await supabase
      .from("attendance_sessions")
      .insert({
        organization_id: employee.organization_id,
        employee_id: employee.id,
        device_id: device.id,
        check_in_time: nowIso,
        check_in_location: `POINT(${longitude} ${latitude})`,
        status: "ACTIVE",
      })
      .select("id, organization_id, employee_id, device_id, check_in_time, status")
      .single();

    if (insertError) {
      return new Response(
        JSON.stringify({ error: "Failed to create attendance session", details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 8. UPDATE DEVICE LAST SEEN
    await supabase
      .from("devices")
      .update({ last_seen_at: nowIso })
      .eq("id", device.id);

    return new Response(
      JSON.stringify({
        success: true,
        session_id: session.id,
        check_in_time: session.check_in_time,
        organization_id: session.organization_id,
        employee_id: session.employee_id,
        status: session.status,
        mock_flagged: Boolean(is_mock),
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal server error", message: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
