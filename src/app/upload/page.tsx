"use client";

import Link from "next/link";
import { useState } from "react";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) {
      setStatus("Please select a .xls or .xlsx file.");
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    setLoading(true);
    setStatus("");

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Upload failed");
      }
      setStatus(`Imported ${data.imported} trades successfully.`);
      setFile(null);
    } catch (error) {
      setStatus((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    const shouldReset = typeof window === "undefined" ? true : window.confirm("Delete all trades from the calendar?");
    if (!shouldReset) return;
    setResetting(true);
    setStatus("");
    try {
      const response = await fetch("/api/reset-trades", { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to clear trades");
      }
      setStatus(`Cleared ${data.deleted} trades. The calendar will now be empty.`);
    } catch (error) {
      setStatus((error as Error).message);
    } finally {
      setResetting(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-4 py-10">
      <Link href="/" className="text-sm text-slate-400 hover:text-white">← Back to calendar</Link>
      <section className="rounded-3xl border border-white/5 bg-slate-950/80 p-8 shadow-2xl">
        <h1 className="text-3xl font-semibold text-white">Upload MT5 report</h1>
        <p className="mt-2 text-sm text-slate-400">Upload the .xls/.xlsx file exported from MetaTrader 5 history report.</p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <div>
            <label htmlFor="file" className="text-sm font-medium text-slate-200">Choose report</label>
            <input
              id="file"
              type="file"
              accept=".xls,.xlsx"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="mt-2 block w-full rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 px-4 py-6 text-sm text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-sky-500/10 file:px-4 file:py-2 file:text-sky-300"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-sky-500/80 px-6 py-3 text-base font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Uploading…" : "Upload report"}
          </button>
        </form>
        <div className="mt-8 rounded-2xl border border-rose-700/40 bg-rose-950/20 p-4">
          <p className="text-sm font-semibold text-rose-200">Danger zone</p>
          <p className="mt-1 text-xs text-rose-300/80">Remove every trade from the database and reset the calendar.</p>
          <button
            type="button"
            onClick={handleReset}
            disabled={resetting}
            className="mt-4 w-full rounded-2xl border border-rose-500/40 bg-rose-500/20 px-4 py-2 text-sm font-semibold text-rose-100 hover:bg-rose-500/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {resetting ? "Clearing…" : "Erase all trades"}
          </button>
        </div>
        {status && <p className="mt-4 text-sm text-slate-300">{status}</p>}
        <ul className="mt-6 list-disc space-y-2 pl-5 text-sm text-slate-400">
          <li>Export MT5 history as .xls/.xlsx (Statement or Detailed report).</li>
          <li>Only trade rows are imported. Summary rows are ignored automatically.</li>
          <li>Re-uploading the same file won&apos;t duplicate trades (tickets must be unique).</li>
        </ul>
      </section>
    </main>
  );
}
