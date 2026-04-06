import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-page-bg">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-review">Unauthorized</h1>
        <p className="mt-2 text-muted">
          You don&apos;t have permission to access this page.
        </p>
        <Link
          href="/login"
          className="mt-4 inline-block text-sm text-primary hover:underline"
        >
          Back to login
        </Link>
      </div>
    </div>
  );
}
