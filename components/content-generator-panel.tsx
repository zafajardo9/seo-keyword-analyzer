"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CircleNotch,
  Copy,
  Check,
  FilePdf,
  NotePencil,
  Pencil,
  Plus,
  Sparkle,
  Trash,
  User,
  X,
} from "@phosphor-icons/react";
import { Persona, GeneratedContent } from "@/lib/types";
import {
  getStoredModel,
  hydrateModel,
  ModelSelector,
} from "@/components/model-selector";
import {
  ApiKeyManager,
  getStoredGeminiKey,
  hydrateApiKeys,
} from "@/components/api-key-manager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ContentGeneratorPanel() {
  const [personas, setPersonas] = React.useState<Persona[]>([]);
  const [selectedPersona, setSelectedPersona] = React.useState<Persona | null>(
    null,
  );
  const [topic, setTopic] = React.useState("");
  const [result, setResult] = React.useState<GeneratedContent | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [personasLoading, setPersonasLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Create / Edit persona modal
  const [showForm, setShowForm] = React.useState(false);
  const [editingPersona, setEditingPersona] = React.useState<Persona | null>(
    null,
  );
  const [formName, setFormName] = React.useState("");
  const [formDesc, setFormDesc] = React.useState("");
  const [formTone, setFormTone] = React.useState("");
  const [formAudience, setFormAudience] = React.useState("");
  const [formGuidelines, setFormGuidelines] = React.useState("");
  const [formSaving, setFormSaving] = React.useState(false);

  const loadPersonas = React.useCallback(async () => {
    try {
      const r = await fetch("/api/personas");
      const data = await r.json();
      setPersonas(data.personas ?? []);
    } catch {
      setError("Failed to load personas.");
    } finally {
      setPersonasLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadPersonas();
  }, [loadPersonas]);

  function openCreateForm() {
    setEditingPersona(null);
    setFormName("");
    setFormDesc("");
    setFormTone("");
    setFormAudience("");
    setFormGuidelines("");
    setShowForm(true);
  }

  function openEditForm(p: Persona) {
    setEditingPersona(p);
    setFormName(p.name);
    setFormDesc(p.description);
    setFormTone(p.tone);
    setFormAudience(p.audience);
    setFormGuidelines((p.guidelines ?? []).join("\n"));
    setShowForm(true);
  }

  async function handleSaveForm(event: React.FormEvent) {
    event.preventDefault();
    if (!formName.trim() || !formTone.trim()) return;

    setFormSaving(true);
    try {
      const body = {
        name: formName.trim(),
        description: formDesc.trim(),
        tone: formTone.trim(),
        audience: formAudience.trim(),
        guidelines: formGuidelines.trim().split("\n").filter(Boolean),
      };

      if (editingPersona) {
        await fetch("/api/personas", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, id: editingPersona.id }),
        });
        setPersonas((prev) =>
          prev.map((p) => (p.id === editingPersona.id ? { ...p, ...body } : p)),
        );
      } else {
        const r = await fetch("/api/personas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await r.json();
        if (data.persona) {
          setPersonas((prev) => [data.persona, ...prev]);
        }
      }

      setShowForm(false);
    } catch {
      setError(
        editingPersona
          ? "Failed to update persona."
          : "Failed to create persona.",
      );
    } finally {
      setFormSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/personas?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      setPersonas((prev) => prev.filter((p) => p.id !== id));
      if (selectedPersona?.id === id) setSelectedPersona(null);
    } catch {
      setError("Failed to delete persona.");
    }
  }

  async function handleGenerate() {
    if (!selectedPersona || !topic.trim()) return;

    await Promise.all([hydrateModel(), hydrateApiKeys()]);
    const currentModel = getStoredModel();
    if (!currentModel) {
      setError("No AI model selected.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const r = await fetch("/api/content/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim(),
          persona: selectedPersona,
          model: currentModel,
          apiKey: getStoredGeminiKey(),
        }),
      });
      const data = await r.json();
      if (!r.ok || data.error) {
        setError(data.error ?? "Failed to generate content.");
        return;
      }
      setResult(data.result ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleExportPdf() {
    if (!result) return;
    try {
      const { pdf, Document, Page, Text, View, StyleSheet } =
        await import("@react-pdf/renderer");

      const styles = StyleSheet.create({
        page: {
          fontFamily: "Helvetica",
          fontSize: 10,
          padding: 40,
          color: "#1a1a1a",
          backgroundColor: "#ffffff",
        },
        header: {
          marginBottom: 20,
          borderBottom: "1px solid #e0e0e0",
          paddingBottom: 12,
        },
        title: { fontSize: 18, fontFamily: "Helvetica-Bold", marginBottom: 4 },
        subtitle: { fontSize: 9, color: "#666666", marginBottom: 12 },
        metaRow: { flexDirection: "row", gap: 6, marginBottom: 4 },
        metaLabel: {
          fontSize: 9,
          fontFamily: "Helvetica-Bold",
          color: "#555555",
          width: 100,
        },
        metaValue: { fontSize: 9, color: "#333333", flex: 1 },
        bodyText: { fontSize: 10, lineHeight: 1.5, color: "#333333" },
        section: { marginBottom: 16 },
        sectionTitle: {
          fontSize: 13,
          fontFamily: "Helvetica-Bold",
          marginBottom: 8,
          color: "#222222",
        },
        footer: {
          position: "absolute",
          bottom: 30,
          left: 40,
          right: 40,
          flexDirection: "row",
          justifyContent: "space-between",
        },
        footerText: { fontSize: 8, color: "#aaaaaa" },
      });

      const MyDoc = (
        <Document title={`${result.title}`}>
          <Page size="A4" style={styles.page}>
            <View style={styles.header}>
              <Text style={styles.title}>{result.title}</Text>
              <Text style={styles.subtitle}>
                Generated by {result.personaName} · Topic: {result.topic} ·{" "}
                {new Date().toLocaleString()}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Meta Description</Text>
              <Text style={styles.metaValue}>{result.metaDescription}</Text>
            </View>
            <Text style={styles.sectionTitle}>&#xA0;</Text>
            <View style={styles.section}>
              <Text style={styles.bodyText}>
                {result.content.replace(/<[^>]+>/g, "")}
              </Text>
            </View>
            <View style={styles.footer} fixed>
              <Text style={styles.footerText}>SEO Keyword Analyzer</Text>
              <Text
                style={styles.footerText}
                render={({ pageNumber, totalPages }) =>
                  `Page ${pageNumber} / ${totalPages}`
                }
              />
            </View>
          </Page>
        </Document>
      );

      const blob = await pdf(MyDoc).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${result.title.slice(0, 50).replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF export failed:", err);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <nav className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background px-6 py-4">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft size={12} /> Home
          </Link>
          <span className="text-border">|</span>
          <div className="flex items-center gap-1.5">
            <NotePencil size={13} className="text-primary" />
            <span className="font-mono text-xs font-semibold">
              Content Generator
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <ApiKeyManager />
          <ModelSelector />
        </div>
      </nav>

      <main className="flex flex-1 flex-col items-center px-6 py-10">
        <div className="w-full max-w-6xl space-y-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
            {/* Left: Persona List */}
            <section className="border border-border p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-mono text-sm font-semibold tracking-tight">
                  Personas
                </h2>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={openCreateForm}
                  className="gap-1 font-mono text-[10px] uppercase tracking-widest"
                >
                  <Plus size={11} /> New
                </Button>
              </div>

              {personasLoading ? (
                <div className="flex items-center justify-center py-12">
                  <CircleNotch
                    size={14}
                    className="animate-spin text-muted-foreground"
                  />
                </div>
              ) : personas.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-12 text-center">
                  <User size={20} className="text-muted-foreground" />
                  <p className="font-mono text-xs text-muted-foreground">
                    No personas yet.
                  </p>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    Create one to start generating content.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {personas.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPersona(p)}
                      className={`flex items-start gap-3 border p-3 text-left transition-colors ${
                        selectedPersona?.id === p.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50 hover:bg-muted/20"
                      }`}
                    >
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <User size={12} className="text-primary" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-xs font-semibold text-foreground">
                          {p.name}
                        </p>
                        <p className="mt-0.5 line-clamp-2 font-mono text-[10px] text-muted-foreground">
                          {p.description || p.tone}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditForm(p);
                          }}
                          className="text-muted-foreground transition-colors hover:text-primary"
                          title="Edit persona"
                        >
                          <Pencil size={11} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(p.id);
                          }}
                          className="text-muted-foreground transition-colors hover:text-destructive"
                          title="Delete persona"
                        >
                          <Trash size={11} />
                        </button>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>

            {/* Right: Content Generation */}
            <section className="flex flex-col border border-border p-5">
              {!selectedPersona ? (
                <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-4 text-center">
                  <NotePencil size={24} className="text-muted-foreground" />
                  <p className="font-mono text-sm font-semibold text-foreground">
                    Select a persona
                  </p>
                  <p className="max-w-sm font-mono text-xs text-muted-foreground">
                    Pick a persona from the left panel or create a new one, then
                    enter a topic to generate content.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {/* Selected persona badge */}
                  <div className="flex items-center gap-3 border border-primary/30 bg-primary/5 p-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20">
                      <User size={14} className="text-primary" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-semibold text-foreground">
                        {selectedPersona.name}
                      </p>
                      <p className="font-mono text-[10px] text-muted-foreground">
                        {selectedPersona.tone} ·{" "}
                        {selectedPersona.audience || "General"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedPersona(null)}
                      className="ml-auto shrink-0 text-muted-foreground hover:text-foreground"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {/* Topic input */}
                  <div className="space-y-1">
                    <Label
                      htmlFor="topic"
                      className="font-mono text-xs uppercase tracking-widest text-muted-foreground"
                    >
                      Topic or Keyword
                    </Label>
                    <Input
                      id="topic"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="e.g. SEO content strategy for B2B SaaS"
                      className="font-mono text-xs"
                      disabled={loading}
                      onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                    />
                  </div>

                  <Button
                    type="button"
                    onClick={handleGenerate}
                    disabled={loading || !topic.trim()}
                    className="gap-1.5 font-mono text-xs uppercase tracking-widest"
                  >
                    {loading ? (
                      <>
                        <CircleNotch size={13} className="animate-spin" />{" "}
                        Generating…
                      </>
                    ) : (
                      <>
                        <Sparkle size={13} /> Generate Content
                      </>
                    )}
                  </Button>

                  {error && (
                    <div className="border border-destructive/40 bg-destructive/5 p-3">
                      <p className="font-mono text-xs text-destructive">
                        {error}
                      </p>
                    </div>
                  )}

                  {/* Results */}
                  {loading && (
                    <div className="flex items-center justify-center gap-2 py-12">
                      <CircleNotch
                        size={16}
                        className="animate-spin text-primary"
                      />
                      <span className="font-mono text-sm text-muted-foreground">
                        Writing in {selectedPersona.name}&apos;s voice…
                      </span>
                    </div>
                  )}

                  {result && !loading && (
                    <div className="mt-2 space-y-4">
                      <div className="border border-border bg-muted/20 p-4">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                            Title
                          </span>
                        </div>
                        <p className="mt-1 font-mono text-base font-bold text-foreground">
                          {result.title}
                        </p>
                        <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                          {result.metaDescription}
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                            Content
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handleExportPdf}
                              className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
                              title="Save as PDF"
                            >
                              <FilePdf size={11} />
                              PDF
                            </button>
                            <CopyButton text={result.content} />
                          </div>
                        </div>
                        <div
                          className="mt-2 max-h-[500px] overflow-y-auto rounded border border-border bg-background p-4 font-mono text-xs leading-relaxed text-foreground prose-headings:font-semibold prose-headings:text-foreground prose-p:mb-2 prose-ul:ml-4 prose-li:mb-1"
                          dangerouslySetInnerHTML={{ __html: result.content }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>

      {/* Create / Edit Persona Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowForm(false)}
          />
          <div className="relative w-full max-w-lg border border-border bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <span className="font-mono text-sm font-semibold">
                {editingPersona ? "Edit Persona" : "Create Persona"}
              </span>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSaveForm} className="flex flex-col gap-4 p-5">
              <div className="space-y-1">
                <Label
                  htmlFor="p-name"
                  className="font-mono text-xs uppercase tracking-widest text-muted-foreground"
                >
                  Name
                </Label>
                <Input
                  id="p-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Tech Founder Alicia"
                  className="font-mono text-xs"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label
                  htmlFor="p-desc"
                  className="font-mono text-xs uppercase tracking-widest text-muted-foreground"
                >
                  Description
                </Label>
                <Input
                  id="p-desc"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="e.g. B2B SaaS founder who writes about growth"
                  className="font-mono text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label
                  htmlFor="p-tone"
                  className="font-mono text-xs uppercase tracking-widest text-muted-foreground"
                >
                  Tone &amp; Voice
                </Label>
                <Input
                  id="p-tone"
                  value={formTone}
                  onChange={(e) => setFormTone(e.target.value)}
                  placeholder="e.g. Authoritative but conversational, uses data"
                  className="font-mono text-xs"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label
                  htmlFor="p-aud"
                  className="font-mono text-xs uppercase tracking-widest text-muted-foreground"
                >
                  Target Audience
                </Label>
                <Input
                  id="p-aud"
                  value={formAudience}
                  onChange={(e) => setFormAudience(e.target.value)}
                  placeholder="e.g. Startup founders and marketing leaders"
                  className="font-mono text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label
                  htmlFor="p-guide"
                  className="font-mono text-xs uppercase tracking-widest text-muted-foreground"
                >
                  Writing Guidelines
                </Label>
                <Textarea
                  id="p-guide"
                  value={formGuidelines}
                  onChange={(e) => setFormGuidelines(e.target.value)}
                  placeholder="One guideline per line:&#10;Always open with a story&#10;Use short paragraphs&#10;Include data points"
                  className="min-h-[100px] font-mono text-xs"
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowForm(false)}
                  className="font-mono text-xs uppercase tracking-widest"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={formSaving || !formName.trim() || !formTone.trim()}
                  className="gap-1.5 font-mono text-xs uppercase tracking-widest"
                >
                  {formSaving ? (
                    <>
                      <CircleNotch size={12} className="animate-spin" /> Saving…
                    </>
                  ) : editingPersona ? (
                    <>Save Changes</>
                  ) : (
                    <>Create Persona</>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
      title="Copy to clipboard"
    >
      {copied ? (
        <>
          <Check size={11} className="text-green-500" /> Copied
        </>
      ) : (
        <>
          <Copy size={11} /> Copy
        </>
      )}
    </button>
  );
}
