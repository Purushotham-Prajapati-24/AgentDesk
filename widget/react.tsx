import { useEffect } from "react";

export type AgentDeskWidgetProps = {
  botId: string;
  configUrl?: string;
  mode?: "launcher" | "inline";
  scriptSrc?: string;
};

export function AgentDeskWidget({ botId, configUrl, mode = "launcher", scriptSrc = "/widget.js" }: AgentDeskWidgetProps) {
  useEffect(() => {
    if (!botId || document.querySelector(`script[data-agentdesk-react="${botId}"]`)) {
      return;
    }

    const script = document.createElement("script");
    script.src = scriptSrc;
    script.async = true;
    script.dataset.agentdeskReact = botId;
    script.dataset.botId = botId;
    script.dataset.mode = mode;
    if (configUrl) {
      script.dataset.configUrl = configUrl;
    }

    document.body.append(script);

    return () => {
      script.remove();
      document.querySelectorAll("agentdesk-widget").forEach((element) => element.remove());
    };
  }, [botId, configUrl, mode, scriptSrc]);

  return null;
}
