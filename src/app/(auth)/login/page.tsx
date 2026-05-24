"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, LockKeyhole, Mail, Radio, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/Signal";
import { DarkVeil } from "@/components/reactbits/DarkVeil";
import { loginWithMagicLink } from "@/app/auth-actions";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

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
    <main className="grid min-h-screen bg-background text-foreground lg:grid-cols-[1fr_480px]">
      <section className="relative flex min-h-[50vh] flex-col justify-between overflow-hidden border-b border-border bg-card p-5 lg:min-h-screen lg:border-b-0 lg:border-r lg:p-8">
        <DarkVeil />
        <Link className="relative inline-flex w-fit items-center gap-2 text-sm font-semibold text-primary" href="/">
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Back to workspace
        </Link>

        <div className="studio-enter relative">
          <StatusPill tone="hot">Access gate</StatusPill>
          <h1 className="mt-5 max-w-3xl text-[clamp(3.5rem,10vw,7rem)] font-bold leading-[0.9]">
            Verify the operator console.
          </h1>
        </div>

        <div className="relative grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-secondary/50 p-3">
            <p className="font-mono text-2xl font-bold text-primary">01</p>
            <p className="mt-1 text-sm font-semibold">Email token</p>
          </div>
          <div className="rounded-lg border border-border bg-secondary/50 p-3">
            <p className="font-mono text-2xl font-bold text-primary">02</p>
            <p className="mt-1 text-sm font-semibold">Tenant context</p>
          </div>
          <div className="rounded-lg border border-border bg-secondary/50 p-3">
            <p className="font-mono text-2xl font-bold text-primary">03</p>
            <p className="mt-1 text-sm font-semibold">Live desk</p>
          </div>
        </div>
      </section>

      <section className="flex items-center p-5 lg:p-8">
        <form className="studio-surface w-full rounded-xl p-5 sm:p-6" onSubmit={handleSubmit}>
          <div className="flex items-center gap-3 border-b border-border pb-5">
            <span className="flex h-12 w-12 items-center justify-center rounded-md border border-primary/50 bg-primary/10 text-primary">
              <Radio aria-hidden="true" className="h-5 w-5" />
            </span>
            <div>
              <p className="studio-kicker text-muted-foreground">AgentDesk</p>
              <h2 className="text-2xl font-bold">Magic link sign in</h2>
            </div>
          </div>

          <div className="mt-6">
            <Input
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

          {message ? (
            <div
              className={`mt-5 border-2 px-3 py-3 text-sm font-bold ${
                message.type === "success" ? "border-success/50 bg-success/10 text-success" : "border-destructive/50 bg-destructive/10 text-destructive"
              }`}
              role="status"
            >
              {message.text}
            </div>
          ) : null}

          <Button className="mt-6 w-full" loading={loading} leftIcon={<Mail aria-hidden="true" className="h-4 w-4" />} type="submit">
            Send magic link
          </Button>
          <div className="mt-5 grid gap-2 text-xs font-medium text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <ShieldCheck aria-hidden="true" className="h-4 w-4 text-accent" />
              One-time Appwrite session verification
            </span>
            <span className="inline-flex items-center gap-2">
              <LockKeyhole aria-hidden="true" className="h-4 w-4 text-accent" />
              Dashboard access resolves tenant context after sign-in
            </span>
          </div>
        </form>
      </section>
    </main>
  );
}
