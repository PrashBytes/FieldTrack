import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
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
      employee_id,
      device_id,
      latitude,
      longitude,
      accuracy,
      is_mock,
      integrity_token,
    } = body;

    if (!employee_id || latitude == null || longitude == null) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the user's profile and verify org membership
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, organization_id, role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the employee belongs to the same org
    const { data: employee } = await supabase
      .from("employees")
      .select("id, organization_id, employment_status, account_status, shift_id")
      .eq("id", employee_id)
      .maybeSingle();

    if (!employee || employee.organization_id !== profile.organization_id) {
      return new Response(JSON.stringify({ error: "Employee not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (employee.account_status !== "active" && employee.account_status !== "pending") {
      return new Response(JSON.stringify({ error: "Employee account not active" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check for existing active session
    const { data: existing } = await supabase
      .from("attendance_sessions")
      .select("id")
      .eq("employee_id", employee_id)
      .eq("attendance_status", "active")
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ error: "Active session already exists", session_id: existing.id }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine integrity status
    let integrityStatus = "unverified";
    if (is_mock) {
      integrityStatus = "high_risk";
    } else if (accuracy && accuracy > 100) {
      integrityStatus = "review_required";
    } else {
      integrityStatus = "trusted";
    }

    // Create attendance session
    const { data: session, error: sessionError } = await supabase
      .from("attendance_sessions")
      .insert({
        organization_id: employee.organization_id,
        employee_id: employee_id,
        device_id: device_id || null,
        shift_id: employee.shift_id,
        check_in_at: new Date().toISOString(),
        check_in_location: `POINT(${longitude} ${latitude})`,
        check_in_accuracy: accuracy || null,
        integrity_status: integrityStatus,
        attendance_status: "active",
        review_status: "pending",
      })
      .select("id, check_in_at")
      .single();

    if (sessionError) {
      return new Response(JSON.stringify({ error: sessionError.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create location session
    const { data: locSession, error: locError } = await supabase
      .from("location_sessions")
      .insert({
        organization_id: employee.organization_id,
        employee_id: employee_id,
        attendance_session_id: session.id,
        device_id: device_id || null,
        started_at: new Date().toISOString(),
        status: "active",
      })
      .select("id")
      .single();

    // Create fraud event if mock location detected
    if (is_mock) {
      await supabase.from("fraud_events").insert({
        organization_id: employee.organization_id,
        employee_id: employee_id,
        device_id: device_id || null,
        attendance_session_id: session.id,
        event_type: "mock_location_signal",
        severity: "high",
        evidence: { is_mock, accuracy, latitude, longitude },
        description: "Mock location signal detected during check-in",
        review_status: "open",
      });
    }

    // Audit log
    await supabase.from("audit_logs").insert({
      organization_id: employee.organization_id,
      actor_id: profile.id,
      action: "attendance_check_in",
      target_type: "attendance_session",
      target_id: session.id,
      metadata: { employee_id, integrity_status: integrityStatus },
    });

    return new Response(JSON.stringify({
      success: true,
      session_id: session.id,
      location_session_id: locSession?.id || null,
      check_in_at: session.check_in_at,
      integrity_status: integrityStatus,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
