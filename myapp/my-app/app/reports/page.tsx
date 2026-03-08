"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, BarChart3, PieChart, TrendingUp, DollarSign } from "lucide-react";
import { DateRangePicker } from "@/components/date-range-picker";
import { DateRange } from "react-day-picker";
import { useReports } from "@/hooks/useResource";
import { Skeleton } from "@/components/ui/skeleton";

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(2024, 0, 1),
    to: new Date(),
  });

  const startDateStr = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined;
  const endDateStr = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined;

  const { data, loading, error } = useReports(startDateStr, endDateStr);

  if (error) {
    return <div className="p-6 text-red-500">Failed to load reports: {error.message}</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Reports & Analytics</h1>
            <p className="text-muted-foreground mt-2">Business insights and performance metrics</p>
          </div>
          <div className="flex items-center gap-2">
            <DateRangePicker date={dateRange} setDate={setDateRange} />
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full" />)}
          </div>
          <Skeleton className="h-[400px] w-full" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${data?.summary?.total_revenue?.toLocaleString() || "0.00"}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Production Volume</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data?.summary?.production_volume || 0} items</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Quality Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data?.summary?.quality_rate || 0}%</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Active Artisans</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data?.summary?.active_artisans || 0}</div>
              </CardContent>
            </Card>
          </div>

          {/* Report Tabs */}
          <Tabs defaultValue="production" className="mb-8">
            <TabsList className="grid grid-cols-4 mb-4">
              <TabsTrigger value="production">
                <BarChart3 className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Production</span>
              </TabsTrigger>
              <TabsTrigger value="financial">
                <DollarSign className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Financial</span>
              </TabsTrigger>
              <TabsTrigger value="quality">
                <PieChart className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Quality</span>
              </TabsTrigger>
              <TabsTrigger value="trends">
                <TrendingUp className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Trends</span>
              </TabsTrigger>
            </TabsList>

            {/* Production Reports */}
            <TabsContent value="production">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Production by Product Type</CardTitle>
                    <CardDescription>Top Items produced by product category</CardDescription>
                  </CardHeader>
                  <CardContent className="h-80">
                    <ProductionBarChart data={data?.production?.by_category || []} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Production by Artisan</CardTitle>
                    <CardDescription>Top performing artisans by volume</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Artisan</TableHead>
                          <TableHead>Items</TableHead>
                          <TableHead>Avg. Quality</TableHead>
                          <TableHead>Value</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(data?.production?.top_artisans || []).map((artisan: any, i: number) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">{artisan.name}</TableCell>
                            <TableCell>{artisan.items}</TableCell>
                            <TableCell>{artisan.quality}</TableCell>
                            <TableCell>${artisan.value?.toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Financial Reports */}
            <TabsContent value="financial">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue by Product Category</CardTitle>
                    <CardDescription>Top Financial breakdown by product type</CardDescription>
                  </CardHeader>
                  <CardContent className="h-80">
                    <RevenueBarChart data={data?.financial?.revenue_by_category || []} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Financial Summary</CardTitle>
                    <CardDescription>Revenue, costs, and margins by category</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Category</TableHead>
                          <TableHead>Revenue</TableHead>
                          <TableHead>Est. Cost</TableHead>
                          <TableHead>Margin</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(data?.financial?.summary || []).map((fs: any, i: number) => (
                          <TableRow key={i}>
                            <TableCell>
                              <Badge variant="outline">{fs.category}</Badge>
                            </TableCell>
                            <TableCell>${fs.revenue?.toLocaleString()}</TableCell>
                            <TableCell>${fs.cost?.toLocaleString()}</TableCell>
                            <TableCell className="text-green-600">{fs.margin}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Quality Reports */}
            <TabsContent value="quality">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Quality Metrics</CardTitle>
                    <CardDescription>Acceptance versus Rejection rates</CardDescription>
                  </CardHeader>
                  <CardContent className="h-80">
                    <QualityPieChart data={data?.quality?.metrics || []} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Rejection Analysis</CardTitle>
                    <CardDescription>Reasons for quality rejections</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Reason</TableHead>
                          <TableHead>Count</TableHead>
                          <TableHead>% of Total</TableHead>
                          <TableHead>Est. Impact</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(data?.quality?.rejections || []).map((rej: any, i: number) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">{rej.reason}</TableCell>
                            <TableCell>{rej.count}</TableCell>
                            <TableCell>{rej.percent}</TableCell>
                            <TableCell>${rej.impact}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Trends Reports */}
            <TabsContent value="trends">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Monthly Production Trends</CardTitle>
                    <CardDescription>Production volume over time</CardDescription>
                  </CardHeader>
                  <CardContent className="h-80">
                    <TrendsLineChart data={data?.trends?.monthly || []} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Seasonal Volume Data</CardTitle>
                    <CardDescription>Production patterns by month</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Month</TableHead>
                          <TableHead>Volume</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(data?.trends?.monthly || []).map((trend: any, i: number) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">{trend.month}</TableCell>
                            <TableCell>{trend.value} items</TableCell>
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
  if (!data || data.length === 0) return <div className="flex h-full items-center justify-center text-muted-foreground">No data available</div>;
  const colors = ["bg-blue-500", "bg-green-500", "bg-yellow-500", "bg-purple-500", "bg-pink-500"];
  const formattedData = data.map((d, i) => ({ label: d.category_name, value: d.value, color: colors[i % colors.length] }));
  const maxValue = Math.max(...formattedData.map((item) => item.value), 1);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex items-end">
        {formattedData.map((item, index) => (
          <div key={index} className="flex-1 flex flex-col items-center justify-end h-full px-1">
            <div
              className={`w-full ${item.color} rounded-t`}
              style={{ height: `${(item.value / maxValue) * 100}%` }}
            ></div>
          </div>
        ))}
      </div>
      <div className="flex mt-2">
        {formattedData.map((item, index) => (
          <div key={index} className="flex-1 text-center">
            <div className="text-[10px] font-medium truncate" title={item.label}>{item.label}</div>
            <div className="text-xs text-muted-foreground">{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function RevenueBarChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) return <div className="flex h-full items-center justify-center text-muted-foreground">No data available</div>;
  const colors = ["bg-blue-500", "bg-green-500", "bg-yellow-500", "bg-purple-500", "bg-pink-500"];
  const formattedData = data.map((d, i) => ({ label: d.category_name, value: d.value, color: colors[i % colors.length] }));
  const maxValue = Math.max(...formattedData.map((item) => item.value), 1);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex items-end">
        {formattedData.map((item, index) => (
          <div key={index} className="flex-1 flex flex-col items-center justify-end h-full px-1">
            <div
              className={`w-full ${item.color} rounded-t`}
              style={{ height: `${(item.value / maxValue) * 100}%` }}
            ></div>
          </div>
        ))}
      </div>
      <div className="flex mt-2">
        {formattedData.map((item, index) => (
          <div key={index} className="flex-1 text-center">
            <div className="text-[10px] font-medium truncate" title={item.label}>{item.label}</div>
            <div className="text-xs text-muted-foreground">${item.value?.toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function QualityPieChart({ data }: { data: any[] }) {
  if (!data || data.length === 0 || data[0].value === 0) return <div className="flex h-full items-center justify-center text-muted-foreground">No data available (0% acceptance)</div>;
  const acceptanceRate = data[0].value;
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="relative w-48 h-48">
        <div
          className="absolute inset-0 rounded-full bg-green-500"
        ></div>
        <div
          className="absolute inset-0 rounded-full bg-red-500"
          style={{ clipPath: `polygon(50% 50%, 50% 0, 100% 0, 100% ${100 - acceptanceRate}%, 50% 50%)` }}
        ></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-white rounded-full w-32 h-32 flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl font-bold">{acceptanceRate}%</div>
              <div className="text-xs text-muted-foreground">Acceptance Rate</div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex justify-center gap-4 mt-4">
        {data.map((item, index) => (
          <div key={index} className="flex items-center">
            <div className={`w-3 h-3 rounded-full ${item.color} mr-1`}></div>
            <span className="text-sm">
              {item.label}: {item.value}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function TrendsLineChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) return <div className="flex h-full items-center justify-center text-muted-foreground">No data available</div>;

  const maxValue = Math.max(...data.map((item) => item.value), 1)
  const minValue = 0;
  const range = maxValue - minValue

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 relative">
        <div className="absolute inset-0 flex items-end">
          {data.map((item, index) => {
            const height = ((item.value - minValue) / range) * 80 + 10
            const prevHeight = index > 0 ? ((data[index - 1].value - minValue) / range) * 80 + 10 : height

            return (
              <div key={index} className="flex-1 flex flex-col items-center justify-end h-full">
                {index > 0 && (
                  <div
                    className="absolute bg-blue-500"
                    style={{
                      height: "2px",
                      width: `${100 / data.length}%`,
                      bottom: `${prevHeight}%`,
                      left: `${(index - 0.5) * (100 / data.length)}%`,
                      transform: `rotate(${Math.atan2(height - prevHeight, 100 / data.length) * (180 / Math.PI)}deg)`,
                      transformOrigin: "0 50%",
                    }}
                  ></div>
                )}
                <div className="w-3 h-3 rounded-full bg-blue-500 z-10 transition-all duration-300" style={{ transform: `translateY(-${height}px)` }}></div>
              </div>
            )
          })}
        </div>
      </div>
      <div className="flex mt-2">
        {data.map((item, index) => (
          <div key={index} className="flex-1 text-center">
            <div className="text-xs font-medium">{item.month}</div>
            <div className="text-xs text-muted-foreground">{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
