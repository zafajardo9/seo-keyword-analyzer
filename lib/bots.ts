export interface BotInfo {
  name: string;
  company: string;
}

const AI_BOTS: { name: string; company: string; pattern: RegExp }[] = [
  { name: "GPTBot", company: "OpenAI", pattern: /GPTBot/i },
  { name: "ChatGPT-User", company: "OpenAI", pattern: /ChatGPT-User/i },
  { name: "OAI-SearchBot", company: "OpenAI", pattern: /OAI-SearchBot/i },
  { name: "ClaudeBot", company: "Anthropic", pattern: /ClaudeBot/i },
  { name: "Claude-Web", company: "Anthropic", pattern: /claude-web/i },
  { name: "anthropic-ai", company: "Anthropic", pattern: /anthropic-ai/i },
  { name: "PerplexityBot", company: "Perplexity", pattern: /PerplexityBot/i },
  { name: "Google-Extended", company: "Google", pattern: /Google-Extended/i },
  { name: "GoogleOther", company: "Google", pattern: /GoogleOther/i },
  { name: "YouBot", company: "You.com", pattern: /YouBot/i },
  { name: "Bytespider", company: "ByteDance", pattern: /Bytespider/i },
  { name: "CCBot", company: "Common Crawl", pattern: /CCBot/i },
  { name: "cohere-ai", company: "Cohere", pattern: /cohere-ai/i },
  { name: "Diffbot", company: "Diffbot", pattern: /Diffbot/i },
  { name: "Applebot-Extended", company: "Apple", pattern: /Applebot-Extended/i },
  { name: "Meta-ExternalAgent", company: "Meta", pattern: /Meta-ExternalAgent/i },
  { name: "Amazonbot", company: "Amazon", pattern: /Amazonbot/i },
  { name: "Timpibot", company: "Timpi", pattern: /Timpi/i },
  { name: "omgili", company: "Webz.io", pattern: /omgili/i },
];

export function detectAIBot(userAgent: string): BotInfo | null {
  for (const bot of AI_BOTS) {
    if (bot.pattern.test(userAgent)) {
      return { name: bot.name, company: bot.company };
    }
  }
  return null;
}

export const ALL_KNOWN_BOTS = AI_BOTS.map((b) => ({ name: b.name, company: b.company }));
