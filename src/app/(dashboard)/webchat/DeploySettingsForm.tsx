"use client";

import { useWebChatConfig } from "@/context/WebChatConfigContext";
import { WebChatSelect, WebChatTextField } from "./form-controls";

export function DeploySettingsForm() {
  const { config, updateSection } = useWebChatConfig();
  const deploy = config.deploy;

  return (
    <div className="grid gap-4">
      <WebChatTextField
        label="Bot ID"
        readOnly
        value={deploy.botId || "Select a bot above"}
        onChange={() => undefined}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <WebChatSelect
          label="Environment"
          options={[
            { label: "Development", value: "development" },
            { label: "Staging", value: "staging" },
            { label: "Production", value: "production" },
          ]}
          value={deploy.environment}
          onChange={(environment) => updateSection("deploy", { environment })}
        />
        <WebChatSelect
          label="Rollout strategy"
          options={[
            { label: "Manual approval", value: "manual" },
            { label: "Canary release", value: "canary" },
            { label: "Progressive rollout", value: "progressive" },
            { label: "Full release", value: "full" },
          ]}
          value={deploy.rolloutStrategy}
          onChange={(rolloutStrategy) => updateSection("deploy", { rolloutStrategy })}
        />
      </div>
      <WebChatTextField
        label="Version tag"
        maxLength={40}
        placeholder="webchat-v1"
        value={deploy.versionTag}
        onChange={(versionTag) => updateSection("deploy", { versionTag })}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <WebChatTextField
          label="Agent ID"
          maxLength={120}
          placeholder="optional deployed agent id"
          value={deploy.agentId}
          onChange={(agentId) => updateSection("deploy", { agentId })}
        />
        <WebChatTextField
          label="Theme ID"
          maxLength={120}
          placeholder="optional theme id"
          value={deploy.themeId}
          onChange={(themeId) => updateSection("deploy", { themeId })}
        />
      </div>
    </div>
  );
}
