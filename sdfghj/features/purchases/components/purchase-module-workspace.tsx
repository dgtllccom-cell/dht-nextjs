import { Boxes, ClipboardList } from "lucide-react";

export function PurchaseModuleWorkspace({
  title,
  description,
  type = "purchase"
}: {
  title: string;
  description: string;
  type?: "purchase" | "stock";
}) {
  const Icon = type === "stock" ? Boxes : ClipboardList;

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">Purchase Module</p>
            <h1 className="text-2xl font-bold text-foreground">{title}</h1>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold text-foreground">ERP Workflow Status</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Payment actions are managed from the Journal menu and remain linked by Purchase Order Number.
        </p>
      </section>
    </div>
  );
}
