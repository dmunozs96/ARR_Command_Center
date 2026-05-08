"use client";

import type { ReactNode } from "react";
import type { ExpertResponseBlock } from "@/lib/types";
import { ExpertTable } from "./ExpertTable";
import { ExpertChart } from "./ExpertChart";

interface Props {
  blocks: ExpertResponseBlock[];
}

function renderInline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function renderText(content: string | undefined) {
  if (!content?.trim()) return null;

  const nodes: ReactNode[] = [];
  const lines = content.split("\n");
  let listItems: string[] = [];
  let listType: "ul" | "ol" | null = null;

  function flushList() {
    if (!listType || listItems.length === 0) return;
    const items = listItems;
    const key = nodes.length;
    nodes.push(
      listType === "ol" ? (
        <ol key={key} className="list-decimal space-y-1 pl-5">
          {items.map((item, index) => <li key={index}>{renderInline(item)}</li>)}
        </ol>
      ) : (
        <ul key={key} className="list-disc space-y-1 pl-5">
          {items.map((item, index) => <li key={index}>{renderInline(item)}</li>)}
        </ul>
      ),
    );
    listItems = [];
    listType = null;
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line === "---") {
      flushList();
      continue;
    }

    const heading = line.match(/^#{1,4}\s+(.+)$/);
    if (heading) {
      flushList();
      nodes.push(
        <h3 key={nodes.length} className="pt-1 text-base font-black text-[#2f185f]">
          {renderInline(heading[1])}
        </h3>,
      );
      continue;
    }

    const bullet = line.match(/^[-*]\s+(.+)$/);
    const numbered = line.match(/^\d+[.)]\s+(.+)$/);
    if (bullet || numbered) {
      const nextType = numbered ? "ol" : "ul";
      if (listType && listType !== nextType) flushList();
      listType = nextType;
      listItems.push((bullet?.[1] ?? numbered?.[1] ?? "").trim());
      continue;
    }

    flushList();
    nodes.push(
      <p key={nodes.length} className="leading-7">
        {renderInline(line)}
      </p>,
    );
  }

  flushList();
  return nodes;
}

export function ExpertResponseRenderer({ blocks }: Props) {
  return (
    <div className="space-y-4">
      {blocks.map((block, i) => {
        if (block.type === "text") {
          return (
            <div key={i} className="space-y-3 text-sm text-[#151229]">
              {renderText(block.content)}
            </div>
          );
        }
        if (block.type === "table") {
          return <ExpertTable key={i} table_title={block.table_title} columns={block.columns} rows={block.rows} />;
        }
        if (block.type === "chart") {
          return (
            <ExpertChart
              key={i}
              chart_type={block.chart_type}
              chart_title={block.chart_title}
              chart_data={block.chart_data}
              x_key={block.x_key}
              data_keys={block.data_keys}
              colors={block.colors}
            />
          );
        }
        return null;
      })}
    </div>
  );
}
