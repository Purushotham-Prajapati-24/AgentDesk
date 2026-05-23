"use client";

import { ChangeEvent, DragEvent, FormEvent, useState } from "react";
import { useTenant } from "@/context/TenantContext";

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
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-5">
        <section className="border-b border-slate-200 pb-5">
          <p className="text-sm font-semibold leading-6 text-slate-500">Knowledge base</p>
          <h1 className="text-2xl font-semibold leading-tight">Document ingestion</h1>
          <p className="mt-2 max-w-[65ch] text-sm leading-6 text-slate-600">
            Upload tenant-scoped source files for parsing and vector ingestion. Supported formats are PDF, DOCX, CSV, TXT,
            and Markdown.
          </p>
        </section>

        <form className="mt-5 rounded-lg border border-slate-300 bg-white p-5 shadow-sm" onSubmit={uploadDocument}>
          <label className="block text-sm font-semibold text-slate-700">
            Bot ID
            <input
              className="mt-1 h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-slate-950"
              value={botId}
              onChange={(event) => setBotId(event.target.value)}
            />
          </label>

          <label
            className="mt-4 flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center hover:border-slate-500"
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
          >
            <span className="text-base font-semibold text-slate-900">{file ? file.name : "Drop a document here"}</span>
            <span className="mt-2 text-sm leading-6 text-slate-600">or click to choose a PDF, DOCX, CSV, TXT, or MD file</span>
            <input className="sr-only" type="file" accept=".pdf,.docx,.csv,.txt,.md" onChange={handleFileChange} />
          </label>

          {uploadState.message ? (
            <p className={uploadMessageClass(uploadState.status)} role="status">
              {uploadState.message}
            </p>
          ) : null}

          <button
            className="mt-4 h-11 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={uploadState.status === "uploading"}
            type="submit"
          >
            Upload Document
          </button>
        </form>
      </div>
    </main>
  );
}

function uploadMessageClass(status: UploadState["status"]) {
  if (status === "success") {
    return "mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700";
  }

  if (status === "error") {
    return "mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700";
  }

  return "mt-4 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-700";
}
