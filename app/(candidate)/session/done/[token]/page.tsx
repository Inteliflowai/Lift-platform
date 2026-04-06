import { resolveInviteToken } from "@/lib/token";

export const dynamic = "force-dynamic";

export default async function SessionDonePage({
  params,
}: {
  params: { token: string };
}) {
  const result = await resolveInviteToken(params.token);

  const firstName = result.valid ? result.candidate.first_name : "there";
  const schoolName = result.valid ? result.tenant.name : "your school";

  return (
    <div className="flex flex-col items-center py-16 text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
        <svg
          className="h-8 w-8 text-success"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>

      <h1 className="text-3xl font-bold">
        Great job, {firstName}!
      </h1>

      <p className="mt-4 max-w-md text-muted">
        You&apos;ve completed the LIFT experience. Thank you for your time and
        thoughtful responses.
      </p>

      <p className="mt-3 max-w-md text-sm text-muted">
        <span className="font-medium text-lift-text">{schoolName}</span> will
        review your responses and be in touch with you soon.
      </p>

      <div className="mt-8 rounded-lg border border-lift-border bg-surface p-5 text-sm text-muted">
        <p>
          You can close this window. There&apos;s nothing more you need to do.
        </p>
      </div>
    </div>
  );
}
