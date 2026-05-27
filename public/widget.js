(() => {
    var _a, _b, _c, _d;
    const STORAGE_VERSION = "v1";
    const DEFAULT_TIMEOUT_MS = 12000;
    const MAX_MESSAGE_LENGTH = 1200;
    const currentScript = (document.currentScript || document.querySelector('script[data-bot-id]'));
    const scriptUrl = (currentScript === null || currentScript === void 0 ? void 0 : currentScript.src) ? new URL(currentScript.src, window.location.href) : null;
    const scriptOrigin = (_a = scriptUrl === null || scriptUrl === void 0 ? void 0 : scriptUrl.origin) !== null && _a !== void 0 ? _a : window.location.origin;
    const botId = (_c = (_b = currentScript === null || currentScript === void 0 ? void 0 : currentScript.dataset.botId) === null || _b === void 0 ? void 0 : _b.trim()) !== null && _c !== void 0 ? _c : "";
    const embedMode = (currentScript === null || currentScript === void 0 ? void 0 : currentScript.dataset.mode) === "inline" ? "inline" : "launcher";
    const configUrl = ((_d = currentScript === null || currentScript === void 0 ? void 0 : currentScript.dataset.configUrl) === null || _d === void 0 ? void 0 : _d.trim()) || `${scriptOrigin}/api/widget/config/${encodeURIComponent(botId)}`;
    if (!botId) {
        return;
    }
    const MESSAGES_KEY = `agentdesk:messages:${STORAGE_VERSION}:${botId}`;
    class AgentDeskWidget extends HTMLElement {
        constructor() {
            super();
            this.config = null;
            this.messages = [];
            this.isOpen = embedMode === "inline";
            this.isSending = false;
            this.sessionToken = getSessionToken(botId);
            this.socket = null;
            this.shadowRootRef = this.attachShadow({ mode: "open" });
        }
        connectedCallback() {
            this.renderShell();
            void this.loadConfig();
        }
        toggle() {
            this.isOpen = !this.isOpen;
            this.renderShell();
        }
        async loadConfig() {
            try {
                const response = await fetchWithTimeout(configUrl, { credentials: "omit" }, DEFAULT_TIMEOUT_MS);
                if (!response.ok) {
                    throw new Error("Widget configuration failed");
                }
                const body = (await response.json());
                if (!body.data || body.data.botId !== botId) {
                    throw new Error("Widget configuration mismatch");
                }
                this.config = normalizeConfig(body.data);
            }
            catch {
                this.config = buildFallbackConfig(botId);
            }
            const persisted = loadMessages();
            if (persisted.length > 0) {
                this.messages = persisted;
            }
            else {
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
        }
        initSocket(config) {
            if (this.socket) {
                return;
            }
            const scriptUrl = "https://cdn.socket.io/4.7.5/socket.io.min.js";
            if (!document.querySelector(`script[src="${scriptUrl}"]`)) {
                const script = document.createElement("script");
                script.src = scriptUrl;
                script.onload = () => void this.connectSocket(config);
                document.head.appendChild(script);
            }
            else {
                const checkInterval = window.setInterval(() => {
                    const windowRef = window;
                    if (typeof windowRef.io !== "undefined") {
                        window.clearInterval(checkInterval);
                        void this.connectSocket(config);
                    }
                }, 100);
            }
        }
        async connectSocket(config) {
            const windowRef = window;
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
                    socket.on("agent-message", (message) => {
                        this.messages.push({
                            id: message.message_id,
                            sender: "bot",
                            content: message.content,
                        });
                        saveMessages(this.messages);
                        this.renderShell();
                    });
                }
            }
            catch (err) {
                console.error("Failed to connect to live handoff socket:", err);
            }
        }
        renderShell() {
            var _a;
            const config = (_a = this.config) !== null && _a !== void 0 ? _a : buildFallbackConfig(botId);
            this.shadowRootRef.replaceChildren(createStyles(config.theme), this.createWidget(config));
        }
        createWidget(config) {
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
            }
            else if (config.useCustomIcon && config.widgetIconUrl) {
                const image = document.createElement("img");
                image.src = config.widgetIconUrl;
                image.alt = "";
                launcher.append(image);
            }
            else {
                launcher.textContent = "✦";
            }
            launcher.addEventListener("click", () => {
                this.isOpen = !this.isOpen;
                this.renderShell();
            });
            wrapper.append(pane, launcher);
            return wrapper;
        }
        createHeader(config) {
            const header = createElement("header", "ad-header");
            const identity = createElement("div", "ad-identity");
            const avatar = createElement("div", "ad-avatar");
            if (config.logoUrl) {
                const image = document.createElement("img");
                image.src = config.logoUrl;
                image.alt = "";
                avatar.append(image);
            }
            else {
                avatar.textContent = config.botName.charAt(0).toUpperCase();
            }
            const copy = createElement("div", "ad-title-wrap");
            const title = createElement("strong", "ad-title");
            title.textContent = config.botName;
            const status = createElement("span", "ad-status");
            status.textContent = config.bannerText;
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
                    }
                    catch {
                    }
                });
                header.append(close);
            }
            return header;
        }
        createMessageList() {
            const list = createElement("div", "ad-messages");
            for (const message of this.messages) {
                const row = createElement("div", `ad-message-row ${message.sender}`);
                const bubble = createElement("div", `ad-message ${message.sender}`);
                appendMarkdown(bubble, message.content);
                row.append(bubble);
                list.append(row);
            }
            if (this.isSending) {
                const row = createElement("div", "ad-message-row bot");
                const typing = createElement("div", "ad-message bot ad-typing");
                for (let index = 0; index < 3; index += 1) {
                    typing.append(createElement("span", "ad-typing-dot"));
                }
                row.append(typing);
                list.append(row);
            }
            queueMicrotask(() => {
                list.scrollTop = list.scrollHeight;
            });
            return list;
        }
        createQuickActions() {
            const actions = createElement("div", "ad-actions");
            for (const label of ["Track order", "Return policy", "Talk to support"]) {
                const button = createElement("button", "ad-action");
                button.type = "button";
                button.textContent = label;
                button.disabled = this.isSending;
                button.addEventListener("click", () => void this.sendMessage(label));
                actions.append(button);
            }
            return actions;
        }
        createForm(config) {
            const form = createElement("form", "ad-form");
            const input = document.createElement("textarea");
            input.className = "ad-input";
            input.name = "message";
            input.placeholder = "Write your message here...";
            input.maxLength = MAX_MESSAGE_LENGTH;
            input.rows = 1;
            input.disabled = this.isSending;
            input.addEventListener("keydown", (event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    form.requestSubmit();
                }
            });
            const send = createElement("button", "ad-send");
            send.type = "submit";
            send.disabled = this.isSending;
            send.textContent = "Send";
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
        async sendMessage(text, explicitConfig) {
            var _a;
            if (this.isSending) {
                return;
            }
            const config = (_a = explicitConfig !== null && explicitConfig !== void 0 ? explicitConfig : this.config) !== null && _a !== void 0 ? _a : buildFallbackConfig(botId);
            const content = text.slice(0, MAX_MESSAGE_LENGTH);
            this.messages.push({ id: createId(), sender: "user", content });
            saveMessages(this.messages);
            this.isSending = true;
            this.renderShell();
            if (this.socket && this.socket.connected) {
                try {
                    this.socket.emit("customer-message", {
                        message_id: createId(),
                        content,
                    });
                }
                catch (err) {
                    console.error("Failed to emit customer message over socket:", err);
                }
            }
            try {
                const responseText = await requestBotReply(config, this.sessionToken, content);
                if (responseText) {
                    await this.typeBotMessage(responseText);
                }
            }
            catch {
                await this.typeBotMessage(config.fallbackMessage);
            }
            finally {
                this.isSending = false;
                this.renderShell();
            }
        }
        async typeBotMessage(content) {
            const message = { id: createId(), sender: "bot", content: "" };
            this.messages.push(message);
            const chars = Array.from(content);
            for (let index = 0; index < chars.length; index += 1) {
                message.content += chars[index];
                if (index % 3 === 0 || index === chars.length - 1) {
                    saveMessages(this.messages);
                    this.renderShell();
                    await delay(12);
                }
            }
        }
    }
    async function requestBotReply(config, sessionToken, message) {
        var _a, _b, _c, _d;
        const endpoint = new URL(config.messageEndpoint, scriptOrigin).toString();
        const response = await fetchWithTimeout(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "text/event-stream, application/json" },
            body: JSON.stringify({
                bot_id: config.botId,
                tenant_id: config.tenantId,
                session_token: sessionToken,
                message,
            }),
        }, DEFAULT_TIMEOUT_MS);
        if (!response.ok) {
            throw new Error("Message request failed");
        }
        const contentType = (_a = response.headers.get("content-type")) !== null && _a !== void 0 ? _a : "";
        if (contentType.includes("text/event-stream") && response.body) {
            return readEventStream(response.body);
        }
        const body = (await response.json());
        return (_d = (_c = (_b = body.data) === null || _b === void 0 ? void 0 : _b.message) !== null && _c !== void 0 ? _c : body.message) !== null && _d !== void 0 ? _d : "";
    }
    async function readEventStream(body) {
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
    function parseStreamPayload(payload) {
        var _a, _b, _c;
        try {
            const data = JSON.parse(payload);
            return (_c = (_b = (_a = data.token) !== null && _a !== void 0 ? _a : data.content) !== null && _b !== void 0 ? _b : data.message) !== null && _c !== void 0 ? _c : "";
        }
        catch {
            return payload;
        }
    }
    function appendMarkdown(target, text) {
        const lines = text.split(/\n{2,}/);
        for (const line of lines) {
            const paragraph = createElement("p", "ad-paragraph");
            appendInlineMarkdown(paragraph, line);
            target.append(paragraph);
        }
    }
    function appendInlineMarkdown(target, text) {
        var _a;
        const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g;
        let cursor = 0;
        for (const match of text.matchAll(pattern)) {
            const token = match[0];
            const index = (_a = match.index) !== null && _a !== void 0 ? _a : 0;
            if (index > cursor) {
                target.append(document.createTextNode(text.slice(cursor, index)));
            }
            target.append(formatMarkdownToken(token));
            cursor = index + token.length;
        }
        if (cursor < text.length) {
            target.append(document.createTextNode(text.slice(cursor)));
        }
    }
    function formatMarkdownToken(token) {
        if (token.startsWith("**")) {
            const strong = document.createElement("strong");
            strong.textContent = token.slice(2, -2);
            return strong;
        }
        if (token.startsWith("`")) {
            const code = document.createElement("code");
            code.textContent = token.slice(1, -1);
            return code;
        }
        const linkMatch = /^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/.exec(token);
        if (linkMatch) {
            const anchor = document.createElement("a");
            anchor.href = linkMatch[2];
            anchor.textContent = linkMatch[1];
            anchor.target = "_blank";
            anchor.rel = "noopener noreferrer";
            return anchor;
        }
        return document.createTextNode(token);
    }
    function normalizeConfig(config) {
        return {
            ...buildFallbackConfig(config.botId),
            ...config,
            theme: { ...buildFallbackConfig(config.botId).theme, ...config.theme },
            logoUrl: config.logoUrl || null,
            useCustomIcon: config.useCustomIcon === true,
            widgetIconUrl: normalizeImageUrl(config.widgetIconUrl),
        };
    }
    function buildFallbackConfig(currentBotId) {
        return {
            botId: currentBotId,
            tenantId: "public-demo-tenant",
            botName: "AgentDesk Support",
            greeting: "Hello. I can help with orders, policies, and support questions.",
            fallbackMessage: "I could not reach the support engine. Please try again in a moment.",
            logoUrl: null,
            useCustomIcon: false,
            widgetIconUrl: null,
            bannerText: "Online - responds instantly",
            messageEndpoint: `${scriptOrigin}/api/chat/message`,
            websocketEndpoint: null,
            theme: {
                headerHsl: "224 20% 18%",
                backgroundHsl: "224 25% 12%",
                textHsl: "210 40% 98%",
                mutedTextHsl: "215 20% 75%",
                userBubbleHsl: "250 85% 60%",
                botBubbleHsl: "224 20% 18%",
                accentHsl: "250 85% 60%",
                fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
            },
        };
    }
    function createStyles(theme) {
        const style = document.createElement("style");
        style.textContent = `
      :host {
        --ad-bg-primary: hsla(${theme.backgroundHsl} / 0.9);
        --ad-bg-secondary: hsla(${theme.botBubbleHsl} / 0.96);
        --ad-header-bg: hsla(${theme.headerHsl} / 0.96);
        --ad-text-primary: hsl(${theme.textHsl});
        --ad-text-secondary: hsl(${theme.mutedTextHsl});
        --ad-accent-solid: hsl(${theme.accentHsl});
        --ad-user-bubble: hsl(${theme.userBubbleHsl});
        --ad-border-color: hsla(224 20% 80% / 0.16);
        --ad-accent-glow: hsla(${theme.accentHsl} / 0.25);
        --ad-font-body: ${theme.fontFamily};
        all: initial;
        color-scheme: dark;
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
        height: 100vh;
        inset: 0;
        position: fixed;
        right: auto;
        width: 100vw;
      }

      .ad-chat-pane {
        background: var(--ad-bg-primary);
        border: 1px solid var(--ad-border-color);
        border-radius: 18px;
        box-shadow: 0 18px 60px rgba(0, 0, 0, 0.38);
        color: var(--ad-text-primary);
        display: flex;
        flex-direction: column;
        height: min(600px, calc(100vh - 112px));
        opacity: 0;
        overflow: hidden;
        pointer-events: none;
        position: absolute;
        bottom: 80px;
        right: 0;
        transform: translateY(24px) scale(0.96);
        transition: opacity 180ms ease, transform 220ms cubic-bezier(0.34, 1.56, 0.64, 1);
        width: min(380px, calc(100vw - 32px));
        backdrop-filter: blur(16px) saturate(180%);
        -webkit-backdrop-filter: blur(16px) saturate(180%);
      }

      .ad-widget.inline .ad-chat-pane {
        border: 0;
        border-radius: 0;
        height: 100vh;
        opacity: 1;
        pointer-events: auto;
        position: static;
        transform: none;
        width: 100vw;
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
        display: flex;
        justify-content: space-between;
        min-height: 74px;
        padding: 16px;
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
        color: var(--ad-text-primary);
        font-size: 15px;
        line-height: 1.2;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .ad-status {
        color: var(--ad-text-secondary);
        font-size: 12px;
        line-height: 1.3;
      }

      .ad-icon-button {
        background: transparent;
        border: 0;
        color: var(--ad-text-secondary);
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
        border-radius: 16px;
        font-size: 14px;
        line-height: 1.5;
        max-width: 82%;
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

      .ad-message a {
        color: inherit;
        font-weight: 700;
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
        background: rgba(255, 255, 255, 0.08);
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
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid var(--ad-border-color);
        border-radius: 14px;
        color: var(--ad-text-primary);
        max-height: 96px;
        min-height: 42px;
        outline: none;
        padding: 11px 12px;
        resize: vertical;
        width: 100%;
      }

      .ad-input::placeholder {
        color: var(--ad-text-secondary);
      }

      .ad-input:focus {
        border-color: var(--ad-accent-solid);
        box-shadow: 0 0 0 3px var(--ad-accent-glow);
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
        box-shadow: 0 10px 30px var(--ad-accent-glow);
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

      @media (max-width: 480px) {
        .ad-widget {
          bottom: 0;
          left: 0;
          right: 0;
        }

        .ad-chat-pane {
          border-radius: 0;
          height: 100vh;
          width: 100vw;
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
    function createElement(tagName, className) {
        const element = document.createElement(tagName);
        element.className = className;
        return element;
    }
    function getSessionToken(currentBotId) {
        const key = `agentdesk:session:${STORAGE_VERSION}:${currentBotId}`;
        try {
            const stored = window.sessionStorage.getItem(key);
            if (stored) {
                return stored;
            }
            const token = createId();
            window.sessionStorage.setItem(key, token);
            return token;
        }
        catch {
            return createId();
        }
    }
    function saveMessages(messages) {
        try {
            const trimmed = messages.slice(-80);
            window.sessionStorage.setItem(MESSAGES_KEY, JSON.stringify(trimmed));
        }
        catch {
        }
    }
    function loadMessages() {
        try {
            const raw = window.sessionStorage.getItem(MESSAGES_KEY);
            if (!raw)
                return [];
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed))
                return [];
            return parsed.filter((m) => typeof m === "object" &&
                m !== null &&
                typeof m.id === "string" &&
                typeof m.sender === "string" &&
                typeof m.content === "string");
        }
        catch {
            return [];
        }
    }
    function createId() {
        var _a;
        if ((_a = window.crypto) === null || _a === void 0 ? void 0 : _a.randomUUID) {
            return window.crypto.randomUUID();
        }
        return `ad_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
    }
    function normalizeWebSocketEndpoint(value) {
        if (!value) {
            return null;
        }
        try {
            const url = new URL(value, scriptOrigin);
            return ["http:", "https:", "ws:", "wss:"].includes(url.protocol) ? url.toString().replace(/\/$/, "") : null;
        }
        catch {
            return null;
        }
    }
    function normalizeImageUrl(value) {
        if (!value) {
            return null;
        }
        try {
            const url = new URL(value, scriptOrigin);
            return ["https:", "data:"].includes(url.protocol) ? url.toString() : null;
        }
        catch {
            return null;
        }
    }
    async function checkLiveHandoffHealth(baseUrl) {
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 2500);
        try {
            const response = await fetch(`${baseUrl}/health`, {
                cache: "no-store",
                signal: controller.signal,
            });
            return response.ok;
        }
        catch {
            return false;
        }
        finally {
            window.clearTimeout(timeout);
        }
    }
    function delay(ms) {
        return new Promise((resolve) => {
            window.setTimeout(resolve, ms);
        });
    }
    function fetchWithTimeout(resource, init, timeoutMs) {
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
        return fetch(resource, { ...init, signal: controller.signal }).finally(() => {
            window.clearTimeout(timeout);
        });
    }
    const elementName = "agentdesk-widget";
    if (!customElements.get(elementName)) {
        customElements.define(elementName, AgentDeskWidget);
    }
    const mount = document.createElement(elementName);
    mount.setAttribute("data-agentdesk-mode", embedMode);
    document.body.append(mount);
})();
