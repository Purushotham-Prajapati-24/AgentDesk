"use client";

import { FormEvent, useEffect, useMemo, useState, Suspense } from "react";
import { ArrowRight, Bot as BotIcon, Check, Copy, Plus, Trash2 } from "lucide-react";
import { createBot, deleteBot, listBots, updateBot } from "@/app/bot-actions";
import { useTenant } from "@/context/TenantContext";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { EmptyState, Panel } from "@/components/ui/Signal";
import { Skeleton } from "@/components/ui/skeleton";
import { useSearchParams } from "next/navigation";

type Bot = {
  $id: string;
  tenant_id: string;
  name: string;
  system_prompt: string;
  fallback_message: string;
  theme_config: string;
};

type BotForm = {
  name: string;
  system_prompt: string;
  fallback_message: string;
};

const EMPTY_FORM: BotForm = {
  name: "",
  system_prompt: "",
  fallback_message: "I do not have enough verified context to answer that yet.",
};

function BotsContent() {
  const { tenant, loading: tenantLoading } = useTenant();
  const searchParams = useSearchParams();
  const isNew = searchParams.get("new") === "true";

  const [bots, setBots] = useState<Bot[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<BotForm>(EMPTY_FORM);
  const [status, setStatus] = useState("");
  const [isAgentsLoading, setIsAgentsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Bot | null>(null);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const selectedBot = useMemo(() => bots.find((bot) => bot.$id === selectedId) ?? null, [bots, selectedId]);

  useEffect(() => {
    if (isNew) {
      setSelectedId(null);
      setForm(EMPTY_FORM);
      setStatus("");
    }
  }, [isNew]);

  useEffect(() => {
    if (!tenant?.$id) {
      return;
    }

    let isActive = true;
    listBots(tenant.$id).then((response) => {
      if (!isActive) {
        return;
      }

      setIsAgentsLoading(false);
      if (response.success) {
        setBots(response.bots);
        if (isNew) {
          setSelectedId(null);
          setForm(EMPTY_FORM);
        } else {
          const firstBot = response.bots[0] ?? null;
          setSelectedId(firstBot?.$id ?? null);
          setForm(firstBot ? botToForm(firstBot) : EMPTY_FORM);
        }
      } else {
        setStatus(response.error);
      }
    });

    return () => {
      isActive = false;
    };
  }, [tenant?.$id, isNew]);

  const isAgentListLoading = Boolean(tenant?.$id) && isAgentsLoading;

  function selectBot(bot: Bot) {
    setSelectedId(bot.$id);
    setForm(botToForm(bot));
    setStatus("");
  }

  async function handleCopy() {
    if (!selectedBot) {
      return;
    }

    await navigator.clipboard.writeText(selectedBot.$id);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  }

  async function saveBot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tenant?.$id) {
      setStatus("Tenant context is not ready.");
      return;
    }

    setIsSaving(true);
    const response = selectedBot
      ? await updateBot(selectedBot.$id, tenant.$id, form)
      : await createBot({ ...form, tenant_id: tenant.$id });
    setIsSaving(false);

    if (!response.success) {
      setStatus(response.error);
      return;
    }

    const nextBot = response.bot;
    setBots((current) => [nextBot, ...current.filter((bot) => bot.$id !== nextBot.$id)]);
    setSelectedId(nextBot.$id);
    setForm(botToForm(nextBot));
    setStatus("Agent configuration saved.");
  }

  function requestDeleteBotFor(bot: Bot) {
    setDeleteTarget(bot);
    setDeleteConfirmed(false);
    setStatus("");
  }

  function cancelDeleteBot() {
    if (isDeleting) {
      return;
    }

    setDeleteTarget(null);
    setDeleteConfirmed(false);
  }

  async function removeSelectedBot() {
    if (!tenant?.$id || !deleteTarget) {
      return;
    }

    setIsDeleting(true);
    const response = await deleteBot(deleteTarget.$id, tenant.$id);
    setIsDeleting(false);

    if (!response.success) {
      setStatus(response.error);
      return;
    }

    const remainingBots = bots.filter((bot) => bot.$id !== deleteTarget.$id);
    setBots(remainingBots);
    
    // Only reset or change selection if the deleted bot was the active one
    if (selectedId === deleteTarget.$id) {
      const firstBot = remainingBots[0] ?? null;
      setSelectedId(firstBot?.$id ?? null);
      setForm(firstBot ? botToForm(firstBot) : EMPTY_FORM);
    }
    
    setDeleteTarget(null);
    setDeleteConfirmed(false);
    setStatus("Agent deleted.");
  }

  if (tenantLoading) {
    return <BotsPageSkeleton />;
  }

  return (
    <div className="cockpit-lane min-h-screen">
      <BotsHeader />

      <div className="mx-auto flex flex-col lg:flex-row justify-between gap-6 max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="grid content-start gap-4 md:grid-cols-2 flex-1">
          {isAgentListLoading ? (
            <AgentGridSkeleton />
          ) : (
            <>
              <button
                className="min-h-[160px] rounded-2xl border border-[#262626] bg-[#141414] p-4 text-left transition hover:-translate-y-1 hover:border-white/50"
                onClick={() => {
                  setSelectedId(null);
                  setForm(EMPTY_FORM);
                  setStatus("");
                }}
                type="button"
              >
                <Plus aria-hidden="true" className="h-5 w-5 text-[#0099ff]" />
                <h2 className="mt-10 text-2xl font-semibold tracking-[-0.03em] text-white">New agent</h2>
                <p className="mt-2 max-w-sm text-sm font-medium leading-6 text-[#999999]">Create a fresh behavior draft for this tenant.</p>
              </button>

              {bots.length === 0 ? (
                <Panel className="min-h-[160px] p-4">
                  <EmptyState title="No agents configured" description="Create a support agent for this tenant to begin training behavior." />
                </Panel>
              ) : (
                bots.map((bot, index) => (
                  <button
                    className={`group/card relative min-h-[160px] cursor-pointer overflow-hidden rounded-2xl p-4 text-left text-white transition hover:-translate-y-1 ${
                      bot.$id === selectedId ? "outline outline-2 outline-[#0099ff]" : ""
                    } ${botCardClass(index)}`}
                    key={bot.$id}
                    onClick={() => selectBot(bot)}
                    type="button"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#090909]">{bot.$id === selectedId ? "active" : "configured"}</span>
                      <div className="flex items-center gap-2">
                        <button
                          className="grid h-8 w-8 place-items-center rounded-full bg-black/25 text-white/80 hover:bg-[#dc2626] hover:text-white hover:scale-105 active:scale-[0.98] transition duration-200"
                          onClick={(event) => {
                            event.stopPropagation();
                            requestDeleteBotFor(bot);
                          }}
                          type="button"
                          title="Delete agent"
                          aria-label={`Delete agent ${bot.name}`}
                        >
                          <Trash2 aria-hidden="true" className="h-4 w-4" />
                        </button>
                        <BotIcon aria-hidden="true" className="h-6 w-6" />
                      </div>
                    </div>
                    <h2 className="mt-10 break-words text-2xl font-semibold tracking-[-0.03em]">{bot.name}</h2>
                    <p className="mt-2 truncate font-mono text-xs font-semibold text-white/75">{bot.$id}</p>
                  </button>
                ))
              )}
            </>
          )}
        </section>

        {isAgentListLoading ? (
          <AgentFormSkeleton />
        ) : (
          <Panel className="h-fit w-full lg:w-[480px] xl:w-[560px] shrink-0 overflow-hidden rounded-2xl border-(--ui-border) bg-(--ui-panel) p-5">
          <form onSubmit={saveBot}>
            <section className="mb-5 flex items-start justify-between gap-3 border-b border-(--ui-border) pb-4">
              <div className="min-w-0 flex-1">
                <h2 className="text-3xl font-semibold leading-tight tracking-[-0.04em] text-(--ui-text)">{selectedBot ? "Edit agent" : "Create agent"}</h2>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-mono">
                  {selectedBot ? (
                    <>
                      <span className="rounded-full bg-[#0099ff]/10 border border-[#0099ff]/30 px-2.5 py-0.5 font-semibold text-[#0099ff] dark:bg-[#0099ff]/20">
                        Agent ID
                      </span>
                      <span className="font-semibold text-(--ui-text) select-all">{selectedBot.$id}</span>
                      <button
                        onClick={handleCopy}
                        type="button"
                        className="ml-1 inline-flex h-7 w-7 items-center justify-center rounded-full border border-(--ui-border) bg-(--ui-bg) text-(--ui-muted) hover:text-[#0099ff] hover:border-[#0099ff]/50 transition duration-200"
                        title="Copy Agent ID"
                      >
                        {isCopied ? (
                          <Check aria-hidden="true" className="h-3.5 w-3.5 text-green-500" />
                        ) : (
                          <Copy aria-hidden="true" className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="rounded-full bg-[#f59e0b]/10 border border-[#f59e0b]/30 px-2.5 py-0.5 font-semibold text-[#f59e0b] dark:bg-[#f59e0b]/20">
                        New agent draft
                      </span>
                      <span className="text-(--ui-muted)">ID will be generated upon saving</span>
                    </>
                  )}
                </div>
              </div>
            </section>

            <div className="grid gap-4">
              <label className="block">
                <span className="studio-kicker mb-2 block text-(--ui-muted)">Agent name</span>
                <input
                  className="min-h-11 w-full rounded-lg border border-(--ui-border) bg-(--ui-bg) px-3 text-sm font-semibold text-(--ui-text) focus:border-(--ui-blue) focus:bg-(--ui-panel)"
                  maxLength={80}
                  required
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                />
              </label>

              <label className="block">
                <span className="studio-kicker mb-2 block text-(--ui-muted)">System prompt</span>
                <textarea
                  className="min-h-60 w-full rounded-lg border border-(--ui-border) bg-(--ui-bg) px-3 py-3 font-mono text-sm leading-6 text-(--ui-text) focus:border-(--ui-blue) focus:bg-(--ui-panel)"
                  maxLength={4000}
                  required
                  value={form.system_prompt}
                  onChange={(event) => setForm({ ...form, system_prompt: event.target.value })}
                />
              </label>

              <label className="block">
                <span className="studio-kicker mb-2 block text-(--ui-muted)">Fallback message</span>
                <textarea
                  className="min-h-28 w-full rounded-lg border border-(--ui-border) bg-(--ui-bg) px-3 py-3 text-sm font-semibold leading-6 text-(--ui-text) focus:border-(--ui-blue) focus:bg-(--ui-panel)"
                  maxLength={500}
                  required
                  value={form.fallback_message}
                  onChange={(event) => setForm({ ...form, fallback_message: event.target.value })}
                />
              </label>
            </div>

            {status ? <p className="mt-5 rounded-lg border border-(--ui-border) bg-(--ui-bg) px-3 py-2 text-sm font-semibold text-(--ui-text)">{status}</p> : null}

            <div className="mt-5 grid gap-3 sm:flex sm:flex-wrap">
              <Button className="w-full sm:w-auto" disabled={isSaving || !tenant?.$id} loading={isSaving} type="submit">
                Save agent
              </Button>
            </div>
          </form>
        </Panel>
        )}
      </div>

      <Dialog open={Boolean(deleteTarget)}>
        <DialogContent className="max-w-xl">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-destructive/40 bg-destructive/10 text-destructive">
              <Trash2 aria-hidden="true" className="h-5 w-5" />
            </div>
            <div>
              <p className="studio-kicker text-destructive">Permanent delete</p>
              <h2 className="mt-1 text-2xl font-bold leading-tight">Delete {deleteTarget?.name ?? "this agent"}?</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-muted-foreground">
                This removes the agent record, its WebChat preferences, uploaded document records, stored document files, and
                Qdrant knowledge chunks for this tenant/agent scope.
              </p>
            </div>
          </div>

          <label className="mt-5 flex cursor-pointer items-start gap-3 border border-border bg-secondary/50 p-3">
            <input
              checked={deleteConfirmed}
              className="mt-1 h-4 w-4 accent-destructive"
              disabled={isDeleting}
              onChange={(event) => setDeleteConfirmed(event.target.checked)}
              type="checkbox"
            />
            <span className="text-sm font-semibold leading-6 text-foreground">
              I understand this permanently deletes {deleteTarget?.name ?? "this agent"} and its indexed knowledge.
            </span>
          </label>

          <div className="mt-5 flex flex-wrap justify-end gap-3">
            <Button disabled={isDeleting} onClick={cancelDeleteBot} type="button" variant="outline">
              Cancel
            </Button>
            <Button
              disabled={!deleteTarget || !deleteConfirmed}
              loading={isDeleting}
              leftIcon={<Trash2 aria-hidden="true" className="h-4 w-4" />}
              onClick={() => void removeSelectedBot()}
              type="button"
              variant="danger"
            >
              Delete permanently
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function BotsPage() {
  return (
    <Suspense fallback={<BotsPageSkeleton />}>
      <BotsContent />
    </Suspense>
  );
}

function BotsPageSkeleton() {
  return (
    <div className="cockpit-lane min-h-screen">
      <BotsHeaderSkeleton />
      <div className="mx-auto flex flex-col lg:flex-row justify-between gap-6 max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="grid content-start gap-4 md:grid-cols-2 flex-1">
          <AgentGridSkeleton />
        </section>
        <AgentFormSkeleton />
      </div>
    </div>
  );
}

function BotsHeaderSkeleton() {
  return (
    <section className="studio-enter border-b border-(--ui-border) bg-(--ui-bg) px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="overflow-hidden rounded-[2rem] border border-[#6366f1]/35 bg-[linear-gradient(135deg,#eef2ff_0%,#ccfbf1_46%,#6366f1_100%)] text-[#1e1b4b] shadow-[0_24px_70px_rgba(99,102,241,0.18)] dark:bg-[linear-gradient(135deg,#111827_0%,#134e4a_48%,#4f46e5_100%)] dark:text-[#eef2ff]">
          <div className="grid gap-4 p-5 sm:p-5 lg:grid-cols-[minmax(0,1fr)_330px] lg:p-6">
            <div className="min-w-0">
              <Skeleton className="h-7 w-44 rounded-full bg-white/45 dark:bg-white/20" />
              <div className="mt-3 grid max-w-4xl gap-3">
                <Skeleton className="h-10 w-full max-w-3xl bg-white/50 dark:bg-white/20 sm:h-12" />
                <Skeleton className="h-10 w-4/5 max-w-2xl bg-white/45 dark:bg-white/15 sm:h-12" />
              </div>
            </div>

            <div className="grid content-start gap-3">
              <div>
                <Skeleton className="h-4 w-24 bg-white/50 dark:bg-white/20" />
              </div>
              <div className="grid gap-2">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div className="flex min-h-10 items-center gap-3 rounded-full border border-white/35 bg-white/30 px-3 dark:bg-black/15" key={index}>
                    <Skeleton className="h-6 w-6 rounded-full bg-white/50 dark:bg-white/20" />
                    <Skeleton className="h-4 flex-1 bg-white/45 dark:bg-white/15" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function AgentGridSkeleton() {
  return (
    <>
      <AgentCardSkeleton />
      <AgentCardSkeleton />
      <AgentCardSkeleton />
      <AgentCardSkeleton />
    </>
  );
}

function AgentCardSkeleton() {
  return (
    <div className="min-h-[160px] overflow-hidden rounded-2xl border border-(--ui-border) bg-(--ui-panel) p-4">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-6 w-20 rounded-full bg-(--ui-bg)" />
        <Skeleton className="h-6 w-6 rounded-full bg-(--ui-bg)" />
      </div>
      <Skeleton className="mt-10 h-7 w-3/4 bg-(--ui-bg)" />
      <Skeleton className="mt-3 h-4 w-2/3 bg-(--ui-bg)" />
    </div>
  );
}

function AgentFormSkeleton() {
  return (
    <Panel className="h-fit w-full lg:w-[480px] xl:w-[560px] shrink-0 overflow-hidden rounded-2xl border-(--ui-border) bg-(--ui-panel) p-5">
      <div className="mb-5 border-b border-(--ui-border) pb-4">
        <div className="min-w-0 flex-1">
          <Skeleton className="h-8 w-48 bg-(--ui-bg)" />
          <div className="mt-3 flex items-center gap-2">
            <Skeleton className="h-6 w-20 rounded-full bg-(--ui-bg)" />
            <Skeleton className="h-4 w-32 bg-(--ui-bg)" />
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        <SkeletonField className="h-11" labelWidth="w-24" />
        <SkeletonField className="h-60" labelWidth="w-28" />
        <SkeletonField className="h-28" labelWidth="w-36" />
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Skeleton className="h-11 w-28 rounded-md bg-(--ui-bg)" />
        <Skeleton className="h-11 w-24 rounded-md bg-(--ui-bg)" />
      </div>
    </Panel>
  );
}

function SkeletonField({ className, labelWidth }: { className: string; labelWidth: string }) {
  return (
    <div>
      <Skeleton className={`mb-2 h-4 ${labelWidth} bg-(--ui-bg)`} />
      <Skeleton className={`w-full rounded-lg bg-(--ui-bg) ${className}`} />
    </div>
  );
}

function BotsHeader() {
  const steps = [
    "Write the agent's support instructions.",
    "Set the fallback response customers will see.",
    "Save the agent before connecting it to WebChat.",
  ];

  return (
    <section className="studio-enter border-b border-(--ui-border) bg-(--ui-bg) px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="overflow-hidden rounded-[2rem] border border-[#6366f1]/35 bg-[linear-gradient(135deg,#eef2ff_0%,#ccfbf1_46%,#6366f1_100%)] text-[#1e1b4b] shadow-[0_24px_70px_rgba(99,102,241,0.18)] dark:bg-[linear-gradient(135deg,#111827_0%,#134e4a_48%,#4f46e5_100%)] dark:text-[#eef2ff]">
          <div className="grid gap-4 p-5 sm:p-5 lg:grid-cols-[minmax(0,1fr)_330px] lg:p-6">
            <div className="min-w-0">
              <p className="inline-flex rounded-full border border-[#312e81]/20 bg-white/55 px-3 py-1 studio-kicker text-[#312e81] dark:border-white/20 dark:bg-black/20 dark:text-[#ccfbf1]">
                Support agent setup
              </p>
              <h1 className="mt-3 max-w-4xl text-3xl font-semibold leading-[1.04] tracking-[-0.02em] text-current sm:text-4xl lg:text-5xl">
                Create customer support agents for this workspace.
              </h1>
            </div>

            <div className="grid content-start gap-3">
              <div>
                <p className="studio-kicker opacity-70">Agent flow</p>
              </div>
              <div className="grid gap-2">
                {steps.map((step) => (
                  <div className="flex min-h-10 items-center gap-3 rounded-full border border-white/35 bg-white/30 px-3 text-sm font-semibold text-current dark:bg-black/15" key={step}>
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#312e81]/10 text-[#312e81] dark:bg-white/15 dark:text-[#ccfbf1]">
                      <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
                    </span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function botToForm(bot: Bot): BotForm {
  return {
    name: bot.name,
    system_prompt: bot.system_prompt,
    fallback_message: bot.fallback_message,
  };
}

function botCardClass(index: number) {
  const cards = [
    "bg-[linear-gradient(135deg,#ff5530,#f59e0b)]",
    "bg-[linear-gradient(135deg,#1456f0,#22c5a5)]",
    "bg-[linear-gradient(135deg,#1c1c1c,#0099ff)]",
    "bg-[linear-gradient(135deg,#0f766e,#22c55e)]",
  ];

  return cards[index % cards.length];
}

