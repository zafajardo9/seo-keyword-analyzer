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

export type CompanyResearchStatus =
  | "queued"
  | "crawling"
  | "enriched"
  | "failed";

export type CompanyAgeMix = "both" | "emerging" | "established";
export type CompanyAgeSignal = "emerging" | "established" | "unknown";
export type CompanyResearchMode = "urls" | "discovery";

export interface CompanyResearchContact {
  type: "email" | "phone" | "social" | "contactPage";
  value: string;
  sourceUrl: string;
}

export interface CompanyDiscoveryResult {
  companyName: string;
  website: string;
  domain: string;
  market: string;
  location: string;
  ageSignal: CompanyAgeSignal;
  discoveryReason: string;
  evidenceTitle: string;
  evidenceUrl: string;
  evidenceSnippet: string;
  relevanceScore: number;
}

export interface CompanyResearchResult {
  id: string;
  status: CompanyResearchStatus;
  website: string;
  domain: string;
  companyName: string;
  category: string;
  summary: string;
  targetAudience: string;
  partnershipFit: string;
  emails: CompanyResearchContact[];
  phones: CompanyResearchContact[];
  contactPage: string;
  socialLinks: CompanyResearchContact[];
  confidenceScore: number;
  notes: string[];
  crawledPages: string[];
  discovery?: CompanyDiscoveryResult;
  error?: string;
}

export interface CompanyResearchRun {
  id: string;
  createdAt: number;
  updatedAt: number;
  mode?: CompanyResearchMode;
  sourceUrls: string[];
  discoveryQuery?: CompanyDiscoveryRun;
  results: CompanyResearchResult[];
}

export interface CompanyDiscoveryRun {
  market: string;
  location: string;
  industry?: string;
  ageMix: CompanyAgeMix;
  contactPreference?: string;
  limit: number;
}

export interface GeminiModel {
  id: string;
  displayName: string;
}

export type AnalysisStep = "url" | "analyzing" | "results";
