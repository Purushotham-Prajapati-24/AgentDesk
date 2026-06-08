import type { ReactNode } from "react";

import { parseMarkdownBlocks, parseMarkdownInline, type MarkdownBlock, type MarkdownInlineToken } from "@/lib/markdown";
import { cn } from "@/lib/utils";

type MarkdownRendererProps = {
  text: string;
  className?: string;
};

export function MarkdownRenderer({ text, className }: MarkdownRendererProps) {
  const blocks = parseMarkdownBlocks(text);

  return <div className={cn("space-y-2 text-sm font-medium leading-6", className)}>{blocks.map((block, index) => renderBlock(block, `block-${index}`))}</div>;
}

function renderBlock(block: MarkdownBlock, key: string) {
  if (block.kind === "heading") {
    const HeadingTag = headingTag(block.level);
    return (
      <HeadingTag className={cn("font-semibold leading-6", block.level === 1 ? "text-base" : "text-sm")} key={key}>
        {renderInline(block.text, key)}
      </HeadingTag>
    );
  }

  if (block.kind === "list") {
    const ListTag = block.ordered ? "ol" : "ul";
    return (
      <ListTag className={cn("list-outside space-y-1 pl-5", block.ordered ? "list-decimal" : "list-disc")} key={key}>
        {block.items.map((item, index) => (
          <li className="pl-1" key={`${key}-item-${index}`}>
            {renderInline(item, `${key}-item-${index}`)}
          </li>
        ))}
      </ListTag>
    );
  }

  return <p key={key}>{renderInline(block.text, key)}</p>;
}

function renderInline(text: string, keyPrefix: string) {
  return renderInlineTokens(parseMarkdownInline(text), keyPrefix);
}

function renderInlineTokens(tokens: MarkdownInlineToken[], keyPrefix: string): ReactNode[] {
  return tokens.map((token, index) => {
    const key = `${keyPrefix}-inline-${index}`;

    if (token.kind === "text") {
      return token.text;
    }

    if (token.kind === "strong") {
      return (
        <strong className="font-semibold" key={key}>
          {renderInline(token.text, key)}
        </strong>
      );
    }

    if (token.kind === "emphasis") {
      return (
        <em className="italic" key={key}>
          {renderInline(token.text, key)}
        </em>
      );
    }

    if (token.kind === "code") {
      return (
        <code className="rounded bg-black/10 px-1 py-0.5 font-mono text-[0.85em] dark:bg-white/15" key={key}>
          {token.text}
        </code>
      );
    }

    return (
      <a className="font-semibold underline underline-offset-2" href={token.href} key={key} rel="noopener noreferrer" target="_blank">
        {token.text}
      </a>
    );
  });
}

function headingTag(level: 1 | 2 | 3) {
  if (level === 1) {
    return "h3";
  }

  if (level === 2) {
    return "h4";
  }

  return "h5";
}
