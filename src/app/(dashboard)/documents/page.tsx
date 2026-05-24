"use client";

import { ChangeEvent, DragEvent, FormEvent, useState } from "react";
import { FileUp, UploadCloud } from "lucide-react";
import { useTenant } from "@/context/TenantContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageHeader, Panel, StatusPill } from "@/components/ui/Signal";

type UploadState = {
  status: "idle" | "uploading" | "success" | "error";
  message: string;
};

export default function DocumentsPage() {
  const { tenant } = useTenant();
  const [botId, setBotId] = useState("test-id");
  const [file, setFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>({ status: "idle", message: "" });

  async function uploadDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!tenant?.$id) {
      setUploadState({ status: "error", message: "Tenant context is not ready." });
      return;
    }

    if (!file) {
      setUploadState({ status: "error", message: "Choose a document before uploading." });
      return;
    }

    const formData = new FormData();
    formData.set("tenant_id", tenant.$id);
    formData.set("bot_id", botId);
    formData.set("file", file);

    setUploadState({ status: "uploading", message: "Uploading and extracting document text..." });
    const response = await fetch("/api/documents/upload", { method: "POST", body: formData });
    const body = (await response.json()) as { success: boolean; error?: { message: string }; data?: { document_id: string } };

    if (!response.ok || !body.success) {
      setUploadState({ status: "error", message: body.error?.message ?? "Upload failed." });
      return;
    }

    setUploadState({ status: "success", message: `Document queued for vector processing: ${body.data?.document_id ?? ""}` });
    setFile(null);
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
        description="Upload tenant-scoped source files for parsing and vector ingestion. Supported formats are PDF, DOCX, CSV, TXT, and Markdown."
        action={<StatusPill tone="warn">Tenant: {tenant?.$id ?? "Unavailable"}</StatusPill>}
      />

      <div className="mx-auto grid max-w-6xl gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[360px_1fr] lg:px-8">
        <Panel className="h-fit p-5">
          <p className="signal-kicker text-muted">Accepted payloads</p>
          <div className="mt-5 grid gap-3">
            {["PDF policies", "DOCX manuals", "CSV tables", "TXT notes", "Markdown guides"].map((item) => (
              <div className="flex items-center gap-3 border-2 border-line bg-panel-warm px-3 py-2 font-bold" key={item}>
                <FileUp aria-hidden="true" className="h-4 w-4 text-signal" />
                {item}
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="p-5">
          <form onSubmit={uploadDocument}>
            <Input
              label="Bot ID"
              value={botId}
              onChange={(event) => setBotId(event.target.value)}
              hint="Documents are scoped to this bot and the active tenant."
            />

            <label
              className="mt-5 flex min-h-72 cursor-pointer flex-col items-center justify-center border-2 border-dashed border-line bg-yellow/60 px-6 py-10 text-center transition hover:bg-yellow"
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
            >
              <UploadCloud aria-hidden="true" className="h-12 w-12 text-line" />
              <span className="mt-5 text-2xl font-black text-line">{file ? file.name : "Drop source file"}</span>
              <span className="mt-2 max-w-md text-sm font-bold leading-6 text-muted">
                Click or drop a PDF, DOCX, CSV, TXT, or MD file. The upload API will extract text before vector processing.
              </span>
              <input className="sr-only" type="file" accept=".pdf,.docx,.csv,.txt,.md" onChange={handleFileChange} />
            </label>

            {uploadState.message ? (
              <p className={uploadMessageClass(uploadState.status)} role="status">
                {uploadState.message}
              </p>
            ) : null}

            <Button className="mt-5" loading={uploadState.status === "uploading"} type="submit">
              Upload document
            </Button>
          </form>
        </Panel>
      </div>
    </div>
  );
}

function uploadMessageClass(status: UploadState["status"]) {
  if (status === "success") {
    return "mt-5 border-2 border-line bg-yellow px-3 py-2 text-sm font-bold text-line";
  }

  if (status === "error") {
    return "mt-5 border-2 border-line bg-coral px-3 py-2 text-sm font-bold text-white";
  }

  return "mt-5 border-2 border-line bg-panel-warm px-3 py-2 text-sm font-bold text-line";
}
