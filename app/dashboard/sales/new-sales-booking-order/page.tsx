"use client";

import { SalesOrderWizard } from "@/features/sales/components/sales-order-wizard";

export default function NewSalesBookingOrderPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h2 className="text-2xl font-black text-white">Create New Sales Booking Order</h2>
        <p className="text-xs text-slate-400">Complete the multi-step wizard to register sales details, product entries, and ports.</p>
      </div>
      <SalesOrderWizard />
    </div>
  );
}
