"use client";

import { useWebChatConfig } from "@/context/WebChatConfigContext";
import { WebChatColorField, WebChatSelect, WebChatTextarea } from "./form-controls";

export function BotAppearanceForm() {
  const { config, updateSection } = useWebChatConfig();
  const appearance = config.appearance;

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <WebChatColorField label="Header" value={appearance.headerColor} onChange={(headerColor) => updateSection("appearance", { headerColor })} />
        <WebChatColorField label="Background" value={appearance.backgroundColor} onChange={(backgroundColor) => updateSection("appearance", { backgroundColor })} />
        <WebChatColorField label="Text" value={appearance.textColor} onChange={(textColor) => updateSection("appearance", { textColor })} />
        <WebChatColorField label="Accent" value={appearance.accentColor} onChange={(accentColor) => updateSection("appearance", { accentColor })} />
        <WebChatColorField label="User bubble" value={appearance.userBubbleColor} onChange={(userBubbleColor) => updateSection("appearance", { userBubbleColor })} />
        <WebChatColorField label="Bot bubble" value={appearance.botBubbleColor} onChange={(botBubbleColor) => updateSection("appearance", { botBubbleColor })} />
      </div>
      <WebChatSelect
        label="Typography"
        options={[
          { label: "Fira Sans", value: "Fira" },
          { label: "Outfit", value: "Outfit" },
          { label: "System UI", value: "System" },
          { label: "Mono Console", value: "Mono" },
        ]}
        value={appearance.fontFamily}
        onChange={(fontFamily) => updateSection("appearance", { fontFamily })}
      />
      <WebChatTextarea
        label="Custom CSS"
        maxLength={2000}
        placeholder=".agentdesk-widget { border: 1px solid #ccff00; }"
        rows={6}
        value={appearance.customCss}
        onChange={(customCss) => updateSection("appearance", { customCss })}
      />
    </div>
  );
}
