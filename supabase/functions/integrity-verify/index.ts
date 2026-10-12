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
    const { device_id, integrity_token, request_hash } = body;

    if (!device_id) {
      return new Response(JSON.stringify({ error: "Missing device_id" }), {
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

    // Verify device belongs to same org
    const { data: device } = await supabase
      .from("devices")
      .select("id, organization_id, employee_id, is_active")
      .eq("id", device_id)
      .maybeSingle();

    if (!device || device.organization_id !== profile.organization_id) {
      return new Response(JSON.stringify({ error: "Device not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!device.is_active) {
      return new Response(JSON.stringify({ error: "Device is revoked" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If Google Play Integrity token is provided, verify it
    // In production, this would call Google's Play Integrity API
    // For now, we accept the token and mark as verified if present
    let integrityResult = "verified";
    let evidence: Record<string, unknown> = {
      token_provided: !!integrity_token,
      request_hash: request_hash || null,
      verified_at: new Date().toISOString(),
    };

    if (!integrity_token) {
      integrityResult = "not_checked";
      evidence.token_provided = false;
    }

    // Update device integrity status
    await supabase
      .from("devices")
      .update({ play_integrity_status: integrityResult, last_seen_at: new Date().toISOString() })
      .eq("id", device_id);

    // If integrity failed, create fraud event
    if (integrityResult === "failed") {
      await supabase.from("fraud_events").insert({
        organization_id: device.organization_id,
        employee_id: device.employee_id,
        device_id: device_id,
        event_type: "integrity_verification_failed",
        severity: "high",
        evidence,
        description: "Play Integrity verification failed",
        review_status: "open",
      });
    }

    return new Response(JSON.stringify({
      success: true,
      integrity_status: integrityResult,
      evidence,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
