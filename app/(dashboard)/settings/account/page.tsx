"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff } from "lucide-react";

export default function AccountSettingsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [loaded, setLoaded] = useState(false);

  // Password change
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  // Profile save
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Delete
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Load user data on mount
  useState(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? "");
      supabase
        .from("users")
        .select("full_name")
        .eq("id", data.user?.id ?? "")
        .single()
        .then(({ data: profile }) => {
          setFullName(profile?.full_name ?? "");
          setLoaded(true);
        });
    });
  });

  async function handleSaveProfile() {
    setSaving(true);
    setSaved(false);
    await fetch("/api/account/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: fullName }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    router.refresh();
  }

  async function handleChangePassword() {
    setPwError(null);
    setPwSuccess(false);

    if (newPw.length < 8) { setPwError("Password must be at least 8 characters."); return; }
    if (newPw !== confirmPw) { setPwError("Passwords do not match."); return; }

    setPwLoading(true);

    // Re-authenticate
    const { error: authErr } = await supabase.auth.signInWithPassword({
      email,
      password: currentPw,
    });

    if (authErr) {
      setPwError("Current password is incorrect.");
      setPwLoading(false);
      return;
    }

    const { error: updateErr } = await supabase.auth.updateUser({ password: newPw });
    setPwLoading(false);

    if (updateErr) {
      setPwError(updateErr.message);
    } else {
      setPwSuccess(true);
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    }
  }

  async function handleDelete() {
    setDeleteError(null);
    setDeleting(true);
    const res = await fetch("/api/account/delete", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: deleteConfirm }),
    });
    const data = await res.json();
    if (!res.ok) {
      setDeleteError(data.error);
      setDeleting(false);
      return;
    }
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (!loaded) {
    return <div className="py-16 text-center text-muted">Loading...</div>;
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-2xl font-bold">Account Settings</h1>

      {/* Profile */}
      <div className="rounded-lg border border-lift-border bg-surface p-5 space-y-4">
        <h2 className="text-sm font-semibold">Profile</h2>
        <div>
          <label className="mb-1 block text-xs text-muted">Full name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-lg border border-lift-border bg-page-bg px-4 py-3 text-sm outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">Email</label>
          <input
            type="email"
            value={email}
            disabled
            className="w-full rounded-lg border border-lift-border bg-lift-border/20 px-4 py-3 text-sm text-muted cursor-not-allowed"
          />
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleSaveProfile} disabled={saving} className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
            {saving ? "Saving..." : "Save Profile"}
          </button>
          {saved && <span className="text-xs text-success">Saved</span>}
        </div>
      </div>

      {/* Change Password */}
      <div className="rounded-lg border border-lift-border bg-surface p-5 space-y-4">
        <h2 className="text-sm font-semibold">Change Password</h2>
        <div>
          <label className="mb-1 block text-xs text-muted">Current password</label>
          <input
            type="password"
            value={currentPw}
            onChange={(e) => setCurrentPw(e.target.value)}
            className="w-full rounded-lg border border-lift-border bg-page-bg px-4 py-3 text-sm outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">New password</label>
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              minLength={8}
              className="w-full rounded-lg border border-lift-border bg-page-bg px-4 py-3 pr-10 text-sm outline-none focus:border-primary"
            />
            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted">Confirm new password</label>
          <input
            type="password"
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
            className="w-full rounded-lg border border-lift-border bg-page-bg px-4 py-3 text-sm outline-none focus:border-primary"
          />
        </div>
        {pwError && <p className="text-xs text-review">{pwError}</p>}
        {pwSuccess && <p className="text-xs text-success">Password updated successfully.</p>}
        <button
          onClick={handleChangePassword}
          disabled={pwLoading || !currentPw || !newPw}
          className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {pwLoading ? "Updating..." : "Update Password"}
        </button>
      </div>

      {/* Danger Zone */}
      <div className="rounded-lg border border-review/20 bg-review/5 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-review">Delete Account</h2>
        <p className="text-xs text-muted">
          Permanently delete your account and remove your access. Your evaluator reviews and data will be preserved.
        </p>
        <div>
          <label className="mb-1 block text-xs text-muted">Type DELETE to confirm</label>
          <input
            type="text"
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            placeholder="DELETE"
            className="w-full rounded-lg border border-review/30 bg-page-bg px-4 py-2 text-sm outline-none focus:border-review"
          />
        </div>
        {deleteError && <p className="text-xs text-review">{deleteError}</p>}
        <button
          onClick={handleDelete}
          disabled={deleting || deleteConfirm !== "DELETE"}
          className="rounded-lg bg-review px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {deleting ? "Deleting..." : "Delete My Account"}
        </button>
      </div>
    </div>
  );
}
