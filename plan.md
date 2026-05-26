# Detailed Developer Docs Portal Execution Plan for Codex

This plan details the exact files, state specifications, CSS variables, interactive widgets, and automated checks required to fully polish and verify the **AgentDesk Public Developer Documentation Portal (`/docs`)**. It provides minutiae, code patterns, and step-by-step verification commands to guide Codex in completing the implementation with absolute precision.

---

## 📅 Architectural Goals & Folder Mapping

To ensure the docs are completely public and decoupled from the operator layout:
* **Root Route:** `src/app/docs/page.tsx` (fully public, outside Next.js auth guard).
* **Styles:** Leverages the global design system from `src/app/globals.css` with brutalist border classes (`border-[var(--webchat-line)]`, `shadow-[18px_18px_0_#000]`) and standard Next.js Tailwind configuration.
* **Component Design:** Client-side rendered client component (`"use client"`) using React hooks for active tab tracking, responsive sidebar search queries, and code generation playgrounds.

---

## 🛠️ Step-by-Step Task Checklist for Codex

### Phase 1: Sidebar Search Filtering & Interactive Navigation

Codex must verify that the sidebar filter correctly handles case-insensitive queries across all sections.

- [ ] **State Specifications in `src/app/docs/page.tsx`:**
  - Verify state variables exist and are strictly typed:
    ```typescript
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [activeSection, setActiveSection] = useState<string>("introduction");
    const [copiedId, setCopiedId] = useState<string | null>(null);
    ```
- [ ] **Filtering Algorithm:**
  - The filter must search through `title`, `category`, and `id` keys of the `docSections` array:
    ```typescript
    const filteredSections = docSections.filter(section => {
      const searchLower = searchQuery.toLowerCase().trim();
      return (
        section.title.toLowerCase().includes(searchLower) ||
        section.category.toLowerCase().includes(searchLower) ||
        section.id.toLowerCase().includes(searchLower)
      );
    });
    ```
- [ ] **Active Indicator Animation:**
  - Verify that the active section button uses CSS transitions for background color changes and uses a left primary accent border highlight:
    ```tsx
    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-bold transition flex items-center justify-between ${
      activeSection === section.id 
        ? "bg-primary/10 text-primary border-l-2 border-primary" 
        : "text-muted-foreground hover:text-foreground hover:bg-card/30"
    }`}
    ```

---

### Phase 2: Copy-to-Clipboard Micro-interactions

Codex must verify that every copyable code block in the docs features animated click feedback.

- [ ] **Unified Copy Helper:**
  - Implement a highly responsive helper using the browser Clipboard API:
    ```typescript
    const copyToClipboard = (text: string, id: string) => {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
          setCopiedId(id);
          setTimeout(() => setCopiedId(null), 2000);
        });
      }
    };
    ```
- [ ] **Visual Feedback States:**
  - When copied, the button must show a green check icon (`Check` from Lucide) and change text to "Copied" with an transition. When idle, show the double-page `Copy` icon.
  - Verification target:
    ```tsx
    {copiedId === "sandbox-script" ? (
      <>
        <Check className="h-3 w-3 text-emerald-400" />
        <span className="text-emerald-400">Copied</span>
      </>
    ) : (
      <>
        <Copy className="h-3 w-3" />
        <span>Copy</span>
      </>
    )}
    ```

---

### Phase 3: Interactive Embed Sandbox Playground

Codex must verify that the embed code generator dynamically outputs both script and iframe embedding snippets correctly using local and production URLs.

- [ ] **Sandbox Configuration Inputs:**
  - **Bot ID Input:** A text box pre-filled with a default template value (e.g. `6a160c5a00212e6e9da0`), updating `sandboxBotId`.
  - **Theme Input:** A text box pre-filled with `webchat-v1`, updating `sandboxTheme`.
  - **Layout Mode Toggle:** Dynamic tab buttons allowing the developer to switch between `launcher` and `inline` rendering modes.
- [ ] **Reactive Generation logic:**
  - Use `useMemo` to construct snippets so changes to `sandboxBotId` or `sandboxTheme` trigger instant re-generation:
    ```typescript
    const sandboxSnippets = useMemo(() => {
      const host = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
      return {
        script: `<script\n  src="${host}/widget.js"\n  data-bot-id="${sandboxBotId}"\n  data-theme="${sandboxTheme}"\n  async\n></script>`,
        iframe: `<iframe\n  src="${host}/embed/${sandboxBotId}?theme=${sandboxTheme}"\n  title="AgentDesk Support"\n  style="width: 100%; height: 640px; border: 0;"\n></iframe>`,
      };
    }, [sandboxBotId, sandboxTheme]);
    ```

---

### Phase 4: Escaping Raw JSX Tags (Critical Build Guard)

Codex must verify that all raw HTML tag-like texts inside standard JSX components are properly escaped or wrapped to prevent Next.js compilation failures:

- [ ] **Escaped Content Checks:**
  - Verify that `<script>` and `<iframe>` inside inline reading text are rendered using HTML entities:
    - **Incorrect:** `using a single optimized <script> tag...`
    - **Correct:** `using a single optimized <code>&lt;script&gt;</code> tag or standard <code>&lt;iframe&gt;</code>.`
  - Inside `<pre>` blocks, ensure the entire code snippet is wrapped in backtick template literals `{ \`...\` }` to completely bypass JSX parsing:
    ```tsx
    <pre className="p-4 font-mono text-xs overflow-x-auto leading-5">
      {`<!-- Paste inside your HTML body -->
    <script
      src="https://YOUR_DOMAIN/widget.js"
      data-bot-id="YOUR_BOT_ID"
      async
    ></script>`}
    </pre>
    ```

---

## 🔍 Automated Verification Protocol

Codex must run the following validation scripts sequentially to prove absolute correctness of the codebase:

1. **Verify public docs route compiling:**
   ```powershell
   npm run build
   ```
   *Expected outcome:* Build completes successfully with exit code `0` and outputs `/docs` in the Route app matrix.
2. **Verify TypeScript type checking:**
   ```powershell
   npx tsc --noEmit
   ```
   *Expected outcome:* Completes with zero errors or warnings under `src/app/docs/page.tsx`.
