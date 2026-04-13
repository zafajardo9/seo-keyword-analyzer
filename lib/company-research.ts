import * as cheerio from "cheerio";
import {
  clampScore,
  generateGeminiText,
  getGeminiApiKey,
  parseJsonSafely,
} from "@/lib/gemini";
import { CompanyResearchContact, CompanyResearchResult } from "@/lib/types";

const MAX_KEY_PAGES = 6;
const BODY_LIMIT = 1200;
const EMAIL_PATTERN =
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_PATTERN =
  /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{4}/g;

const KEY_PAGE_TERMS = [
  "contact",
  "about",
  "team",
  "partnership",
  "partner",
  "careers",
  "support",
];

interface ScrapedCompanyPage {
  url: string;
  title: string;
  description: string;
  h1: string[];
  text: string;
  emails: CompanyResearchContact[];
  phones: CompanyResearchContact[];
  contactPages: CompanyResearchContact[];
  socialLinks: CompanyResearchContact[];
  internalLinks: string[];
}

interface RawCompanyAiResult {
  companyName?: string;
  category?: string;
  summary?: string;
  targetAudience?: string;
  partnershipFit?: string;
  confidenceScore?: number;
  notes?: string[];
}

function unique<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const value = key(item).toLowerCase();
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

function normalizeWebsite(input: string): URL {
  const trimmed = input.trim();
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) && !/^https?:\/\//i.test(trimmed)) {
    throw new Error("Only HTTP and HTTPS URLs are supported");
  }

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(withProtocol);
  } catch {
    throw new Error("Invalid URL format");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only HTTP and HTTPS URLs are supported");
  }

  url.hash = "";
  return url;
}

function sameDomain(url: URL, root: URL): boolean {
  const host = url.hostname.replace(/^www\./, "");
  const rootHost = root.hostname.replace(/^www\./, "");
  return host === rootHost;
}

function scoreKeyPage(url: string): number {
  const lower = url.toLowerCase();
  return KEY_PAGE_TERMS.reduce((score, term, index) => {
    if (!lower.includes(term)) return score;
    return score + 100 - index * 8;
  }, 0);
}

function toContact(
  type: CompanyResearchContact["type"],
  value: string,
  sourceUrl: string,
): CompanyResearchContact {
  return { type, value: value.trim(), sourceUrl };
}

function cleanEmail(email: string): string {
  return email.replace(/[).,;:!?]+$/g, "").toLowerCase();
}

function cleanPhone(phone: string): string {
  return phone.replace(/\s+/g, " ").trim();
}

function fallbackCompanyName(page: ScrapedCompanyPage, root: URL): string {
  const h1 = page.h1.find(Boolean);
  if (h1) return h1;
  if (page.title) {
    return page.title.split(/[|-]/)[0]?.trim() || page.title;
  }
  return root.hostname.replace(/^www\./, "");
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; SEOAnalyzerBot/1.0; +https://seo-analyzer.app)",
      Accept: "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch page: HTTP ${res.status}`);
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (contentType && !contentType.includes("text/html")) {
    throw new Error("URL did not return an HTML page");
  }

  return res.text();
}

