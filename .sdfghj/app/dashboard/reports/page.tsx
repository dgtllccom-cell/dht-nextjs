import { BarChart3, FileSpreadsheet, Printer } from "lucide-react";

const reportAreas = [
  { title: "Trial balance", icon: BarChart3 },
  { title: "General ledger", icon: FileSpreadsheet },
  { title: "Printable statements", icon: Printer }
];

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Reports will read from posted ledger entries, never from draft business documents.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {reportAreas.map((area) => (
          <section key={area.title} className="rounded-lg border bg-card p-5">
            <area.icon className="mb-4 h-5 w-5 text-primary" aria-hidden />
            <h2 className="font-medium">{area.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">Ready for ledger-backed query builders.</p>
          </section>
        ))}
      </div>
    </div>
  );
}
