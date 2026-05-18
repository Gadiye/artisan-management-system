"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, BarChart3, PieChart, TrendingUp, DollarSign, Calendar, Sparkles, ChevronRight, Activity, Award, UserCheck } from "lucide-react";
import { DateRangePicker } from "@/components/date-range-picker";
import { DateRange } from "react-day-picker";
import { useReports } from "@/hooks/useResource";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(2024, 0, 1),
    to: new Date(),
  });

  const startDateStr = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined;
  const endDateStr = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined;

  const { data, loading, error } = useReports(startDateStr, endDateStr);

  if (error) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-950">
          <AlertTitle>Reports Error</AlertTitle>
          <AlertDescription>Failed to fetch reports and performance analytics: {error.message}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Reports & Analytics</h1>
          <p className="text-sm font-semibold text-muted-foreground mt-1">Enterprise insights, financial margins, and performance metrics</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
            <DateRangePicker date={dateRange} setDate={setDateRange} />
          </div>
          <Button variant="outline" className="h-11 font-bold text-xs uppercase px-4 border-gray-300 hover:bg-gray-50 transition-colors">
            <Download className="mr-2 h-4 w-4 stroke-[2.5]" />
            Export Data
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <Skeleton className="h-4 w-28 mb-2" />
                  <Skeleton className="h-8 w-36" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Skeleton className="h-[450px] w-full" />
        </div>
      ) : (
        <>
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="relative overflow-hidden group hover:scale-[1.02] hover:shadow-lg transition-all duration-300 border-emerald-100 bg-gradient-to-br from-emerald-50/50 to-white">
              <div className="absolute top-0 right-0 p-4 opacity-15">
                <DollarSign className="h-16 w-16 text-emerald-600" />
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-600"></span>
                  Total Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-extrabold text-emerald-600 tracking-tight">
                  Ksh {Number(data?.summary?.total_revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <p className="text-[10px] text-emerald-800/80 font-bold mt-1">Earnings across selected interval</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden group hover:scale-[1.02] hover:shadow-lg transition-all duration-300 border-blue-100 bg-gradient-to-br from-blue-50/40 to-white">
              <div className="absolute top-0 right-0 p-4 opacity-15">
                <Activity className="h-16 w-16 text-blue-600" />
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-blue-800 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-blue-600"></span>
                  Production Volume
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-extrabold text-blue-600 tracking-tight">{data?.summary?.production_volume || 0} pcs</div>
                <p className="text-[10px] text-blue-800/80 font-bold mt-1">Total crafted unit outputs</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden group hover:scale-[1.02] hover:shadow-lg transition-all duration-300 border-purple-100 bg-gradient-to-br from-purple-50/40 to-white">
              <div className="absolute top-0 right-0 p-4 opacity-15">
                <Award className="h-16 w-16 text-purple-600" />
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-purple-800 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-purple-600 animate-pulse"></span>
                  Quality Acceptance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-extrabold text-purple-600 tracking-tight">{data?.summary?.quality_rate || 0}%</div>
                <p className="text-[10px] text-purple-800/80 font-bold mt-1">Average QA inspection pass score</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden group hover:scale-[1.02] hover:shadow-lg transition-all duration-300 border-indigo-100 bg-gradient-to-br from-indigo-50/40 to-white">
              <div className="absolute top-0 right-0 p-4 opacity-15">
                <UserCheck className="h-16 w-16 text-indigo-600" />
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-indigo-800 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-indigo-600"></span>
                  Active Artisans
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-extrabold text-indigo-600 tracking-tight">{data?.summary?.active_artisans || 0} craftspeople</div>
                <p className="text-[10px] text-indigo-800/80 font-bold mt-1">Active assignment contributors</p>
              </CardContent>
            </Card>
          </div>

          {/* Reports Tabs Layout */}
          <Tabs defaultValue="production" className="space-y-6">
            <TabsList className="bg-slate-100 p-1 border rounded-xl grid grid-cols-4 max-w-xl">
              <TabsTrigger value="production" className="font-extrabold text-xs uppercase py-2.5 rounded-lg transition-all">
                <BarChart3 className="h-4 w-4 mr-1.5" />
                Production
              </TabsTrigger>
              <TabsTrigger value="financial" className="font-extrabold text-xs uppercase py-2.5 rounded-lg transition-all">
                <DollarSign className="h-4 w-4 mr-1.5" />
                Financial
              </TabsTrigger>
              <TabsTrigger value="quality" className="font-extrabold text-xs uppercase py-2.5 rounded-lg transition-all">
                <PieChart className="h-4 w-4 mr-1.5" />
                Quality
              </TabsTrigger>
              <TabsTrigger value="trends" className="font-extrabold text-xs uppercase py-2.5 rounded-lg transition-all">
                <TrendingUp className="h-4 w-4 mr-1.5" />
                Trends
              </TabsTrigger>
            </TabsList>

            {/* Production Reports */}
            <TabsContent value="production" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-gray-200 shadow-sm overflow-hidden">
                  <CardHeader className="bg-gray-50/50 border-b pb-4">
                    <CardTitle className="text-base font-bold text-gray-900">Production by Product Type</CardTitle>
                    <CardDescription className="text-xs font-semibold">Breakdown of crafted outputs by category</CardDescription>
                  </CardHeader>
                  <CardContent className="h-80 pt-6">
                    <ProductionBarChart data={data?.production?.by_category || []} />
                  </CardContent>
                </Card>

                <Card className="border-gray-200 shadow-sm overflow-hidden">
                  <CardHeader className="bg-gray-50/50 border-b pb-4">
                    <CardTitle className="text-base font-bold text-gray-900">Production by Artisan</CardTitle>
                    <CardDescription className="text-xs font-semibold">Top performing artisans ranked by crafted volume</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader className="bg-gray-50/30">
                        <TableRow>
                          <TableHead className="font-bold text-gray-700 text-xs pl-6">Artisan</TableHead>
                          <TableHead className="font-bold text-gray-700 text-xs text-right">Items Crafted</TableHead>
                          <TableHead className="font-bold text-gray-700 text-xs text-right">Avg. Quality</TableHead>
                          <TableHead className="font-bold text-gray-700 text-xs text-right pr-6">Piece-Rate Value</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(data?.production?.top_artisans || []).map((artisan: any, i: number) => (
                          <TableRow key={i} className="hover:bg-slate-50/20">
                            <TableCell className="font-extrabold text-sm text-gray-900 pl-6 py-3.5">{artisan.name}</TableCell>
                            <TableCell className="text-right font-extrabold text-xs text-gray-900 py-3.5">{artisan.items} pcs</TableCell>
                            <TableCell className="text-right py-3.5">
                              <Badge variant="outline" className="font-bold text-[9px] uppercase px-2 py-0.5 border bg-emerald-50 text-emerald-700 border-emerald-200">
                                {artisan.quality}% Pass
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-extrabold text-sm text-gray-900 pr-6 py-3.5">
                              Ksh {Number(artisan.value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Financial Reports */}
            <TabsContent value="financial" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-gray-200 shadow-sm overflow-hidden">
                  <CardHeader className="bg-gray-50/50 border-b pb-4">
                    <CardTitle className="text-base font-bold text-gray-900">Revenue by Product Category</CardTitle>
                    <CardDescription className="text-xs font-semibold">Distribution of gross order margins by category</CardDescription>
                  </CardHeader>
                  <CardContent className="h-80 pt-6">
                    <RevenueBarChart data={data?.financial?.revenue_by_category || []} />
                  </CardContent>
                </Card>

                <Card className="border-gray-200 shadow-sm overflow-hidden">
                  <CardHeader className="bg-gray-50/50 border-b pb-4">
                    <CardTitle className="text-base font-bold text-gray-900">Financial Summary</CardTitle>
                    <CardDescription className="text-xs font-semibold">Revenue, estimated costs, and net margins by category</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader className="bg-gray-50/30">
                        <TableRow>
                          <TableHead className="font-bold text-gray-700 text-xs pl-6">Category</TableHead>
                          <TableHead className="font-bold text-gray-700 text-xs text-right">Revenue</TableHead>
                          <TableHead className="font-bold text-gray-700 text-xs text-right">Est. Cost</TableHead>
                          <TableHead className="font-bold text-gray-700 text-xs text-right pr-6">Margin Ratio</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(data?.financial?.summary || []).map((fs: any, i: number) => (
                          <TableRow key={i} className="hover:bg-slate-50/20">
                            <TableCell className="pl-6 py-3.5">
                              <Badge variant="outline" className="font-bold text-[10px] uppercase">{fs.category}</Badge>
                            </TableCell>
                            <TableCell className="text-right font-extrabold text-sm text-gray-950 py-3.5">
                              Ksh {Number(fs.revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right font-extrabold text-xs text-muted-foreground py-3.5">
                              Ksh {Number(fs.cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right font-black text-sm text-emerald-600 pr-6 py-3.5">
                              {fs.margin}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Quality Reports */}
            <TabsContent value="quality" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-gray-200 shadow-sm overflow-hidden">
                  <CardHeader className="bg-gray-50/50 border-b pb-4">
                    <CardTitle className="text-base font-bold text-gray-900">Quality Metrics</CardTitle>
                    <CardDescription className="text-xs font-semibold">Distribution of product inspections</CardDescription>
                  </CardHeader>
                  <CardContent className="h-80 pt-6">
                    <QualityPieChart data={data?.quality?.metrics || []} />
                  </CardContent>
                </Card>

                <Card className="border-gray-200 shadow-sm overflow-hidden">
                  <CardHeader className="bg-gray-50/50 border-b pb-4">
                    <CardTitle className="text-base font-bold text-gray-900">Rejection Analysis</CardTitle>
                    <CardDescription className="text-xs font-semibold">Identified reasons for inspection failures</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader className="bg-gray-50/30">
                        <TableRow>
                          <TableHead className="font-bold text-gray-700 text-xs pl-6">Reason Tag</TableHead>
                          <TableHead className="font-bold text-gray-700 text-xs text-right">Defect Count</TableHead>
                          <TableHead className="font-bold text-gray-700 text-xs text-right">% of Rejections</TableHead>
                          <TableHead className="font-bold text-gray-700 text-xs text-right pr-6">Est. Cost Impact</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(data?.quality?.rejections || []).map((rej: any, i: number) => (
                          <TableRow key={i} className="hover:bg-slate-50/20">
                            <TableCell className="font-extrabold text-sm text-gray-900 pl-6 py-3.5">{rej.reason}</TableCell>
                            <TableCell className="text-right font-extrabold text-xs text-gray-800 py-3.5">{rej.count} cases</TableCell>
                            <TableCell className="text-right font-extrabold text-xs text-rose-600 py-3.5">{rej.percent}%</TableCell>
                            <TableCell className="text-right font-black text-sm text-rose-600 pr-6 py-3.5">
                              Ksh {Number(rej.impact || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Trends Reports */}
            <TabsContent value="trends" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-gray-200 shadow-sm overflow-hidden">
                  <CardHeader className="bg-gray-50/50 border-b pb-4">
                    <CardTitle className="text-base font-bold text-gray-900">Monthly Production Trends</CardTitle>
                    <CardDescription className="text-xs font-semibold">Work completed volume history</CardDescription>
                  </CardHeader>
                  <CardContent className="h-80 pt-6">
                    <TrendsLineChart data={data?.trends?.monthly || []} />
                  </CardContent>
                </Card>

                <Card className="border-gray-200 shadow-sm overflow-hidden">
                  <CardHeader className="bg-gray-50/50 border-b pb-4">
                    <CardTitle className="text-base font-bold text-gray-900">Seasonal Volume Data</CardTitle>
                    <CardDescription className="text-xs font-semibold">Production throughput grouped by month</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader className="bg-gray-50/30">
                        <TableRow>
                          <TableHead className="font-bold text-gray-700 text-xs pl-6">Month Period</TableHead>
                          <TableHead className="font-bold text-gray-700 text-xs text-right pr-6">Volume Completed</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(data?.trends?.monthly || []).map((trend: any, i: number) => (
                          <TableRow key={i} className="hover:bg-slate-50/20">
                            <TableCell className="font-extrabold text-sm text-gray-950 pl-6 py-3.5">{trend.month}</TableCell>
                            <TableCell className="text-right font-black text-xs text-indigo-600 pr-6 py-3.5">{trend.value} items</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

// Chart components

function ProductionBarChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) return <div className="flex h-full items-center justify-center text-muted-foreground font-bold text-xs">No data available</div>;
  const colors = ["bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-purple-500", "bg-rose-500"];
  const formattedData = data.map((d, i) => ({ label: d.category_name, value: d.value, color: colors[i % colors.length] }));
  const maxValue = Math.max(...formattedData.map((item) => item.value), 1);

  return (
    <div className="flex flex-col h-full justify-between">
      <div className="flex-1 flex items-end gap-3.5 px-6">
        {formattedData.map((item, index) => (
          <div key={index} className="flex-1 flex flex-col items-center justify-end h-full group relative">
            {/* Tooltip */}
            <div className="absolute -top-7 scale-0 group-hover:scale-100 bg-slate-900 text-white font-bold text-[10px] px-2 py-0.5 rounded shadow transition-all duration-200 z-10">
              {item.value} pcs
            </div>
            <div
              className={`w-full ${item.color} rounded-t-lg transition-all duration-300 hover:brightness-105 shadow-sm`}
              style={{ height: `${(item.value / maxValue) * 100}%` }}
            ></div>
          </div>
        ))}
      </div>
      <div className="flex mt-3 border-t pt-2 border-slate-100">
        {formattedData.map((item, index) => (
          <div key={index} className="flex-1 text-center px-1">
            <div className="text-[10px] font-extrabold text-gray-900 truncate" title={item.label}>{item.label}</div>
            <div className="text-[11px] font-bold text-muted-foreground mt-0.5">{item.value} pcs</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function RevenueBarChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) return <div className="flex h-full items-center justify-center text-muted-foreground font-bold text-xs">No data available</div>;
  const colors = ["bg-emerald-500", "bg-blue-500", "bg-indigo-500", "bg-purple-500", "bg-amber-500"];
  const formattedData = data.map((d, i) => ({ label: d.category_name, value: d.value, color: colors[i % colors.length] }));
  const maxValue = Math.max(...formattedData.map((item) => item.value), 1);

  return (
    <div className="flex flex-col h-full justify-between">
      <div className="flex-1 flex items-end gap-3.5 px-6">
        {formattedData.map((item, index) => (
          <div key={index} className="flex-1 flex flex-col items-center justify-end h-full group relative">
            <div className="absolute -top-7 scale-0 group-hover:scale-100 bg-slate-900 text-white font-bold text-[10px] px-2 py-0.5 rounded shadow transition-all duration-200 z-10 whitespace-nowrap">
              Ksh {item.value?.toLocaleString()}
            </div>
            <div
              className={`w-full ${item.color} rounded-t-lg transition-all duration-300 hover:brightness-105 shadow-sm`}
              style={{ height: `${(item.value / maxValue) * 100}%` }}
            ></div>
          </div>
        ))}
      </div>
      <div className="flex mt-3 border-t pt-2 border-slate-100">
        {formattedData.map((item, index) => (
          <div key={index} className="flex-1 text-center px-1">
            <div className="text-[10px] font-extrabold text-gray-900 truncate" title={item.label}>{item.label}</div>
            <div className="text-[10px] font-bold text-emerald-600 mt-0.5">Ksh {item.value?.toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function QualityPieChart({ data }: { data: any[] }) {
  if (!data || data.length === 0 || data[0].value === 0) return <div className="flex h-full items-center justify-center text-muted-foreground font-bold text-xs">No data available (0% acceptance)</div>;
  const acceptanceRate = data[0].value;
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <div className="relative w-40 h-40">
        <div
          className="absolute inset-0 rounded-full bg-emerald-500 shadow-sm"
        ></div>
        <div
          className="absolute inset-0 rounded-full bg-rose-500 shadow-sm"
          style={{ clipPath: `polygon(50% 50%, 50% 0, 100% 0, 100% ${100 - acceptanceRate}%, 50% 50%)` }}
        ></div>
        <div className="absolute inset-2 flex items-center justify-center">
          <div className="bg-white rounded-full w-full h-full flex items-center justify-center shadow-inner">
            <div className="text-center">
              <div className="text-2xl font-black text-gray-900">{acceptanceRate}%</div>
              <div className="text-[9px] font-extrabold uppercase text-muted-foreground tracking-wider mt-0.5">Acceptance</div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex justify-center gap-4 border-t pt-3 w-full border-slate-100">
        {data.map((item, index) => (
          <div key={index} className="flex items-center text-xs font-bold">
            <div className={`w-3 h-3 rounded-full ${index === 0 ? 'bg-emerald-500' : 'bg-rose-500'} mr-1.5`}></div>
            <span className="text-gray-800">
              {item.label}: {item.value}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function TrendsLineChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) return <div className="flex h-full items-center justify-center text-muted-foreground font-bold text-xs">No data available</div>;

  const maxValue = Math.max(...data.map((item) => item.value), 1);
  const minValue = 0;
  const range = maxValue - minValue;

  const padding = 25;
  const chartHeight = 220;
  const chartWidth = 500;

  const points = data.map((item, index) => {
    const x = padding + (index * (chartWidth - padding * 2)) / (data.length - 1 || 1);
    const y = chartHeight - padding - ((item.value - minValue) / range) * (chartHeight - padding * 2);
    return { x, y, month: item.month, value: item.value };
  });

  const pathD = points.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, "");

  const areaD = points.length > 0 
    ? `${pathD} L ${points[points.length - 1].x} ${chartHeight - padding} L ${points[0].x} ${chartHeight - padding} Z` 
    : "";

  return (
    <div className="flex flex-col h-full justify-between">
      <div className="flex-1 relative w-full h-[220px]">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          
          {/* Grid lines */}
          <line x1={padding} y1={padding} x2={chartWidth - padding} y2={padding} stroke="#f8fafc" strokeWidth="1" />
          <line x1={padding} y1={chartHeight / 2} x2={chartWidth - padding} y2={chartHeight / 2} stroke="#f8fafc" strokeWidth="1" />
          <line x1={padding} y1={chartHeight - padding} x2={chartWidth - padding} y2={chartHeight - padding} stroke="#e2e8f0" strokeWidth="1.5" />

          {/* Area under the line */}
          {areaD && <path d={areaD} fill="url(#chart-gradient)" />}

          {/* The line itself */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Individual Dots */}
          {points.map((p, index) => (
            <g key={index} className="group cursor-pointer">
              <circle
                cx={p.x}
                cy={p.y}
                r="5"
                fill="#3b82f6"
                stroke="#ffffff"
                strokeWidth="2"
                className="transition-all duration-200 group-hover:r-7 group-hover:fill-blue-600 shadow-sm"
              />
              <rect
                x={p.x - 22}
                y={p.y - 28}
                width="44"
                height="16"
                rx="4"
                fill="#0f172a"
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
              />
              <text
                x={p.x}
                y={p.y - 17}
                textAnchor="middle"
                fill="#ffffff"
                className="text-[9px] font-black opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
              >
                {p.value} pcs
              </text>
            </g>
          ))}
        </svg>
      </div>
      
      <div className="flex justify-between px-2 mt-2 border-t pt-2 border-slate-100">
        {data.map((item, index) => (
          <div key={index} className="text-center flex-1">
            <span className="text-[10px] font-extrabold text-gray-900 uppercase tracking-wider">{item.month}</span>
            <div className="text-[10px] text-muted-foreground font-bold">{item.value} pcs</div>
          </div>
        ))}
      </div>
    </div>
  );
}
