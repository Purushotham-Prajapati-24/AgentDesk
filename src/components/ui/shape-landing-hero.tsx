"use client";

import type React from "react";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { Circle } from "lucide-react";
import { cn } from "@/lib/utils";

type ElegantShapeProps = {
  className?: string;
  delay?: number;
  width?: number;
  height?: number;
  rotate?: number;
  gradient?: string;
  text?: string;
};

type HeroGeometricProps = {
  badge?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  sideContent?: React.ReactNode;
};

function ElegantShape({ className, delay = 0, width = 400, height = 100, rotate = 0, gradient = "from-white/[0.08]", text }: ElegantShapeProps) {
  return (
    <motion.div
      animate={{
        opacity: 1,
        rotate,
        y: 0,
      }}
      className={cn(
        "pointer-events-none absolute scale-[0.5] sm:scale-[0.75] lg:scale-100 origin-center transition-transform duration-500",
        className
      )}
      initial={{
        opacity: 0,
        rotate: rotate - 15,
        y: -150,
      }}
      transition={{
        delay,
        duration: 2.4,
        ease: [0.23, 0.86, 0.39, 0.96] as const,
        opacity: { duration: 1.2 },
      }}
    >
      <motion.div
        animate={{
          y: [0, 15, 0],
        }}
        className="relative"
        style={{ height, width }}
        transition={{
          duration: 12,
          ease: "easeInOut",
          repeat: Number.POSITIVE_INFINITY,
        }}
      >
        <div
          className={cn(
            "absolute inset-0 rounded-full border-2 border-white/[0.15] bg-gradient-to-r to-transparent backdrop-blur-[2px]",
            "shadow-[0_8px_32px_0_rgba(255,255,255,0.1)] after:absolute after:inset-0 after:rounded-full",
            "after:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.2),transparent_70%)]",
            gradient,
            "flex items-center justify-center px-12 text-center"
          )}
        >
          {text && (
            <span
              className="font-mono text-xs font-semibold tracking-[0.3em] text-white/70 uppercase select-none"
              style={{
                textShadow: "0 0 10px rgba(255,255,255,0.6), 0 0 20px rgba(255,255,255,0.2)",
              }}
            >
              {text}
            </span>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export function HeroGeometric({ badge, title, description, actions, sideContent }: HeroGeometricProps) {
  const fadeUpVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: (index: number) => ({
      opacity: 1,
      transition: {
        delay: 0.35 + index * 0.12,
        duration: 0.8,
        ease: [0.25, 0.4, 0.25, 1] as const,
      },
      y: 0,
    }),
  };

  return (
    <div className="relative isolate z-10 mx-auto flex flex-col justify-center lg:justify-normal lg:grid w-full max-w-7xl lg:max-w-[95vw] gap-6 md:gap-10 lg:grid-cols-[minmax(0,1fr)_420px] items-stretch lg:items-center pt-1 lg:pt-0 flex-1">
      <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1456f0]/[0.05] via-transparent to-[#ff5530]/[0.07] blur-3xl" />
        <ElegantShape
          className="left-[-24%] top-[8%] md:left-[-16%] md:top-[10%]"
          delay={0.2}
          gradient="from-[#22c5a5]/[0.14]"
          height={130}
          rotate={11}
          width={560}
          text="ai agent"
        />
        <ElegantShape
          className="right-[-28%] top-[8%] md:right-[-12%] md:top-[3%]"
          delay={0.35}
          gradient="from-[#0099ff]/[0.15]"
          height={150}
          rotate={-14}
          width={620}
          text="AGENTDESK"
        />
        <ElegantShape
          className="bottom-[2%] left-[18%] md:bottom-[4%] md:left-[32%]"
          delay={0.45}
          gradient="from-[#ff5530]/[0.12]"
          height={110}
          rotate={-8}
          width={430}
          text="grounded knowledge"
        />
        <ElegantShape
          className="right-[6%] top-[62%] hidden md:block"
          delay={0.55}
          gradient="from-[#f59e0b]/[0.14]"
          height={80}
          rotate={18}
          width={270}
          text="gemini 2.0"
        />
        <ElegantShape
          className="left-[18%] top-[2%] hidden lg:block"
          delay={0.65}
          gradient="from-[#1456f0]/[0.12]"
          height={54}
          rotate={-24}
          width={190}
          text="quick deployment"
        />
      </div>

      <div>
        {badge ? (
          <motion.div
            animate="visible"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--cream-border)] bg-[var(--cream-card)]/55 px-3 py-1.5 text-[#ff5530] shadow-[0_12px_40px_rgba(28,28,28,0.06)] backdrop-blur-md"
            custom={0}
            initial="hidden"
            variants={fadeUpVariants}
          >
            <Circle aria-hidden="true" className="h-2 w-2 fill-[#ff5530]" />
            <span className="font-mono text-xs font-semibold uppercase">{badge}</span>
          </motion.div>
        ) : null}

        <motion.div animate="visible" custom={1} initial="hidden" variants={fadeUpVariants}>
          <h1 className="editorial-display mt-2 max-w-5xl text-5xl sm:text-6xl md:text-7xl lg:text-[5.4rem] xl:text-[6rem] text-[#1c1c1c]">
            {title}
          </h1>
        </motion.div>

        {description ? (
          <motion.p
            animate="visible"
            className="mt-3 max-w-2xl font-[var(--font-inter)] text-base sm:text-lg lg:text-lg leading-relaxed tracking-[0.01em] text-[#5f5f5d]"
            custom={2}
            initial="hidden"
            variants={fadeUpVariants}
          >
            {description}
          </motion.p>
        ) : null}

        {actions ? (
          <motion.div animate="visible" className="mt-4 lg:mt-10 flex flex-col gap-3 sm:flex-row" custom={3} initial="hidden" variants={fadeUpVariants}>
            {actions}
          </motion.div>
        ) : null}
      </div>

      {sideContent ? (
        <motion.div animate="visible" custom={4} initial="hidden" variants={fadeUpVariants}>
          {sideContent}
        </motion.div>
      ) : null}
    </div>
  );
}
