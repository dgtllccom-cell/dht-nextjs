import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, FileText, Printer, Ship } from "lucide-react";

type StagePageProps = {
  title: string;
  eyebrow: string;
  description: string;
  activeStage: "shipment" | "report";
};

const workflow = [
  "Shipping Line",
  "Vessel / Voyage",
  "Port Information",
  "ETA / ETD",
  "Shipment Report"
];

export function ShippingLineStagePage({ title, eyebrow, description, activeStage }: StagePageProps) {
  return (
    <div className="mx-auto max-w-[1500px] space-y-4 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-cyan-600 dark:text-cyan-300">{eyebrow}</p>
          <h1 className="text-2xl font-black tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={"/dashboard/shipping-line/shipment-report" as Route} className="inline-flex h-9 items-center gap-2 rounded-md bg-cyan-600 px-3 text-xs font-black text-white hover:bg-cyan-500">
            Shipment Report <ArrowRight className="h-4 w-4" />
          </Link>
          <button type="button" className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-xs font-bold">
            <Printer className="h-4 w-4" /> Print
          </button>
        </div>
      </div>

      <section className="rounded-xl border bg-card p-4">
        <div className="grid gap-2 md:grid-cols-5">
          {workflow.map((step, index) => {
            const isActive =
              (activeStage === "shipment" && step === "Shipping Line") ||
              (activeStage === "report" && step === "Shipment Report");
            return (
              <div key={step} className={`rounded-lg border p-3 text-xs ${isActive ? "border-cyan-400 bg-cyan-50 text-cyan-800 dark:bg-cyan-950/30 dark:text-cyan-200" : "bg-muted/30 text-muted-foreground"}`}>
                <div className="text-[10px] font-black uppercase">Step {index + 1}</div>
                <div className="mt-1 font-black">{step}</div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-xl border bg-card p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-black">
            <Ship className="h-4 w-4 text-cyan-600" /> Shipping Line Details
          </div>
          <div className="grid gap-2 text-sm">
            <Info label="Shipping Line Name" value="DGT Logistics" />
            <Info label="Vessel Name" value="Pending Shipment Entry" />
            <Info label="Voyage Number" value="Pending Shipment Entry" />
            <Info label="Container Numbers" value="Linked after Loading Entry" />
            <Info label="Port of Loading" value="Pending" />
            <Info label="Port of Discharge" value="Pending" />
            <Info label="ETA / ETD" value="Pending" />
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-black">
            <FileText className="h-4 w-4 text-cyan-600" /> Shipment Tracking Actions
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {["View Shipment", "Print Shipment", "Export Tracking", "Open Containers"].map((action) => (
              <button key={action} type="button" className="inline-flex h-10 items-center justify-between rounded-lg border bg-background px-3 text-xs font-black hover:bg-muted">
                {action}
                <ArrowRight className="h-4 w-4" />
              </button>
            ))}
          </div>
          <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs font-semibold text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
            Shipping Line only manages vessel, voyage, port information, ETA/ETD and shipment tracking. Bill of Lading is handled in the Purchase workflow after Loading Entry.
          </p>
        </div>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[150px_1fr] gap-3 border-b border-dotted py-2">
      <span className="text-xs font-black uppercase text-muted-foreground">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  );
}
