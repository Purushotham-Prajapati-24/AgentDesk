export type MarkdownBlock =
  | { kind: "paragraph"; text: string }
  | { kind: "heading"; level: 1 | 2 | 3; text: string }
  | { kind: "list"; ordered: boolean; items: string[] };

export type MarkdownInlineToken =
  | { kind: "text"; text: string }
  | { kind: "strong"; text: string }
  | { kind: "emphasis"; text: string }
  | { kind: "code"; text: string }
  | { kind: "link"; text: string; href: string };

type PendingList = {
  kind: "ul" | "ol";
  items: string[];
};

export function parseMarkdownBlocks(text: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const paragraphLines: string[] = [];
  let pendingList: PendingList | null = null;

  const flushParagraph = () => {
    const paragraph = paragraphLines.join(" ").trim();
    paragraphLines.length = 0;
    if (paragraph) {
      blocks.push({ kind: "paragraph", text: paragraph });
    }
  };

  const flushList = () => {
    if (pendingList?.items.length) {
      blocks.push({ kind: "list", ordered: pendingList.kind === "ol", items: pendingList.items });
    }
    pendingList = null;
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    const headingMatch = /^(#{1,3})\s+(.+)$/.exec(trimmed);
    if (headingMatch) {
      flushParagraph();
      flushList();
      blocks.push({ kind: "heading", level: headingMatch[1].length as 1 | 2 | 3, text: headingMatch[2].trim() });
      continue;
    }

    const unorderedMatch = /^[-*]\s+(.+)$/.exec(trimmed);
    const orderedMatch = /^\d+[.)]\s+(.+)$/.exec(trimmed);
    const listMatch = unorderedMatch ?? orderedMatch;
    if (listMatch) {
      flushParagraph();
      const listKind = orderedMatch ? "ol" : "ul";
      if (!pendingList || pendingList.kind !== listKind) {
        flushList();
        pendingList = { kind: listKind, items: [] };
      }
      pendingList.items.push(listMatch[1].trim());
      continue;
    }

    if (pendingList) {
      const itemIndex = pendingList.items.length - 1;
      if (itemIndex >= 0) {
        pendingList.items[itemIndex] = `${pendingList.items[itemIndex]} ${trimmed}`;
        continue;
      }
    }

    paragraphLines.push(trimmed);
  }

  flushParagraph();
  flushList();

  return blocks;
}

export function parseMarkdownInline(text: string): MarkdownInlineToken[] {
  const tokens: MarkdownInlineToken[] = [];
  let cursor = 0;

  const appendText = (value: string) => {
    if (!value) {
      return;
    }

    const previous = tokens.at(-1);
    if (previous?.kind === "text") {
      previous.text += value;
      return;
    }

    tokens.push({ kind: "text", text: value });
  };

  while (cursor < text.length) {
    const code = readDelimitedToken(text, cursor, "`", "`");
    if (code) {
      tokens.push({ kind: "code", text: code.text });
      cursor = code.end;
      continue;
    }

    const markdownLink = readMarkdownLink(text, cursor);
    if (markdownLink) {
      tokens.push({ kind: "link", text: markdownLink.text, href: markdownLink.href });
      cursor = markdownLink.end;
      continue;
    }

    const strong = readDelimitedToken(text, cursor, "**", "**");
    if (strong) {
      tokens.push({ kind: "strong", text: strong.text });
      cursor = strong.end;
      continue;
    }

    const emphasis = text.startsWith("*", cursor) && !text.startsWith("**", cursor) ? readDelimitedToken(text, cursor, "*", "*") : null;
    if (emphasis) {
      tokens.push({ kind: "emphasis", text: emphasis.text });
      cursor = emphasis.end;
      continue;
    }

    const rawUrl = readRawUrl(text, cursor);
    if (rawUrl) {
      tokens.push({ kind: "link", text: rawUrl.href, href: rawUrl.href });
      appendText(rawUrl.trailing);
      cursor = rawUrl.end;
      continue;
    }

    appendText(text[cursor]);
    cursor += 1;
  }

  return tokens;
}

function readDelimitedToken(text: string, cursor: number, opener: string, closer: string) {
  if (!text.startsWith(opener, cursor)) {
    return null;
  }

  const contentStart = cursor + opener.length;
  const contentEnd = text.indexOf(closer, contentStart);
  if (contentEnd <= contentStart) {
    return null;
  }

  return {
    text: text.slice(contentStart, contentEnd),
    end: contentEnd + closer.length,
  };
}

function readMarkdownLink(text: string, cursor: number) {
  if (!text.startsWith("[", cursor)) {
    return null;
  }

  const labelEnd = text.indexOf("](", cursor + 1);
  if (labelEnd === -1) {
    return null;
  }

  const hrefStart = labelEnd + 2;
  const hrefEnd = text.indexOf(")", hrefStart);
  if (hrefEnd === -1) {
    return null;
  }

  const label = text.slice(cursor + 1, labelEnd);
  const href = text.slice(hrefStart, hrefEnd);
  if (!label.trim() || !isSafeHttpUrl(href)) {
    return null;
  }

  return {
    text: label,
    href,
    end: hrefEnd + 1,
  };
}

function readRawUrl(text: string, cursor: number) {
  const match = /^https?:\/\/[^\s<>"']+/i.exec(text.slice(cursor));
  if (!match) {
    return null;
  }

  const candidate = match[0];
  const { href, trailing } = splitTrailingUrlPunctuation(candidate);
  if (!isSafeHttpUrl(href)) {
    return null;
  }

  return {
    href,
    trailing,
    end: cursor + candidate.length,
  };
}

function splitTrailingUrlPunctuation(value: string) {
  let href = value;
  let trailing = "";

  while (href && /[.,!?;:)\]]/.test(href[href.length - 1])) {
    trailing = `${href[href.length - 1]}${trailing}`;
    href = href.slice(0, -1);
  }

  return { href, trailing };
}

function isSafeHttpUrl(value: string) {
  return /^https?:\/\/[^\s]+$/i.test(value);
}
