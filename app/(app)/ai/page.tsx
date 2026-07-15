"use client";

import { FormEvent, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api-client";

export default function AIPage() {
  const [policyQ, setPolicyQ] = useState("");
  const [policyA, setPolicyA] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [searchR, setSearchR] = useState("");
  const [summary, setSummary] = useState("");
  const [report, setReport] = useState("");

  async function askPolicy(e: FormEvent) {
    e.preventDefault();
    const res = await api<{ answer: string; status: string }>("/api/v1/ai/policy", {
      method: "POST",
      json: { question: policyQ },
    });
    setPolicyA(`[${res.status}] ${res.answer}`);
  }

  async function smartSearch(e: FormEvent) {
    e.preventDefault();
    const res = await api<{
      note: string;
      results?: { employees: { label: string }[]; documents: { label: string }[] };
    }>("/api/v1/ai/search", { method: "POST", json: { query: searchQ } });
    const employees = res.results?.employees.map((e) => e.label).join(", ") || "none";
    const docs = res.results?.documents.map((d) => d.label).join(", ") || "none";
    setSearchR(`${res.note}\nEmployees: ${employees}\nDocuments: ${docs}`);
  }

  async function meetingSummary() {
    const res = await api<{ summary: string; status: string }>("/api/v1/ai/meeting-summary", {
      method: "POST",
      json: {},
    });
    setSummary(`[${res.status}] ${res.summary}`);
  }

  async function aiReport(e: FormEvent) {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    const res = await api<{ report: string; status: string }>("/api/v1/ai/report", {
      method: "POST",
      json: { prompt: fd.get("prompt") },
    });
    setReport(`[${res.status}] ${res.report}`);
  }

  return (
    <div>
      <PageHeader
        title="AI Assistant"
        description="Optional AI features (stubbed for this MVP)"
        actions={<Badge tone="warning">Coming soon</Badge>}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold">Policy Q&A</h2>
          <form onSubmit={askPolicy} className="space-y-2">
            <Textarea
              placeholder="Ask about HR policy, working hours…"
              value={policyQ}
              onChange={(e) => setPolicyQ(e.target.value)}
              required
            />
            <Button type="submit">Ask</Button>
          </form>
          {policyA ? <p className="mt-3 whitespace-pre-wrap text-sm text-[var(--muted-fg)]">{policyA}</p> : null}
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold">Smart search</h2>
          <form onSubmit={smartSearch} className="space-y-2">
            <Input
              placeholder="Search employees or documents"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              required
            />
            <Button type="submit">Search</Button>
          </form>
          {searchR ? <p className="mt-3 whitespace-pre-wrap text-sm text-[var(--muted-fg)]">{searchR}</p> : null}
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold">Meeting summaries</h2>
          <Button onClick={meetingSummary}>Generate sample summary</Button>
          {summary ? <p className="mt-3 text-sm text-[var(--muted-fg)]">{summary}</p> : null}
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold">AI reports</h2>
          <form onSubmit={aiReport} className="space-y-2">
            <Textarea name="prompt" placeholder="Describe the report you want…" required />
            <Button type="submit">Generate</Button>
          </form>
          {report ? <p className="mt-3 text-sm text-[var(--muted-fg)]">{report}</p> : null}
        </Card>
      </div>
    </div>
  );
}
