"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createBot, deleteBot, listBots, updateBot } from "@/app/bot-actions";
import { useTenant } from "@/context/TenantContext";

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

  async function removeSelectedBot() {
    if (!tenant?.$id || !selectedBot) {
      return;
    }

    const response = await deleteBot(selectedBot.$id, tenant.$id);
    if (!response.success) {
      setStatus(response.error);
      return;
    }

    const remainingBots = bots.filter((bot) => bot.$id !== selectedBot.$id);
    setBots(remainingBots);
    const firstBot = remainingBots[0] ?? null;
    setSelectedId(firstBot?.$id ?? null);
    setForm(firstBot ? botToForm(firstBot) : EMPTY_FORM);
    setStatus("Bot deleted.");
  }

  if (tenantLoading) {
    return <main className="p-6 text-sm text-slate-600">Loading workspace...</main>;
  }

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <div className="mx-auto grid min-h-screen w-full max-w-7xl gap-5 px-4 py-5 lg:grid-cols-[320px_1fr]">
        <aside className="rounded-lg border border-slate-300 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold leading-6 text-slate-500">Bot configs</p>
              <h1 className="text-xl font-semibold leading-tight">Bots</h1>
            </div>
            <button
              className="rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white"
              onClick={() => {
                setSelectedId(null);
                setForm(EMPTY_FORM);
                setStatus("");
              }}
              type="button"
            >
              New
            </button>
          </div>

          <div className="space-y-2">
            {bots.length === 0 ? (
              <p className="rounded-md border border-dashed border-slate-300 p-4 text-sm leading-6 text-slate-500">
                No bots are configured for this tenant yet.
              </p>
            ) : (
              bots.map((bot) => (
                <button
                  className={`w-full rounded-md border p-3 text-left text-sm ${
                    bot.$id === selectedId ? "border-slate-950 bg-slate-100" : "border-slate-200 bg-white"
                  }`}
                  key={bot.$id}
                  onClick={() => selectBot(bot)}
                  type="button"
                >
                  <span className="block font-semibold text-slate-950">{bot.name}</span>
                  <span className="mt-1 block truncate text-xs text-slate-500">{bot.$id}</span>
                </button>
              ))
            )}
          </div>
        </aside>

        <form className="rounded-lg border border-slate-300 bg-white p-5 shadow-sm" onSubmit={saveBot}>
          <section className="mb-5 border-b border-slate-200 pb-4">
            <p className="text-sm font-semibold leading-6 text-slate-500">Tenant: {tenant?.$id ?? "Unavailable"}</p>
            <h2 className="text-2xl font-semibold leading-tight">{selectedBot ? "Edit bot" : "Create bot"}</h2>
          </section>

          <div className="grid gap-4">
            <label className="text-sm font-semibold text-slate-700">
              Bot Name
              <input
                className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-slate-950"
                maxLength={80}
                required
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </label>

            <label className="text-sm font-semibold text-slate-700">
              System Prompt
              <textarea
                className="mt-1 min-h-56 w-full rounded-md border border-slate-300 px-3 py-2 text-sm leading-6 outline-none focus:border-slate-950"
                maxLength={4000}
                required
                value={form.system_prompt}
                onChange={(event) => setForm({ ...form, system_prompt: event.target.value })}
              />
            </label>

            <label className="text-sm font-semibold text-slate-700">
              Fallback Message
              <textarea
                className="mt-1 min-h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-sm leading-6 outline-none focus:border-slate-950"
                maxLength={500}
                required
                value={form.fallback_message}
                onChange={(event) => setForm({ ...form, fallback_message: event.target.value })}
              />
            </label>
          </div>

          {status ? <p className="mt-4 rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700">{status}</p> : null}

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              className="h-11 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={isSaving || !tenant?.$id}
              type="submit"
            >
              {isSaving ? "Saving..." : "Save bot"}
            </button>
            <button
              className="h-11 rounded-md border border-rose-300 px-4 text-sm font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!selectedBot}
              onClick={() => void removeSelectedBot()}
              type="button"
            >
              Delete
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

function botToForm(bot: Bot): BotForm {
  return {
    name: bot.name,
    system_prompt: bot.system_prompt,
    fallback_message: bot.fallback_message,
  };
}
