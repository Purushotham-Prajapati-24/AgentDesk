"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Search,
  Settings,
  Terminal,
  Workflow,
  type LucideIcon,
} from "lucide-react";

export type DocCategory = "start" | "configure" | "deploy" | "api";

/** Section metadata — passed from the server page so the island can render the nav. */
export type DocSectionMeta = {
  id: string;
  title: string;
  summary: string;
  category: DocCategory;
};

const categories: Array<{
  id: DocCategory;
  label: string;
  description: string;
  icon: LucideIcon;
}> = [
  { id: "start", label: "Start", description: "Product shape and first setup path.", icon: BookOpen },
  { id: "configure", label: "Configure", description: "Knowledge and WebChat customization.", icon: Settings },
  { id: "deploy", label: "Deploy", description: "Script, iframe, React, and Vue installs.", icon: Workflow },
  { id: "api", label: "API", description: "Widget controls, handoff, and contracts.", icon: Terminal },
];

/**
 * DocsExplorer — client island for section navigation + search filtering.
 *
 * All documentation content is server-rendered in the parent page.
 * This component only controls which section is scrolled-into-view
 * and filters the left-hand navigation list.
 */
export function DocsExplorer({
  sections,
  initialSection = "introduction",
}: {
  sections: DocSectionMeta[];
  initialSection?: string;
}) {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeSection, setActiveSection] = useState<string>(initialSection);

  const searchLower = searchQuery.toLowerCase().trim();
  const filteredSections = useMemo(
    () =>
      sections.filter((section) => {
        if (!searchLower) return true;
        const categoryLabel =
          categories.find((c) => c.id === section.category)?.label ?? section.category;
        return (
          section.title.toLowerCase().includes(searchLower) ||
          section.summary.toLowerCase().includes(searchLower) ||
          categoryLabel.toLowerCase().includes(searchLower) ||
          section.id.toLowerCase().includes(searchLower)
        );
      }),
    [sections, searchLower],
  );

  const activeSectionData =
    sections.find((s) => s.id === activeSection) ?? sections[0];
  const visibleSectionData =
    filteredSections.find((s) => s.id === activeSection) ?? filteredSections[0] ?? activeSectionData;
  const activeCategory =
    categories.find((c) => c.id === visibleSectionData.category) ?? categories[0];
  const ActiveCategoryIcon = activeCategory.icon;

  /** Scroll the server-rendered section into view. */
  const scrollToSection = useCallback((sectionId: string) => {
    setActiveSection(sectionId);
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  /** Keyboard shortcut: / to focus search. */
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "/" && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        const input = document.querySelector<HTMLInputElement>('input[name="docs-search"]');
        if (input) input.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <aside className="min-w-0">
      <div className="flex flex-col gap-4 rounded-[1.5rem] border border-[var(--ui-border)] bg-[var(--ui-panel)] p-4 lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)]">
        <div className="relative shrink-0">
          <Search aria-hidden="true" className="absolute left-3.5 top-3.5 h-4 w-4 text-[var(--ui-muted)]" />
          <input
            aria-label="Search documentation"
            autoComplete="off"
            className="min-h-11 w-full rounded-xl border border-[var(--ui-border)] bg-[var(--ui-bg)] py-2.5 pl-10 pr-4 text-sm font-semibold text-[var(--ui-text)] transition placeholder:text-[var(--ui-muted)] focus:border-[#0099ff] focus:bg-[var(--ui-panel-2)]"
            name="docs-search"
            placeholder="Search docs... (/)"
            spellCheck={false}
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto space-y-5 pr-1" aria-label="Documentation sections">
          {categories.map((category) => {
            const categorySections = filteredSections.filter((s) => s.category === category.id);
            const Icon = category.icon;

            if (categorySections.length === 0) return null;

            return (
              <div className="space-y-2" key={category.id}>
                <div className="flex items-center gap-2 px-1">
                  <Icon aria-hidden="true" className="h-3.5 w-3.5 text-[#0099ff]" />
                  <h2 className="studio-kicker text-[var(--ui-muted)]">{category.label}</h2>
                </div>
                <ul className="space-y-1">
                  {categorySections.map((section) => (
                    <li key={section.id}>
                      <button
                        className={`group flex w-full items-start gap-3 rounded-2xl border px-3 py-2.5 text-left transition ${
                          visibleSectionData.id === section.id
                            ? "border-[#0099ff]/70 bg-[#0099ff]/10 text-[var(--ui-text)]"
                            : "border-transparent text-[var(--ui-muted)] hover:border-[var(--ui-border)] hover:bg-[var(--ui-panel-2)] hover:text-[var(--ui-text)]"
                        }`}
                        type="button"
                        onClick={() => scrollToSection(section.id)}
                      >
                        <span
                          className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                            visibleSectionData.id === section.id
                              ? "bg-[#0099ff]"
                              : "bg-[var(--ui-border)] group-hover:bg-[#0099ff]/70"
                          }`}
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold leading-5">{section.title}</span>
                          <span className="mt-1 line-clamp-2 block text-xs font-medium leading-5 text-[var(--ui-muted)]">
                            {section.summary}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}

          {filteredSections.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--ui-border)] bg-[var(--ui-bg)] p-4 text-sm font-medium leading-6 text-[var(--ui-muted)]">
              No docs match this search.
              <button
                className="mt-3 block rounded-full bg-[#0099ff] px-3 py-2 text-xs font-semibold text-[#041018]"
                type="button"
                onClick={() => setSearchQuery("")}
              >
                Clear search
              </button>
            </div>
          ) : null}
        </nav>
      </div>
    </aside>
  );
}
