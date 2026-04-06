"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewTenantPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDemo, setIsDemo] = useState(false);

  function handleNameChange(value: string) {
    setName(value);
    setSlug(
      value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/admin/tenants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slug, admin_email: adminEmail || undefined }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to create tenant");
      setLoading(false);
      return;
    }

    const tenant = await res.json();

    // If demo, generate synthetic data
    if (isDemo) {
      await fetch("/api/admin/demo/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant_id: tenant.id }),
      });
    }

    router.push(`/admin/tenants/${tenant.id}`);
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-2xl font-bold">New Tenant</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs text-muted">School Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
            className="w-full rounded-md border border-lift-border bg-page-bg px-3 py-2 text-sm text-lift-text outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">Slug</label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
            className="w-full rounded-md border border-lift-border bg-page-bg px-3 py-2 text-sm text-lift-text outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">
            Initial School Admin Email (optional)
          </label>
          <input
            type="email"
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
            className="w-full rounded-md border border-lift-border bg-page-bg px-3 py-2 text-sm text-lift-text outline-none focus:border-primary"
          />
        </div>

        <label className="flex items-center gap-2">
          <input type="checkbox" checked={isDemo} onChange={(e) => setIsDemo(e.target.checked)} className="rounded" />
          <span className="text-sm">Create as Demo Tenant (populate with 18 synthetic candidates)</span>
        </label>

        {error && <p className="text-xs text-review">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Tenant"}
        </button>
      </form>
    </div>
  );
}
