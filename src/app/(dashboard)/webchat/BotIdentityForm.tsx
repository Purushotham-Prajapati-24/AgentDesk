"use client";

import { useWebChatConfig } from "@/context/WebChatConfigContext";
import { WebChatTextField, WebChatTextarea } from "./form-controls";

export function BotIdentityForm() {
  const { config, updateSection } = useWebChatConfig();
  const identity = config.identity;

  return (
    <div className="grid gap-4">
      <WebChatTextField
        label="Bot name"
        maxLength={80}
        placeholder="AgentDesk Support"
        value={identity.botName}
        onChange={(botName) => updateSection("identity", { botName })}
      />
      <WebChatTextField
        label="Avatar URL"
        maxLength={500}
        placeholder="https://cdn.example.com/avatar.png"
        type="url"
        value={identity.avatarUrl}
        onChange={(avatarUrl) => updateSection("identity", { avatarUrl })}
      />
      <WebChatTextarea
        label="Description"
        maxLength={220}
        placeholder="Describe what this bot does for customers."
        value={identity.description}
        onChange={(description) => updateSection("identity", { description })}
      />
    </div>
  );
}
