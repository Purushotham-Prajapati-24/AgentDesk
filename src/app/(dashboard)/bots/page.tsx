"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Bot as BotIcon, Check, Copy, Plus, Trash2 } from "lucide-react";
import { createBot, deleteBot, listBots, updateBot } from "@/app/bot-actions";
import { useTenant } from "@/context/TenantContext";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { EmptyState, Panel, StatusPill } from "@/components/ui/Signal";

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

export default function BotsPage() {
  const { tenant, loading: tenantLoading } = useTenant();
  const [bots, setBots] = useState<Bot[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<BotForm>(EMPTY_FORM);
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Bot | null>(null);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const selectedBot = useMemo(() => bots.find((bot) => bot.$id === selectedId) ?? null, [bots, selectedId]);

  useEffect(() => {
    if (!tenant?.$id) {
      return;
    }

    let isActive = true;
    listBots(tenant.$id).then((response) => {
      if (!isActive) {
        return;
      }

      if (response.success) {
        setBots(response.bots);
        const firstBot = response.bots[0] ?? null;
        setSelectedId(firstBot?.$id ?? null);
        setForm(firstBot ? botToForm(firstBot) : EMPTY_FORM);
      } else {
        setStatus(response.error);
      }
    });

    return () => {
      isActive = false;
    };
  }, [tenant?.$id]);

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

  function requestDeleteBot() {
    if (!selectedBot) {
      return;
    }

    setDeleteTarget(selectedBot);
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
    const firstBot = remainingBots[0] ?? null;
    setSelectedId(firstBot?.$id ?? null);
    setForm(firstBot ? botToForm(firstBot) : EMPTY_FORM);
    setDeleteTarget(null);
    setDeleteConfirmed(false);
    setStatus("Agent deleted.");
  }

  if (tenantLoading) {
    return <main className="p-6 font-bold text-muted-foreground">Loading workspace...</main>;
  }

  return (
    <div className="cockpit-lane min-h-screen">
      <BotsHeader botCount={bots.length} />

      <div className="mx-auto grid max-w-6xl gap-4 px-4 py-6 sm:px-6 xl:grid-cols-[minmax(0,0.95fr)_440px] lg:px-8">
        <section className="grid content-start gap-3 md:grid-cols-2">
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
                className={`min-h-[160px] overflow-hidden rounded-2xl p-4 text-left text-white transition hover:-translate-y-1 ${
                  bot.$id === selectedId ? "outline outline-2 outline-[#0099ff]" : ""
                } ${botCardClass(index)}`}
                key={bot.$id}
                onClick={() => selectBot(bot)}
                type="button"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#090909]">{bot.$id === selectedId ? "active" : "configured"}</span>
                  <BotIcon aria-hidden="true" className="h-6 w-6" />
                </div>
                <h2 className="mt-10 break-words text-2xl font-semibold tracking-[-0.03em]">{bot.name}</h2>
                <p className="mt-2 truncate font-mono text-xs font-semibold text-white/75">{bot.$id}</p>
              </button>
            ))
          )}
        </section>

        <Panel className="h-fit overflow-hidden rounded-2xl border-[var(--ui-border)] bg-[var(--ui-panel)] p-5">
          <form onSubmit={saveBot}>
            <section className="mb-5 flex items-start justify-between gap-3 border-b border-[var(--ui-border)] pb-4">
              <div className="min-w-0 flex-1">
                <p className="studio-kicker text-[#0099ff]">Tenant: {tenant?.$id ?? "Unavailable"}</p>
                <h2 className="mt-1 text-3xl font-semibold leading-tight tracking-[-0.04em] text-[var(--ui-text)]">{selectedBot ? "Edit agent" : "Create agent"}</h2>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <StatusPill tone={selectedBot ? "hot" : "warn"}>
                  <span className="block max-w-24 truncate sm:max-w-36">{selectedBot ? selectedBot.$id : "new draft"}</span>
                </StatusPill>
                {selectedBot && (
                  <Button
                    className="h-9 w-9 p-0"
                    onClick={handleCopy}
                    size="icon"
                    type="button"
                    variant="outline"
                  >
                    {isCopied ? (
                      <Check aria-hidden="true" className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy aria-hidden="true" className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            </section>

            <div className="grid gap-4">
              <label className="block">
                <span className="studio-kicker mb-2 block text-[var(--ui-muted)]">Agent name</span>
                <input
                  className="min-h-11 w-full rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg)] px-3 text-sm font-semibold text-[var(--ui-text)] focus:border-[var(--ui-blue)] focus:bg-[var(--ui-panel)]"
                  maxLength={80}
                  required
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                />
              </label>

              <label className="block">
                <span className="studio-kicker mb-2 block text-[var(--ui-muted)]">System prompt</span>
                <textarea
                  className="min-h-60 w-full rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg)] px-3 py-3 font-mono text-sm leading-6 text-[var(--ui-text)] focus:border-[var(--ui-blue)] focus:bg-[var(--ui-panel)]"
                  maxLength={4000}
                  required
                  value={form.system_prompt}
                  onChange={(event) => setForm({ ...form, system_prompt: event.target.value })}
                />
              </label>

              <label className="block">
                <span className="studio-kicker mb-2 block text-[var(--ui-muted)]">Fallback message</span>
                <textarea
                  className="min-h-28 w-full rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg)] px-3 py-3 text-sm font-semibold leading-6 text-[var(--ui-text)] focus:border-[var(--ui-blue)] focus:bg-[var(--ui-panel)]"
                  maxLength={500}
                  required
                  value={form.fallback_message}
                  onChange={(event) => setForm({ ...form, fallback_message: event.target.value })}
                />
              </label>
            </div>

            {status ? <p className="mt-5 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg)] px-3 py-2 text-sm font-semibold text-[var(--ui-text)]">{status}</p> : null}

            <div className="mt-5 grid gap-3 sm:flex sm:flex-wrap">
              <Button className="w-full sm:w-auto" disabled={isSaving || !tenant?.$id} loading={isSaving} type="submit">
                Save agent
              </Button>
              <Button
                className="w-full sm:w-auto"
                disabled={!selectedBot}
                leftIcon={<Trash2 aria-hidden="true" className="h-4 w-4" />}
                onClick={requestDeleteBot}
                type="button"
                variant="danger"
              >
                Delete
              </Button>
            </div>
          </form>
        </Panel>
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

function BotsHeader({ botCount }: { botCount: number }) {
  const steps = [
    "Write the agent's support instructions.",
    "Set the fallback response customers will see.",
    "Save the agent before connecting it to WebChat.",
  ];

  return (
    <section className="studio-enter border-b border-[var(--ui-border)] bg-[var(--ui-bg)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="overflow-hidden rounded-[2rem] border border-[var(--ui-border)] bg-[var(--ui-panel)]">
          <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:p-8">
            <div className="min-w-0">
              <p className="inline-flex rounded-full border border-[var(--ui-border)] bg-[var(--ui-bg)] px-3 py-1 studio-kicker text-[#0099ff]">
                Support agent setup
              </p>
              <h1 className="mt-4 max-w-4xl text-3xl font-semibold leading-[1.04] tracking-[-0.02em] text-[var(--ui-text)] sm:text-4xl lg:text-5xl">
                Create customer support agents for this workspace.
              </h1>
              <p className="mt-4 max-w-2xl text-base font-medium leading-7 text-[var(--ui-muted)] sm:text-lg">
                Use this page to create, edit, and delete tenant-specific support agents. Each agent stores the instructions it should follow and the fallback message it should use when it cannot answer with confidence.
              </p>
            </div>

            <div className="grid content-start gap-3 rounded-3xl border border-[var(--ui-border)] bg-[var(--ui-bg)] p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="studio-kicker text-[var(--ui-muted)]">Configured agents</span>
                <StatusPill tone="warn">{botCount}</StatusPill>
              </div>
              <div className="grid gap-2">
                {steps.map((step, index) => (
                  <div className="flex min-h-11 items-center gap-3 rounded-full border border-[var(--ui-border)] bg-[var(--ui-panel)] px-3 text-sm font-semibold text-[var(--ui-text)]" key={step}>
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0099ff]/10 font-mono text-xs text-[#0099ff]">
                      {index + 1}
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