async function scrapeCompanyPage(url: string, root: URL): Promise<ScrapedCompanyPage> {
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  $("script, style, noscript, iframe, svg, canvas").remove();

  const title = $("title").first().text().trim();
  const description =
    $('meta[name="description"]').attr("content")?.trim() ??
    $('meta[property="og:description"]').attr("content")?.trim() ??
    "";

  const h1: string[] = [];
  $("h1").each((_, el) => {
    const text = $(el).text().trim();
    if (text) h1.push(text);
  });

  const visibleText = $("body").text().replace(/\s+/g, " ").trim();
  const hrefValues: string[] = [];
  const internalLinks: string[] = [];
  const contactPages: CompanyResearchContact[] = [];
  const socialLinks: CompanyResearchContact[] = [];

  $("a[href]").each((_, el) => {
    const rawHref = $(el).attr("href")?.trim();
    if (!rawHref) return;
    hrefValues.push(rawHref);

    let parsed: URL;
    try {
      parsed = new URL(rawHref, url);
    } catch {
      return;
    }

    parsed.hash = "";
    if (["mailto:", "tel:"].includes(parsed.protocol)) return;

    if (["http:", "https:"].includes(parsed.protocol)) {
      const href = parsed.toString();
      const lower = href.toLowerCase();

      if (
        lower.includes("linkedin.com") ||
        lower.includes("twitter.com") ||
        lower.includes("x.com") ||
        lower.includes("facebook.com") ||
        lower.includes("instagram.com")
      ) {
        socialLinks.push(toContact("social", href, url));
      }

      if (sameDomain(parsed, root)) {
        internalLinks.push(href);
        if (KEY_PAGE_TERMS.some((term) => lower.includes(term))) {
          contactPages.push(toContact("contactPage", href, url));
        }
      }
    }
  });

  const mailtoEmails = hrefValues
    .filter((href) => href.toLowerCase().startsWith("mailto:"))
    .map((href) => cleanEmail(href.replace(/^mailto:/i, "").split("?")[0] ?? ""))
    .filter(Boolean);

  const visibleEmails = visibleText.match(EMAIL_PATTERN)?.map(cleanEmail) ?? [];
  const emails = [...mailtoEmails, ...visibleEmails]
    .filter((email) => !email.includes(".png") && !email.includes(".jpg"))
    .map((email) => toContact("email", email, url));

  const telPhones = hrefValues
    .filter((href) => href.toLowerCase().startsWith("tel:"))
    .map((href) => cleanPhone(href.replace(/^tel:/i, "")))
    .filter(Boolean);
  const visiblePhones = visibleText.match(PHONE_PATTERN)?.map(cleanPhone) ?? [];
  const phones = [...telPhones, ...visiblePhones]
    .filter((phone) => phone.replace(/\D/g, "").length >= 7)
    .map((phone) => toContact("phone", phone, url));

  return {
    url,
    title,
    description,
    h1,
    text: visibleText.slice(0, BODY_LIMIT),
    emails: unique(emails, (contact) => contact.value),
    phones: unique(phones, (contact) => contact.value),
    contactPages: unique(contactPages, (contact) => contact.value),
    socialLinks: unique(socialLinks, (contact) => contact.value),
    internalLinks: unique(internalLinks, (link) => link),
  };
}

function selectKeyPageUrls(home: ScrapedCompanyPage, root: URL): string[] {
  return home.internalLinks
    .filter((link) => {
      try {
        const parsed = new URL(link);
        return sameDomain(parsed, root) && parsed.pathname !== root.pathname;
      } catch {
        return false;
      }
    })
    .map((link) => {
      const parsed = new URL(link);
      parsed.search = "";
      parsed.hash = "";
      return parsed.toString();
    })
    .filter((link) => scoreKeyPage(link) > 0)
    .sort((a, b) => scoreKeyPage(b) - scoreKeyPage(a))
    .filter((link, index, links) => links.indexOf(link) === index)
    .slice(0, MAX_KEY_PAGES);
}

function notesForContacts(
  emails: CompanyResearchContact[],
  phones: CompanyResearchContact[],
  contactPage: string,
): string[] {
  const notes: string[] = [];
  if (emails.length === 0) notes.push("No public email found.");
  if (phones.length === 0) notes.push("No public phone found.");
  if (!contactPage) notes.push("No contact page found.");
  return notes;
}

