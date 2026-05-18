
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
    ? `Ksh ${pendingPayments.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : '...';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
          <Briefcase className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{jobsData?.in_progress ?? '...'}</div>
          <p className="text-xs text-muted-foreground">Currently in progress</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Artisans</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{artisansData?.results?.length ?? '...'}</div>
          <p className="text-xs text-muted-foreground">Working on current jobs</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formattedPendingPayments}</div>
          <p className="text-xs text-muted-foreground">Across all completed jobs</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Inventory Items</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{inventoryData?.count ?? '...'}</div>
          <p className="text-xs text-muted-foreground">Ready for next stage</p>
        </CardContent>
      </Card>
    </div>
  );
}
