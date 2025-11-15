// my-app/app/financials/page.tsx
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Briefcase } from "lucide-react";

export default function FinancialsHomePage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Financials Overview</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href="/financials/payslips-page" passHref>
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Payslips
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Manage Artisan Payslips</div>
              <p className="text-xs text-muted-foreground">
                View, generate, and manage artisan payment records.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/financials/advances-page" passHref>
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Advances
              </CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Track Artisan Advances</div>
              <p className="text-xs text-muted-foreground">
                Record and deduct advances given to artisans.
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Add more financial-related cards here if needed */}
      </div>
    </div>
  );
}
