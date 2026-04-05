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

export interface GeminiModel {
  id: string;
  displayName: string;
}

export type AnalysisStep = "url" | "analyzing" | "results";
