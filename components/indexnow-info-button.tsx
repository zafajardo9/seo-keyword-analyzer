"use client";

import * as React from "react";
import { InfoButton, ToolInfoDrawer } from "@/components/tool-info-drawer";

const INDEXNOW_INFO = {
  toolName: "IndexNow Submit",
  tagline: "Tell search engines about new or updated pages right away, so they don't have to wait until their next scheduled crawl to discover your content.",
  sections: [
    {
      title: "Why this saves you time",
      body: "Search engines crawl websites on their own schedule, which can mean new or updated pages stay invisible in search for days or weeks. IndexNow lets you skip that wait by notifying them directly.",
    },
    {
      title: "Which search engines get notified",
      body: "One submission reaches Bing, Yandex, Naver, Seznam, and Yep simultaneously — you don't need to notify each one separately.",
    },
    {
      title: "What you need to use it",
      body: "An IndexNow API key and a small verification file hosted on your site. The setup checklist at the bottom of this page walks you through it in about two minutes.",
    },
    {
      title: "What happens after you submit",
      body: "Each search engine receives your list of URLs and decides when to crawl them — typically much sooner than their normal schedule. A 200 or 202 response means your submission was accepted.",
    },
  ],
};

export function IndexNowInfoButton() {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <InfoButton onClick={() => setOpen(true)} />
      <ToolInfoDrawer open={open} onClose={() => setOpen(false)} {...INDEXNOW_INFO} />
    </>
  );
}
