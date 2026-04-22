import { resolveInviteToken } from "@/lib/token";
import { supabaseAdmin } from "@/lib/supabase/admin";
import Link from "next/link";
import { t } from "@/lib/i18n/useLocale";

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
          {t("invite.invalid_title")}
        </h1>
        <p className="mt-3 text-muted">
          {t("invite.invalid_body")}
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
        {t("invite.welcome_prefix")}, {candidate.first_name}!
      </h1>
      <p className="mt-4 max-w-md text-muted">
        <span className="font-medium text-lift-text">{tenant.name}</span>{" "}
        {t("invite.invited_body_prefix")}
      </p>
      <p className="mt-3 max-w-md text-sm text-muted">
        {t("invite.not_a_test")}
      </p>
      <p className="mt-2 max-w-md text-sm text-muted">
        {t("invite.duration_hint")}
      </p>
      <Link
        href={`/consent/${params.token}`}
        className="mt-8 rounded-lg bg-primary px-8 py-3 text-lg font-semibold text-white transition-opacity hover:opacity-90"
      >
        {t("invite.cta")}
      </Link>
    </div>
  );
}
