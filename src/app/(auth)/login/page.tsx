"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Radio } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/Signal";
import { loginWithMagicLink } from "@/app/auth-actions";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    const result = await loginWithMagicLink(email);

    if (result.success) {
      setMessage({ type: "success", text: "Magic link dispatched. Check your inbox." });
    } else {
      setMessage({ type: "error", text: result.error || "Failed to send magic link." });
    }
    setLoading(false);
  };

  return (
    <main className="grid min-h-screen bg-background text-line lg:grid-cols-[1fr_480px]">
      <section className="relative flex min-h-[50vh] flex-col justify-between overflow-hidden border-b-2 border-line bg-line p-5 text-panel lg:min-h-screen lg:border-b-0 lg:border-r-2 lg:p-8">
        <Link className="inline-flex w-fit items-center gap-2 text-sm font-black text-yellow" href="/">
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Back to workspace
        </Link>

        <div className="signal-enter">
          <StatusPill tone="warn">Access gate</StatusPill>
          <h1 className="mt-5 max-w-3xl text-[clamp(4rem,12vw,9rem)] font-black uppercase leading-[0.78]">
            Verify the operator.
          </h1>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="border-2 border-panel p-3">
            <p className="font-mono text-2xl font-black text-yellow">01</p>
            <p className="mt-1 text-sm font-bold">Email token</p>
          </div>
          <div className="border-2 border-panel p-3">
            <p className="font-mono text-2xl font-black text-yellow">02</p>
            <p className="mt-1 text-sm font-bold">Tenant context</p>
          </div>
          <div className="border-2 border-panel p-3">
            <p className="font-mono text-2xl font-black text-yellow">03</p>
            <p className="mt-1 text-sm font-bold">Live desk</p>
          </div>
        </div>
      </section>

      <section className="flex items-center p-5 lg:p-8">
        <form className="signal-panel w-full p-5 sm:p-6" onSubmit={handleSubmit}>
          <div className="flex items-center gap-3 border-b-2 border-line pb-5">
            <span className="flex h-12 w-12 items-center justify-center border-2 border-line bg-signal text-white">
              <Radio aria-hidden="true" className="h-5 w-5" />
            </span>
            <div>
              <p className="signal-kicker text-muted">AgentDesk</p>
              <h2 className="text-2xl font-black">Magic link sign in</h2>
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
                message.type === "success" ? "border-line bg-yellow text-line" : "border-line bg-coral text-white"
              }`}
              role="status"
            >
              {message.text}
            </div>
          ) : null}

          <Button className="mt-6 w-full" loading={loading} leftIcon={<Mail aria-hidden="true" className="h-4 w-4" />} type="submit">
            Send magic link
          </Button>
        </form>
      </section>
    </main>
  );
}
