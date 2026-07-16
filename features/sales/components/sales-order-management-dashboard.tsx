"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  BadgeDollarSign, 
  Boxes, 
  CheckCircle2, 
  Clock3, 
  Download, 
  Edit3, 
  Eye, 
  FileCheck2, 
  FileText, 
  MoreVertical, 
  Printer, 
  RefreshCcw, 
  Search, 
  SlidersHorizontal, 
  Ship, 
  TrendingUp, 
  Truck 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { openSalesA4ReportWindow } from "@/lib/reports/open-sales-a4-report-window";
import { apiGet, apiPatch } from "@/lib/api/client";

type SalesOrder = {
  id: string;
  sales_order_no: string;
  sales_contract_no: string | null;
  order_date: string;
  customer_name: string | null;
  product_summary: string | null;
  quantity: number;
  total_weight: number;
  currency_code: string;
  exchange_rate: number;
  order_total: number;
  paid_amount: number;
  remaining_amount: number;
  sales_status: string;
  payment_status: string;
  delivery_status: string;
  form_data?: any;
  created_at: string;
};

const lifecycleTabs = [
  "Dashboard Overview",
  "Draft Sales Bookings",
  "Confirmed Sales",
  "Finalized Orders"
] as const;

type LifecycleTab = (typeof lifecycleTabs)[number];

