"use client";

import { ChangeEvent, DragEvent, FormEvent, useEffect, useState } from "react";
import { FileUp, UploadCloud } from "lucide-react";
import { listBots } from "@/app/bot-actions";
import { useAuth } from "@/context/AuthContext";
import { useTenant } from "@/context/TenantContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageHeader, Panel, StatusPill } from "@/components/ui/Signal";

type UploadState = {
  status: "idle" | "uploading" | "processing" | "success" | "error";
  message: string;
};

type BotOption = {
  $id: string;
  name: string;
};

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
      setUploadState({ status: "error", message: "Bot ID is required." });
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

    const ingestResponse = await fetch("/api/documents/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenant_id: tenant.$id,
        bot_id: botId,
        user_id: user?.$id,
        limit: 10,
      }),
    });
    const ingestBody = (await ingestResponse.json()) as { success: boolean; error?: { message: string }; data?: { processed?: Array<{ chunks?: number }> } };

    if (!ingestResponse.ok || !ingestBody.success) {
      setUploadState({ status: "error", message: ingestBody.error?.message ?? "Upload succeeded, but vector processing failed." });
      return;
    }

    const processedCount = ingestBody.data?.processed?.length ?? 0;
    const chunkCount = ingestBody.data?.processed?.reduce((total, item) => total + (item.chunks ?? 0), 0) ?? 0;
    setUploadState({ status: "success", message: `Vector processing complete for ${processedCount} document(s), ${chunkCount} chunk(s).` });
  }

  async function ingestUrl(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!tenant?.$id) {
      setUploadState({ status: "error", message: "Tenant context is not ready." });
      return;
    }

    if (!botId) {
      setUploadState({ status: "error", message: "Bot ID is required." });
      return;
    }

    setUploadState({ status: "uploading", message: "Fetching URL and extracting readable text..." });
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
    const body = (await response.json()) as { success: boolean; error?: { message: string }; data?: { document_id: string } };

    if (!response.ok || !body.success) {
      setUploadState({ status: "error", message: body.error?.message ?? "URL ingestion failed." });
      return;
    }

    setUploadState({ status: "processing", message: `URL captured. Starting vector processing for ${body.data?.document_id ?? "the page"}...` });
    const ingestResponse = await fetch("/api/documents/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenant_id: tenant.$id,
        bot_id: botId,
        user_id: user?.$id,
        limit: 10,
      }),
    });
    const ingestBody = (await ingestResponse.json()) as { success: boolean; error?: { message: string }; data?: { processed?: Array<{ chunks?: number }> } };

    if (!ingestResponse.ok || !ingestBody.success) {
      setUploadState({ status: "error", message: ingestBody.error?.message ?? "URL captured, but vector processing failed." });
      return;
    }

    setSourceUrl("");
    const processedCount = ingestBody.data?.processed?.length ?? 0;
    const chunkCount = ingestBody.data?.processed?.reduce((total, item) => total + (item.chunks ?? 0), 0) ?? 0;
    setUploadState({ status: "success", message: `Vector processing complete for ${processedCount} source(s), ${chunkCount} chunk(s).` });
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
    <div className="min-h-screen">
      <PageHeader
        kicker="Knowledge base"
        title="Drop the facts before the bot talks."
        description="Upload tenant-scoped source files for parsing and hybrid vector ingestion. Supported formats are PDF, DOC, DOCX, XLSX, XLS, CSV, TXT, and Markdown."
        action={<StatusPill tone="warn">Tenant: {tenant?.$id ?? "Unavailable"}</StatusPill>}
      />

      <div className="mx-auto grid max-w-6xl gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[360px_minmax(0,1fr)] lg:px-8">
        <Panel className="h-fit p-5">
          <p className="studio-kicker text-muted-foreground">Accepted payloads</p>
          <div className="mt-5 grid gap-3">
            {["PDF policies", "DOC manuals", "DOCX manuals", "XLSX spreadsheets", "XLS spreadsheets", "CSV tables", "TXT notes", "Markdown guides"].map((item) => (
              <div className="flex items-center gap-3 border border-border bg-secondary/60 px-3 py-2 font-bold" key={item}>
                <FileUp aria-hidden="true" className="h-4 w-4 text-primary" />
                {item}
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="p-5">
          <form onSubmit={uploadDocument}>
            <label className="block">
              <span className="studio-kicker mb-2 block text-muted-foreground">Bot</span>
              <select
                className="min-h-11 w-full rounded-md border border-input bg-card-elevated px-3 py-2 text-sm font-bold text-foreground focus:border-primary focus:bg-card"
                value={botId}
                onChange={(event) => setBotId(event.target.value)}
              >
                <option value="">{bots.length === 0 ? "Create a bot before uploading knowledge" : "Select a bot"}</option>
                {bots.map((bot) => (
                  <option key={bot.$id} value={bot.$id}>
                    {bot.name} / {bot.$id}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs font-medium leading-5 text-muted-foreground">
                Documents are indexed for this exact bot ID. The widget must use the same bot.
              </p>
            </label>

            <label
              className="mt-5 flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-primary/50 bg-primary/10 px-4 py-8 text-center transition hover:bg-primary/20 sm:min-h-72 sm:px-6 sm:py-10"
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
            >
              <UploadCloud aria-hidden="true" className="h-12 w-12 text-foreground" />
              <span className="mt-5 max-w-full break-words text-xl font-bold text-foreground sm:text-2xl">{file ? file.name : "Drop source file"}</span>
              <span className="mt-2 max-w-md text-sm font-bold leading-6 text-muted-foreground">
                Click or drop a PDF, DOC, DOCX, XLSX, XLS, CSV, TXT, or MD file. The upload API will extract text before vector processing.
              </span>
              <input className="sr-only" type="file" accept=".pdf,.doc,.docx,.xlsx,.xls,.csv,.txt,.md" onChange={handleFileChange} />
            </label>

            {uploadState.message ? (
              <p className={uploadMessageClass(uploadState.status)} role="status">
                {uploadState.message}
              </p>
            ) : null}

            <Button className="mt-5 w-full sm:w-auto" loading={uploadState.status === "uploading"} type="submit">
              Upload document
            </Button>
          </form>

          <form className="mt-6 border-t border-border pt-5" onSubmit={ingestUrl}>
            <Input
              label="Source URL"
              value={sourceUrl}
              onChange={(event) => setSourceUrl(event.target.value)}
              hint="Capture public help center articles, policies, FAQs, or product pages."
            />
            <Button className="mt-5 w-full sm:w-auto" disabled={!sourceUrl.trim()} loading={uploadState.status === "uploading"} type="submit" variant="secondary">
              Ingest URL
            </Button>
          </form>
        </Panel>
      </div>
    </div>
  );
}

function uploadMessageClass(status: UploadState["status"]) {
  if (status === "success") {
    return "mt-5 border border-border bg-primary/10 px-3 py-2 text-sm font-bold text-foreground";
  }

  if (status === "error") {
    return "mt-5 border border-border bg-destructive px-3 py-2 text-sm font-bold text-white";
  }

  return "mt-5 border border-border bg-secondary/60 px-3 py-2 text-sm font-bold text-foreground";
}

