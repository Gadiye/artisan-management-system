
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, Users, DollarSign, Package } from "lucide-react";
import useSWR from 'swr';

const fetcher = (url: string) => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  const fullUrl = `${(baseUrl || '').endsWith('/') ? baseUrl : `${baseUrl}/`}${url}`;
  return fetch(fullUrl).then(res => res.json());
};

export default function LiveDashboard() {
  const { data: jobsData } = useSWR('jobs/dashboard/', fetcher);
  const { data: artisansData } = useSWR('artisans/', fetcher);
  const { data: inventoryData } = useSWR('inventory/items/', fetcher);
  const { data: payslipsData } = useSWR('payslips/', fetcher);

  interface PayslipData {
    total_payment: string;
  }

  const pendingPayments = payslipsData?.results?.reduce((sum: number, payslip: PayslipData) => sum + parseFloat(payslip.total_payment), 0);
  const formattedPendingPayments = typeof pendingPayments === 'number'
    ? `Ksh ${pendingPayments.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    : '...';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card className="relative overflow-hidden group hover:scale-[1.02] hover:shadow-lg transition-all duration-300 border-blue-100 bg-gradient-to-br from-blue-50/50 to-white">
        <div className="absolute top-0 right-0 p-4 opacity-15">
          <Briefcase className="h-16 w-16 text-blue-600" />
        </div>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-blue-800 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span>
            Active Jobs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-extrabold text-blue-600 tracking-tight">{jobsData?.in_progress ?? '...'}</div>
          <p className="text-xs text-blue-800/80 font-medium mt-1">Currently in progress</p>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden group hover:scale-[1.02] hover:shadow-lg transition-all duration-300 border-purple-100 bg-gradient-to-br from-purple-50/50 to-white">
        <div className="absolute top-0 right-0 p-4 opacity-15">
          <Users className="h-16 w-16 text-purple-600" />
        </div>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-purple-800 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-purple-600"></span>
            Active Artisans
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-extrabold text-purple-600 tracking-tight">{artisansData?.results?.length ?? '...'}</div>
          <p className="text-xs text-purple-800/80 font-medium mt-1">Working on assignments</p>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden group hover:scale-[1.02] hover:shadow-lg transition-all duration-300 border-emerald-100 bg-gradient-to-br from-emerald-50/50 to-white">
        <div className="absolute top-0 right-0 p-4 opacity-15">
          <DollarSign className="h-16 w-16 text-emerald-600" />
        </div>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-600"></span>
            Pending Payments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-extrabold text-emerald-600 tracking-tight">{formattedPendingPayments}</div>
          <p className="text-xs text-emerald-800/80 font-medium mt-1">Due for completed work</p>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden group hover:scale-[1.02] hover:shadow-lg transition-all duration-300 border-orange-100 bg-gradient-to-br from-orange-50/50 to-white">
        <div className="absolute top-0 right-0 p-4 opacity-15">
          <Package className="h-16 w-16 text-orange-600" />
        </div>
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-orange-800 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-orange-600"></span>
            Inventory Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-extrabold text-orange-600 tracking-tight">{inventoryData?.count ?? '...'}</div>
          <p className="text-xs text-orange-800/80 font-medium mt-1">Ready for next production stage</p>
        </CardContent>
      </Card>
    </div>
  );
}
