"use client";

import * as React from "react";
import { FilePdf, CircleNotch } from "@phosphor-icons/react";
import { PageAudit, ScrapedContent, Recommendation } from "@/lib/types";

interface PdfExportProps {
  scrapedContent: ScrapedContent;
  pageAudit: PageAudit | null;
  keywords: string[];
  recommendations: Recommendation[];
  model: string;
}

export function PdfExport({ scrapedContent, pageAudit, keywords, recommendations, model }: PdfExportProps) {
  const [generating, setGenerating] = React.useState(false);

  async function handleExport() {
    setGenerating(true);
    try {
      const { pdf, Document, Page, Text, View, StyleSheet } = await import(
        "@react-pdf/renderer"
      );

      const styles = StyleSheet.create({
        page: {
          fontFamily: "Helvetica",
          fontSize: 10,
          padding: 40,
          color: "#1a1a1a",
          backgroundColor: "#ffffff",
        },
        header: {
          marginBottom: 24,
          borderBottom: "1px solid #e0e0e0",
          paddingBottom: 12,
        },
        title: { fontSize: 18, fontFamily: "Helvetica-Bold", marginBottom: 4 },
        subtitle: { fontSize: 9, color: "#666666" },
        section: { marginBottom: 20 },
        sectionTitle: {
          fontSize: 11,
          fontFamily: "Helvetica-Bold",
          textTransform: "uppercase",
          letterSpacing: 1,
          marginBottom: 8,
          color: "#333333",
          borderBottom: "0.5px solid #e0e0e0",
          paddingBottom: 4,
        },
        metaRow: { flexDirection: "row", gap: 6, marginBottom: 3 },
        metaLabel: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#555555", width: 90 },
        metaValue: { fontSize: 9, color: "#333333", flex: 1 },
        keywordWrap: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
        keyword: {
          fontSize: 9,
          border: "0.5px solid #cccccc",
          paddingHorizontal: 5,
          paddingVertical: 2,
          color: "#333333",
        },
        auditGrid: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 12,
        },
        auditCard: {
          width: "48%",
          border: "0.5px solid #e0e0e0",
          padding: 8,
        },
        auditLabel: {
          fontSize: 8,
          color: "#777777",
          textTransform: "uppercase",
          marginBottom: 3,
        },
        auditValue: {
          fontSize: 10,
          fontFamily: "Helvetica-Bold",
          color: "#222222",
        },
        scoreList: {
          marginTop: 8,
          gap: 5,
        },
        scoreRow: {
          marginBottom: 6,
        },
        scoreLabel: {
          fontSize: 9,
          fontFamily: "Helvetica-Bold",
          marginBottom: 2,
          color: "#333333",
        },
        scoreExplanation: {
          fontSize: 8,
          color: "#666666",
          lineHeight: 1.35,
        },
        listSection: {
          marginTop: 10,
        },
        listTitle: {
          fontSize: 9,
          fontFamily: "Helvetica-Bold",
          marginBottom: 4,
          color: "#333333",
        },
        listItem: {
          fontSize: 8,
          color: "#555555",
          marginBottom: 3,
          lineHeight: 1.35,
        },
        recCard: {
          marginBottom: 14,
          border: "0.5px solid #e0e0e0",
          padding: 10,
        },
        recTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 4 },
        recReasoning: { fontSize: 9, color: "#555555", marginBottom: 6, lineHeight: 1.4 },
        recKeywords: { flexDirection: "row", flexWrap: "wrap", gap: 3, marginBottom: 6 },
        recKeyword: {
          fontSize: 8,
          border: "0.5px solid #b0c0ff",
          backgroundColor: "#f0f4ff",
          paddingHorizontal: 4,
          paddingVertical: 1,
          color: "#3344aa",
        },
        sampleLabel: { fontSize: 8, color: "#888888", marginBottom: 2, fontFamily: "Helvetica-Bold" },
        sampleText: {
          fontSize: 9,
          color: "#444444",
          fontStyle: "italic",
          lineHeight: 1.4,
          borderLeft: "2px solid #ccddff",
          paddingLeft: 6,
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

      const now = new Date().toLocaleString();
      const modelShort = model.replace("models/", "");

      const MyDoc = (
        <Document title={`SEO Analysis — ${scrapedContent.title}`}>
          <Page size="A4" style={styles.page}>
            <View style={styles.header}>
              <Text style={styles.title}>SEO Analysis Report</Text>
              <Text style={styles.subtitle}>
                Generated {now} · Model: {modelShort}
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Page Info</Text>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>URL</Text>
                <Text style={styles.metaValue}>{scrapedContent.url}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Title</Text>
                <Text style={styles.metaValue}>{scrapedContent.title}</Text>
              </View>
              {scrapedContent.description ? (
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Description</Text>
                  <Text style={styles.metaValue}>{scrapedContent.description}</Text>
                </View>
              ) : null}
            </View>

            {pageAudit ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>AI SEO Audit</Text>
                <View style={styles.auditGrid}>
                  <View style={styles.auditCard}>
                    <Text style={styles.auditLabel}>Overall Score</Text>
                    <Text style={styles.auditValue}>{pageAudit.overallScore} / 100</Text>
                  </View>
                  <View style={styles.auditCard}>
                    <Text style={styles.auditLabel}>Page Type</Text>
                    <Text style={styles.auditValue}>{pageAudit.pageType}</Text>
                  </View>
                  <View style={styles.auditCard}>
                    <Text style={styles.auditLabel}>Niche / Field</Text>
                    <Text style={styles.auditValue}>{pageAudit.industry}</Text>
                  </View>
                  <View style={styles.auditCard}>
                    <Text style={styles.auditLabel}>Primary Intent</Text>
                    <Text style={styles.auditValue}>{pageAudit.primaryIntent}</Text>
                  </View>
                </View>
                <Text style={styles.recReasoning}>{pageAudit.verdict}</Text>
                <View style={styles.scoreList}>
                  {pageAudit.dimensions.map((dimension) => (
                    <View key={dimension.key} style={styles.scoreRow}>
                      <Text style={styles.scoreLabel}>
                        {dimension.label}: {dimension.score}/100
                      </Text>
                      <Text style={styles.scoreExplanation}>{dimension.explanation}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.listSection}>
                  <Text style={styles.listTitle}>Priority Actions</Text>
                  {pageAudit.priorityActions.map((item, index) => (
                    <Text key={`priority-${index}`} style={styles.listItem}>
                      • {item}
                    </Text>
                  ))}
                </View>
                <View style={styles.listSection}>
                  <Text style={styles.listTitle}>Missing Subtopics</Text>
                  {pageAudit.missingSubtopics.map((item, index) => (
                    <Text key={`subtopic-${index}`} style={styles.listItem}>
                      • {item}
                    </Text>
                  ))}
                </View>
              </View>
            ) : null}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Keywords &amp; Phrases ({keywords.length})
              </Text>
              <View style={styles.keywordWrap}>
                {keywords.map((kw, i) => (
                  <Text key={i} style={styles.keyword}>
                    {kw}
                  </Text>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Content Recommendations ({recommendations.length})
              </Text>
              {recommendations.map((rec, i) => (
                <View key={i} style={styles.recCard}>
                  <Text style={styles.recTitle}>
                    {i + 1}. {rec.topic}
                  </Text>
                  <Text style={styles.recReasoning}>{rec.reasoning}</Text>
                  {rec.targetKeywords?.length > 0 && (
                    <View style={styles.recKeywords}>
                      {rec.targetKeywords.map((kw, j) => (
                        <Text key={j} style={styles.recKeyword}>
                          {kw}
                        </Text>
                      ))}
                    </View>
                  )}
                  <Text style={styles.sampleLabel}>Sample Content</Text>
                  <Text style={styles.sampleText}>{rec.sampleContent}</Text>
                </View>
              ))}
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
      a.download = `seo-analysis-${Date.now()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={generating}
      className="flex items-center gap-2 border border-border px-3 py-2 font-mono text-xs uppercase tracking-widest transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary disabled:opacity-50"
    >
      {generating ? (
        <CircleNotch size={13} className="animate-spin" />
      ) : (
        <FilePdf size={13} />
      )}
      {generating ? "Generating PDF…" : "Export PDF"}
    </button>
  );
}
