"use client";

import { useRouter } from "next/navigation";

export function ImpersonateButton({ tenantId }: { tenantId: string }) {
  const router = useRouter();

  async function handleImpersonate() {
    await fetch(`/api/admin/tenants/${tenantId}/impersonate`, {
      method: "POST",
    });
    router.push("/school");
    router.refresh();
  }

  return (
    <button
      onClick={handleImpersonate}
      className="rounded-md border border-warning bg-warning/10 px-4 py-2 text-sm font-medium text-warning hover:bg-warning/20"
    >
      Impersonate School Admin
    </button>
  );
}
