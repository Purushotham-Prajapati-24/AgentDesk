"use client";

import { useWebChatConfig } from "@/context/WebChatConfigContext";
import { WebChatSwitch, WebChatTextField } from "./form-controls";

export function FeatureToggleForm() {
  const { config, updateSection } = useWebChatConfig();
  const features = config.features;

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
        description="Show a proactive greeting bubble above the launcher button after a delay."
        label="Proactive greeting"
        onChange={(proactiveMessage) => updateSection("features", { proactiveMessage })}
      />
      {features.proactiveMessage && (
        <div className="grid gap-4 border-l-2 border-[var(--ui-border)] pl-4 ml-4 mt-2">
          <WebChatTextField
            label="Greeting text"
            value={features.proactiveMessageText}
            onChange={(proactiveMessageText) => updateSection("features", { proactiveMessageText })}
            placeholder="e.g. Hi! 👋 Need help?"
            maxLength={150}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <WebChatTextField
              label="Display delay (seconds)"
              value={String(features.proactiveMessageDelay)}
              onChange={(value) => {
                const parsed = parseInt(value, 10);
                updateSection("features", { proactiveMessageDelay: isNaN(parsed) ? 0 : parsed });
              }}
              placeholder="e.g. 5"
              type="text"
            />
            <WebChatTextField
              label="Auto-close duration (seconds, 0 to disable)"
              value={String(features.proactiveMessageAutoclose)}
              onChange={(value) => {
                const parsed = parseInt(value, 10);
                updateSection("features", { proactiveMessageAutoclose: isNaN(parsed) ? 0 : parsed });
              }}
              placeholder="e.g. 10"
              type="text"
            />
          </div>
          <WebChatSwitch
            checked={features.proactiveMessageShowOnce}
            description="Only show once per visitor session to avoid repetitive popups."
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
