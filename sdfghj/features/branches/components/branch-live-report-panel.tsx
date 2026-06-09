"use client";

import type { ReactNode } from "react";
import { ClipboardList } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type BranchLiveReportField = {
  label: string;
  value: string;
};

export type BranchLiveReportStep = {
  title: string;
  rows: BranchLiveReportField[];
};

export function BranchLiveReportRow({ label, value }: BranchLiveReportField) {
  const blank = !value || value === "-";

  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 border-b border-dashed py-2 text-sm last:border-b-0">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className={blank ? "font-semibold text-muted-foreground" : "font-semibold text-foreground"}>
        {value || "-"}
      </span>
    </div>
  );
}

function pillClassName() {
  return "inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs text-slate-700 dark:text-slate-200";
}

type BranchLiveReportPanelProps = {
  title: string;
  status: string;
  summary?: BranchLiveReportField[];
  steps: BranchLiveReportStep[];
  actions?: ReactNode;
  footer?: ReactNode;
};

export function BranchLiveReportPanel({ title, status, summary = [], steps, actions, footer }: BranchLiveReportPanelProps) {
  return (
    <Card className="border-slate-200/80 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" aria-hidden />
            <CardTitle>{title}</CardTitle>
          </div>
          <span className={pillClassName()}>
            <b>Status:</b> <span>{status}</span>
          </span>
        </div>

        {summary.length ? (
          <div className="mt-3 rounded-lg border bg-muted/25 p-3">
            <div className="flex flex-wrap gap-2">
              {summary.map((item) => (
                <span key={`${item.label}-${item.value}`} className={pillClassName()}>
                  <b>{item.label}:</b> <span>{item.value || "-"}</span>
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {actions ? <div className="mt-3 flex justify-end gap-2">{actions}</div> : null}
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="space-y-3">
          {steps.map((step) => (
            <section key={step.title} className="rounded-lg border bg-background p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{step.title}</p>
              <div className="mt-2 space-y-1">
                {step.rows.map((row) => (
                  <BranchLiveReportRow key={`${step.title}-${row.label}`} label={row.label} value={row.value} />
                ))}
              </div>
            </section>
          ))}
        </div>

        {footer ? <div className="border-t pt-2">{footer}</div> : null}
      </CardContent>
    </Card>
  );
}
