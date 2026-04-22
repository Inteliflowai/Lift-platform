"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { LogOut, ChevronDown, Camera, User } from "lucide-react";

export function TopBar({
  email,
  fullName,
  avatarUrl,
}: {
  email: string;
  fullName?: string | null;
  avatarUrl?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatar, setAvatar] = useState(avatarUrl ?? null);
  const router = useRouter();
  const supabase = createClient();
  const ref = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const initials = (fullName ?? email)
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setUploading(false);
      return;
    }

    const ext = file.name.split(".").pop();
    const path = `avatars/${user.id}.${ext}`;

    // Upload to Supabase Storage
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

    // Update user profile
    await supabase
      .from("users")
      .update({ avatar_url: publicUrl })
      .eq("id", user.id);

    setAvatar(publicUrl);
    setUploading(false);
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-lift-border bg-surface px-6">
      <div />

      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/5"
        >
          {avatar ? (
            <div className="relative h-8 w-8 overflow-hidden rounded-full">
              <Image
                src={avatar}
                alt="Avatar"
                fill
                sizes="32px"
                className="object-cover"
              />
            </div>
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#14b8a6] to-[#2dd4bf] text-xs font-bold text-white">
              {initials}
            </div>
          )}
          <ChevronDown
            size={14}
            className={`text-muted transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>

        {open && (
          <div className="absolute right-0 mt-1.5 w-60 rounded-xl border border-lift-border bg-surface py-2 shadow-lg">
            {/* Profile header */}
            <div className="border-b border-lift-border px-4 pb-3">
              <div className="flex items-center gap-3">
                <div className="relative group">
                  {avatar ? (
                    <div className="relative h-10 w-10 overflow-hidden rounded-full">
                      <Image
                        src={avatar}
                        alt="Avatar"
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#14b8a6] to-[#2dd4bf] text-sm font-bold text-white">
                      {initials}
                    </div>
                  )}
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <Camera size={14} className="text-white" />
                  </button>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-lift-text">
                    {fullName || "User"}
                  </p>
                  <p className="truncate text-xs text-muted">{email}</p>
                </div>
              </div>
              {uploading && (
                <p className="mt-2 text-xs text-[#14b8a6]">Uploading...</p>
              )}
            </div>

            {/* Edit Profile */}
            <a
              href="/school/settings/profile"
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-muted transition-colors hover:bg-white/5"
            >
              <User size={14} />
              Edit Profile
            </a>

            {/* Account Settings */}
            <a
              href="/settings/account"
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-muted transition-colors hover:bg-white/5"
            >
              <User size={14} />
              Account Settings
            </a>

            {/* Change photo */}
            <button
              onClick={() => fileRef.current?.click()}
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-muted transition-colors hover:bg-white/5"
            >
              <Camera size={14} />
              Change photo
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-muted transition-colors hover:bg-white/5 hover:text-[#f43f5e]"
            >
              <LogOut size={14} />
              Log out
            </button>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>
        )}
      </div>
    </header>
  );
}
