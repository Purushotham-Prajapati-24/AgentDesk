"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
        }, 2000);
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
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md text-center">
        {status === "loading" && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <svg className="animate-spin h-10 w-10 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <h2 className="text-xl font-semibold">Verifying your login...</h2>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-4">
            <div className="flex justify-center text-green-600">
              <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Success!</h2>
            <p className="text-gray-600">Redirecting to dashboard...</p>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4">
            <div className="flex justify-center text-red-600">
              <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Verification Failed</h2>
            <p className="text-red-600">{error}</p>
            <div className="pt-4">
              <a href="/login" className="text-blue-600 hover:text-blue-500 font-medium">
                Try logging in again
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
