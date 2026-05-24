"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Bot as BotIcon, Check, Copy, Plus, Trash2 } from "lucide-react";
import { createBot, deleteBot, listBots, updateBot } from "@/app/bot-actions";
import { useTenant } from "@/context/TenantContext";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { EmptyState, PageHeader, Panel, StatusPill } from "@/components/ui/Signal";

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
    setStatus("Bot configuration saved.");
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
    setStatus("Bot deleted.");
  }

  if (tenantLoading) {
    return <main className="p-6 font-bold text-muted-foreground">Loading workspace...</main>;
  }

  return (
    <div className="min-h-screen">
      <PageHeader
        kicker="Bot studio"
        title="Write the behavior before the support line opens."
        description="Create tenant-scoped support agents, set their instruction spine, and define the fallback message customers hear when knowledge is missing."
        action={<StatusPill tone="warn">{bots.length} configured</StatusPill>}
      />

      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[340px_1fr] lg:px-8">
        <Panel className="h-fit p-4">
          <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
            <div>
              <p className="studio-kicker text-muted-foreground">Roster</p>
              <h2 className="text-2xl font-bold">Bots</h2>
            </div>
            <Button
              leftIcon={<Plus aria-hidden="true" className="h-4 w-4" />}
              onClick={() => {
                setSelectedId(null);
                setForm(EMPTY_FORM);
                setStatus("");
              }}
              size="sm"
              type="button"
              variant="secondary"
            >
              New
            </Button>
          </div>

          <div className="mt-4 grid gap-2">
            {bots.length === 0 ? (
              <EmptyState title="No bots configured" description="Create a support agent for this tenant to begin training behavior." />
            ) : (
              bots.map((bot) => (
                <button
                  className={`group w-full border-2 p-3 text-left text-sm transition hover:-translate-y-0.5 ${
                    bot.$id === selectedId ? "border-border bg-primary/10" : "border-border bg-card hover:bg-secondary/60"
                  }`}
                  key={bot.$id}
                  onClick={() => selectBot(bot)}
                  type="button"
                >
                  <span className="flex items-center gap-2 font-bold text-foreground">
                    <BotIcon aria-hidden="true" className="h-4 w-4 text-primary" />
                    {bot.name}
                  </span>
                  <span className="mt-2 block truncate font-mono text-xs font-bold text-muted-foreground">{bot.$id}</span>
                </button>
              ))
            )}
          </div>
        </Panel>

        <Panel className="p-5">
          <form onSubmit={saveBot}>
            <section className="mb-5 flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="studio-kicker text-muted-foreground">Tenant: {tenant?.$id ?? "Unavailable"}</p>
                <h2 className="text-3xl font-bold leading-tight">{selectedBot ? "Edit bot" : "Create bot"}</h2>
              </div>
              <div className="flex items-center gap-2">
                <StatusPill tone={selectedBot ? "hot" : "warn"}>{selectedBot ? selectedBot.$id : "new draft"}</StatusPill>
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
                <span className="studio-kicker mb-2 block text-muted-foreground">Bot name</span>
                <input
                  className="min-h-11 w-full border border-border bg-card px-3 text-sm font-bold focus:bg-secondary/60"
                  maxLength={80}
                  required
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                />
              </label>

              <label className="block">
                <span className="studio-kicker mb-2 block text-muted-foreground">System prompt</span>
                <textarea
                  className="min-h-60 w-full border border-border bg-card px-3 py-3 font-mono text-sm leading-6 focus:bg-secondary/60"
                  maxLength={4000}
                  required
                  value={form.system_prompt}
                  onChange={(event) => setForm({ ...form, system_prompt: event.target.value })}
                />
              </label>

              <label className="block">
                <span className="studio-kicker mb-2 block text-muted-foreground">Fallback message</span>
                <textarea
                  className="min-h-28 w-full border border-border bg-card px-3 py-3 text-sm font-bold leading-6 focus:bg-secondary/60"
                  maxLength={500}
                  required
                  value={form.fallback_message}
                  onChange={(event) => setForm({ ...form, fallback_message: event.target.value })}
                />
              </label>
            </div>

            {status ? <p className="mt-5 border border-border bg-secondary/60 px-3 py-2 text-sm font-bold text-foreground">{status}</p> : null}

            <div className="mt-5 flex flex-wrap gap-3">
              <Button disabled={isSaving || !tenant?.$id} loading={isSaving} type="submit">
                Save bot
              </Button>
              <Button
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
              <h2 className="mt-1 text-2xl font-bold leading-tight">Delete {deleteTarget?.name ?? "this bot"}?</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-muted-foreground">
                This removes the bot record, its WebChat preferences, uploaded document records, stored document files, and
                Qdrant knowledge chunks for this tenant/bot scope.
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
              I understand this permanently deletes {deleteTarget?.name ?? "this bot"} and its indexed knowledge.
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

function botToForm(bot: Bot): BotForm {
  return {
    name: bot.name,
    system_prompt: bot.system_prompt,
    fallback_message: bot.fallback_message,
  };
}

