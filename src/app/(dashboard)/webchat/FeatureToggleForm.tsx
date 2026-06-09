"use client";

import { useWebChatConfig } from "@/context/WebChatConfigContext";
import type { WebChatConfig } from "@/lib/webchat-config";
import { WebChatSelect, WebChatSwitch, WebChatTextField, WebChatTextarea } from "./form-controls";

type ProactiveCta = WebChatConfig["features"]["proactiveMessageCtas"][number];

const triggerOptions: Array<{ label: string; value: WebChatConfig["features"]["proactiveMessageTriggerType"] }> = [
  { label: "After page load", value: "delay" },
  { label: "After visitor idle", value: "idle" },
];

const frequencyOptions: Array<{ label: string; value: WebChatConfig["features"]["proactiveMessageFrequencyCap"] }> = [
  { label: "Session", value: "session" },
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Always", value: "always" },
];

const ctaActionOptions: Array<{ label: string; value: ProactiveCta["action"] }> = [
  { label: "Open chat", value: "open_chat" },
  { label: "Prefill message", value: "prefill_message" },
  { label: "Open URL", value: "open_url" },
];

export function FeatureToggleForm() {
  const { config, updateSection } = useWebChatConfig();
  const features = config.features;

  function updateNumber(key: "proactiveMessageDelay" | "proactiveMessageAutoclose" | "proactiveMessageIdleDelay", value: string) {
    const parsed = parseInt(value, 10);
    updateSection("features", { [key]: Number.isNaN(parsed) ? 0 : parsed });
  }

  function updateUrlRules(value: string) {
    updateSection("features", {
      proactiveMessageUrlRules: value
        .split(/\r?\n/)
        .map((rule) => rule.trim())
        .filter(Boolean)
        .slice(0, 20),
    });
  }

  function updateCta(index: number, patch: Partial<ProactiveCta>) {
    const current = features.proactiveMessageCtas[index] ?? {
      id: `cta-${index + 1}`,
      label: "",
      action: "open_chat" as const,
      value: "",
    };
    const next = [...features.proactiveMessageCtas];
    next[index] = { ...current, ...patch };
    updateSection("features", {
      proactiveMessageCtas: next.filter((cta) => cta.label.trim() || cta.value.trim()).slice(0, 3),
    });
  }

  return (
    <div className="grid gap-3">
      <WebChatSwitch
        checked={features.voice}
        description="Allow customers to speak prompts when the browser supports it."
        label="Voice input"
        onChange={(voice) => updateSection("features", { voice })}
      />
      <WebChatSwitch
        checked={features.transcriptExport}
        description="Expose an export transcript action for support audit trails."
        label="Transcript export"
        onChange={(transcriptExport) => updateSection("features", { transcriptExport })}
      />
      <WebChatSwitch
        checked={features.fileUploads}
        description="Allow customers to attach files inside the conversation."
        label="Customer uploads"
        onChange={(fileUploads) => updateSection("features", { fileUploads })}
      />
      <WebChatSwitch
        checked={features.humanHandoff}
        description="Keep live operator takeover available from support tooling."
        label="Human handoff"
        onChange={(humanHandoff) => updateSection("features", { humanHandoff })}
      />
      <WebChatSwitch
        checked={features.sourceCitations}
        description="Show source references when the agent answers from retrieved context."
        label="Source citations"
        onChange={(sourceCitations) => updateSection("features", { sourceCitations })}
      />
      <WebChatSwitch
        checked={features.proactiveMessage}
        description="Show a proactive greeting bubble above the launcher button."
        label="Proactive greeting"
        onChange={(proactiveMessage) => updateSection("features", { proactiveMessage })}
      />
      {features.proactiveMessage && (
        <div className="ml-4 mt-2 grid gap-4 border-l-2 border-[var(--ui-border)] pl-4">
          <WebChatTextField
            label="Greeting text"
            maxLength={300}
            placeholder="e.g. Hi! Need help?"
            value={features.proactiveMessageText}
            onChange={(proactiveMessageText) => updateSection("features", { proactiveMessageText })}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <WebChatSelect
              label="Trigger"
              options={triggerOptions}
              value={features.proactiveMessageTriggerType}
              onChange={(proactiveMessageTriggerType) => updateSection("features", { proactiveMessageTriggerType })}
            />
            <WebChatSelect
              label="Frequency cap"
              options={frequencyOptions}
              value={features.proactiveMessageFrequencyCap}
              onChange={(proactiveMessageFrequencyCap) => updateSection("features", { proactiveMessageFrequencyCap })}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {features.proactiveMessageTriggerType === "idle" ? (
              <WebChatTextField
                label="Idle delay (seconds)"
                placeholder="e.g. 20"
                type="text"
                value={String(features.proactiveMessageIdleDelay)}
                onChange={(value) => updateNumber("proactiveMessageIdleDelay", value)}
              />
            ) : (
              <WebChatTextField
                label="Display delay (seconds)"
                placeholder="e.g. 5"
                type="text"
                value={String(features.proactiveMessageDelay)}
                onChange={(value) => updateNumber("proactiveMessageDelay", value)}
              />
            )}
            <WebChatTextField
              label="Auto-close duration (seconds, 0 to disable)"
              placeholder="e.g. 10"
              type="text"
              value={String(features.proactiveMessageAutoclose)}
              onChange={(value) => updateNumber("proactiveMessageAutoclose", value)}
            />
          </div>
          <WebChatTextarea
            helperText="One rule per line. Use * for all pages, /pricing/* for descendants, and !/checkout to exclude."
            label="URL targeting rules"
            rows={4}
            value={features.proactiveMessageUrlRules.join("\n")}
            onChange={updateUrlRules}
          />
          <WebChatTextField
            helperText="Used for A/B test reporting and frequency-cap resets."
            label="Variant ID"
            maxLength={60}
            placeholder="default"
            value={features.proactiveMessageVariantId}
            onChange={(proactiveMessageVariantId) => updateSection("features", { proactiveMessageVariantId })}
          />
          <div className="grid gap-3">
            <span className="studio-kicker text-[var(--ui-muted)]">Quick actions</span>
            {[0, 1, 2].map((index) => {
              const cta = features.proactiveMessageCtas[index] ?? {
                id: `cta-${index + 1}`,
                label: "",
                action: "open_chat" as const,
                value: "",
              };
              return (
                <div className="grid gap-3 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-panel)] p-3" key={cta.id}>
                  <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
                    <WebChatTextField
                      label={`CTA ${index + 1} label`}
                      maxLength={40}
                      placeholder={index === 0 ? "Talk to support" : "Optional"}
                      value={cta.label}
                      onChange={(label) => updateCta(index, { id: cta.id, label })}
                    />
                    <WebChatSelect
                      label="Action"
                      options={ctaActionOptions}
                      value={cta.action}
                      onChange={(action) => updateCta(index, { id: cta.id, action })}
                    />
                  </div>
                  {cta.action !== "open_chat" ? (
                    <WebChatTextField
                      label={cta.action === "open_url" ? "URL" : "Prefill message"}
                      placeholder={cta.action === "open_url" ? "https://example.com/pricing" : "I need help with my order."}
                      type={cta.action === "open_url" ? "url" : "text"}
                      value={cta.value}
                      onChange={(value) => updateCta(index, { id: cta.id, value })}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
          <WebChatSwitch
            checked={features.proactiveMessageShowOnce}
            description="Legacy session-only suppression. Frequency cap controls the richer visitor cooldown."
            label="Show once per session"
            onChange={(proactiveMessageShowOnce) => updateSection("features", { proactiveMessageShowOnce })}
          />
          <WebChatSwitch
            checked={features.proactiveMessageSound}
            description="Play a subtle notification chime when the bubble appears."
            label="Sound notification"
            onChange={(proactiveMessageSound) => updateSection("features", { proactiveMessageSound })}
          />
        </div>
      )}
    </div>
  );
}
