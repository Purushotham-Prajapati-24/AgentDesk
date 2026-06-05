"use client";

import { ChangeEvent, DragEvent, FormEvent, useEffect, useState } from "react";
import { CheckCircle2, Database, FileArchive, FileSpreadsheet, FileText, FileUp, Globe2, Layers3, Link2, UploadCloud } from "lucide-react";
import { listBots } from "@/app/bot-actions";
import { useAuth } from "@/context/AuthContext";
import { useTenant } from "@/context/TenantContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type UploadState = {
  status: "idle" | "uploading" | "processing" | "success" | "error";
  message: string;
};

type BotOption = {
  $id: string;
  name: string;
};

type IngestResult = {
  chunks?: number;
  status?: string;
};

type IngestResponseBody = {
  success: boolean;
  error?: { message: string };
  data?: {
    processed?: IngestResult[];
    claimed?: number;
    remaining?: number;
  };
};

const FAN_OUT_CONCURRENCY = 3;
const acceptedPayloads = [
  { label: "PDF policies", icon: FileText, className: "border-[#ef4444]/30 bg-[linear-gradient(135deg,#fff1f2_0%,#fecdd3_50%,#ef4444_100%)] text-[#7f1d1d] dark:bg-[linear-gradient(135deg,#2a0b0f_0%,#7f1d1d_52%,#ef4444_100%)] dark:text-[#fff1f2]" },
  { label: "DOC manuals", icon: FileArchive, className: "border-[#2563eb]/30 bg-[linear-gradient(135deg,#eff6ff_0%,#bfdbfe_50%,#2563eb_100%)] text-[#172554] dark:bg-[linear-gradient(135deg,#07152f_0%,#1e3a8a_52%,#2563eb_100%)] dark:text-[#eff6ff]" },
  { label: "DOCX playbooks", icon: FileArchive, className: "border-[#4f46e5]/30 bg-[linear-gradient(135deg,#eef2ff_0%,#c7d2fe_50%,#4f46e5_100%)] text-[#1e1b4b] dark:bg-[linear-gradient(135deg,#11112d_0%,#312e81_52%,#4f46e5_100%)] dark:text-[#eef2ff]" },
  { label: "XLSX sheets", icon: FileSpreadsheet, className: "border-[#16a34a]/30 bg-[linear-gradient(135deg,#f0fdf4_0%,#bbf7d0_50%,#16a34a_100%)] text-[#052e16] dark:bg-[linear-gradient(135deg,#051b0d_0%,#166534_52%,#16a34a_100%)] dark:text-[#f0fdf4]" },
  { label: "XLS tables", icon: FileSpreadsheet, className: "border-[#65a30d]/30 bg-[linear-gradient(135deg,#f7fee7_0%,#d9f99d_50%,#65a30d_100%)] text-[#1a2e05] dark:bg-[linear-gradient(135deg,#101805_0%,#365314_52%,#65a30d_100%)] dark:text-[#f7fee7]" },
  { label: "CSV datasets", icon: Database, className: "border-[#0891b2]/30 bg-[linear-gradient(135deg,#ecfeff_0%,#a5f3fc_50%,#0891b2_100%)] text-[#083344] dark:bg-[linear-gradient(135deg,#061a20_0%,#155e75_52%,#0891b2_100%)] dark:text-[#ecfeff]" },
  { label: "TXT notes", icon: FileText, className: "border-[#f59e0b]/30 bg-[linear-gradient(135deg,#fffbeb_0%,#fde68a_50%,#f59e0b_100%)] text-[#451a03] dark:bg-[linear-gradient(135deg,#211403_0%,#92400e_52%,#f59e0b_100%)] dark:text-[#fffbeb]" },
  { label: "Markdown guides", icon: FileText, className: "border-[#0d9488]/30 bg-[linear-gradient(135deg,#f0fdfa_0%,#99f6e4_50%,#0d9488_100%)] text-[#042f2e] dark:bg-[linear-gradient(135deg,#041715_0%,#115e59_52%,#0d9488_100%)] dark:text-[#f0fdfa]" },
];

