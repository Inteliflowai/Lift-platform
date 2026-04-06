import { resolveInviteToken } from "@/lib/token";
import { supabaseAdmin } from "@/lib/supabase/admin";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function InviteLandingPage({
  params,
}: {
  params: { token: string };
}) {
  const result = await resolveInviteToken(params.token);

  if (!result.valid) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <h1 className="text-2xl font-bold text-review">
          This link is no longer valid
        </h1>
        <p className="mt-3 text-muted">
          This invitation may have expired or already been used. Please contact
          your school&apos;s admissions office for a new link.
        </p>
      </div>
    );
  }

  const { invite, candidate, tenant } = result;

  // Mark invite as opened
  if (invite.status === "pending") {
    await supabaseAdmin
      .from("invites")
      .update({ status: "opened", opened_at: new Date().toISOString() })
      .eq("id", invite.id);
  }

  return (
    <div className="flex flex-col items-center py-12 text-center">
      <h1 className="text-3xl font-bold">
        Welcome, {candidate.first_name}!
      </h1>
      <p className="mt-4 max-w-md text-muted">
        <span className="font-medium text-lift-text">{tenant.name}</span> has
        invited you to complete the LIFT experience — a short set of reading,
        writing, and reasoning activities.
      </p>
      <p className="mt-3 max-w-md text-sm text-muted">
        This is not a test. There are no right or wrong answers. We&apos;re
        interested in how you think and approach different tasks.
      </p>
      <p className="mt-2 max-w-md text-sm text-muted">
        It typically takes 30-50 minutes. You can pause and come back if needed.
      </p>
      <Link
        href={`/consent/${params.token}`}
        className="mt-8 rounded-lg bg-primary px-8 py-3 text-lg font-semibold text-white transition-opacity hover:opacity-90"
      >
        Get Started
      </Link>
    </div>
  );
}
