"use client";

import type { ExpertResponseBlock } from "@/lib/types";
import { ExpertTable } from "./ExpertTable";
import { ExpertChart } from "./ExpertChart";

interface Props {
  blocks: ExpertResponseBlock[];
}

export function ExpertResponseRenderer({ blocks }: Props) {
  return (
    <div className="space-y-4">
      {blocks.map((block, i) => {
        if (block.type === "text") {
          return (
            <div key={i} className="prose prose-sm max-w-none text-[#151229]" style={{ whiteSpace: "pre-wrap" }}>
              {block.content}
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
