"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Camera } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { useToast } from "@/components/ui/Toast";

export function ProfileClient({
  userId,
  email,
  fullName: initialName,
  avatarUrl: initialAvatar,
  role,
}: {
  userId: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(initialName);
  const [avatar, setAvatar] = useState(initialAvatar);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const initials = (fullName || email)
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `avatars/${userId}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("lift-reports")
      .upload(path, file, { upsert: true });

    if (uploadErr) {
      console.error("Upload failed:", uploadErr.message);
      setUploading(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("lift-reports").getPublicUrl(path);

    await supabase
      .from("users")
      .update({ avatar_url: publicUrl })
      .eq("id", userId);

    setAvatar(publicUrl);
    setUploading(false);
    router.refresh();
  }

  async function handleSave() {
    setSaving(true);

    await supabase
      .from("users")
      .update({ full_name: fullName.trim() })
      .eq("id", userId);

    setSaving(false);
    toast("Profile updated");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <BackButton label="Back" />
      <h1 className="text-2xl font-bold">Edit Profile</h1>

      <div className="rounded-lg border border-lift-border bg-surface p-6 space-y-6">
        {/* Avatar */}
        <div className="flex flex-col items-center">
          <div className="relative group">
            {avatar ? (
              <div className="relative h-24 w-24 overflow-hidden rounded-full">
                <Image
                  src={avatar}
                  alt="Avatar"
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-[#14b8a6] to-[#2dd4bf] text-2xl font-bold text-white">
                {initials}
              </div>
            )}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 disabled:opacity-50"
            >
              <Camera size={20} className="text-white" />
            </button>
          </div>
          {uploading && (
            <p className="mt-2 text-xs text-primary">Uploading...</p>
          )}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="mt-2 text-xs text-primary hover:underline"
          >
            Change photo
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarUpload}
            className="hidden"
          />
        </div>

        {/* Full Name */}
        <div>
          <label htmlFor="profile-full-name" className="mb-1 block text-sm font-medium text-lift-text">
            Full name
          </label>
          <input
            id="profile-full-name"
            name="full_name"
            type="text"
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-lg border border-lift-border bg-page-bg px-4 py-3 text-sm text-lift-text outline-none focus:border-primary"
          />
        </div>

        {/* Email (read-only) */}
        <div>
          <label htmlFor="profile-email" className="mb-1 block text-sm font-medium text-lift-text">
            Email
          </label>
          <input
            id="profile-email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            disabled
            className="w-full rounded-lg border border-lift-border bg-lift-border/20 px-4 py-3 text-sm text-muted cursor-not-allowed"
          />
          <p className="mt-1 text-[10px] text-muted">
            Email cannot be changed. Contact support if needed.
          </p>
        </div>

        {/* Role (read-only) */}
        <div>
          <label htmlFor="profile-role" className="mb-1 block text-sm font-medium text-lift-text">
            Your role in LIFT
          </label>
          <input
            id="profile-role"
            name="role"
            type="text"
            value={role.replace("_", " ")}
            disabled
            className="w-full rounded-lg border border-lift-border bg-lift-border/20 px-4 py-3 text-sm text-muted cursor-not-allowed capitalize"
          />
          <p className="mt-1 text-[10px] text-muted">
            Your access level in this school. Contact your school admin to change roles.
          </p>
        </div>

        {/* Save */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving || fullName.trim() === initialName}
            className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
