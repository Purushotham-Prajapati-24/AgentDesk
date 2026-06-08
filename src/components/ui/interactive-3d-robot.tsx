"use client";

import { Component, lazy, Suspense, type ReactNode, useState } from "react";

const Spline = lazy(() => import("@splinetool/react-spline"));

interface InteractiveRobotSplineProps {
  scene: string;
  className?: string;
}

function RobotFallback({ className }: { className?: string }) {
  return (
    <div className={`robot-fallback ${className ?? "relative"} flex h-full w-full items-center justify-center overflow-hidden text-white`}>
      <div className="robot-fallback-glow absolute inset-0" />
      <div className="robot-fallback-core relative h-28 w-28 rounded-full border backdrop-blur-md" />
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
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={`${className ?? "relative h-full w-full"} overflow-hidden`}>
      <div className={`pointer-events-none absolute inset-0 transition-opacity duration-500 ${loaded ? "opacity-0" : "opacity-100"}`}>
        <RobotFallback className="absolute inset-0" />
      </div>
      <SplineErrorBoundary className="absolute inset-0">
        <Suspense fallback={null}>
          <Spline className="absolute inset-0 h-full w-full" onLoad={() => setLoaded(true)} scene={scene} />
        </Suspense>
      </SplineErrorBoundary>
    </div>
  );
}