async function enrichCompany(
  model: string,
  root: URL,
  pages: ScrapedCompanyPage[],
  fallbackName: string,
  emails: CompanyResearchContact[],
  phones: CompanyResearchContact[],
  contactPage: string,
): Promise<RawCompanyAiResult> {
  const key = getGeminiApiKey();
  const pageSummary = pages
    .map(
      (page, index) => `Page ${index + 1}
URL: ${page.url}
Title: ${page.title}
Description: ${page.description}
H1: ${page.h1.join(" | ")}
Text: ${page.text}`,
    )
    .join("\n\n")
    .slice(0, 9000);

  const prompt = `You are an SEO and partnerships research assistant. Use only the provided public website crawl data. Do not invent email addresses, phone numbers, names, or facts.

Website: ${root.toString()}
Fallback company name: ${fallbackName}
Visible emails: ${emails.map((contact) => contact.value).join(", ") || "none"}
Visible phones: ${phones.map((contact) => contact.value).join(", ") || "none"}
Contact page: ${contactPage || "none"}

Crawl data:
${pageSummary}

Return ONLY valid JSON:
{
  "companyName": "best public company name",
  "category": "short category or industry",
  "summary": "1 concise sentence describing what the company does",
  "targetAudience": "who they appear to serve, under 10 words",
  "partnershipFit": "1 concise sentence explaining why they may or may not fit outreach",
  "confidenceScore": 0,
  "notes": ["short warnings or useful observations"]
}

Guidance:
- Confidence is 0 to 100 based on how clear the website data is
- If public contact info is missing, mention that in notes
- Keep all text concise and practical for a marketing outreach table`;

  const rawText = await generateGeminiText(model, prompt, key, {
    temperature: 0.35,
    maxOutputTokens: 1400,
  });

  return parseJsonSafely<RawCompanyAiResult>(rawText) ?? {};
}

export async function researchCompanyWebsite(
  inputUrl: string,
  model: string,
): Promise<CompanyResearchResult> {
  const root = normalizeWebsite(inputUrl);
  const normalizedRoot = `${root.protocol}//${root.hostname}${root.pathname === "/" ? "" : root.pathname}`;
  const home = await scrapeCompanyPage(root.toString(), root);
  const keyPageUrls = selectKeyPageUrls(home, root);
  const keyPages = await Promise.allSettled(
    keyPageUrls.map((url) => scrapeCompanyPage(url, root)),
  );

  const pages = [
    home,
    ...keyPages
      .filter(
        (result): result is PromiseFulfilledResult<ScrapedCompanyPage> =>
          result.status === "fulfilled",
      )
      .map((result) => result.value),
  ];

  const emails = unique(
    pages.flatMap((page) => page.emails),
    (contact) => contact.value,
  );
  const phones = unique(
    pages.flatMap((page) => page.phones),
    (contact) => contact.value,
  );
  const contactPages = unique(
    pages.flatMap((page) => page.contactPages),
    (contact) => contact.value,
  );
  const socialLinks = unique(
    pages.flatMap((page) => page.socialLinks),
    (contact) => contact.value,
  );

  const contactPage =
    contactPages.find((contact) => contact.value.toLowerCase().includes("contact"))
      ?.value ??
    contactPages[0]?.value ??
    "";
  const fallbackName = fallbackCompanyName(home, root);
  const ai = await enrichCompany(
    model,
    root,
    pages,
    fallbackName,
    emails,
    phones,
    contactPage,
  );

  const baseNotes = notesForContacts(emails, phones, contactPage);
  const aiNotes = Array.isArray(ai.notes)
    ? ai.notes.filter((note): note is string => typeof note === "string")
    : [];

  return {
    id: `${root.hostname}-${Date.now()}`,
    status: "enriched",
    website: normalizedRoot,
    domain: root.hostname.replace(/^www\./, ""),
    companyName: String(ai.companyName ?? fallbackName),
    category: String(ai.category ?? "Uncategorized"),
    summary: String(ai.summary ?? home.description ?? "No summary available."),
    targetAudience: String(ai.targetAudience ?? "Unknown audience"),
    partnershipFit: String(
      ai.partnershipFit ?? "Review manually for partnership fit.",
    ),
    emails,
    phones,
    contactPage,
    socialLinks,
    confidenceScore: clampScore(ai.confidenceScore ?? 50),
    notes: unique([...baseNotes, ...aiNotes], (note) => note),
    crawledPages: pages.map((page) => page.url),
  };
}
