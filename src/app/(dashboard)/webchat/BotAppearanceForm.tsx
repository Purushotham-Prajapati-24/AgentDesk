"use client";

import type React from "react";
import { useState } from "react";
import { useWebChatConfig } from "@/context/WebChatConfigContext";
import type { WebChatConfig } from "@/lib/webchat-config";
import { WebChatColorField, WebChatSelect, WebChatSwitch, WebChatTextarea, WebChatTextField } from "./form-controls";

const fontOptions: Array<{ label: string; value: WebChatConfig["appearance"]["fontFamily"] }> = [
  { label: "Fira Sans", value: "Fira" },
  { label: "Outfit", value: "Outfit" },
  { label: "System UI", value: "System" },
  { label: "Mono Console", value: "Mono" },
];

export function BotAppearanceForm() {
  const { config, updateSection } = useWebChatConfig();
  const appearance = config.appearance;
  const [launcherUrlAttention, setLauncherUrlAttention] = useState(false);

  return (
    <div className="grid gap-4">
      <AppearanceGroup title="Surface">
        <div className="grid gap-4 md:grid-cols-2">
          <WebChatColorField label="Widget background" value={appearance.backgroundColor} onChange={(backgroundColor) => updateSection("appearance", { backgroundColor })} />
          <WebChatColorField label="Body text" value={appearance.textColor} onChange={(textColor) => updateSection("appearance", { textColor })} />
          <WebChatColorField label="Accent" value={appearance.accentColor} onChange={(accentColor) => updateSection("appearance", { accentColor })} />
          <WebChatColorField label="User bubble" value={appearance.userBubbleColor} onChange={(userBubbleColor) => updateSection("appearance", { userBubbleColor })} />
          <WebChatColorField label="Bot bubble" value={appearance.botBubbleColor} onChange={(botBubbleColor) => updateSection("appearance", { botBubbleColor })} />
        </div>
        <WebChatSelect label="Widget typography" options={fontOptions} value={appearance.fontFamily} onChange={(fontFamily) => updateSection("appearance", { fontFamily })} />
      </AppearanceGroup>

      <AppearanceGroup title="Header">
        <div className="grid gap-4 md:grid-cols-2">
          <WebChatTextField
            label="Header title"
            maxLength={80}
            placeholder={config.identity.botName}
            value={appearance.headerTitle}
            onChange={(headerTitle) => updateSection("appearance", { headerTitle })}
          />
          <WebChatTextField
            label="Header subtitle"
            maxLength={100}
            placeholder="Online - responds instantly"
            value={appearance.headerSubtitle}
            onChange={(headerSubtitle) => updateSection("appearance", { headerSubtitle })}
          />
          <WebChatColorField label="Header background" value={appearance.headerColor} onChange={(headerColor) => updateSection("appearance", { headerColor })} />
          <WebChatColorField label="Header text" value={appearance.headerTextColor} onChange={(headerTextColor) => updateSection("appearance", { headerTextColor })} />
          <WebChatColorField label="Header subtext" value={appearance.headerSubtextColor} onChange={(headerSubtextColor) => updateSection("appearance", { headerSubtextColor })} />
          <WebChatColorField label="Close button" value={appearance.headerCloseButtonColor} onChange={(headerCloseButtonColor) => updateSection("appearance", { headerCloseButtonColor })} />
        </div>
        <WebChatSelect label="Header font" options={fontOptions} value={appearance.headerFontFamily} onChange={(headerFontFamily) => updateSection("appearance", { headerFontFamily })} />
      </AppearanceGroup>

      <AppearanceGroup title="Message box">
        <WebChatTextField
          label="Placeholder message"
          maxLength={120}
          placeholder="Write your message here..."
          value={appearance.inputPlaceholder}
          onChange={(inputPlaceholder) => updateSection("appearance", { inputPlaceholder })}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <WebChatColorField label="Input background" value={appearance.inputBackgroundColor} onChange={(inputBackgroundColor) => updateSection("appearance", { inputBackgroundColor })} />
          <WebChatColorField label="Input text" value={appearance.inputTextColor} onChange={(inputTextColor) => updateSection("appearance", { inputTextColor })} />
          <WebChatColorField label="Placeholder text" value={appearance.inputPlaceholderColor} onChange={(inputPlaceholderColor) => updateSection("appearance", { inputPlaceholderColor })} />
          <WebChatColorField label="Input border" value={appearance.inputBorderColor} onChange={(inputBorderColor) => updateSection("appearance", { inputBorderColor })} />
        </div>
        <WebChatSelect label="Input font" options={fontOptions} value={appearance.inputFontFamily} onChange={(inputFontFamily) => updateSection("appearance", { inputFontFamily })} />
      </AppearanceGroup>

      <AppearanceGroup title="Launcher">
        <WebChatSwitch
          checked={appearance.useCustomIcon}
          description="Show a custom image inside the closed floating launcher button."
          label="Use custom launcher icon"
          onChange={(useCustomIcon) => {
            updateSection("appearance", { useCustomIcon });
            if (useCustomIcon) {
              setLauncherUrlAttention(false);
            }
          }}
        />
        <WebChatTextField
          blocked={!appearance.useCustomIcon}
          helperText={
            appearance.useCustomIcon
              ? "Paste any hosted image URL for the launcher icon."
              : launcherUrlAttention
                ? "Needs attention: turn on custom launcher icon before adding a URL."
                : "Turn on custom launcher icon to edit this URL."
          }
          helperTone={!appearance.useCustomIcon && launcherUrlAttention ? "warning" : "muted"}
          label="Custom launcher icon URL"
          maxLength={500}
          onBlockedAttempt={() => setLauncherUrlAttention(true)}
          placeholder="https://example.com/support-icon.png"
          type="url"
          value={appearance.widgetIconUrl}
          onChange={(widgetIconUrl) => updateSection("appearance", { widgetIconUrl })}
        />
      </AppearanceGroup>
      <WebChatTextarea
        label="Custom CSS"
        maxLength={2000}
        placeholder=".agentdesk-widget { border: 1px solid #0099ff; }"
        rows={6}
        value={appearance.customCss}
        onChange={(customCss) => updateSection("appearance", { customCss })}
      />
    </div>
  );
}

function AppearanceGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-bg)] p-3 sm:p-4">
      <h3 className="studio-kicker text-[var(--ui-muted)]">{title}</h3>
      {children}
    </section>
  );
}
