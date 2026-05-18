import LiveDashboard from "@/components/live-dashboard";
import LiveJobs from "@/components/live-jobs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, Briefcase, DollarSign, CheckCircle, LayoutDashboard, Sparkles } from "lucide-react";
import Link from "next/link";

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-50/30">
      <div className="container mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2.5">
              <LayoutDashboard className="h-8 w-8 text-blue-600" />
              Artisan Management Dashboard
            </h1>
            <p className="text-muted-foreground mt-1.5 text-sm font-medium">
              Oversee your woodcraft production workflow and artisan assignments
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-800 bg-blue-50 border border-blue-150 px-3 py-1.5 rounded-full shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-blue-600" />
            <span>Operational Excellence Console</span>
          </div>
        </div>

        <LiveDashboard />

        {/* Quick Actions & Live Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-1 shadow-sm border-gray-200">
            <CardHeader className="border-b bg-gray-50/50">
              <CardTitle className="text-lg font-bold">Quick Actions</CardTitle>
              <CardDescription className="text-xs font-medium">Common tasks and management workflows</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-3">
              <Link href="/jobs/create" className="block">
                <Button className="w-full justify-start h-11 font-bold shadow-sm" variant="default">
                  <Briefcase className="mr-2 h-4 w-4" />
                  Create New Job
                </Button>
              </Link>
              <Link href="/jobs/complete" className="block">
                <Button className="w-full justify-start h-11 font-bold shadow-sm bg-white" variant="outline">
                  <CheckCircle className="mr-2 h-4 w-4 text-emerald-600" />
                  Complete Job
                </Button>
              </Link>
              <Link href="/pricing" className="block">
                <Button className="w-full justify-start h-11 font-bold shadow-sm bg-white" variant="outline">
                  <DollarSign className="mr-2 h-4 w-4 text-amber-600" />
                  Update Pricing
                </Button>
              </Link>
              <Link href="/inventory" className="block">
                <Button className="w-full justify-start h-11 font-bold shadow-sm bg-white" variant="outline">
                  <Package className="mr-2 h-4 w-4 text-blue-600" />
                  View Inventory
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Current Jobs Overview */}
          <Card className="lg:col-span-2 shadow-sm border-gray-200">
            <CardHeader className="border-b bg-gray-50/50">
              <CardTitle className="text-lg font-bold">Current Jobs Overview</CardTitle>
              <CardDescription className="text-xs font-medium">Recent production assignments and their status</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <LiveJobs />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}