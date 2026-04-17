"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { BackButton } from "@/components/ui/BackButton";
import { Upload, Check, Globe, Mail, Palette, Eye } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Settings = {
  logoUrl: string;
  logoDarkUrl: string;
  faviconUrl: string;
  primaryColor: string;
  customDomain: string;
  domainVerified: boolean;
  hideLiftBranding: boolean;
  emailFromName: string;
  emailReplyTo: string;
  poweredByVisible: boolean;
};

export function BrandingClient({
  tenantId,
  settings: initial,
}: {
  tenantId: string;
  settings: Settings;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [s, setS] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState("");
  const [uploading, setUploading] = useState<string | null>(null);

  function update(field: keyof Settings, value: string | boolean) {
    setS((prev) => ({ ...prev, [field]: value }));
  }

  async function handleUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    field: "logoUrl" | "logoDarkUrl" | "faviconUrl"
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(field);
    const ext = file.name.split(".").pop();
    const path = `${tenantId}/branding/${field}.${ext}`;

    const { error } = await supabase.storage
      .from("lift-assets")
      .upload(path, file, { upsert: true });

    if (!error) {
      const {
        data: { publicUrl },
      } = supabase.storage.from("lift-assets").getPublicUrl(path);
      update(field, publicUrl);
    }
    setUploading(null);
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    await fetch("/api/school/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        logo_url: s.logoUrl,
        wl_primary_color: s.primaryColor,
        wl_logo_dark_url: s.logoDarkUrl,
        wl_favicon_url: s.faviconUrl,
        wl_hide_lift_branding: s.hideLiftBranding,
        wl_email_from_name: s.emailFromName,
        wl_email_reply_to: s.emailReplyTo,
        wl_powered_by_visible: s.poweredByVisible,
      }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    router.refresh();
  }

  async function handleVerifyDomain() {
    if (!s.customDomain) return;
    setVerifying(true);
    setVerifyMsg("");
    const res = await fetch("/api/admin/wl/verify-domain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain: s.customDomain }),
    });
    const data = await res.json();
    setVerifying(false);
    setVerifyMsg(data.message ?? "");
    if (data.verified) {
      update("domainVerified", true);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <BackButton href="/school/settings" label="Settings" />
      <h1 className="text-2xl font-bold">Branding</h1>

      {/* Logo Upload */}
      <div className="rounded-lg border border-lift-border bg-surface p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Upload size={16} className="text-primary" />
          <h2 className="text-sm font-semibold">Logo</h2>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs text-muted">Light background logo</label>
            <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-lift-border bg-page-bg">
              {s.logoUrl ? (
                <Image src={s.logoUrl} alt="Logo" width={120} height={40} className="max-h-10 w-auto object-contain" />
              ) : (
                <span className="text-xs text-muted">No logo</span>
              )}
            </div>
            <label className="mt-1 block cursor-pointer text-xs text-primary hover:underline">
              {uploading === "logoUrl" ? "Uploading..." : "Upload"}
              <input type="file" accept="image/*" onChange={(e) => handleUpload(e, "logoUrl")} className="hidden" />
            </label>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">Dark background logo</label>
            <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-[#2a2a3a] bg-[#1e1b2e]">
              {s.logoDarkUrl ? (
                <Image src={s.logoDarkUrl} alt="Dark Logo" width={120} height={40} className="max-h-10 w-auto object-contain" />
              ) : (
                <span className="text-xs text-[#7878a0]">No logo</span>
              )}
            </div>
            <label className="mt-1 block cursor-pointer text-xs text-primary hover:underline">
              {uploading === "logoDarkUrl" ? "Uploading..." : "Upload"}
              <input type="file" accept="image/*" onChange={(e) => handleUpload(e, "logoDarkUrl")} className="hidden" />
            </label>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs text-muted">Favicon</label>
          <div className="flex items-center gap-3">
            {s.faviconUrl && (
              <Image src={s.faviconUrl} alt="Favicon" width={32} height={32} className="h-8 w-8 rounded" />
            )}
            <label className="cursor-pointer text-xs text-primary hover:underline">
              {uploading === "faviconUrl" ? "Uploading..." : "Upload favicon"}
              <input type="file" accept="image/*" onChange={(e) => handleUpload(e, "faviconUrl")} className="hidden" />
            </label>
          </div>
        </div>
      </div>

      {/* Brand Color */}
      <div className="rounded-lg border border-lift-border bg-surface p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Palette size={16} className="text-primary" />
          <h2 className="text-sm font-semibold">Brand Color</h2>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={s.primaryColor}
            onChange={(e) => update("primaryColor", e.target.value)}
            className="h-10 w-10 cursor-pointer rounded-lg border border-lift-border"
          />
          <input
            type="text"
            value={s.primaryColor}
            onChange={(e) => update("primaryColor", e.target.value)}
            className="w-28 rounded-md border border-lift-border bg-page-bg px-3 py-2 text-sm font-mono outline-none focus:border-primary"
          />
          <button
            onClick={() => update("primaryColor", "#14b8a6")}
            className="text-xs text-muted hover:underline"
          >
            Reset to default
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-md px-4 py-2 text-xs font-medium text-white" style={{ background: s.primaryColor }}>
            Sample Button
          </div>
          <div className="rounded-md border px-4 py-2 text-xs font-medium" style={{ borderColor: s.primaryColor, color: s.primaryColor }}>
            Sample Link
          </div>
        </div>
      </div>

      {/* Custom Domain */}
      <div className="rounded-lg border border-lift-border bg-surface p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Globe size={16} className="text-primary" />
          <h2 className="text-sm font-semibold">Custom Domain</h2>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={s.customDomain}
            onChange={(e) => update("customDomain", e.target.value)}
            placeholder="lift.yourschool.com"
            className="flex-1 rounded-md border border-lift-border bg-page-bg px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <button
            onClick={handleVerifyDomain}
            disabled={verifying || !s.customDomain}
            className="rounded-md bg-primary px-4 py-2 text-xs font-medium text-white disabled:opacity-50"
          >
            {verifying ? "Verifying..." : "Verify"}
          </button>
          {s.domainVerified && <Check size={16} className="text-success" />}
        </div>
        {verifyMsg && <p className="text-xs text-muted">{verifyMsg}</p>}

        <details className="text-xs text-muted">
          <summary className="cursor-pointer hover:text-lift-text">How to set up your custom domain</summary>
          <ol className="mt-2 space-y-1 pl-4 list-decimal">
            <li>In your DNS provider, add a CNAME record: <code className="bg-page-bg px-1 rounded">lift.yourschool.com → cname.vercel-dns.com</code></li>
            <li>Ask our team to add the domain to Vercel (contact support)</li>
            <li>Enter your domain above and click Verify</li>
            <li>Allow up to 48 hours for DNS propagation</li>
          </ol>
        </details>
      </div>

      {/* Email Branding */}
      <div className="rounded-lg border border-lift-border bg-surface p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Mail size={16} className="text-primary" />
          <h2 className="text-sm font-semibold">Email Branding</h2>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">Sender name</label>
          <input
            type="text"
            value={s.emailFromName}
            onChange={(e) => update("emailFromName", e.target.value)}
            placeholder="e.g. Hillside Academy Admissions"
            className="w-full rounded-md border border-lift-border bg-page-bg px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">Reply-to email</label>
          <input
            type="email"
            value={s.emailReplyTo}
            onChange={(e) => update("emailReplyTo", e.target.value)}
            placeholder="e.g. admissions@yourschool.com"
            className="w-full rounded-md border border-lift-border bg-page-bg px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
        <p className="text-[10px] text-muted/70">
          Emails are delivered via LIFT&apos;s email provider. Custom email domain requires DNS configuration — contact support.
        </p>
      </div>

      {/* LIFT Branding */}
      <div className="rounded-lg border border-lift-border bg-surface p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Eye size={16} className="text-primary" />
          <h2 className="text-sm font-semibold">LIFT Branding</h2>
        </div>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={s.poweredByVisible}
            onChange={(e) => update("poweredByVisible", e.target.checked)}
            className="h-4 w-4 accent-primary rounded"
          />
          <span className="text-sm">Show &quot;Powered by LIFT&quot; in sidebar</span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={s.hideLiftBranding}
            onChange={(e) => update("hideLiftBranding", e.target.checked)}
            className="h-4 w-4 accent-primary rounded"
          />
          <span className="text-sm">Hide all LIFT branding (Enterprise only)</span>
        </label>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Branding"}
        </button>
        {saved && <span className="text-xs text-success">Branding saved</span>}
      </div>
    </div>
  );
}
