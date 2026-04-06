import { supabaseAdmin } from "@/lib/supabase/admin";

export async function resolveInviteToken(token: string) {
  const { data: invite } = await supabaseAdmin
    .from("invites")
    .select("*, candidates(*, guardians(*)), tenants(name, slug)")
    .eq("token", token)
    .single();

  if (!invite) return { valid: false as const, error: "not_found" as const };

  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return { valid: false as const, error: "expired" as const };
  }

  const candidate = invite.candidates as unknown as {
    id: string;
    first_name: string;
    last_name: string;
    grade_band: string;
    grade_applying_to: string;
    date_of_birth: string | null;
    status: string;
    tenant_id: string;
    cycle_id: string | null;
    guardians: { id: string; full_name: string; email: string }[];
  };

  const tenant = invite.tenants as unknown as { name: string; slug: string };

  return {
    valid: true as const,
    invite,
    candidate,
    tenant,
  };
}

export async function resolveResumeToken(resumeToken: string) {
  const { data: session } = await supabaseAdmin
    .from("sessions")
    .select("*, candidates(*, tenants(name))")
    .eq("resume_token", resumeToken)
    .single();

  if (!session) return null;
  return session;
}
