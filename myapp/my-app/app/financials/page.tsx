// my-app/app/financials/page.tsx
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Landmark, Wallet, Award, Activity, Receipt, ArrowRight } from "lucide-react";

export default function FinancialsHomePage() {
  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="border-b pb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Financial Ledger</h1>
        <p className="text-sm font-semibold text-muted-foreground mt-1">Manage artisan advances, payroll payouts, and generated payslips</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
        <Link href="/financials/payslips-page" passHref className="group">
          <Card className="relative overflow-hidden border border-gray-200 shadow-sm bg-white hover:border-blue-200 hover:shadow-md transition-all duration-300 hover:scale-[1.01] cursor-pointer">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
              <Landmark className="h-28 w-28 text-blue-600" />
            </div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 border-b bg-slate-50/50">
              <div className="space-y-0.5">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-blue-800 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-blue-600"></span>
                  Payslip Ledger
                </CardTitle>
                <CardDescription className="text-[11px] font-semibold">Artisan compensations and statements</CardDescription>
              </div>
              <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-extrabold group-hover:scale-105 transition-transform">
                <Receipt className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-3">
              <div className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                Manage Artisan Payslips
              </div>
              <p className="text-xs text-muted-foreground font-semibold leading-relaxed">
                Review pending work items, compile payouts individually or in bulk by service category, and generate downloadable spreadsheet sheets.
              </p>
              <div className="text-xs font-bold text-blue-600 flex items-center gap-1 mt-4 group-hover:translate-x-1 transition-transform">
                Open Payslips Registry <ArrowRight className="h-3.5 w-3.5 stroke-[2.5]" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/financials/advances-page" passHref className="group">
          <Card className="relative overflow-hidden border border-gray-200 shadow-sm bg-white hover:border-indigo-200 hover:shadow-md transition-all duration-300 hover:scale-[1.01] cursor-pointer">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
              <Wallet className="h-28 w-28 text-indigo-600" />
            </div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 border-b bg-slate-50/50">
              <div className="space-y-0.5">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-indigo-800 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-indigo-600"></span>
                  Advances Tracker
                </CardTitle>
                <CardDescription className="text-[11px] font-semibold">Credit allowances and balances</CardDescription>
              </div>
              <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 font-extrabold group-hover:scale-105 transition-transform">
                <Wallet className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-3">
              <div className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                Track Artisan Advances
              </div>
              <p className="text-xs text-muted-foreground font-semibold leading-relaxed">
                Record short-term capital advances allocated to craftsmen, track outstanding remaining balances, and execute pay-period deductions.
              </p>
              <div className="text-xs font-bold text-indigo-600 flex items-center gap-1 mt-4 group-hover:translate-x-1 transition-transform">
                Open Advances Ledger <ArrowRight className="h-3.5 w-3.5 stroke-[2.5]" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
