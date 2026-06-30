"use client";

import React, { Suspense, useCallback, useState } from "react";
import Link from "next/link";
import { ArrowLeft, LockKeyhole, Mail, Radio, ShieldCheck } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { loginWithMagicLink } from "@/app/auth-actions";
import { ThemeToggle } from "@/components/ThemeToggle";
import { InteractiveRobotSpline } from "@/components/ui/interactive-3d-robot";
import { sanitizeNextPath } from "@/lib/auth-redirect";
import { Turnstile } from "@marsidev/react-turnstile";
import { useTheme } from "@/context/ThemeContext";

const ROBOT_SCENE_URL = "https://prod.spline.design/PyzDhpQ9E5f1E3MT/scene.splinecode";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const { resolvedTheme } = useTheme();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [captchaKey, setCaptchaKey] = useState(0);
  const [captchaLoadFailed, setCaptchaLoadFailed] = useState(false);

  const queryMessage = getQueryMessage(searchParams.get("error"));
  const configError = process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
    ? { type: "error" as const, text: "Security verification is misconfigured (missing CAPTCHA site key). Please contact support." }
    : null;
  const visibleMessage = configError ?? message ?? queryMessage;
  const nextPath = sanitizeNextPath(searchParams.get("next"));

  const turnstileOptions = React.useMemo(() => ({
    theme: (resolvedTheme === "dark" ? "dark" : "light") as "dark" | "light",
    size: "flexible" as const,
    action: "login",
  }), [resolvedTheme]);

  const handleTurnstileSuccess = useCallback((token: string) => {
    setTurnstileToken(token);
    setCaptchaLoadFailed(false);
  }, []);

  const handleTurnstileExpire = useCallback(() => {
    setTurnstileToken(null);
  }, []);

  const handleTurnstileError = useCallback(() => {
    setTurnstileToken(null);
    setCaptchaLoadFailed(true);
    setMessage({
      type: "error",
      text: "Security check failed to load. Please check your connection or disable ad-blockers.",
    });
  }, []);

  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    if (configError) return;

    if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !turnstileToken) {
      if (captchaLoadFailed) {
        return;
      }
      setMessage({ type: "error", text: "Please complete the security verification." });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const result = await loginWithMagicLink(email, {
        captchaToken: turnstileToken ?? undefined,
        nextPath: nextPath ?? undefined,
      });
      if (!result.success) {
        setTurnstileToken(null);
        setCaptchaLoadFailed(false);
        setCaptchaKey((prev) => prev + 1);
        throw new Error(result.error);
      }
      setMessage({ type: "success", text: "Magic link dispatched. Check your inbox." });
    } catch (error: unknown) {
      setTurnstileToken(null);
      setCaptchaLoadFailed(false);
      setCaptchaKey((prev) => prev + 1);
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Failed to send magic link." });
    }
    setLoading(false);
  }, [configError, turnstileToken, captchaLoadFailed, email, nextPath]);

  return (
    <main className="cream-lane marketing-lane grid min-h-screen overflow-hidden lg:grid-cols-[minmax(0,1fr)_500px]">
      <section className="login-robot-panel relative min-h-[48vh] overflow-hidden border-b border-[var(--marketing-border)] lg:min-h-screen lg:border-b-0 lg:border-r">
        <InteractiveRobotSpline scene={ROBOT_SCENE_URL} className="login-robot-scene absolute inset-0 h-full w-full scale-120" />
        <div className="login-robot-tone pointer-events-none absolute inset-0" />

        <div className="relative z-20 flex items-start justify-between gap-3 p-5 lg:p-8">
          <Link
            aria-label="Back to AgentDesk"
            className="login-robot-control inline-flex h-11 w-11 items-center justify-center rounded-full backdrop-blur-md transition"
            href="/"
          >
            <ArrowLeft aria-hidden="true" className="h-5 w-5" />
          </Link>
          <div className="login-robot-toggle rounded-full p-1 backdrop-blur-md">
            <ThemeToggle variant="cockpit" />
          </div>
        </div>

        <div className="login-robot-copy pointer-events-none absolute inset-x-5 bottom-5 z-20 mx-auto max-w-[46rem] px-5 py-4 text-center text-white sm:px-8 sm:py-5 lg:inset-x-8 lg:bottom-8">
          <h1 className="">Resolve every support queue with context</h1>
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

          {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
            <div className="mt-5 flex justify-center">
              <div className="w-full max-w-[340px] overflow-hidden rounded-xl border border-[var(--marketing-border)] bg-[var(--marketing-surface)] p-1.5 shadow-sm transition-all duration-300 hover:border-[var(--sky)]/50">
                <Turnstile
                  key={captchaKey}
                  siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                  options={turnstileOptions}
                  onSuccess={handleTurnstileSuccess}
                  onExpire={handleTurnstileExpire}
                  onError={handleTurnstileError}
                />
              </div>
            </div>
          )}

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
            disabled={loading || !!configError}
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
