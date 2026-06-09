(() => {
  type Sender = "bot" | "user";

  type WidgetTheme = {
    headerHsl: string;
    headerTextHsl: string;
    headerSubtextHsl: string;
    headerCloseButtonHsl: string;
    headerFontFamily: string;
    backgroundHsl: string;
    textHsl: string;
    mutedTextHsl: string;
    userBubbleHsl: string;
    botBubbleHsl: string;
    accentHsl: string;
    fontFamily: string;
    inputBackgroundHsl: string;
    inputTextHsl: string;
    inputPlaceholderHsl: string;
    inputBorderHsl: string;
    inputFontFamily: string;
  };

  type WidgetConfig = {
    botId: string;
    tenantId: string;
    botName: string;
    headerTitle: string;
    headerSubtitle: string;
    greeting: string;
    fallbackMessage: string;
    logoUrl: string | null;
    useCustomIcon: boolean;
    widgetIconUrl: string | null;
    bannerText: string;
    inputPlaceholder: string;
    messageEndpoint: string;
    websocketEndpoint: string | null;
    theme: WidgetTheme;
    proactiveMessage: boolean;
    proactiveMessageText: string;
    proactiveMessageDelay: number;
    proactiveMessageShowOnce: boolean;
    proactiveMessageSound: boolean;
    proactiveMessageAutoclose: number;
    proactiveMessageTriggerType: "delay" | "idle";
    proactiveMessageIdleDelay: number;
    proactiveMessageUrlRules: string[];
    proactiveMessageFrequencyCap: "session" | "daily" | "weekly" | "always";
    proactiveMessageCtas: ProactiveMessageCta[];
    proactiveMessageVariantId: string;
  };

  type ProactiveMessageCta = {
    id: string;
    label: string;
    action: "open_chat" | "prefill_message" | "open_url";
    value: string;
  };

  type ChatMessage = {
    id: string;
    sender: Sender;
    content: string;
  };

  const STORAGE_VERSION = "v1";
  const DEFAULT_TIMEOUT_MS = 12000;
  const MAX_MESSAGE_LENGTH = 1200;

  const currentScript = (
    document.currentScript || 
    document.querySelector('script[data-bot-id]') || 
    document.querySelector('script[src*="widget.js"]')
  ) as HTMLScriptElement | null;
  const scriptUrl = currentScript?.src ? new URL(currentScript.src, window.location.href) : null;
  const scriptOrigin = scriptUrl?.origin ?? window.location.origin;
  
  let botId = currentScript?.dataset.botId?.trim() ?? "";
  let embedMode = currentScript?.dataset.mode === "inline" ? "inline" : "launcher";

  // Fallback for Next.js / React 19 script hoisting on the embed page
  if (!botId && window.location.pathname.startsWith("/embed/")) {
    const segments = window.location.pathname.split("/");
    const lastSegment = segments[segments.length - 1];
    if (lastSegment && /^[a-zA-Z0-9_-]{3,80}$/.test(lastSegment)) {
      botId = lastSegment;
      embedMode = "inline";
    }
  }

  const configUrl = currentScript?.dataset.configUrl?.trim() || `${scriptOrigin}/api/widget/config/${encodeURIComponent(botId)}`;

  if (!botId) {
    return;
  }

  // Derived storage key — declared here so botId is guaranteed to be initialized.
  const MESSAGES_KEY = `agentdesk:messages:${STORAGE_VERSION}:${botId}`;

  type SocketInstance = {
    connected: boolean;
    emit: (event: string, payload: { message_id: string; content: string }) => void;
    on: (event: string, callback: (payload: { message_id: string; content: string }) => void) => void;
  };

  class AgentDeskWidget extends HTMLElement {
    private readonly shadowRootRef: ShadowRoot;
    private config: WidgetConfig | null = null;
    private messages: ChatMessage[] = [];
    private isOpen = embedMode === "inline";
    private isSending = false;
    private sessionToken = getSessionToken(botId);
    private socket: SocketInstance | null = null;
    private messageListRef: HTMLDivElement | null = null;
    private typingRowRef: HTMLDivElement | null = null;
    private composerInputRef: HTMLTextAreaElement | null = null;
    private sendButtonRef: HTMLButtonElement | null = null;
    private quickActionButtons: HTMLButtonElement[] = [];
    private proactiveTimer: number | null = null;
    private proactiveAutocloseTimer: number | null = null;
    private proactiveBubbleRef: HTMLDivElement | null = null;
    private proactiveIdleListeners: Array<() => void> = [];

    constructor() {
      super();
      this.shadowRootRef = this.attachShadow({ mode: "open" });
    }

    connectedCallback() {
      this.renderShell();
      void this.loadConfig();
    }

    toggle() {
      this.isOpen = !this.isOpen;
      if (this.isOpen) {
        this.hideProactiveBubble(true);
      }
      this.renderShell();
    }

    private async loadConfig() {
      try {
        const response = await fetchWithTimeout(configUrl, { credentials: "omit" }, DEFAULT_TIMEOUT_MS);
        if (!response.ok) {
          throw new Error("Widget configuration failed");
        }

        const body = (await response.json()) as { data?: WidgetConfig };
        if (!body.data || body.data.botId !== botId) {
          throw new Error("Widget configuration mismatch");
        }

      this.config = normalizeConfig(body.data);
      } catch {
        this.config = buildFallbackConfig(botId);
      }

      // Restore any persisted messages from a previous mount.
      // Only fall back to the greeting if there is no prior history.
      const persisted = loadMessages();
      if (persisted.length > 0) {
        this.messages = persisted;
      } else {
        this.messages = [
          {
            id: createId(),
            sender: "bot",
            content: this.config.greeting,
          },
        ];
        saveMessages(this.messages);
      }
      this.renderShell();
      this.initSocket(this.config);
      this.startProactiveMessage();
    }

    private initSocket(this: AgentDeskWidget, config: WidgetConfig) {
      if (this.socket) {
        return;
      }

      const scriptUrl = "https://cdn.socket.io/4.7.5/socket.io.min.js";
      if (!document.querySelector(`script[src="${scriptUrl}"]`)) {
        const script = document.createElement("script");
        script.src = scriptUrl;
        script.onload = () => void this.connectSocket(config);
        document.head.appendChild(script);
      } else {
        const checkInterval = window.setInterval(() => {
          const windowRef = window as unknown as {
            io?: (url: string, options?: unknown) => SocketInstance;
          };
          if (typeof windowRef.io !== "undefined") {
            window.clearInterval(checkInterval);
            void this.connectSocket(config);
          }
        }, 100);
      }
    }

    private async connectSocket(this: AgentDeskWidget, config: WidgetConfig) {
      const windowRef = window as unknown as {
        io?: (url: string, options?: unknown) => SocketInstance;
      };

      const wsUrl = normalizeWebSocketEndpoint(config.websocketEndpoint);
      if (!wsUrl) {
        return;
      }

      const isHealthy = await checkLiveHandoffHealth(wsUrl);
      if (!isHealthy) {
        return;
      }

      const namespace = `${wsUrl.replace(/\/$/, "")}/tenant-${config.tenantId}`;

      try {
        if (!windowRef.io) {
          return;
        }

        const socket = windowRef.io(namespace, {
          auth: {
            tenant_id: config.tenantId,
            session_id: this.sessionToken,
          },
        });

        this.socket = socket;

        if (socket) {
          socket.on("agent-message", (message: { message_id: string; content: string }) => {
            const chatMessage: ChatMessage = {
              id: message.message_id,
              sender: "bot",
              content: message.content,
            };
            this.messages.push(chatMessage);
            saveMessages(this.messages);
            this.appendMessageRow(chatMessage);
          });
        }
      } catch (err) {
        console.error("Failed to connect to live handoff socket:", err);
      }
    }

    private renderShell() {
      const config = this.config ?? buildFallbackConfig(botId);
      this.messageListRef = null;
      this.typingRowRef = null;
      this.composerInputRef = null;
      this.sendButtonRef = null;
      this.quickActionButtons = [];
      this.shadowRootRef.replaceChildren(createStyles(config.theme), this.createWidget(config));
    }

    private createWidget(config: WidgetConfig) {
      const wrapper = createElement("section", `ad-widget ${embedMode}`);
      const pane = createElement("div", `ad-chat-pane${this.isOpen || embedMode === "inline" ? " active" : ""}`);
      pane.setAttribute("aria-live", "polite");

      pane.append(this.createHeader(config), this.createMessageList(), this.createQuickActions(), this.createForm(config));

      if (embedMode === "inline") {
        wrapper.append(pane);
        return wrapper;
      }

      const launcher = createElement("button", "ad-launcher-button");
      launcher.type = "button";
      launcher.setAttribute("aria-label", this.isOpen ? "Close support chat" : "Open support chat");
      if (this.isOpen) {
        launcher.textContent = "×";
      } else if (config.useCustomIcon && config.widgetIconUrl) {
        const image = document.createElement("img");
        image.src = config.widgetIconUrl;
        image.alt = "";
        launcher.append(image);
      } else {
        launcher.textContent = "✦";
      }
      launcher.addEventListener("click", () => {
        this.isOpen = !this.isOpen;
        if (this.isOpen) {
          this.hideProactiveBubble(true);
        }
        this.renderShell();
      });

      const proactiveBubble = this.createProactiveBubble(config);
      wrapper.append(pane, launcher, proactiveBubble);
      return wrapper;
    }

    private createHeader(config: WidgetConfig) {
      const header = createElement("header", "ad-header");
      const identity = createElement("div", "ad-identity");
      const avatar = createElement("div", "ad-avatar");

      if (config.logoUrl) {
        const image = document.createElement("img");
        image.src = config.logoUrl;
        image.alt = "";
        avatar.append(image);
      } else {
        avatar.textContent = config.botName.charAt(0).toUpperCase();
      }

      const copy = createElement("div", "ad-title-wrap");
      const title = createElement("strong", "ad-title");
      title.textContent = config.headerTitle || config.botName;
      const status = createElement("span", "ad-status");
      status.textContent = config.headerSubtitle || config.bannerText;
      copy.append(title, status);

      identity.append(avatar, copy);
      header.append(identity);

      if (embedMode !== "inline") {
        const close = createElement("button", "ad-icon-button");
        close.type = "button";
        close.setAttribute("aria-label", "Close support chat");
        close.textContent = "×";
        close.addEventListener("click", () => {
          this.isOpen = false;
          this.renderShell();
          try {
            window.parent.postMessage({ type: "agentdesk-widget-close", botId }, "*");
          } catch {
            // ignore
          }
        });
        header.append(close);
      }

      return header;
    }

    private createMessageList() {
      const list = createElement("div", "ad-messages");
      this.messageListRef = list;
      for (const message of this.messages) {
        list.append(this.createMessageRow(message));
      }

      if (this.isSending) {
        this.appendTypingIndicator(list);
      }

      queueMicrotask(() => {
        list.scrollTop = list.scrollHeight;
      });

      return list;
    }

    private createMessageRow(message: ChatMessage) {
      const row = createElement("div", `ad-message-row ${message.sender}`);
      row.dataset.messageId = message.id;
      const bubble = createElement("div", `ad-message ${message.sender}`);
      appendMarkdown(bubble, message.content);
      row.append(bubble);
      return row;
    }

    private appendMessageRow(message: ChatMessage) {
      if (!this.messageListRef) {
        this.renderShell();
        return null;
      }

      const row = this.createMessageRow(message);
      this.messageListRef.append(row);
      this.scrollMessagesToBottom();
      return row;
    }

    private updateMessageRow(message: ChatMessage, row: HTMLDivElement | null) {
      const targetRow =
        row ??
        [...(this.messageListRef?.querySelectorAll<HTMLDivElement>("[data-message-id]") ?? [])].find((item) => item.dataset.messageId === message.id) ??
        null;
      const bubble = targetRow?.querySelector<HTMLDivElement>(".ad-message");
      if (!bubble) {
        return;
      }

      bubble.replaceChildren();
      appendMarkdown(bubble, message.content);
      this.scrollMessagesToBottom();
    }

    private appendTypingIndicator(list = this.messageListRef) {
      if (!list || this.typingRowRef) {
        return;
      }

      const row = createElement("div", "ad-message-row bot");
      row.dataset.typing = "true";
      const typing = createElement("div", "ad-message bot ad-typing");
      for (let index = 0; index < 3; index += 1) {
        typing.append(createElement("span", "ad-typing-dot"));
      }
      row.append(typing);
      list.append(row);
      this.typingRowRef = row;
      this.scrollMessagesToBottom();
    }

    private removeTypingIndicator() {
      if (this.typingRowRef) {
        this.typingRowRef.remove();
      }
      this.typingRowRef = null;
    }

    private setSendingState(isSending: boolean) {
      this.isSending = isSending;
      if (this.composerInputRef) {
        this.composerInputRef.toggleAttribute("disabled", isSending);
      }
      if (this.sendButtonRef) {
        this.sendButtonRef.disabled = isSending;
      }
      for (const button of this.quickActionButtons) {
        button.disabled = isSending;
      }

      if (isSending) {
        this.appendTypingIndicator();
      } else {
        this.removeTypingIndicator();
      }
    }

    private scrollMessagesToBottom() {
      const list = this.messageListRef;
      if (!list) {
        return;
      }

      queueMicrotask(() => {
        list.scrollTop = list.scrollHeight;
      });
    }

    private createQuickActions() {
      const actions = createElement("div", "ad-actions");
      this.quickActionButtons = [];
      for (const label of ["Track order", "Return policy", "Talk to support"]) {
        const button = createElement("button", "ad-action");
        button.type = "button";
        button.textContent = label;
        button.disabled = this.isSending;
        button.addEventListener("click", () => void this.sendMessage(label));
        this.quickActionButtons.push(button);
        actions.append(button);
      }
      return actions;
    }

    private createForm(config: WidgetConfig) {
      const form = createElement("form", "ad-form");
      const input = document.createElement("textarea");
      input.className = "ad-input";
      input.name = "message";
      input.placeholder = config.inputPlaceholder || "Write your message here...";
      input.maxLength = MAX_MESSAGE_LENGTH;
      input.rows = 1;
      input.disabled = this.isSending;
      this.composerInputRef = input;

      input.addEventListener("keydown", (event) => {
        // Keep host-page shortcut listeners from cancelling text entry inside the Shadow DOM.
        event.stopPropagation();
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          form.requestSubmit();
        }
      });

      const send = createElement("button", "ad-send");
      send.type = "submit";
      send.disabled = this.isSending;
      send.textContent = "Send";
      this.sendButtonRef = send;

      const footer = createElement("p", "ad-footer");
      footer.textContent = "Powered by AgentDesk";

      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const text = input.value.trim();
        if (!text) {
          return;
        }
        input.value = "";
        void this.sendMessage(text, config);
      });

      const wrap = createElement("div", "ad-composer");
      wrap.append(input, send);
      form.append(wrap, footer);
      return form;
    }

    private async sendMessage(text: string, explicitConfig?: WidgetConfig) {
      if (this.isSending) {
        return;
      }

      const config = explicitConfig ?? this.config ?? buildFallbackConfig(botId);
      const content = text.slice(0, MAX_MESSAGE_LENGTH);
      const userMessage: ChatMessage = { id: createId(), sender: "user", content };
      this.messages.push(userMessage);
      saveMessages(this.messages);
      this.appendMessageRow(userMessage);
      this.setSendingState(true);

      // Emit over WebSocket for real-time live agent view
      if (this.socket && this.socket.connected) {
        try {
          this.socket.emit("customer-message", {
            message_id: createId(),
            content,
          });
        } catch (err) {
          console.error("Failed to emit customer message over socket:", err);
        }
      }

      try {
        const responseText = await requestBotReply(config, this.sessionToken, content);
        if (responseText) {
          await this.typeBotMessage(responseText);
        }
      } catch {
        await this.typeBotMessage(config.fallbackMessage);
      } finally {
        this.setSendingState(false);
      }
    }

    private async typeBotMessage(content: string) {
      this.removeTypingIndicator();
      const message: ChatMessage = { id: createId(), sender: "bot", content: "" };
      this.messages.push(message);
      const row = this.appendMessageRow(message);
      const chars = Array.from(content);

      for (let index = 0; index < chars.length; index += 1) {
        message.content += chars[index];
        if (index % 3 === 0 || index === chars.length - 1) {
          saveMessages(this.messages);
          this.updateMessageRow(message, row);
          await delay(12);
        }
      }
    }

    private startProactiveMessage() {
      if (this.proactiveTimer) window.clearTimeout(this.proactiveTimer);
      if (this.proactiveAutocloseTimer) window.clearTimeout(this.proactiveAutocloseTimer);
      this.stopProactiveIdleTracking();

      const config = this.config;
      if (!config || !this.canShowProactiveBubble(config)) {
        return;
      }

      if (config.proactiveMessageTriggerType === "idle") {
        this.startProactiveIdleTracking(config);
        return;
      }

      const delayMs = (config.proactiveMessageDelay || 5) * 1000;
      this.proactiveTimer = window.setTimeout(() => {
        if (!this.canShowProactiveBubble(config)) return;
        this.showProactiveBubble("delay");
      }, delayMs);
    }

    private showProactiveBubble(trigger: "delay" | "idle") {
      if (!this.proactiveBubbleRef) return;
      this.proactiveBubbleRef.classList.add("active");
      this.trackProactiveEvent("proactive_shown", { trigger });

      if (this.config?.proactiveMessageSound) {
        this.playProactiveSound();
      }

      const autocloseSec = this.config?.proactiveMessageAutoclose || 0;
      if (autocloseSec > 0) {
        this.proactiveAutocloseTimer = window.setTimeout(() => {
          this.hideProactiveBubble();
        }, autocloseSec * 1000);
      }
    }

    private hideProactiveBubble(dismiss = false, eventName: "proactive_dismissed" | "proactive_opened_chat" | "proactive_cta_clicked" = "proactive_dismissed") {
      if (this.proactiveBubbleRef) {
        this.proactiveBubbleRef.classList.remove("active");
      }
      if (this.proactiveAutocloseTimer) {
        window.clearTimeout(this.proactiveAutocloseTimer);
        this.proactiveAutocloseTimer = null;
      }
      if (dismiss && this.config) {
        this.storeProactiveSuppression(this.config);
        this.trackProactiveEvent(eventName);
      }
    }

    private canShowProactiveBubble(config: WidgetConfig) {
      if (!config.proactiveMessage || embedMode === "inline" || this.isOpen) {
        return false;
      }

      if (!matchesUrlRules(config.proactiveMessageUrlRules, window.location.pathname)) {
        return false;
      }

      if (config.proactiveMessageShowOnce && window.sessionStorage.getItem(legacyProactiveKey(config)) === "true") {
        return false;
      }

      return !isProactiveSuppressed(config);
    }

    private startProactiveIdleTracking(config: WidgetConfig) {
      const resetIdleTimer = () => {
        if (this.proactiveTimer) window.clearTimeout(this.proactiveTimer);
        this.proactiveTimer = window.setTimeout(() => {
          if (!this.canShowProactiveBubble(config)) return;
          this.stopProactiveIdleTracking();
          this.showProactiveBubble("idle");
        }, (config.proactiveMessageIdleDelay || 20) * 1000);
      };

      for (const eventName of ["mousemove", "keydown", "scroll", "touchstart", "click"] as const) {
        window.addEventListener(eventName, resetIdleTimer, { passive: true });
        this.proactiveIdleListeners.push(() => window.removeEventListener(eventName, resetIdleTimer));
      }

      resetIdleTimer();
    }

    private stopProactiveIdleTracking() {
      for (const removeListener of this.proactiveIdleListeners) {
        removeListener();
      }
      this.proactiveIdleListeners = [];
    }

    private storeProactiveSuppression(config: WidgetConfig) {
      try {
        window.sessionStorage.setItem(legacyProactiveKey(config), "true");
        if (config.proactiveMessageFrequencyCap === "always") {
          return;
        }

        const expiresAt = proactiveSuppressionExpiry(config.proactiveMessageFrequencyCap);
        const value = JSON.stringify({ expiresAt });
        const key = proactiveSuppressionKey(config);
        if (config.proactiveMessageFrequencyCap === "session") {
          window.sessionStorage.setItem(key, value);
        } else {
          window.localStorage.setItem(key, value);
        }
      } catch {
        // Storage access can fail in restricted browser contexts.
      }
    }

    private trackProactiveEvent(eventName: "proactive_shown" | "proactive_dismissed" | "proactive_opened_chat" | "proactive_cta_clicked", metadata: Record<string, string> = {}) {
      const config = this.config;
      if (!config) {
        return;
      }

      emitWidgetEvent(config, this.sessionToken, {
        eventName,
        variantId: config.proactiveMessageVariantId,
        metadata,
      });
    }

    private openChatFromProactive(eventName: "proactive_opened_chat" | "proactive_cta_clicked", prefill = "") {
      this.isOpen = true;
      this.hideProactiveBubble(true, eventName);
      this.renderShell();
      if (prefill) {
        queueMicrotask(() => {
          if (this.composerInputRef) {
            this.composerInputRef.value = prefill.slice(0, MAX_MESSAGE_LENGTH);
            this.composerInputRef.focus();
          }
        });
      }
    }

    private handleProactiveCta(cta: ProactiveMessageCta) {
      if (cta.action === "open_url") {
        const url = normalizeHttpUrl(cta.value);
        if (url) {
          window.open(url, "_blank", "noopener,noreferrer");
        }
        this.hideProactiveBubble(true, "proactive_cta_clicked");
        return;
      }

      this.openChatFromProactive("proactive_cta_clicked", cta.action === "prefill_message" ? cta.value : "");
    }

    private createProactiveBubble(config: WidgetConfig) {
      const bubble = createElement("div", "ad-proactive-bubble");
      this.proactiveBubbleRef = bubble;
      bubble.tabIndex = 0;
      bubble.setAttribute("role", "button");
      bubble.setAttribute("aria-label", "Open support chat");

      const closeBtn = createElement("button", "ad-proactive-close");
      closeBtn.type = "button";
      closeBtn.setAttribute("aria-label", "Dismiss greeting");
      closeBtn.textContent = "×";
      closeBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        this.hideProactiveBubble(true);
      });

      const body = createElement("div", "ad-proactive-body");
      const text = createElement("p", "ad-proactive-text");
      text.textContent = config.proactiveMessageText;
      const meta = createElement("p", "ad-proactive-meta");
      meta.textContent = `${config.botName} · a few moments ago`;

      body.append(text, meta);
      if (config.proactiveMessageCtas.length > 0) {
        const actions = createElement("div", "ad-proactive-actions");
        for (const cta of config.proactiveMessageCtas) {
          const button = createElement("button", "ad-proactive-action");
          button.type = "button";
          button.textContent = cta.label;
          button.addEventListener("click", (event) => {
            event.stopPropagation();
            this.handleProactiveCta(cta);
          });
          actions.append(button);
        }
        body.append(actions);
      }
      bubble.append(closeBtn, body);

      bubble.addEventListener("click", () => {
        this.openChatFromProactive("proactive_opened_chat");
      });
      bubble.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          this.openChatFromProactive("proactive_opened_chat");
        }
      });

      return bubble;
    }

    private playProactiveSound() {
      try {
        const windowRef = window as unknown as {
          AudioContext?: typeof AudioContext;
          webkitAudioContext?: typeof AudioContext;
        };
        const AudioCtx = windowRef.AudioContext || windowRef.webkitAudioContext;
        if (!AudioCtx) return;
        const audioContext = new AudioCtx();
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);

        osc.type = "sine";
        osc.frequency.setValueAtTime(587.33, audioContext.currentTime); // D5
        gain.gain.setValueAtTime(0.08, audioContext.currentTime);
        osc.start();

        osc.frequency.setValueAtTime(880, audioContext.currentTime + 0.1); // A5
        gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.35);
        osc.stop(audioContext.currentTime + 0.35);
      } catch (e) {
        console.warn("Audio Context playback failed", e);
      }
    }
  }

  async function requestBotReply(config: WidgetConfig, sessionToken: string, message: string) {
    const endpoint = new URL(config.messageEndpoint, scriptOrigin).toString();
    const response = await fetchWithTimeout(
      endpoint,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream, application/json" },
        body: JSON.stringify({
          bot_id: config.botId,
          tenant_id: config.tenantId,
          session_token: sessionToken,
          message,
        }),
      },
      DEFAULT_TIMEOUT_MS,
    );

    if (!response.ok) {
      throw new Error("Message request failed");
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("text/event-stream") && response.body) {
      return readEventStream(response.body);
    }

    const body = (await response.json()) as { data?: { message?: string }; message?: string };
    return body.data?.message ?? body.message ?? "";
  }

  async function readEventStream(body: ReadableStream<Uint8Array>) {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let result = "";

    while (true) {
      const chunk = await reader.read();
      if (chunk.done) {
        break;
      }

      const text = decoder.decode(chunk.value, { stream: true });
      for (const line of text.split("\n")) {
        if (!line.startsWith("data:")) {
          continue;
        }
        const payload = line.slice(5).trim();
        if (payload && payload !== "[DONE]") {
          result += parseStreamPayload(payload);
        }
      }
    }

    return result;
  }

  function parseStreamPayload(payload: string) {
    try {
      const data = JSON.parse(payload) as { token?: string; content?: string; message?: string };
      return data.token ?? data.content ?? data.message ?? "";
    } catch {
      return payload;
    }
  }

  type MarkdownBlock =
    | { kind: "paragraph"; text: string }
    | { kind: "heading"; level: 1 | 2 | 3; text: string }
    | { kind: "list"; ordered: boolean; items: string[] };

  type InlineMarkdownToken =
    | { kind: "strong"; text: string }
    | { kind: "emphasis"; text: string }
    | { kind: "code"; text: string }
    | { kind: "link"; text: string; href: string };

  type PendingMarkdownList = {
    kind: "ul" | "ol";
    items: string[];
  };

  function appendMarkdown(target: HTMLElement, text: string) {
    for (const block of parseMarkdownBlocks(text)) {
      appendMarkdownBlock(target, block);
    }
  }

  function parseMarkdownBlocks(text: string): MarkdownBlock[] {
    const blocks: MarkdownBlock[] = [];
    const lines = text.replace(/\r\n?/g, "\n").split("\n");
    const paragraphLines: string[] = [];
    let pendingList: PendingMarkdownList | null = null;

    const flushParagraph = () => {
      const paragraph = paragraphLines.join(" ").trim();
      paragraphLines.length = 0;
      if (paragraph) {
        blocks.push({ kind: "paragraph", text: paragraph });
      }
    };

    const flushList = () => {
      if (pendingList?.items.length) {
        blocks.push({ kind: "list", ordered: pendingList.kind === "ol", items: pendingList.items });
      }
      pendingList = null;
    };

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed) {
        flushParagraph();
        flushList();
        continue;
      }

      const headingMatch = /^(#{1,3})\s+(.+)$/.exec(trimmed);
      if (headingMatch) {
        flushParagraph();
        flushList();
        blocks.push({ kind: "heading", level: headingMatch[1].length as 1 | 2 | 3, text: headingMatch[2].trim() });
        continue;
      }

      const unorderedMatch = /^[-*]\s+(.+)$/.exec(trimmed);
      const orderedMatch = /^\d+[.)]\s+(.+)$/.exec(trimmed);
      const listMatch = unorderedMatch ?? orderedMatch;
      if (listMatch) {
        flushParagraph();
        const listKind = orderedMatch ? "ol" : "ul";
        if (!pendingList || pendingList.kind !== listKind) {
          flushList();
          pendingList = { kind: listKind, items: [] };
        }
        pendingList.items.push(listMatch[1].trim());
        continue;
      }

      if (pendingList) {
        const itemIndex = pendingList.items.length - 1;
        if (itemIndex >= 0) {
          pendingList.items[itemIndex] = `${pendingList.items[itemIndex]} ${trimmed}`;
          continue;
        }
      }

      paragraphLines.push(trimmed);
    }

    flushParagraph();
    flushList();

    return blocks;
  }

  function appendMarkdownBlock(target: HTMLElement, block: MarkdownBlock) {
    if (block.kind === "heading") {
      const heading = document.createElement(`h${block.level}` as "h1" | "h2" | "h3");
      heading.className = `ad-heading ad-heading-${block.level}`;
      appendInlineMarkdown(heading, block.text);
      target.append(heading);
      return;
    }

    if (block.kind === "list") {
      const list = document.createElement(block.ordered ? "ol" : "ul");
      list.className = block.ordered ? "ad-list-ol" : "ad-list-ul";
      for (const item of block.items) {
        const listItem = document.createElement("li");
        listItem.className = "ad-list-item";
        appendInlineMarkdown(listItem, item);
        list.append(listItem);
      }
      target.append(list);
      return;
    }

    const paragraph = createElement("p", "ad-paragraph");
    appendInlineMarkdown(paragraph, block.text);
    target.append(paragraph);
  }

  function appendInlineMarkdown(target: HTMLElement, text: string) {
    let cursor = 0;
    let textBuffer = "";

    const flushText = () => {
      if (textBuffer) {
        target.append(document.createTextNode(textBuffer));
        textBuffer = "";
      }
    };

    while (cursor < text.length) {
      const code = readDelimitedToken(text, cursor, "`", "`");
      if (code) {
        flushText();
        target.append(formatMarkdownToken({ kind: "code", text: code.text }));
        cursor = code.end;
        continue;
      }

      const markdownLink = readMarkdownLink(text, cursor);
      if (markdownLink) {
        flushText();
        target.append(formatMarkdownToken({ kind: "link", text: markdownLink.text, href: markdownLink.href }));
        cursor = markdownLink.end;
        continue;
      }

      const strong = readDelimitedToken(text, cursor, "**", "**");
      if (strong) {
        flushText();
        target.append(formatMarkdownToken({ kind: "strong", text: strong.text }));
        cursor = strong.end;
        continue;
      }

      const emphasis = text.startsWith("*", cursor) && !text.startsWith("**", cursor) ? readDelimitedToken(text, cursor, "*", "*") : null;
      if (emphasis) {
        flushText();
        target.append(formatMarkdownToken({ kind: "emphasis", text: emphasis.text }));
        cursor = emphasis.end;
        continue;
      }

      const rawUrl = readRawUrl(text, cursor);
      if (rawUrl) {
        flushText();
        target.append(formatMarkdownToken({ kind: "link", text: rawUrl.href, href: rawUrl.href }));
        textBuffer += rawUrl.trailing;
        cursor = rawUrl.end;
        continue;
      }

      textBuffer += text[cursor];
      cursor += 1;
    }

    flushText();
  }

  function formatMarkdownToken(token: InlineMarkdownToken) {
    if (token.kind === "strong") {
      const strong = document.createElement("strong");
      appendInlineMarkdown(strong, token.text);
      return strong;
    }

    if (token.kind === "emphasis") {
      const emphasis = document.createElement("em");
      appendInlineMarkdown(emphasis, token.text);
      return emphasis;
    }

    if (token.kind === "code") {
      const code = document.createElement("code");
      code.textContent = token.text;
      return code;
    }

    const anchor = document.createElement("a");
    anchor.className = "ad-link";
    anchor.href = token.href;
    anchor.textContent = token.text;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    return anchor;
  }

  function readDelimitedToken(text: string, cursor: number, opener: string, closer: string) {
    if (!text.startsWith(opener, cursor)) {
      return null;
    }

    const contentStart = cursor + opener.length;
    const contentEnd = text.indexOf(closer, contentStart);
    if (contentEnd <= contentStart) {
      return null;
    }

    return {
      text: text.slice(contentStart, contentEnd),
      end: contentEnd + closer.length,
    };
  }

  function readMarkdownLink(text: string, cursor: number) {
    if (!text.startsWith("[", cursor)) {
      return null;
    }

    const labelEnd = text.indexOf("](", cursor + 1);
    if (labelEnd === -1) {
      return null;
    }

    const hrefStart = labelEnd + 2;
    const hrefEnd = text.indexOf(")", hrefStart);
    if (hrefEnd === -1) {
      return null;
    }

    const label = text.slice(cursor + 1, labelEnd);
    const href = text.slice(hrefStart, hrefEnd);
    if (!label.trim() || !isSafeHttpUrl(href)) {
      return null;
    }

    return {
      text: label,
      href,
      end: hrefEnd + 1,
    };
  }

  function readRawUrl(text: string, cursor: number) {
    const match = /^https?:\/\/[^\s<>"']+/i.exec(text.slice(cursor));
    if (!match) {
      return null;
    }

    const candidate = match[0];
    const { href, trailing } = splitTrailingUrlPunctuation(candidate);
    if (!isSafeHttpUrl(href)) {
      return null;
    }

    return {
      href,
      trailing,
      end: cursor + candidate.length,
    };
  }

  function splitTrailingUrlPunctuation(value: string) {
    let href = value;
    let trailing = "";

    while (href && /[.,!?;:)\]]/.test(href[href.length - 1])) {
      trailing = `${href[href.length - 1]}${trailing}`;
      href = href.slice(0, -1);
    }

    return { href, trailing };
  }

  function isSafeHttpUrl(value: string) {
    return /^https?:\/\/[^\s]+$/i.test(value);
  }

  function normalizeConfig(config: WidgetConfig): WidgetConfig {
    const fallback = buildFallbackConfig(config.botId);

    return {
      ...fallback,
      ...config,
      headerTitle: stringValue(config.headerTitle, stringValue(config.botName, fallback.botName)),
      headerSubtitle: stringValue(config.headerSubtitle, stringValue(config.bannerText, fallback.headerSubtitle)),
      inputPlaceholder: stringValue(config.inputPlaceholder, fallback.inputPlaceholder),
      theme: { ...fallback.theme, ...config.theme },
      logoUrl: config.logoUrl || null,
      useCustomIcon: config.useCustomIcon === true,
      widgetIconUrl: normalizeImageUrl(config.widgetIconUrl),
      proactiveMessage: config.proactiveMessage === true,
      proactiveMessageText: stringValue(config.proactiveMessageText, fallback.proactiveMessageText),
      proactiveMessageDelay: typeof config.proactiveMessageDelay === "number" ? config.proactiveMessageDelay : fallback.proactiveMessageDelay,
      proactiveMessageShowOnce: config.proactiveMessageShowOnce === true,
      proactiveMessageSound: config.proactiveMessageSound === true,
      proactiveMessageAutoclose: typeof config.proactiveMessageAutoclose === "number" ? config.proactiveMessageAutoclose : fallback.proactiveMessageAutoclose,
      proactiveMessageTriggerType: config.proactiveMessageTriggerType === "idle" ? "idle" : fallback.proactiveMessageTriggerType,
      proactiveMessageIdleDelay: typeof config.proactiveMessageIdleDelay === "number" ? config.proactiveMessageIdleDelay : fallback.proactiveMessageIdleDelay,
      proactiveMessageUrlRules: normalizeStringArray(config.proactiveMessageUrlRules, 20, 160),
      proactiveMessageFrequencyCap: normalizeFrequencyCap(config.proactiveMessageFrequencyCap),
      proactiveMessageCtas: normalizeProactiveCtas(config.proactiveMessageCtas),
      proactiveMessageVariantId: stringValue(config.proactiveMessageVariantId, fallback.proactiveMessageVariantId).slice(0, 60),
    };
  }

  function stringValue(value: unknown, fallback: string) {
    return typeof value === "string" && value.trim() ? value.trim() : fallback;
  }

  function normalizeStringArray(value: unknown, maxItems: number, maxLength: number) {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim().slice(0, maxLength))
      .filter(Boolean)
      .slice(0, maxItems);
  }

  function normalizeFrequencyCap(value: unknown): WidgetConfig["proactiveMessageFrequencyCap"] {
    return value === "daily" || value === "weekly" || value === "always" || value === "session" ? value : "session";
  }

  function normalizeProactiveCtas(value: unknown): ProactiveMessageCta[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((item, index) => {
        if (!item || typeof item !== "object") {
          return null;
        }

        const record = item as Record<string, unknown>;
        const action = record.action === "prefill_message" || record.action === "open_url" || record.action === "open_chat" ? record.action : "open_chat";
        const label = stringValue(record.label, "").slice(0, 40);
        const rawValue = stringValue(record.value, "").slice(0, 500);
        const normalizedValue = action === "open_url" ? normalizeHttpUrl(rawValue) : rawValue;
        if (!label || (action !== "open_chat" && !normalizedValue)) {
          return null;
        }

        return {
          id: stringValue(record.id, `cta-${index + 1}`).slice(0, 60),
          label,
          action,
          value: normalizedValue,
        } satisfies ProactiveMessageCta;
      })
      .filter((item): item is ProactiveMessageCta => Boolean(item))
      .slice(0, 3);
  }

  function buildFallbackConfig(currentBotId: string): WidgetConfig {
    return {
      botId: currentBotId,
      tenantId: "public-demo-tenant",
      botName: "AgentDesk Support",
      headerTitle: "AgentDesk Support",
      headerSubtitle: "Online - responds instantly",
      greeting: "Hello. I can help with orders, policies, and support questions.",
      fallbackMessage: "I could not reach the support engine. Please try again in a moment.",
      logoUrl: null,
      useCustomIcon: false,
      widgetIconUrl: null,
      bannerText: "Online - responds instantly",
      inputPlaceholder: "Write your message here...",
      messageEndpoint: `${scriptOrigin}/api/chat/message`,
      websocketEndpoint: null,
      proactiveMessage: false,
      proactiveMessageText: "Hi! 👋 Need help?",
      proactiveMessageDelay: 5,
      proactiveMessageShowOnce: true,
      proactiveMessageSound: false,
      proactiveMessageAutoclose: 0,
      proactiveMessageTriggerType: "delay",
      proactiveMessageIdleDelay: 20,
      proactiveMessageUrlRules: [],
      proactiveMessageFrequencyCap: "session",
      proactiveMessageCtas: [],
      proactiveMessageVariantId: "default",
      theme: {
        headerHsl: "0 0% 11%",
        headerTextHsl: "0 0% 100%",
        headerSubtextHsl: "0 0% 84%",
        headerCloseButtonHsl: "0 0% 100%",
        headerFontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
        backgroundHsl: "43 38% 95%",
        textHsl: "0 0% 11%",
        mutedTextHsl: "60 1% 37%",
        userBubbleHsl: "224 88% 51%",
        botBubbleHsl: "40 50% 98%",
        accentHsl: "204 100% 50%",
        fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        inputBackgroundHsl: "0 0% 100%",
        inputTextHsl: "0 0% 11%",
        inputPlaceholderHsl: "60 1% 37%",
        inputBorderHsl: "40 34% 93%",
        inputFontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
      },
    };
  }  

  function createStyles(theme: WidgetTheme) {
    const style = document.createElement("style");
    style.textContent = `
      :host {
        --ad-bg-primary: hsl(${theme.backgroundHsl});
        --ad-bg-secondary: hsl(${theme.botBubbleHsl});
        --ad-header-bg: hsl(${theme.headerHsl});
        --ad-header-text: hsl(${theme.headerTextHsl});
        --ad-header-subtext: hsl(${theme.headerSubtextHsl});
        --ad-header-close: hsl(${theme.headerCloseButtonHsl});
        --ad-text-primary: hsl(${theme.textHsl});
        --ad-text-secondary: hsl(${theme.mutedTextHsl});
        --ad-accent-solid: hsl(${theme.accentHsl});
        --ad-user-bubble: hsl(${theme.userBubbleHsl});
        --ad-border-color: #eceae4;
        --ad-accent-glow: hsla(${theme.accentHsl} / 0.18);
        --ad-font-body: ${theme.fontFamily};
        --ad-font-header: ${theme.headerFontFamily};
        --ad-font-input: ${theme.inputFontFamily};
        --ad-input-bg: hsl(${theme.inputBackgroundHsl});
        --ad-input-text: hsl(${theme.inputTextHsl});
        --ad-input-placeholder: hsl(${theme.inputPlaceholderHsl});
        --ad-input-border: hsl(${theme.inputBorderHsl});
        all: initial;
        color-scheme: light;
        display: block;
        font-family: var(--ad-font-body);
      }

      :host([data-agentdesk-mode="inline"]) {
        bottom: 0;
        left: 0;
        position: fixed;
        right: 0;
        top: 0;
      }

      * { box-sizing: border-box; }
      button, textarea { font: inherit; }

      .ad-widget {
        bottom: 24px;
        position: fixed;
        right: 24px;
        z-index: 2147483647;
      }

      .ad-widget.inline {
        bottom: auto;
        height: 100svh;
        inset: 0;
        position: fixed;
        right: auto;
        width: 100%;
      }

      .ad-chat-pane {
        background: var(--ad-bg-primary);
        border: 1px solid var(--ad-border-color);
        border-radius: 22px;
        box-shadow: 0 18px 60px rgba(28, 28, 28, 0.16);
        color: var(--ad-text-primary);
        display: flex;
        flex-direction: column;
        height: min(600px, calc(100svh - 112px));
        opacity: 0;
        overflow: hidden;
        pointer-events: none;
        position: absolute;
        bottom: 80px;
        right: 0;
        transform: translateY(24px) scale(0.96);
        transition: opacity 180ms ease, transform 220ms cubic-bezier(0.34, 1.56, 0.64, 1);
        max-width: calc(100svw - 32px);
        width: min(380px, calc(100svw - 32px));
      }

      .ad-widget.inline .ad-chat-pane {
        border: 0;
        border-radius: 0;
        height: 100svh;
        opacity: 1;
        pointer-events: auto;
        position: static;
        transform: none;
        width: 100%;
      }

      .ad-chat-pane.active {
        opacity: 1;
        pointer-events: auto;
        transform: translateY(0) scale(1);
      }

      .ad-header {
        align-items: center;
        background: var(--ad-header-bg);
        border-bottom: 1px solid var(--ad-border-color);
        border-radius: 999px;
        display: flex;
        font-family: var(--ad-font-header);
        justify-content: space-between;
        min-height: 74px;
        margin: 12px;
        padding: 12px 14px;
      }

      .ad-identity {
        align-items: center;
        display: flex;
        gap: 12px;
        min-width: 0;
      }

      .ad-avatar {
        align-items: center;
        background: var(--ad-accent-solid);
        border-radius: 50%;
        color: white;
        display: flex;
        flex: 0 0 auto;
        font-weight: 800;
        height: 40px;
        justify-content: center;
        overflow: hidden;
        width: 40px;
      }

      .ad-avatar img {
        height: 100%;
        object-fit: cover;
        width: 100%;
      }

      .ad-title-wrap {
        display: flex;
        flex-direction: column;
        gap: 3px;
        min-width: 0;
      }

      .ad-title {
        color: var(--ad-header-text);
        font-size: 15px;
        line-height: 1.2;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .ad-status {
        color: var(--ad-header-subtext);
        font-size: 12px;
        line-height: 1.3;
      }

      .ad-icon-button {
        background: transparent;
        border: 0;
        color: var(--ad-header-close);
        cursor: pointer;
        font-size: 24px;
        height: 34px;
        line-height: 1;
        width: 34px;
      }

      .ad-messages {
        display: flex;
        flex: 1;
        flex-direction: column;
        gap: 12px;
        overflow-y: auto;
        padding: 18px 16px;
        scrollbar-width: thin;
      }

      .ad-message-row {
        display: flex;
      }

      .ad-message-row.user {
        justify-content: flex-end;
      }

      .ad-message {
        animation: stream-in 180ms ease-out both;
        border-radius: 18px;
        font-size: 14px;
        line-height: 1.5;
        max-width: 88%;
        overflow-wrap: anywhere;
        padding: 11px 13px;
      }

      .ad-message.bot {
        background: var(--ad-bg-secondary);
        border: 1px solid var(--ad-border-color);
        color: var(--ad-text-primary);
      }

      .ad-message.user {
        background: var(--ad-user-bubble);
        color: white;
      }

      .ad-paragraph {
        margin: 0;
      }

      .ad-paragraph + .ad-paragraph {
        margin-top: 8px;
      }

      .ad-heading {
        font-size: 14px;
        font-weight: 800;
        line-height: 1.35;
        margin: 0;
      }

      .ad-heading-1 {
        font-size: 15px;
      }

      .ad-paragraph + .ad-heading,
      .ad-heading + .ad-paragraph,
      .ad-heading + .ad-list-ul,
      .ad-heading + .ad-list-ol,
      .ad-list-ul + .ad-paragraph,
      .ad-list-ol + .ad-paragraph,
      .ad-list-ul + .ad-heading,
      .ad-list-ol + .ad-heading {
        margin-top: 8px;
      }

      .ad-list-ul,
      .ad-list-ol {
        margin: 0;
        padding-left: 18px;
      }

      .ad-list-ul + .ad-list-ul,
      .ad-list-ul + .ad-list-ol,
      .ad-list-ol + .ad-list-ul,
      .ad-list-ol + .ad-list-ol,
      .ad-paragraph + .ad-list-ul,
      .ad-paragraph + .ad-list-ol {
        margin-top: 8px;
      }

      .ad-list-item {
        margin: 0;
        padding-left: 2px;
      }

      .ad-list-item + .ad-list-item {
        margin-top: 4px;
      }

      .ad-link,
      .ad-message a {
        color: inherit;
        font-weight: 700;
        text-decoration: underline;
        text-underline-offset: 2px;
      }

      .ad-message code {
        background: rgba(255, 255, 255, 0.14);
        border-radius: 5px;
        padding: 1px 4px;
      }

      .ad-typing {
        align-items: center;
        display: inline-flex;
        gap: 5px;
        min-height: 38px;
      }

      .ad-typing-dot {
        animation: ad-wave-dots 1.2s infinite ease-in-out;
        background: var(--ad-text-secondary);
        border-radius: 50%;
        height: 6px;
        width: 6px;
      }

      .ad-typing-dot:nth-child(2) { animation-delay: 160ms; }
      .ad-typing-dot:nth-child(3) { animation-delay: 320ms; }

      .ad-actions {
        border-top: 1px solid var(--ad-border-color);
        display: flex;
        gap: 8px;
        overflow-x: auto;
        padding: 12px 16px;
      }

      .ad-action {
        background: rgba(255, 255, 255, 0.68);
        border: 1px solid var(--ad-border-color);
        border-radius: 999px;
        color: var(--ad-text-primary);
        cursor: pointer;
        flex: 0 0 auto;
        font-size: 12px;
        padding: 8px 10px;
      }

      .ad-action:disabled,
      .ad-send:disabled {
        cursor: not-allowed;
        opacity: 0.6;
      }

      .ad-form {
        border-top: 1px solid var(--ad-border-color);
        padding: 12px 16px 10px;
      }

      .ad-composer {
        align-items: flex-end;
        display: flex;
        gap: 8px;
      }

      .ad-input {
        background: var(--ad-input-bg);
        border: 1px solid var(--ad-input-border);
        border-radius: 14px;
        color: var(--ad-input-text);
        font-family: var(--ad-font-input);
        max-height: 96px;
        min-width: 0;
        min-height: 42px;
        outline: none;
        padding: 11px 12px;
        resize: vertical;
        width: 100%;
      }

      .ad-input::placeholder {
        color: var(--ad-input-placeholder);
      }

      .ad-input:focus {
        border-color: var(--ad-accent-solid);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      }

      .ad-send {
        background: var(--ad-accent-solid);
        border: 0;
        border-radius: 12px;
        color: white;
        cursor: pointer;
        font-weight: 700;
        min-height: 42px;
        padding: 0 14px;
      }

      .ad-footer {
        color: var(--ad-text-secondary);
        font-size: 11px;
        margin: 8px 0 0;
        text-align: center;
      }

      .ad-launcher-button {
        align-items: center;
        animation: ad-bubble-breath 3s infinite ease-in-out;
        background: var(--ad-accent-solid);
        border: 0;
        border-radius: 50%;
        bottom: 0;
        box-shadow: 0 12px 32px var(--ad-accent-glow);
        color: white;
        cursor: pointer;
        display: flex;
        font-size: 28px;
        font-weight: 800;
        height: 62px;
        justify-content: center;
        position: absolute;
        right: 0;
        transition: transform 160ms ease;
        width: 62px;
      }

      .ad-launcher-button:hover {
        transform: scale(1.06);
      }

      .ad-launcher-button img {
        border-radius: inherit;
        display: block;
        height: 100%;
        object-fit: cover;
        width: 100%;
      }

      @keyframes ad-wave-dots {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-5px); }
      }

      @keyframes ad-bubble-breath {
        0%, 100% { box-shadow: 0 10px 30px var(--ad-accent-glow), 0 0 0 0 hsla(${theme.accentHsl} / 0.38); }
        70% { box-shadow: 0 12px 36px var(--ad-accent-glow), 0 0 0 12px hsla(${theme.accentHsl} / 0); }
      }

      .ad-proactive-bubble {
        background: white;
        border: 1px solid var(--ad-border-color);
        border-radius: 16px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
        color: #1c1c1c;
        display: none;
        flex-direction: column;
        gap: 4px;
        opacity: 0;
        padding: 14px 16px;
        position: absolute;
        bottom: 80px;
        right: 0;
        transform: translateY(12px);
        transition: opacity 200ms ease, transform 200ms ease;
        width: 280px;
        z-index: 2147483646;
        cursor: pointer;
      }

      .ad-proactive-bubble.active {
        display: flex;
        opacity: 1;
        transform: translateY(0);
      }

      .ad-proactive-bubble::after {
        content: "";
        position: absolute;
        bottom: -8px;
        right: 24px;
        width: 0;
        height: 0;
        border-left: 8px solid transparent;
        border-right: 8px solid transparent;
        border-top: 8px solid white;
      }

      .ad-proactive-close {
        background: transparent;
        border: 0;
        color: #999999;
        cursor: pointer;
        font-size: 16px;
        line-height: 1;
        position: absolute;
        right: 12px;
        top: 12px;
      }

      .ad-proactive-close:hover {
        color: #555555;
      }

      .ad-proactive-text {
        font-size: 13px;
        font-weight: 600;
        line-height: 1.4;
        margin: 0;
        padding-right: 14px;
        color: #1c1c1c;
      }

      .ad-proactive-meta {
        color: #999999;
        font-size: 10px;
        margin: 0;
      }

      .ad-proactive-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 8px;
      }

      .ad-proactive-action {
        background: rgba(28, 28, 28, 0.04);
        border: 1px solid var(--ad-border-color);
        border-radius: 999px;
        color: #1c1c1c;
        cursor: pointer;
        font-size: 11px;
        font-weight: 700;
        padding: 6px 9px;
      }

      .ad-proactive-action:hover {
        background: rgba(28, 28, 28, 0.08);
      }

      @media (prefers-reduced-motion: reduce) {
        .ad-chat-pane,
        .ad-message,
        .ad-launcher-button,
        .ad-proactive-bubble,
        .ad-typing-dot {
          animation: none !important;
          transition: none !important;
        }
      }

      @media (max-width: 480px) {
        .ad-widget {
          bottom: 0;
          left: 0;
          right: 0;
        }

        .ad-chat-pane {
          border-radius: 14px;
          bottom: 88px;
          box-shadow: 0 12px 36px rgba(0, 0, 0, 0.34);
          height: min(620px, calc(100svh - 112px));
          left: 8px;
          max-width: none;
          position: fixed;
          right: 8px;
          width: auto;
        }

        .ad-widget.inline .ad-chat-pane {
          border-radius: 0;
          height: 100svh;
          inset: 0;
          width: 100%;
        }

        .ad-message {
          max-width: 92%;
        }

        .ad-launcher-button {
          bottom: 18px;
          right: 18px;
          transform: none;
        }

        .ad-launcher-button:hover {
          transform: scale(1.04);
        }
      }
    `;
    return style;
  }

  function createElement<K extends keyof HTMLElementTagNameMap>(tagName: K, className: string) {
    const element = document.createElement(tagName);
    element.className = className;
    return element;
  }

  function getSessionToken(currentBotId: string) {
    const key = `agentdesk:session:${STORAGE_VERSION}:${currentBotId}`;
    try {
      const stored = window.sessionStorage.getItem(key);
      if (stored) {
        return stored;
      }

      const token = createId();
      window.sessionStorage.setItem(key, token);
      return token;
    } catch {
      return createId();
    }
  }

  function saveMessages(messages: ChatMessage[]) {
    try {
      // Only keep the last 80 messages to avoid sessionStorage size limits.
      const trimmed = messages.slice(-80);
      window.sessionStorage.setItem(MESSAGES_KEY, JSON.stringify(trimmed));
    } catch {
      // Ignore quota errors — messages are still in memory.
    }
  }

  function loadMessages(): ChatMessage[] {
    try {
      const raw = window.sessionStorage.getItem(MESSAGES_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        (m): m is ChatMessage =>
          typeof m === "object" &&
          m !== null &&
          typeof (m as ChatMessage).id === "string" &&
          typeof (m as ChatMessage).sender === "string" &&
          typeof (m as ChatMessage).content === "string",
      );
    } catch {
      return [];
    }
  }

  function createId() {
    if (window.crypto?.randomUUID) {
      return window.crypto.randomUUID();
    }
    return `ad_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
  }

  function normalizeWebSocketEndpoint(value: string | null) {
    if (!value) {
      return null;
    }

    try {
      const url = new URL(value, scriptOrigin);
      return ["http:", "https:", "ws:", "wss:"].includes(url.protocol) ? url.toString().replace(/\/$/, "") : null;
    } catch {
      return null;
    }
  }

  function normalizeImageUrl(value: string | null) {
    if (!value) {
      return null;
    }

    try {
      const url = new URL(value, scriptOrigin);
      return ["https:", "data:"].includes(url.protocol) ? url.toString() : null;
    } catch {
      return null;
    }
  }

  function normalizeHttpUrl(value: string) {
    if (!value) {
      return "";
    }

    try {
      const url = new URL(value, window.location.href);
      return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
    } catch {
      return "";
    }
  }

  function matchesUrlRules(rules: string[], pathname: string) {
    const normalizedPath = pathname || "/";
    if (rules.length === 0) {
      return true;
    }

    const includes = rules.filter((rule) => !rule.startsWith("!"));
    const excludes = rules.filter((rule) => rule.startsWith("!")).map((rule) => rule.slice(1));
    const included = includes.length === 0 || includes.some((rule) => matchesPathRule(rule, normalizedPath));
    const excluded = excludes.some((rule) => matchesPathRule(rule, normalizedPath));
    return included && !excluded;
  }

  function matchesPathRule(rule: string, pathname: string) {
    const normalizedRule = rule.trim();
    if (!normalizedRule || normalizedRule === "*") {
      return true;
    }

    if (normalizedRule.endsWith("/*")) {
      const prefix = normalizedRule.slice(0, -1);
      return pathname.startsWith(prefix);
    }

    return pathname === normalizedRule;
  }

  function legacyProactiveKey(config: WidgetConfig) {
    return `agentdesk:proactive-dismissed:${config.botId}`;
  }

  function proactiveSuppressionKey(config: WidgetConfig) {
    const signature = `${config.botId}:${config.proactiveMessageVariantId}:${config.proactiveMessageText}`;
    return `agentdesk:proactive:${STORAGE_VERSION}:${simpleHash(signature)}`;
  }

  function isProactiveSuppressed(config: WidgetConfig) {
    if (config.proactiveMessageFrequencyCap === "always") {
      return false;
    }

    try {
      const key = proactiveSuppressionKey(config);
      const raw = config.proactiveMessageFrequencyCap === "session" ? window.sessionStorage.getItem(key) : window.localStorage.getItem(key);
      if (!raw) {
        return false;
      }
      const parsed = JSON.parse(raw) as { expiresAt?: number };
      if (!parsed.expiresAt || Date.now() > parsed.expiresAt) {
        window.sessionStorage.removeItem(key);
        window.localStorage.removeItem(key);
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  function proactiveSuppressionExpiry(cap: WidgetConfig["proactiveMessageFrequencyCap"]) {
    const now = Date.now();
    if (cap === "daily") return now + 24 * 60 * 60 * 1000;
    if (cap === "weekly") return now + 7 * 24 * 60 * 60 * 1000;
    return now + 12 * 60 * 60 * 1000;
  }

  function simpleHash(value: string) {
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
      hash = (hash << 5) - hash + value.charCodeAt(index);
      hash |= 0;
    }
    return Math.abs(hash).toString(36);
  }

  function emitWidgetEvent(config: WidgetConfig, sessionToken: string, payload: { eventName: string; variantId: string; metadata: Record<string, string> }) {
    const body = JSON.stringify({
      botId: config.botId,
      tenantId: config.tenantId,
      sessionToken,
      ...payload,
    });
    const endpoint = `${scriptOrigin}/api/widget/events`;

    try {
      if (navigator.sendBeacon) {
        const sent = navigator.sendBeacon(endpoint, new Blob([body], { type: "application/json" }));
        if (sent) {
          return;
        }
      }
      void fetch(endpoint, {
        body,
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        method: "POST",
      });
    } catch {
      // Telemetry must never block visitor UX.
    }
  }

  async function checkLiveHandoffHealth(baseUrl: string) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 2500);

    try {
      const response = await fetch(`${baseUrl}/health`, {
        cache: "no-store",
        signal: controller.signal,
      });
      return response.ok;
    } catch {
      return false;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  function delay(ms: number) {
    return new Promise<void>((resolve) => {
      window.setTimeout(resolve, ms);
    });
  }

  function fetchWithTimeout(resource: string, init: RequestInit, timeoutMs: number) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
    return fetch(resource, { ...init, signal: controller.signal }).finally(() => {
      window.clearTimeout(timeout);
    });
  }

  function mountWidget() {
    if (!document.body) {
      window.setTimeout(mountWidget, 10);
      return;
    }
    const elementName = "agentdesk-widget";
    if (!customElements.get(elementName)) {
      customElements.define(elementName, AgentDeskWidget);
    }
    if (!document.body.querySelector(elementName)) {
      const mount = document.createElement(elementName);
      mount.setAttribute("data-agentdesk-mode", embedMode);
      document.body.append(mount);
    }
  }

  mountWidget();
})();
