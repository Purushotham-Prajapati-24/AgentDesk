"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { loginWithMagicLink } from "@/app/auth-actions";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const result = await loginWithMagicLink(email);

    if (result.success) {
      setMessage({ type: "success", text: "Check your email for the magic link!" });
    } else {
      setMessage({ type: "error", text: result.error || "Failed to send magic link." });
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Sign in to AgentDesk
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            We&apos;ll send a magic link to your email
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="-space-y-px rounded-md shadow-sm">
            <Input
              id="email-address"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              label="Email Address"
            />
          </div>

          {message && (
            <div
              className={`rounded-md p-4 text-sm ${
                message.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
              }`}
            >
              {message.text}
            </div>
          )}

          <div>
            <Button type="submit" loading={loading} className="w-full">
              Send Magic Link
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
