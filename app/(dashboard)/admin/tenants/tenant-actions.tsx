"use client";

import { useRouter } from "next/navigation";

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
  );
}
