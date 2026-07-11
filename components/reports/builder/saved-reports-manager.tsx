"use client";
import { useState, useEffect } from "react";
import { type SavedReportConfig } from "./types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bookmark, Save, Trash2, CheckCircle2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

type SavedReportsManagerProps = {
  moduleName: string;
  currentConfig: Omit<SavedReportConfig, "name" | "module">;
  onLoadReport: (config: SavedReportConfig) => void;
};

export function SavedReportsManager({ moduleName, currentConfig, onLoadReport }: SavedReportsManagerProps) {
  const [reports, setReports] = useState<SavedReportConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [newReportName, setNewReportName] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  useEffect(() => {
    fetchReports();
  }, [moduleName]);

  const fetchReports = async () => {
    try {
      const res = await fetch(`/api/erp/reports/saved?module=${moduleName}`);
      const json = await res.json();
      if (json.success) {
        setReports(json.data.map((r: any) => ({
          id: r.id,
          name: r.name,
          module: r.module,
          isPublic: r.isPublic,
          ...r.config,
        })));
      }
    } catch (e) {
      console.error("Failed to load saved reports", e);
    }
  };

  const handleSave = async () => {
    if (!newReportName.trim()) return;
    setLoading(true);
    try {
      const configToSave = { ...currentConfig };
      const res = await fetch(`/api/erp/reports/saved`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newReportName,
          module: moduleName,
          isPublic,
          config: configToSave,
        }),
      });
      if (res.ok) {
        setSaveDialogOpen(false);
        setNewReportName("");
        setIsPublic(false);
        fetchReports();
      }
    } catch (e) {
      console.error("Failed to save report", e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this saved report?")) return;
    try {
      const res = await fetch(`/api/erp/reports/saved/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchReports();
      }
    } catch (err) {
      console.error("Failed to delete", err);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Select onValueChange={(val) => {
        const rep = reports.find((r) => r.id === val);
        if (rep) onLoadReport(rep);
      }}>
        <SelectTrigger className="w-[200px] h-9 text-xs">
          <div className="flex items-center gap-2">
            <Bookmark className="h-3 w-3 text-blue-600" />
            <SelectValue placeholder="Load Saved Report..." />
          </div>
        </SelectTrigger>
        <SelectContent>
          {reports.length === 0 ? (
            <div className="p-2 text-xs text-slate-500 italic text-center">No saved reports</div>
          ) : (
            reports.map((r) => (
              <SelectItem key={r.id} value={r.id!} className="text-xs">
                <div className="flex items-center justify-between w-full pr-6">
                  <span>{r.name}</span>
                  <div
                    className="p-1 hover:bg-red-100 rounded text-red-500 hover:text-red-700 transition-colors"
                    onClick={(e) => handleDelete(r.id!, e)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </div>
                </div>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 text-xs">
            <Save className="h-3.5 w-3.5 mr-1" /> Save Layout
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-lg">Save Custom Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">Report Name</label>
              <Input
                placeholder="e.g., Pakistan Pending Payments"
                value={newReportName}
                onChange={(e) => setNewReportName(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Checkbox
                id="isPublic"
                checked={isPublic}
                onCheckedChange={(c) => setIsPublic(!!c)}
              />
              <label htmlFor="isPublic" className="text-sm font-medium leading-none cursor-pointer">
                Share with other users (Public)
              </label>
            </div>
            
            <div className="bg-slate-50 p-3 rounded text-xs space-y-1.5 border">
              <div className="font-semibold text-slate-700 mb-2">This will save:</div>
              <div className="flex items-center gap-2 text-slate-600"><CheckCircle2 className="h-3 w-3 text-green-500" /> Selected columns & order</div>
              <div className="flex items-center gap-2 text-slate-600"><CheckCircle2 className="h-3 w-3 text-green-500" /> Active filters</div>
              <div className="flex items-center gap-2 text-slate-600"><CheckCircle2 className="h-3 w-3 text-green-500" /> Date range</div>
              <div className="flex items-center gap-2 text-slate-600"><CheckCircle2 className="h-3 w-3 text-green-500" /> Sorting rules</div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="ghost" onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={loading || !newReportName.trim()}>
                {loading ? "Saving..." : "Save Report"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