const workflowSteps = [
  { label: "Extract", detail: "Read files and public URLs into tenant-scoped source records." },
  { label: "Chunk", detail: "Break content into searchable passages for retrieval." },
  { label: "Index", detail: "Process vectors for the selected agent before it answers." },
];

export default function DocumentsPage() {
  const { tenant } = useTenant();
  const { user } = useAuth();
  const [botId, setBotId] = useState("");
  const [bots, setBots] = useState<BotOption[]>([]);
  const [sourceUrl, setSourceUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>({ status: "idle", message: "" });

  useEffect(() => {
    if (!tenant?.$id) {
      return;
    }

    let isActive = true;
    listBots(tenant.$id).then((response) => {
      if (!isActive) {
        return;
      }

      if (!response.success) {
        setUploadState({ status: "error", message: response.error });
        return;
      }

      setBots(response.bots);
      setBotId((current) => current || response.bots[0]?.$id || "");
    });

    return () => {
      isActive = false;
    };
  }, [tenant?.$id]);

  async function uploadDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!tenant?.$id) {
      setUploadState({ status: "error", message: "Tenant context is not ready." });
      return;
    }

    if (!botId) {
      setUploadState({ status: "error", message: "Agent ID is required." });
      return;
    }

    if (!file) {
      setUploadState({ status: "error", message: "Choose a document before uploading." });
      return;
    }

    const formData = new FormData();
    formData.set("tenant_id", tenant.$id);
    formData.set("bot_id", botId);
    formData.set("user_id", user?.$id || "");
    formData.set("file", file);

    setUploadState({ status: "uploading", message: "Uploading and extracting document text..." });
    const response = await fetch("/api/documents/upload", { method: "POST", body: formData });
    const body = (await response.json()) as { success: boolean; error?: { message: string }; data?: { document_id: string } };

    if (!response.ok || !body.success) {
      setUploadState({ status: "error", message: body.error?.message ?? "Upload failed." });
      return;
    }

    setUploadState({ status: "processing", message: `Document uploaded. Starting vector processing for ${body.data?.document_id ?? "the file"}...` });
    setFile(null);

    let result;
    try {
      result = await runIngestionWorkers({
        tenantId: tenant.$id,
        botId,
        userId: user?.$id || "",
        queuedCount: 1,
        concurrency: 1,
        onProgress: ({ processedCount, chunkCount }) => {
          setUploadState({ status: "processing", message: `Vector processing in progress: ${processedCount} document(s), ${chunkCount} chunk(s).` });
        },
      });
    } catch (error) {
      setUploadState({ status: "error", message: error instanceof Error ? error.message : "Upload succeeded, but vector processing failed." });
      return;
    }

    setUploadState({
      status: result.failedCount > 0 ? "error" : "success",
      message: `Vector processing complete for ${result.processedCount} document(s), ${result.chunkCount} chunk(s). Failed: ${result.failedCount}.`,
    });
  }

  async function ingestUrl(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!tenant?.$id) {
      setUploadState({ status: "error", message: "Tenant context is not ready." });
      return;
    }

    if (!botId) {
      setUploadState({ status: "error", message: "Agent ID is required." });
      return;
    }

    setUploadState({ status: "uploading", message: "Queueing URL ingestion..." });
    const response = await fetch("/api/documents/url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenant_id: tenant.$id,
        bot_id: botId,
        user_id: user?.$id,
        url: sourceUrl,
      }),
    });
    const body = (await response.json()) as {
      success: boolean;
      error?: { message: string };
      data?: { document_id?: string; count?: number; sitemap?: boolean };
    };

    if (!response.ok || !body.success) {
      setUploadState({ status: "error", message: body.error?.message ?? "URL ingestion failed." });
      return;
    }

    const queuedCount = body.data?.count ?? 1;
    setUploadState({
      status: "processing",
      message: `Queued ${queuedCount} source${queuedCount === 1 ? "" : "s"}. Starting vector processing...`,
    });
    let result;
    try {
      result = await runIngestionWorkers({
        tenantId: tenant.$id,
        botId,
        userId: user?.$id || "",
        queuedCount,
        concurrency: body.data?.sitemap ? FAN_OUT_CONCURRENCY : 1,
        onProgress: ({ processedCount, chunkCount, failedCount }) => {
          setUploadState({
            status: "processing",
            message: `Vector processing in progress: ${processedCount}/${queuedCount} source(s), ${chunkCount} chunk(s), ${failedCount} failed.`,
          });
        },
      });
    } catch (error) {
      setUploadState({ status: "error", message: error instanceof Error ? error.message : "URL captured, but vector processing failed." });
      return;
    }

    setSourceUrl("");
    setUploadState({
      status: result.failedCount > 0 ? "error" : "success",
      message: `Vector processing complete for ${result.processedCount} queued source(s), ${result.chunkCount} chunk(s). Failed: ${result.failedCount}.`,
    });
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
    setUploadState({ status: "idle", message: "" });
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setFile(event.dataTransfer.files[0] ?? null);
    setUploadState({ status: "idle", message: "" });
  }

  return (
    <div className="cockpit-lane min-h-screen bg-[var(--ui-bg)] text-[var(--ui-text)]">
      <section className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-[#f59e0b]/35 bg-[linear-gradient(135deg,#fef3c7_0%,#ccfbf1_42%,#0f766e_100%)] text-[#132f1f] shadow-[0_24px_70px_rgba(15,118,110,0.18)] dark:bg-[linear-gradient(135deg,#1c1607_0%,#0f3f3a_48%,#d97706_100%)] dark:text-[#fff7ed]">
          <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:p-7">
            <div className="min-w-0">
              <p className="inline-flex rounded-full border border-[#134e4a]/20 bg-white/55 px-3 py-1 font-mono text-xs font-semibold uppercase text-[#134e4a] dark:border-white/20 dark:bg-black/20 dark:text-[#fde68a]">
                Knowledge intake
              </p>
              <h1 className="mt-3 max-w-4xl text-4xl font-semibold leading-[1.05] tracking-[-0.03em] text-current sm:text-5xl lg:text-6xl">
                Turn trusted files and URLs into agent-ready answers.
              </h1>
            </div>

            <div className="grid content-between gap-5 rounded-3xl border border-white/35 bg-white/35 p-5 text-[#12372d] shadow-[inset_0_1px_0_rgba(255,255,255,0.24)] dark:bg-black/20 dark:text-[#fff7ed]">
              <div>
                <p className="font-mono text-xs font-semibold uppercase opacity-70">Tenant workspace</p>
                <p className="mt-3 break-all font-mono text-2xl font-semibold tracking-[-0.04em]">{tenant?.$id ?? "Unavailable"}</p>
                <p className="mt-3 text-sm font-medium leading-6 opacity-70">Every source is stored and indexed against this workspace.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white/70 px-3 py-2 text-xs font-semibold text-[#134e4a] dark:bg-white/20 dark:text-[#fff7ed]">{bots.length} agents found</span>
                <span className="rounded-full border border-[#134e4a]/15 bg-white/30 px-3 py-2 text-xs font-semibold text-[#0f766e] dark:border-white/20 dark:bg-black/15 dark:text-[#fde68a]">Hybrid retrieval ready</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-5 px-4 pb-8 sm:px-6 lg:grid-cols-[360px_minmax(0,1fr)] lg:px-8">
        <aside className="grid h-fit gap-5">
          <section className="rounded-[1.5rem] border border-[var(--ui-border)] bg-[var(--ui-panel)] p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--ui-text)] text-[var(--ui-bg)]">
                <FileUp aria-hidden="true" className="h-5 w-5" />
              </span>
              <div>
                <p className="font-mono text-xs font-semibold uppercase text-[var(--ui-muted)]">Accepted payloads</p>
                <h2 className="text-lg font-semibold text-[var(--ui-text)]">Source formats</h2>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {acceptedPayloads.map((item) => {
                const Icon = item.icon;
                return (
                  <div className={`rounded-2xl border p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] ${item.className}`} key={item.label}>
                    <Icon aria-hidden="true" className="h-4 w-4 opacity-85" />
                    <p className="mt-3 text-sm font-semibold leading-5 text-current">{item.label}</p>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-[1.5rem] border border-[var(--ui-border)] bg-[var(--ui-panel)] p-5">
            <p className="font-mono text-xs font-semibold uppercase text-[var(--ui-muted)]">Processing flow</p>
            <div className="mt-5 grid gap-3">
              {workflowSteps.map((step, index) => (
                <div className="flex gap-3 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-bg)] p-3" key={step.label}>
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--ui-panel-2)] font-mono text-xs font-semibold text-[var(--ui-blue)]">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[var(--ui-text)]">{step.label}</p>
                    <p className="mt-1 text-xs font-medium leading-5 text-[var(--ui-muted)]">{step.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>

        <section className="min-w-0 overflow-hidden rounded-[1.5rem] border border-[var(--ui-border)] bg-[var(--ui-panel)]">
          <div className="border-b border-[var(--ui-border)] bg-[var(--ui-panel-2)] px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--ui-text)] text-[var(--ui-bg)]">
                  <Layers3 aria-hidden="true" className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-xl font-semibold tracking-[-0.02em] text-[var(--ui-text)]">Add knowledge</h2>
                  <p className="text-sm font-medium text-[var(--ui-muted)]">Choose an agent, upload a file, or ingest a public source.</p>
                </div>
              </div>
              <span className="rounded-full border border-[var(--ui-border)] bg-[var(--ui-panel)] px-3 py-1 font-mono text-xs font-semibold text-[var(--ui-muted)]">
                {uploadState.status}
              </span>
            </div>
          </div>

          <div className="p-5">
            <form onSubmit={uploadDocument}>
              <label className="block">
                <span className="studio-kicker mb-2 block text-[var(--ui-muted)]">Agent</span>
                <select
                  className="min-h-11 w-full rounded-xl border border-[var(--ui-border)] bg-[var(--ui-bg)] px-3 py-2 text-sm font-semibold text-[var(--ui-text)] outline-none transition focus:border-[var(--ui-blue)] focus:bg-[var(--ui-panel-2)]"
                  value={botId}
                  onChange={(event) => setBotId(event.target.value)}
                >
                  <option value="">{bots.length === 0 ? "Create an agent before uploading knowledge" : "Select an agent"}</option>
                  {bots.map((bot) => (
                    <option key={bot.$id} value={bot.$id}>
                      {bot.name} / {bot.$id}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs font-medium leading-5 text-[var(--ui-muted)]">
                  Sources are indexed for this exact agent ID. The widget must use the same agent.
                </p>
              </label>

              <label
                className="mt-5 flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-[1.5rem] border-2 border-dashed border-[var(--ui-border)] bg-[var(--ui-bg)] px-4 py-8 text-center transition hover:border-[var(--ui-blue)] hover:bg-[var(--ui-panel-2)] sm:min-h-72 sm:px-6 sm:py-10"
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleDrop}
              >
                <span className="grid h-16 w-16 place-items-center rounded-full bg-[var(--ui-panel)] text-[var(--ui-blue)]">
                  <UploadCloud aria-hidden="true" className="h-8 w-8" />
                </span>
                <span className="mt-5 max-w-full break-words text-xl font-semibold text-[var(--ui-text)] sm:text-2xl">{file ? file.name : "Drop source file"}</span>
                <span className="mt-2 max-w-md text-sm font-medium leading-6 text-[var(--ui-muted)]">
                  Click or drop a PDF, DOC, DOCX, XLSX, XLS, CSV, TXT, or MD file. Text extraction starts before vector processing.
                </span>
                <input className="sr-only" type="file" accept=".pdf,.doc,.docx,.xlsx,.xls,.csv,.txt,.md" onChange={handleFileChange} />
              </label>

              {uploadState.message ? (
                <p className={uploadMessageClass(uploadState.status)} role="status">
                  {uploadState.status === "success" ? <CheckCircle2 aria-hidden="true" className="h-4 w-4 shrink-0" /> : null}
                  {uploadState.message}
                </p>
              ) : null}

              <Button
                className="mt-5 w-full rounded-full sm:w-auto"
                disabled={uploadState.status === "processing"}
                leftIcon={<UploadCloud aria-hidden="true" className="h-4 w-4" />}
                loading={uploadState.status === "uploading"}
                type="submit"
              >
                Upload document
              </Button>
            </form>

            <form className="mt-6 rounded-[1.5rem] border border-[var(--ui-border)] bg-[var(--ui-bg)] p-4 sm:p-5" onSubmit={ingestUrl}>
              <div className="mb-4 flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--ui-panel)] text-[var(--ui-blue)]">
                  <Globe2 aria-hidden="true" className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-semibold text-[var(--ui-text)]">Ingest public URL</h3>
                  <p className="text-sm font-medium text-[var(--ui-muted)]">Use this for help centers, FAQs, policies, product pages, or sitemap.xml files.</p>
                </div>
              </div>
              <Input
                label="Source URL"
                value={sourceUrl}
                onChange={(event) => setSourceUrl(event.target.value)}
                hint="The URL will be queued, extracted, and processed into the selected agent knowledge base."
              />
              <Button
                className="mt-5 w-full rounded-full sm:w-auto"
                disabled={!sourceUrl.trim() || uploadState.status === "processing"}
                leftIcon={<Link2 aria-hidden="true" className="h-4 w-4" />}
                loading={uploadState.status === "uploading"}
                type="submit"
                variant="secondary"
              >
                Ingest URL
              </Button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}

async function runIngestionWorkers({
  tenantId,
  botId,
  userId,
  queuedCount,
  concurrency,
  onProgress,
}: {
  tenantId: string;
  botId: string;
  userId: string;
  queuedCount: number;
  concurrency: number;
  onProgress: (progress: { processedCount: number; chunkCount: number; failedCount: number }) => void;
}) {
  const workerCount = Math.max(1, Math.min(concurrency, queuedCount || 1));
  const totals = { processedCount: 0, chunkCount: 0, failedCount: 0 };

  async function runWorker(workerIndex: number) {
    const workerId = `dashboard-${Date.now().toString(36)}-${workerIndex}-${crypto.randomUUID()}`;

    while (true) {
      const response = await fetch("/api/documents/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: tenantId,
          bot_id: botId,
          user_id: userId,
          limit: 1,
          worker_id: workerId,
        }),
      });
      const body = (await response.json()) as IngestResponseBody;

      if (!response.ok || !body.success) {
        throw new Error(body.error?.message ?? "Vector processing failed.");
      }

      const processed = body.data?.processed ?? [];
      totals.processedCount += processed.length;
      totals.chunkCount += processed.reduce((total, item) => total + (item.chunks ?? 0), 0);
      totals.failedCount += processed.filter((item) => item.status === "failed").length;

      if (processed.length > 0) {
        onProgress(totals);
      }

      if ((body.data?.claimed ?? 0) === 0 || (body.data?.remaining ?? 0) === 0) {
        break;
      }
    }
  }

  await Promise.all(Array.from({ length: workerCount }, (_, index) => runWorker(index)));
  return totals;
}

function uploadMessageClass(status: UploadState["status"]) {
  if (status === "success") {
    return "mt-5 flex items-start gap-2 rounded-2xl border border-[#22c55e]/40 bg-[#22c55e]/10 px-3 py-2 text-sm font-semibold text-[#16a34a]";
  }

  if (status === "error") {
    return "mt-5 flex items-start gap-2 rounded-2xl border border-[#ff5530]/40 bg-[#ff5530]/10 px-3 py-2 text-sm font-semibold text-[#ff5530]";
  }

  return "mt-5 flex items-start gap-2 rounded-2xl border border-[var(--ui-blue)]/40 bg-[var(--ui-blue)]/10 px-3 py-2 text-sm font-semibold text-[var(--ui-blue)]";
}

