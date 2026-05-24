"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { Check, Loader2, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/Signal";
import { verifyMagicLink } from "@/app/auth-actions";

export default function VerifyPage() {
  return (
    <Suspense fallback={<VerifyShell status="loading" error="" />}>
      <VerifyContent />
    </Suspense>
  );
}

function VerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    const userId = searchParams.get("userId");
    const secret = searchParams.get("secret");

    if (!userId || !secret) {
      queueMicrotask(() => {
        setStatus("error");
        setError("Invalid magic link.");
      });
      return;
    }

    const verify = async () => {
      const result = await verifyMagicLink(userId, secret);
      if (result.success) {
        setStatus("success");
        setTimeout(() => {
          router.push("/");
        }, 1200);
      } else {
        setStatus("error");
        setError(result.error || "Verification failed.");
      }
    };

    verify();
  }, [searchParams, router]);

  return <VerifyShell status={status} error={error} />;
}

function VerifyShell({ status, error }: { status: "loading" | "success" | "error"; error: string }) {
  const isSuccess = status === "success";
  const isError = status === "error";

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12 text-line">
      <section className="signal-panel w-full max-w-xl p-5 text-center sm:p-8">
        <div className="mx-auto flex h-20 w-20 items-center justify-center border-2 border-line bg-yellow shadow-[4px_4px_0_#17120D]">
          {status === "loading" ? <Loader2 className="h-9 w-9 animate-spin" /> : null}
          {isSuccess ? <Check className="h-10 w-10" /> : null}
          {isError ? <X className="h-10 w-10" /> : null}
        </div>

        <div className="mt-6">
          <StatusPill tone={isError ? "danger" : isSuccess ? "warn" : "hot"}>
            {status === "loading" ? "Verifying" : isSuccess ? "Cleared" : "Rejected"}
          </StatusPill>
        </div>

        <h1 className="mt-5 text-4xl font-black leading-none">
          {status === "loading" ? "Checking your signal..." : isSuccess ? "Operator verified." : "Verification failed."}
        </h1>

        <p className="mx-auto mt-4 max-w-md text-base font-semibold leading-7 text-muted">
          {status === "loading"
            ? "Hold this screen while AgentDesk validates the one-time link."
            : isSuccess
              ? "Redirecting you to the workspace command surface."
              : error}
        </p>

        {isError ? (
          <Link className="mt-6 inline-block" href="/login">
            <Button variant="secondary">Try logging in again</Button>
          </Link>
        ) : null}
      </section>
    </main>
  );
}
