"use client";

import { Download } from "lucide-react";
import { cn } from "@/lib/cn";

type CsvValue = string | number | boolean | null | undefined;

function csvCell(value: CsvValue) {
  let text = value == null ? "" : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function downloadCsv(filename: string, headers: string[], rows: CsvValue[][]) {
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function CsvExportButton({ filename, headers, rows, label = "Export", className }: { filename: string; headers: string[]; rows: CsvValue[][]; label?: string; className?: string }) {
  return <button type="button" className={cn("ref-btn", className)} onClick={() => downloadCsv(filename, headers, rows)}><Download />{label}</button>;
}
