"use client";

import { useWebChatConfig } from "@/context/WebChatConfigContext";
import { WebChatSwitch } from "./form-controls";

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
    </div>
  );
}