export function SalesOrderManagementDashboard({ initialStage }: { initialStage?: string }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<LifecycleTab>("Dashboard Overview");
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Load orders
  async function loadOrders() {
    setLoading(true);
    try {
      const qp = new URLSearchParams();
      if (search.trim()) qp.set("q", search.trim());
      const res = await apiGet<{ salesOrders: SalesOrder[] }>(`/api/erp/sales/orders?${qp.toString()}`);
      setOrders(res.salesOrders || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders().catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    if (initialStage === "booking") {
      setActiveTab("Draft Sales Bookings");
    } else if (initialStage === "confirm") {
      setActiveTab("Confirmed Sales");
    }
  }, [initialStage]);

  // Transition Stage Actions
  async function transitionStatus(orderId: string, nextStatus: string) {
    setUpdatingId(orderId);
    try {
      await apiPatch(`/api/erp/sales/orders/${orderId}`, {
        salesStatus: nextStatus
      });
      await loadOrders();
    } catch (err: any) {
      alert("Failed to update sales order status: " + err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  // Filtered lists
  const filtered = useMemo(() => {
    if (activeTab === "Dashboard Overview") return orders;
    if (activeTab === "Draft Sales Bookings") return orders.filter(o => o.sales_status === "draft");
    if (activeTab === "Confirmed Sales") return orders.filter(o => o.sales_status === "Confirmed" || o.sales_status === "confirmed");
    if (activeTab === "Finalized Orders") return orders.filter(o => o.sales_status === "Finalized" || o.sales_status === "finalized");
    return orders;
  }, [orders, activeTab]);

  // Aggregated totals
  const summary = useMemo(() => {
    return {
      total: orders.length,
      revenue: orders.reduce((sum, o) => sum + Number(o.order_total || 0), 0),
      collected: orders.reduce((sum, o) => sum + Number(o.paid_amount || 0), 0),
      receivables: orders.reduce((sum, o) => sum + Number(o.remaining_amount || 0), 0)
    };
  }, [orders]);

  // Print helper
  function handlePrint(order: SalesOrder) {
    const raw = order.form_data || {};
    const reportData = {
      id: order.id,
      salesBookingOrderNumber: order.sales_order_no,
      salesDate: order.order_date,
      bookingDate: order.created_at,
      salesAccountName: raw.form?.salesAccountName || "-",
      salesAccountNumber: raw.form?.salesAccountNo || "-",
      purchaseAccountName: raw.form?.purchaseAccountName || "-",
      purchaseAccountNumber: raw.form?.purchaseAccountNo || "-",
      supplierName: raw.form?.supplierName || "-",
      customerName: order.customer_name || raw.form?.customerName || "-",
      productName: order.product_summary || "-",
      goodsDescription: raw.form?.goodsName ? `${raw.form.goodsName} / ${raw.form.brand}` : "-",
      quantity: order.quantity,
      unit: raw.form?.qtyName || "BAGS",
      totalWeight: order.total_weight,
      containerCount: raw.form?.containerCount || 0,
      salesRate: raw.form?.coursePrice || 0,
      totalSalesAmount: order.order_total,
      currency: order.currency_code,
      status: order.sales_status,
      paymentStatus: order.payment_status,
      branchName: raw.form?.branchName || "-",
      countryName: raw.form?.branchCountry || "-",
      createdAt: order.created_at,
      form_data: order.form_data,
      audit: {
        userName: raw.form?.userName || "Admin User",
        userId: raw.form?.userId || "USR-001",
        branchCode: raw.form?.branchCode || "QTA"
      }
    };

    openSalesA4ReportWindow({
      title: "Sales Booking Invoice",
      salesData: reportData
    });
  }

  return (
    <div className="space-y-6 text-slate-100 min-h-screen pb-16">
      
      {/* Search Header Controls */}
      <div className="bg-slate-900/40 p-4 rounded-2xl border border-slate-800 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex border border-slate-850 bg-slate-950 p-1 rounded-xl">
          {lifecycleTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === tab
                  ? "bg-cyan-600 text-white shadow-md shadow-cyan-950"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <div className="relative w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search order no, customer..."
              className="w-full bg-slate-950 border border-slate-850 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-cyan-500 text-white placeholder-slate-650"
            />
          </div>
          <Button
            onClick={() => {
              router.push("/dashboard/sales/new-sales-booking-order");
            }}
            className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs px-4"
          >
            + Create Booking
          </Button>
        </div>
      </div>

      {/* Aggregate Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl flex items-center space-x-3">
          <TrendingUp className="h-8 w-8 text-cyan-400" />
          <div>
            <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider mb-0.5">Estimated Revenue</span>
            <span className="text-lg font-black text-white">{summary.revenue.toLocaleString()} USD</span>
          </div>
        </div>
        <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl flex items-center space-x-3">
          <CheckCircle2 className="h-8 w-8 text-emerald-400" />
          <div>
            <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider mb-0.5">Collections Paid</span>
            <span className="text-lg font-black text-emerald-400">{summary.collected.toLocaleString()} USD</span>
          </div>
        </div>
        <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl flex items-center space-x-3">
          <Clock3 className="h-8 w-8 text-amber-400" />
          <div>
            <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider mb-0.5">Accounts Receivable</span>
            <span className="text-lg font-black text-white">{summary.receivables.toLocaleString()} USD</span>
          </div>
        </div>
        <div className="bg-slate-950 border border-indigo-950 p-4 rounded-xl flex items-center space-x-3 bg-indigo-950/20">
          <Boxes className="h-8 w-8 text-indigo-400" />
          <div>
            <span className="text-[10px] text-indigo-400 font-bold block uppercase tracking-wider mb-0.5">Orders Count</span>
            <span className="text-lg font-black text-white">{summary.total}</span>
          </div>
        </div>
      </div>

      {/* Master Data Grid */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/20">
        <table className="min-w-full text-xs text-left text-slate-350">
          <thead className="bg-slate-950 text-slate-450 uppercase text-xs font-semibold">
            <tr>
              <th className="px-6 py-4">SO Number</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Customer</th>
              <th className="px-6 py-4">Product Details</th>
              <th className="px-6 py-4">Qty</th>
              <th className="px-6 py-4">Weight</th>
              <th className="px-6 py-4">Total Amount</th>
              <th className="px-6 py-4">Sales Status</th>
              <th className="px-6 py-4">Payment</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850">
            {loading ? (
              <tr>
                <td colSpan={10} className="px-6 py-12 text-center text-slate-400 font-medium">Loading sales bookings...</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-6 py-12 text-center text-slate-500">No sales bookings in this stage.</td>
              </tr>
            ) : (
              filtered.map((order) => (
                <tr key={order.id} className="hover:bg-slate-900/30">
                  <td className="px-6 py-4 font-mono font-bold text-white">{order.sales_order_no}</td>
                  <td className="px-6 py-4 text-slate-400">{order.order_date}</td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-white">{order.customer_name || "-"}</div>
                    <div className="text-[10px] text-slate-500">{order.form_data?.form?.branchName || "-"}</div>
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-200">{order.product_summary || "-"}</td>
                  <td className="px-6 py-4">{order.quantity?.toLocaleString()}</td>
                  <td className="px-6 py-4">{order.total_weight?.toLocaleString()} KG</td>
                  <td className="px-6 py-4 font-black text-white">{order.order_total?.toLocaleString()} {order.currency_code}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      order.sales_status === "draft" 
                        ? "bg-slate-900 text-slate-500 border border-slate-800" 
                        : order.sales_status === "Confirmed" || order.sales_status === "confirmed"
                          ? "bg-indigo-950 text-indigo-400 border border-indigo-900"
                          : "bg-emerald-950 text-emerald-400 border border-emerald-900"
                    }`}>
                      {order.sales_status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      order.payment_status === "pending" 
                        ? "bg-amber-950 text-amber-400 border border-amber-900" 
                        : "bg-emerald-950 text-emerald-400 border border-emerald-900"
                    }`}>
                      {order.payment_status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <Button
                      onClick={() => handlePrint(order)}
                      variant="outline"
                      className="border-slate-800 bg-transparent text-slate-300 hover:bg-slate-950 text-xs px-2 py-1 h-auto"
                    >
                      <Printer className="h-3 w-3" />
                    </Button>
                    
                    {order.sales_status === "draft" && (
                      <Button
                        disabled={updatingId === order.id}
                        onClick={() => transitionStatus(order.id, "Confirmed")}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-2 py-1 h-auto font-bold"
                      >
                        Confirm Booking
                      </Button>
                    )}

                    {(order.sales_status === "Confirmed" || order.sales_status === "confirmed") && (
                      <Button
                        disabled={updatingId === order.id}
                        onClick={() => transitionStatus(order.id, "Finalized")}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-2 py-1 h-auto font-bold"
                      >
                        Finalize & Post GL
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
