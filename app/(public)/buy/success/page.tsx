"use client";

import Image from "next/image";
import { CheckCircle, Mail, ArrowRight } from "lucide-react";

export default function BuySuccessPage() {
  return (
    <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-[500px] text-center">
        <Image
          src="/LIFT LOGO.jpeg"
          alt="LIFT"
          width={100}
          height={100}
          priority
          className="mx-auto h-[80px] w-[80px] rounded-xl object-contain"
        />

        <div className="mt-6 rounded-xl border border-[#10b981]/20 bg-[#10b981]/5 p-8 backdrop-blur-xl">
          <CheckCircle size={48} className="mx-auto text-[#10b981]" />

          <h1 className="mt-4 font-[family-name:var(--font-display)] text-2xl font-bold text-white">
            Welcome to LIFT!
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-white/60">
            Your payment was successful and your account is being set up.
          </p>

          <div className="mt-6 rounded-lg border border-[#2a2a3a] bg-[#0d0d1a] p-4 text-left">
            <div className="flex items-start gap-3">
              <Mail size={18} className="mt-0.5 shrink-0 text-[#6366f1]" />
              <div>
                <p className="text-sm font-medium text-white">Check your email</p>
                <p className="mt-1 text-xs text-white/50">
                  We sent you a password reset link to set up your account password.
                  Click the link in the email, set your password, then log in to your dashboard.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <a
              href="/login"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#6366f1] to-[#818cf8] py-3 text-sm font-semibold text-white shadow-lg transition-all hover:opacity-90"
            >
              Go to Login
              <ArrowRight size={16} />
            </a>
            <a
              href="/forgot-password"
              className="block text-center text-xs text-white/40 hover:text-white/60"
            >
              Didn&apos;t get the email? Request a new password reset
            </a>
          </div>
        </div>

        <p className="mt-6 text-[10px] text-white/20">
          Powered by Inteliflow
        </p>
      </div>
    </div>
  );
}
