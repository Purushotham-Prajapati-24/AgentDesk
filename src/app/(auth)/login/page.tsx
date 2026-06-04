"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { ArrowLeft, LockKeyhole, Mail, Radio, ShieldCheck } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { loginWithMagicLink } from "@/app/auth-actions";
import { ThemeToggle } from "@/components/ThemeToggle";
import { InteractiveRobotSpline } from "@/components/ui/interactive-3d-robot";

const ROBOT_SCENE_URL = "https://prod.spline.design/PyzDhpQ9E5f1E3MT/scene.splinecode";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const queryMessage = getQueryMessage(searchParams.get("error"));
  const visibleMessage = message ?? queryMessage;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const result = await loginWithMagicLink(email);
      if (!result.success) {
        throw new Error(result.error);
      }
      setMessage({ type: "success", text: "Magic link dispatched. Check your inbox." });
    } catch (error: unknown) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Failed to send magic link." });
    }
    setLoading(false);
  };

  return (
    <main className="cream-lane marketing-lane grid min-h-screen overflow-hidden lg:grid-cols-[minmax(0,1fr)_500px]">
      <section className="relative min-h-[42vh] overflow-hidden border-b border-[var(--marketing-border)] bg-[#070a12] lg:min-h-screen lg:border-b-0 lg:border-r">
        <InteractiveRobotSpline scene={ROBOT_SCENE_URL} className="absolute inset-0 h-full w-full" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(20,86,240,0.16),transparent_34rem),linear-gradient(180deg,rgba(7,10,18,0.08),rgba(7,10,18,0.42))]" />

        <div className="relative z-10 flex items-start justify-between gap-3 p-5 lg:p-8">
          <Link
            aria-label="Back to AgentDesk"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/30 text-white shadow-[0_16px_40px_rgba(0,0,0,0.22)] backdrop-blur-md transition hover:bg-black/45"
            href="/"
          >
            <ArrowLeft aria-hidden="true" className="h-5 w-5" />
          </Link>
          <div className="rounded-full bg-black/25 p-1 backdrop-blur-md">
            <ThemeToggle compact variant="cockpit" />
          </div>
        </div>
      </section>

      <section className="marketing-dark-band flex min-w-0 items-center p-5 lg:p-8">
        <form className="marketing-dark-surface w-full rounded-[2rem] border border-[var(--marketing-border)] bg-[var(--marketing-surface)] p-5 shadow-[0_24px_80px_rgba(7,10,18,0.08)] sm:p-6" onSubmit={handleSubmit}>
          <div className="flex items-center gap-3 border-b border-[var(--marketing-border)] pb-5">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--marketing-inverse)] text-[var(--marketing-on-inverse)]">
              <Radio aria-hidden="true" className="h-5 w-5" />
            </span>
            <div>
              <p className="font-mono text-xs font-semibold uppercase text-[var(--marketing-muted)]">AgentDesk</p>
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--marketing-ink)]">Magic link sign in</h2>
            </div>
          </div>

          <div className="mt-6">
            <Input
              className="marketing-input rounded-xl"
              id="email-address"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="operator@company.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              label="Email address"
              hint="We send a one-time link. No password storage, no shared console account."
            />
          </div>

          {visibleMessage ? (
            <div
              className={`mt-5 border px-3 py-3 text-sm font-semibold ${
                visibleMessage.type === "success" ? "border-[#22c55e]/40 bg-[#22c55e]/10 text-[#166534]" : "border-[#ff5530]/40 bg-[#ff5530]/10 text-[#b42318]"
              }`}
              role="status"
            >
              {visibleMessage.text}
            </div>
          ) : null}

          <button
            className="marketing-cta mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border px-5 text-sm font-semibold transition hover:-translate-y-0.5 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            disabled={loading}
            style={{
              backgroundColor: "var(--marketing-inverse)",
              borderColor: "var(--marketing-inverse)",
              color: "var(--marketing-on-inverse)",
            }}
            type="submit"
          >
            <Mail aria-hidden="true" className="h-4 w-4" />
            <span>{loading ? "Sending magic link..." : "Send magic link"}</span>
          </button>
          <div className="mt-5 grid gap-2 text-xs font-medium leading-5 text-[var(--marketing-muted)]">
            <span className="inline-flex items-center gap-2">
              <ShieldCheck aria-hidden="true" className="h-4 w-4 text-[#1456f0]" />
              One-time Appwrite session verification
            </span>
            <span className="inline-flex items-center gap-2">
              <LockKeyhole aria-hidden="true" className="h-4 w-4 text-[#1456f0]" />
              Dashboard access resolves tenant context after sign-in
            </span>
          </div>
        </form>
      </section>
    </main>
  );
}

function getQueryMessage(error: string | null): { type: "error"; text: string } | null {
  if (error === "invalid_magic_link") {
    return { type: "error", text: "Invalid magic link. Request a new sign-in link." };
  }

  if (error === "verification_failed") {
    return { type: "error", text: "Verification failed. Request a fresh magic link and try again." };
  }

  return null;
}
