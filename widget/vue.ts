type VueRuntime = {
  defineComponent: (options: unknown) => unknown;
  h: (tag: string, props?: Record<string, unknown>) => unknown;
  onBeforeUnmount: (callback: () => void) => void;
  onMounted: (callback: () => void) => void;
};

export function createAgentDeskVueComponent({ defineComponent, h, onBeforeUnmount, onMounted }: VueRuntime) {
  return defineComponent({
    name: "AgentDeskWidget",
    props: {
      botId: { type: String, required: true },
      configUrl: { type: String, default: "" },
      mode: { type: String, default: "launcher" },
      scriptSrc: { type: String, default: "/widget.js" },
    },
    setup(props: { botId: string; configUrl?: string; mode?: string; scriptSrc?: string }) {
      let script: HTMLScriptElement | null = null;

      onMounted(() => {
        if (!props.botId || document.querySelector(`script[data-agentdesk-vue="${props.botId}"]`)) {
          return;
        }

        script = document.createElement("script");
        script.src = props.scriptSrc ?? "/widget.js";
        script.async = true;
        script.dataset.agentdeskVue = props.botId;
        script.dataset.botId = props.botId;
        script.dataset.mode = props.mode ?? "launcher";
        if (props.configUrl) {
          script.dataset.configUrl = props.configUrl;
        }

        document.body.append(script);
      });

      onBeforeUnmount(() => {
        script?.remove();
        document.querySelectorAll("agentdesk-widget").forEach((element) => element.remove());
      });

      return () => h("span", { "data-agentdesk-vue-host": props.botId, hidden: true });
    },
  });
}
