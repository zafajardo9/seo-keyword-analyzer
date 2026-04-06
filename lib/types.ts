export interface ScrapedContent {
  url: string;
  title: string;
  description: string;
  headings: { h1: string[]; h2: string[]; h3: string[] };
  bodyText: string;
}

export interface Recommendation {
  topic: string;
  reasoning: string;
  targetKeywords: string[];
  sampleContent: string;
}

export type ScoreDimensionKey =
  | "topicalRelevance"
  | "searchIntentMatch"
  | "topicalDepth"
  | "clarityReadability"
  | "metadataQuality"
  | "trustSignals";

export interface ScoreDimension {
  key: ScoreDimensionKey;
  label: string;
  score: number;
  explanation: string;
}

export interface PageAudit {
  pageType: string;
  industry: string;
  primaryAudience: string;
  primaryIntent: string;
  overallScore: number;
  verdict: string;
  dimensions: ScoreDimension[];
  strengths: string[];
  weaknesses: string[];
  missingSubtopics: string[];
  priorityActions: string[];
}

export interface ContentRelevanceAudit {
  targetKeyword: string;
  sourceType?: "draft" | "url";
  sourceUrl?: string;
  detectedIntent: string;
  intentMatchScore: number;
  relevanceScore: number;
  verdict: string;
  missingSubtopics: string[];
  offTopicSections: string[];
  headingSuggestions: string[];
  rewriteSuggestions: string[];
  improvedTitle: string;
  improvedMetaDescription: string;
}

export type BattleMetricKey =
  | "topicalCoverage"
  | "searchIntentFit"
  | "clarityReadability"
  | "metadataQuality"
  | "trustSignals"
  | "keywordOpportunity";

export interface BattleMetricScore {
  key: BattleMetricKey;
  label: string;
  leftScore: number;
  rightScore: number;
  explanation: string;
}

export interface BlogBattleResult {
  left: {
    url: string;
    title: string;
    nickname: string;
    overallScore: number;
    strengths: string[];
    weaknesses: string[];
  };
  right: {
    url: string;
    title: string;
    nickname: string;
    overallScore: number;
    strengths: string[];
    weaknesses: string[];
  };
  winner: "left" | "right" | "tie";
  verdict: string;
  quickTakeaways: string[];
  metrics: BattleMetricScore[];
}

export interface GeminiModel {
  id: string;
  displayName: string;
}

export type AnalysisStep = "url" | "analyzing" | "results";
