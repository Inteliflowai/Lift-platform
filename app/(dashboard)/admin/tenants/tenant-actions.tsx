"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";

export function TenantActions({
  tenantId,
  status,
}: {
  tenantId: string;
  status: string;
}) {
  const router = useRouter();

  async function toggleStatus() {
    const newStatus = status === "active" ? "suspended" : "active";
    await fetch(`/api/admin/tenants/${tenantId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={toggleStatus}
        className={`text-xs font-medium ${
          status === "active"
            ? "text-warning hover:text-warning/80"
            : "text-success hover:text-success/80"
        }`}
      >
        {status === "active" ? "Suspend" : "Reactivate"}
      </button>
      <Link
        href={`/admin/tenants/${tenantId}/reset`}
        className="text-xs font-medium text-review hover:text-review/80"
        title="Reset data or delete this tenant entirely"
      >
        Delete
      </Link>
    </div>
  );
}
