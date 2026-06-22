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
  wasAutoDetected?: boolean;
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

export interface MarketResearchReport {
  companyName: string;
  industry: string;
  summary: string;
  trends: string[];
  competitorInsights: string[];
  recentNews: string[];
  opportunities: string[];
  risks: string[];
  confidenceScore: number;
  sources: string[];
}

export interface GeminiModel {
  id: string;
  displayName: string;
}

export type AnalysisStep = "url" | "analyzing" | "results";

export type GeoDimensionKey =
  | "eeatSignals"
  | "factDataDensity"
  | "sourceCitationQuality"
  | "brandEntityClarity"
  | "topicalAuthorityDepth";

export type AeoDimensionKey =
  | "directAnswerFormat"
  | "questionCoverage"
  | "structuredAnswerQuality"
  | "faqOptimization"
  | "passageLevelClarity";

export type LlmCitationPotential = "High" | "Medium" | "Low";

export interface GeoAeoDimension {
  key: GeoDimensionKey | AeoDimensionKey;
  label: string;
  score: number;
  explanation: string;
  group: "geo" | "aeo";
}

export interface GeoAeoAudit {
  overallScore: number;
  geoScore: number;
  aeoScore: number;
  verdict: string;
  llmCitationPotential: LlmCitationPotential;
  llmCitationReasoning: string;
  dimensions: GeoAeoDimension[];
  topQuestionsAnswered: string[];
  missingQuestionsToAdd: string[];
  schemaMarkupOpportunities: string[];
  geoRecommendations: string[];
  aeoRecommendations: string[];
}

export type PromptGrade = "A" | "B" | "C" | "D" | "F";
export type PromptLikelihood = "High" | "Medium" | "Low";
export type PromptCategory =
  | "Informational"
  | "Commercial"
  | "Navigational"
  | "Transactional"
  | "Investigational";

export type ContentCheckKey =
  | "semanticHtml"
  | "semanticCoverage"
  | "atomicSections"
  | "examplesAndFaqs"
  | "internalLinking";

export interface ContentCheck {
  key: ContentCheckKey;
  label: string;
  grade: PromptGrade;
  score: number;
  verdict: string;
  suggestions: string[];
}

export interface PromptResult {
  prompt: string;
  grade: PromptGrade;
  score: number;
  likelihood: PromptLikelihood;
  category: PromptCategory;
  reasoning: string;
  suggestions: string[];
}

export interface PromptAnalysis {
  url: string;
  pageTitle: string;
  overallScore: number;
  overallGrade: PromptGrade;
  aiVisibilityVerdict: string;
  prompts: PromptResult[];
  topStrengths: string[];
  criticalGaps: string[];
  searchQueries?: string[];
  contentChecks?: ContentCheck[];
}

// ── Content Relevance Suite (Optimizer, Strategy, Brief) ──

export interface ContentOptimizerResult {
  optimizedContent: string;
  optimizedTitle: string;
  optimizedMetaDescription: string;
  keyChanges: string[];
  improvedScores: {
    estimatedRelevanceScore: number;
    estimatedIntentMatchScore: number;
  };
}

export interface ClusterTopic {
  topic: string;
  type: "pillar" | "supporting" | "cluster";
  targetKeywords?: string[];
  rationale?: string;
}

export interface TopicCluster {
  pillarTopic: string;
  clusterTopics: ClusterTopic[];
  internalLinkingStrategy: string;
}

export interface AudienceMapping {
  primaryAudience: string;
  personaDetails: string;
  contentPreferences: string[];
  searchBehavior: string;
  painPoints: string[];
}

export interface CompetitorInsight {
  name: string;
  angle: string;
  gapToExploit: string;
  strengths: string[];
  weaknesses: string[];
}

export interface CompetitiveLandscape {
  topCompetitors: CompetitorInsight[];
  marketPositioning: string;
  contentDifferentiation: string[];
}

export interface ContentStrategyResult {
  topicCluster: TopicCluster;
  audienceMapping: AudienceMapping;
  competitiveLandscape: CompetitiveLandscape;
}

export interface BriefOutlineItem {
  heading: string;
  hLevel: "h2" | "h3" | "h4";
  keyPoints: string[];
  targetKeywords?: string[];
  estimatedWordCount?: number;
}

export interface ContentBriefResult {
  workingTitle: string;
  targetKeywords: {
    primary: string;
    secondary: string[];
    related: string[];
  };
  searchIntent: string;
  outline: BriefOutlineItem[];
  writingGuidelines: string[];
  suggestedMedia: string[];
  estimatedReadingTime: string;
  seoRecommendations: string[];
  questionsToAnswer?: string[];
}

export interface SerpResult {
  url: string;
  title: string;
  headings: string[];
}

// ── SEO Validation ──

export type SeoValidationStatus = "pass" | "fail" | "warning";

export interface PlatformFix {
  platform: string;
  steps: string[];
}

export interface SeoCheckItem {
  label: string;
  status: SeoValidationStatus;
  value?: string;
  recommendation?: string;
  platformFixes?: PlatformFix[];
}

export interface SeoCategory {
  id: string;
  label: string;
  icon: string;
  checks: SeoCheckItem[];
}

export interface SeoValidationResult {
  url?: string;
  overallScore: number;
  passCount: number;
  totalCount: number;
  categories: SeoCategory[];
  criticalIssues: string[];
  summary: string;
}

export interface ContentOutlineResult {
  targetKeyword: string;
  serpAnalysis: {
    topResults: SerpResult[];
    commonHeadingPatterns: string[];
    contentGaps: string[];
  };
  recommendedOutline: BriefOutlineItem[];
  totalEstimatedWords: number;
  seoTips: string[];
}
