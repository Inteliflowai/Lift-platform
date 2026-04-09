"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

function ConfirmHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const type = searchParams.get("type");

    async function handle() {
      // Supabase handles token exchange via the URL hash automatically
      const { data, error } = await supabase.auth.getSession();

      if (error || !data.session) {
        setStatus("error");
        setMessage("This link is invalid or has expired.");
        return;
      }

      switch (type) {
        case "email_change":
          setStatus("success");
          setMessage("Email updated successfully!");
          setTimeout(() => router.push("/settings/account"), 3000);
          break;
        case "signup":
          setStatus("success");
          setMessage("Email verified! You can now sign in.");
          setTimeout(() => router.push("/login?confirmed=true"), 3000);
          break;
        case "recovery":
          router.push("/reset-password");
          break;
        default:
          setStatus("success");
          setMessage("Confirmation complete.");
          setTimeout(() => router.push("/login"), 3000);
      }
    }

    handle();
  }, [searchParams, router, supabase]);

  return (
    <div className="relative z-10 w-full max-w-[400px] px-4 login-card-enter">
      <div className="mb-8 flex justify-center">
        <Image src="/LIFT LOGO.jpeg" alt="LIFT" width={80} height={80} priority className="h-20 w-20 rounded-2xl object-contain" />
      </div>

      <div className="glow-border rounded-[20px] border border-white/10 bg-[rgba(15,15,19,0.85)] p-10 shadow-[0_24px_60px_rgba(0,0,0,0.4)] backdrop-blur-[20px] text-center">
        {status === "loading" && (
          <div className="flex justify-center py-4">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#6366f1] border-t-transparent" />
          </div>
        )}
        {status === "success" && (
          <div className="rounded-lg bg-[#10b981]/10 border border-[#10b981]/20 p-4">
            <p className="text-sm text-[#10b981]">{message}</p>
            <p className="mt-1 text-xs text-white/40">Redirecting...</p>
          </div>
        )}
        {status === "error" && (
          <div>
            <p className="text-sm text-[#f43f5e]">{message}</p>
            <Link href="/login" className="mt-3 inline-block text-xs text-[#6366f1] hover:underline">
              Go to login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense>
      <ConfirmHandler />
    </Suspense>
  );
}
