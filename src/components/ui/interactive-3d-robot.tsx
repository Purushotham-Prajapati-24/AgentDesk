"use client";

import { Component, lazy, Suspense, type ReactNode } from "react";

const Spline = lazy(() => import("@splinetool/react-spline"));

interface InteractiveRobotSplineProps {
  scene: string;
  className?: string;
}

function RobotFallback({ className }: { className?: string }) {
  return (
    <div className={`relative flex h-full w-full items-center justify-center overflow-hidden bg-[#070a12] text-white ${className ?? ""}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_48%_28%,rgba(20,86,240,0.34),transparent_24rem),radial-gradient(circle_at_70%_60%,rgba(34,197,165,0.18),transparent_22rem)]" />
      <div className="relative h-28 w-28 rounded-full border border-white/20 bg-white/5 shadow-[0_0_80px_rgba(20,86,240,0.28)] backdrop-blur-md" />
    </div>
  );
}

class SplineErrorBoundary extends Component<{ children: ReactNode; className?: string }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <RobotFallback className={this.props.className} />;
    }

    return this.props.children;
  }
}

export function InteractiveRobotSpline({ scene, className }: InteractiveRobotSplineProps) {
  return (
    <SplineErrorBoundary className={className}>
      <Suspense
        fallback={
          <div className={`flex h-full w-full items-center justify-center bg-[#070a12] text-white ${className ?? ""}`}>
            <svg className="mr-3 h-5 w-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l2-2.647z"
            />
            </svg>
          </div>
        }
      >
        <Spline scene={scene} className={className} />
      </Suspense>
    </SplineErrorBoundary>
  );
}
