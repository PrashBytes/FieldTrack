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
    const { session_id, latitude, longitude, accuracy, is_mock } = body;

    if (!session_id) {
      return new Response(JSON.stringify({ error: "Missing session_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
      return new Response(JSON.stringify({ error: "Session already closed" }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const checkoutTime = new Date().toISOString();

    const { error: updateError } = await supabase
      .from("attendance_sessions")
      .update({
        check_out_at: checkoutTime,
        check_out_location: latitude != null && longitude != null ? `POINT(${longitude} ${latitude})` : null,
        check_out_accuracy: accuracy || null,
        attendance_status: "completed",
      })
      .eq("id", session_id);

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // End the location session
    await supabase
      .from("location_sessions")
      .update({ ended_at: checkoutTime, status: "ended" })
      .eq("attendance_session_id", session_id)
      .eq("status", "active");

    // Create fraud event if mock location detected at checkout
    if (is_mock) {
      await supabase.from("fraud_events").insert({
        organization_id: session.organization_id,
        employee_id: session.employee_id,
        attendance_session_id: session_id,
        event_type: "mock_location_signal",
        severity: "high",
        evidence: { is_mock, accuracy, latitude, longitude, event: "check_out" },
        description: "Mock location signal detected during check-out",
        review_status: "open",
      });
    }

    await supabase.from("audit_logs").insert({
      organization_id: session.organization_id,
      actor_id: profile.id,
      action: "attendance_check_out",
      target_type: "attendance_session",
      target_id: session_id,
      metadata: { employee_id: session.employee_id },
    });

    return new Response(JSON.stringify({
      success: true,
      check_out_at: checkoutTime,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
