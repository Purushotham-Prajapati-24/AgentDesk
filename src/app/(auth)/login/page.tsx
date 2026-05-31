"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { ArrowLeft, LockKeyhole, Mail, Radio, ShieldCheck } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { loginWithMagicLink } from "@/app/auth-actions";
import { ThemeToggle } from "@/components/ThemeToggle";

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
    <main className="cream-lane grid min-h-screen overflow-hidden lg:grid-cols-[minmax(0,1fr)_500px]">
      <section className="relative flex min-h-[52vh] flex-col justify-between overflow-hidden border-b border-[#eceae4] p-5 lg:min-h-screen lg:border-b-0 lg:border-r lg:p-8">
        <span className="pastel-bloom left-10 top-24 h-56 w-56 bg-[#b8f2d2]" />
        <span className="pastel-bloom bottom-24 right-16 h-64 w-64 bg-[#ffd8c2] [animation-delay:3s]" />
        <div className="relative flex items-center justify-between gap-3">
          <Link className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#1c1c1c]" href="/">
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Back to AgentDesk
          </Link>
          <ThemeToggle compact />
        </div>

        <div className="relative max-w-4xl">
          <p className="font-mono text-xs font-semibold uppercase text-[#ff5530]">Access gate</p>
          <h1 className="editorial-display mt-5 text-[4.4rem] text-[#1c1c1c] sm:text-[6.2rem] lg:text-[7rem]">
            Verify the operator console.
          </h1>
        </div>

        <div className="relative grid gap-3 sm:grid-cols-3">
          {["Email token", "Tenant context", "Live desk"].map((item, index) => (
            <div className="border border-[#eceae4] bg-[#fcfbf8] p-4" key={item}>
              <p className="font-mono text-2xl text-[#1456f0]">0{index + 1}</p>
              <p className="mt-8 text-sm font-semibold text-[#1c1c1c]">{item}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex min-w-0 items-center p-5 lg:p-8">
        <form className="w-full border border-[#eceae4] bg-[#fcfbf8] p-5 sm:p-6" onSubmit={handleSubmit}>
          <div className="flex items-center gap-3 border-b border-[#eceae4] pb-5">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1c1c1c] text-[#fcfbf8]">
              <Radio aria-hidden="true" className="h-5 w-5" />
            </span>
            <div>
              <p className="font-mono text-xs font-semibold uppercase text-[#5f5f5d]">AgentDesk</p>
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[#1c1c1c]">Magic link sign in</h2>
            </div>
          </div>

          <div className="mt-6">
            <Input
              className="border-[#eceae4] bg-[#f7f4ed] text-[#1c1c1c] placeholder:text-[#5f5f5d] focus:border-[#0099ff] focus:bg-[#fcfbf8]"
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

          <Button className="mt-6 w-full" loading={loading} leftIcon={<Mail aria-hidden="true" className="h-4 w-4" />} type="submit">
            Send magic link
          </Button>
          <div className="mt-5 grid gap-2 text-xs font-medium leading-5 text-[#5f5f5d]">
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
