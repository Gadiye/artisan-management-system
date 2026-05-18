"use client";

import { useState } from "react";
import { useProductionGuide } from '@/hooks/useResource';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Factory, 
  Users, 
  ClipboardList, 
  ArrowRightIcon, 
  Search, 
  Filter, 
  TrendingUp, 
  Gauge, 
  Package, 
  Layers, 
  Sparkles,
  AlertTriangle
} from "lucide-react";
import { PRODUCTION_STAGES, getStageColor } from '@/lib/constants';

interface ProductionProduct {
    id: number;
    product_type: string;
    animal_type: string;
    size_category: string;
    stock: number;
    total_ordered: number;
    inventory: Record<string, number>;
    in_production: Record<string, number>;
}

const STAGES = PRODUCTION_STAGES;

export default function ProductionGuidePage() {
    const { data, loading, error } = useProductionGuide();
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");

    if (loading) {
        return (
            <div className="container mx-auto p-6 space-y-8">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-10 w-64" />
                    <Skeleton className="h-6 w-32" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <Card key={i} className="border-gray-150">
                            <CardHeader className="pb-2">
                                <Skeleton className="h-4 w-28" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-8 w-16 mb-2" />
                                <Skeleton className="h-3 w-40" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
                <Card className="border-gray-150">
                    <CardHeader>
                        <Skeleton className="h-6 w-48 mb-1" />
                        <Skeleton className="h-4 w-72" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-[300px] w-full" />
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (error) {
        return (
            <div className="container mx-auto p-6">
                <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-950">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertTitle>Error Loading Guide</AlertTitle>
                    <AlertDescription>{error.message}</AlertDescription>
                </Alert>
            </div>
        )
    }

    const safeData = ((data as any)?.products || []) as ProductionProduct[];
    const safeWorkload = (data as any)?.artisan_workload || [];

    // Calculate overall shortage
    const totalShortage = safeData.reduce((sum: number, p: ProductionProduct) => {
        const totalWip = Object.values(p.inventory || {}).reduce((a: number, b: number) => a + b, 0) +
            Object.values(p.in_production || {}).reduce((a: number, b: number) => a + b, 0);
        const gap = (p.total_ordered || 0) - (p.stock + totalWip);
        return sum + (gap > 0 ? gap : 0);
    }, 0);

    // Apply client-side search & status filtering
    const filteredProducts = safeData.filter((p: ProductionProduct) => {
        const productText = `${p.product_type} ${p.animal_type} ${p.size_category}`.toLowerCase();
        const matchesSearch = productText.includes(searchQuery.toLowerCase());

        const totalWip = Object.values(p.inventory || {}).reduce((a: number, b: number) => a + b, 0) +
            Object.values(p.in_production || {}).reduce((a: number, b: number) => a + b, 0);
        const gap = (p.total_ordered || 0) - (p.stock + totalWip);

        if (statusFilter === "SHORTAGE") {
            return matchesSearch && gap > 0;
        }
        if (statusFilter === "COVERED") {
            return matchesSearch && gap <= 0 && p.total_ordered > 0;
        }
        return matchesSearch;
    });

    const getCapacityStatus = (units: number) => {
        if (units === 0) return { label: "Available", color: "bg-green-100 text-green-800 border-green-200", progressColor: "bg-green-600", percent: 0 };
        if (units <= 5) return { label: "Light Load", color: "bg-green-50 text-green-700 border-green-100", progressColor: "bg-green-500", percent: (units / 15) * 100 };
        if (units <= 12) return { label: "Optimal Load", color: "bg-blue-50 text-blue-700 border-blue-100", progressColor: "bg-blue-600", percent: (units / 15) * 100 };
        return { label: "Heavy / Busy", color: "bg-red-50 text-red-700 border-red-150 animate-pulse", progressColor: "bg-red-600", percent: Math.min((units / 15) * 100, 100) };
    };

    return (
        <div className="container mx-auto p-6 space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2.5">
                        <Factory className="h-8 w-8 text-blue-600" />
                        Production Guide
                    </h1>
                    <p className="text-muted-foreground mt-1.5 text-sm font-medium">
                        Active customer demand, stock counts, and artisan assignment planning
                    </p>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-blue-800 bg-blue-50 border border-blue-150 px-3 py-1.5 rounded-full shadow-sm">
                    <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                    <span>Real-time Operations Console</span>
                </div>
            </div>

            {/* Glassmorphic Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="relative overflow-hidden group hover:scale-[1.02] hover:shadow-lg transition-all duration-300 border-orange-100 bg-gradient-to-br from-orange-50/50 to-white dark:from-orange-950/10">
                    <div className="absolute top-0 right-0 p-4 opacity-15">
                        <AlertTriangle className="h-16 w-16 text-orange-600" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-orange-800 flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-orange-600 animate-ping"></span>
                            Shortage to Produce
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-extrabold text-orange-600 tracking-tight">{totalShortage}</div>
                        <p className="text-xs text-orange-800/80 font-medium mt-1">Units missing across active customer orders</p>
                    </CardContent>
                </Card>

                <Card className="relative overflow-hidden group hover:scale-[1.02] hover:shadow-lg transition-all duration-300 border-emerald-100 bg-gradient-to-br from-emerald-50/50 to-white dark:from-emerald-950/10">
                    <div className="absolute top-0 right-0 p-4 opacity-15">
                        <TrendingUp className="h-16 w-16 text-emerald-600" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                            <span className="h-2 w-2 bg-emerald-600 rounded-full"></span>
                            Active Demand
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-extrabold text-emerald-600 tracking-tight">
                            {safeData.reduce((sum: number, p: ProductionProduct) => sum + (p.total_ordered || 0), 0)}
                        </div>
                        <p className="text-xs text-emerald-800/80 font-medium mt-1">Total pieces requested in current orders</p>
                    </CardContent>
                </Card>

                <Card className="relative overflow-hidden group hover:scale-[1.02] hover:shadow-lg transition-all duration-300 border-blue-100 bg-gradient-to-br from-blue-50/50 to-white dark:from-blue-950/10">
                    <div className="absolute top-0 right-0 p-4 opacity-15">
                        <Gauge className="h-16 w-16 text-blue-600" />
                    </div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-blue-800 flex items-center gap-1.5">
                            <span className="h-2 w-2 bg-blue-600 rounded-full"></span>
                            Work In Progress
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-extrabold text-blue-600 tracking-tight">
                            {safeData.reduce((sum: number, p: ProductionProduct) => sum + Object.values(p.in_production || {}).reduce((a: number, b: number) => a + b, 0), 0)}
                        </div>
                        <p className="text-xs text-blue-800/80 font-medium mt-1">Units actively in production with artisans</p>
                    </CardContent>
                </Card>
            </div>

            {/* Navigation Tabs */}
            <Tabs defaultValue="status" className="w-full space-y-6">
                <TabsList className="bg-gray-100 p-1 rounded-lg inline-flex border">
                    <TabsTrigger value="status" className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-all">
                        <ClipboardList className="h-4 w-4" /> Live Status Board
                    </TabsTrigger>
                    <TabsTrigger value="distribution" className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-all">
                        <Layers className="h-4 w-4" /> Ready for Assignment
                    </TabsTrigger>
                    <TabsTrigger value="artisans" className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-all">
                        <Users className="h-4 w-4" /> Artisan Capacity
                    </TabsTrigger>
                </TabsList>

                {/* TAB 1: Live Status Board */}
                <TabsContent value="status" className="space-y-4">
                    <Card className="shadow-sm border-gray-200">
                        <CardHeader className="pb-3 border-b flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <CardTitle className="text-lg font-bold text-gray-900">Production Status Board</CardTitle>
                                <CardDescription className="text-xs">Live pipeline nodes representing woodcraft moving through production stages</CardDescription>
                            </div>

                            {/* Search & Filter Controls */}
                            <div className="flex items-center gap-3 w-full md:w-auto">
                                <div className="relative flex-1 md:w-64">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search by animal or type..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-9 text-xs h-9 bg-white"
                                    />
                                </div>
                                <div className="w-36">
                                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                                        <SelectTrigger className="text-xs h-9 bg-white">
                                            <Filter className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                                            <SelectValue placeholder="All Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL" className="text-xs">All Products</SelectItem>
                                            <SelectItem value="SHORTAGE" className="text-xs">Shortage Only</SelectItem>
                                            <SelectItem value="COVERED" className="text-xs">Covered Demand</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {filteredProducts.length === 0 ? (
                                <div className="p-8 text-center text-muted-foreground text-sm font-medium">
                                    No products matching your search or filters.
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader className="bg-gray-50/70">
                                            <TableRow>
                                                <TableHead className="font-bold text-gray-700 text-xs">Product Details</TableHead>
                                                <TableHead className="font-bold text-gray-700 text-xs text-center">Ordered</TableHead>
                                                <TableHead className="font-bold text-gray-700 text-xs w-[400px]">Production Pipeline Flow</TableHead>
                                                <TableHead className="font-bold text-gray-700 text-xs text-center">On Hand Stock</TableHead>
                                                <TableHead className="font-bold text-gray-700 text-xs text-right">Supply Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredProducts.map((p: ProductionProduct) => {
                                                const totalWip = Object.values(p.inventory || {}).reduce((a: number, b: number) => a + b, 0) +
                                                    Object.values(p.in_production || {}).reduce((a: number, b: number) => a + b, 0);
                                                const totalSupply = p.stock + totalWip;
                                                const gap = (p.total_ordered || 0) - totalSupply;

                                                return (
                                                    <TableRow key={p.id} className="hover:bg-gray-50/50 transition-colors">
                                                        <TableCell className="py-3">
                                                            <div className="font-bold text-gray-900 text-sm">{p.product_type?.replace(/_/g, " ")}</div>
                                                            <div className="text-xs text-muted-foreground font-medium mt-0.5">
                                                                {p.animal_type} • <span className="bg-slate-100 text-slate-800 px-1 py-0.2 rounded font-mono text-[10px]">{p.size_category?.replace(/_/g, " ")}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="font-bold text-gray-900 text-sm text-center">{p.total_ordered || 0}</TableCell>
                                                        <TableCell className="py-3">
                                                            <div className="space-y-2">
                                                                {/* Horizontal Pipeline Steps Tracker */}
                                                                <div className="flex items-center space-x-1.5 overflow-x-auto py-1">
                                                                    {STAGES.map((s, idx) => {
                                                                        const count = (p.inventory?.[s.key] || 0) + (p.in_production?.[s.key] || 0);
                                                                        const isActive = count > 0;
                                                                        return (
                                                                            <div key={s.key} className="flex items-center">
                                                                                <div 
                                                                                    className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                                                                                        isActive 
                                                                                            ? `${getStageColor(s.key)} border border-current shadow-sm scale-105` 
                                                                                            : "bg-gray-50 text-gray-400 border border-gray-150"
                                                                                    }`}
                                                                                    title={`${s.label}: ${count} units`}
                                                                                >
                                                                                    <span>{s.label.charAt(0)}</span>
                                                                                    {isActive && (
                                                                                        <span className="bg-white/80 dark:bg-black/30 rounded-full px-1.5 py-0.1 font-bold text-[9px]">
                                                                                            {count}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                                {idx < STAGES.length - 1 && (
                                                                                    <span className="text-gray-300 mx-1 font-semibold">➔</span>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                                <Progress 
                                                                    value={Math.min((totalSupply / (p.total_ordered || 1)) * 100, 100)} 
                                                                    className="h-1.5 bg-gray-100" 
                                                                />
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-center font-bold text-gray-700">{p.stock}</TableCell>
                                                        <TableCell className="text-right py-3">
                                                            {gap > 0 ? (
                                                                <Badge variant="destructive" className="animate-pulse bg-red-100 text-red-800 border-red-200 font-semibold px-2 py-0.5">
                                                                    Shortage: {gap}
                                                                </Badge>
                                                            ) : p.total_ordered > 0 ? (
                                                                <Badge variant="outline" className="text-green-700 bg-green-50 border-green-200 font-semibold px-2 py-0.5">
                                                                    Covered
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="secondary" className="bg-gray-100 text-gray-600 border-gray-200 font-semibold px-2 py-0.5">
                                                                    Stock Only
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB 2: Ready for Assignment Assignable shelf Columns */}
                <TabsContent value="distribution">
                    <Card className="shadow-sm border-gray-200">
                        <CardHeader>
                            <CardTitle className="text-lg font-bold text-gray-900">Assignable Shelf Queue</CardTitle>
                            <CardDescription className="text-xs">Bottleneck tracker showing items sitting on the shelves waiting for the next artisan category assignment</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {STAGES.map((stage, idx) => {
                                    const totalAtStage = safeData.reduce((sum: number, p: ProductionProduct) => sum + (p.inventory?.[stage.key] || 0), 0);
                                    if (totalAtStage === 0) return null;

                                    return (
                                        <Card key={stage.key} className="border-l-4 border-l-blue-600 hover:shadow-md transition-shadow duration-200">
                                            <CardHeader className="py-3.5 border-b bg-gray-50/50">
                                                <CardTitle className="text-sm font-bold flex justify-between items-center text-gray-900">
                                                    <span>{stage.label} Shelf</span>
                                                    <Badge className={`${getStageColor(stage.key)} font-bold px-2 py-0.5 border`}>
                                                        {totalAtStage} Units
                                                    </Badge>
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="text-xs space-y-3 pt-3">
                                                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                                                    {safeData.filter((p: ProductionProduct) => (p.inventory?.[stage.key] || 0) > 0).map((p: ProductionProduct) => (
                                                        <div key={p.id} className="flex justify-between items-center bg-gray-50 border p-2 rounded-md hover:bg-gray-100/50 transition-colors">
                                                            <div>
                                                                <span className="font-bold text-gray-800">{p.product_type?.replace(/_/g, " ")}</span>
                                                                <span className="block text-[10px] text-muted-foreground mt-0.5">{p.animal_type} • {p.size_category}</span>
                                                            </div>
                                                            <span className="font-bold bg-white text-gray-900 border px-2 py-0.5 rounded shadow-sm text-sm">
                                                                {p.inventory[stage.key]}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="pt-2.5 border-t text-blue-700 font-bold flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                                                    <ArrowRightIcon className="h-3.5 w-3.5 text-blue-600 animate-pulse" />
                                                    <span>Next Stage: {STAGES[idx + 1]?.label || "Final Warehouse Stock"}</span>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB 3: Artisan Capacity loading */}
                <TabsContent value="artisans" className="space-y-4">
                    <Card className="shadow-sm border-gray-200">
                        <CardHeader>
                            <CardTitle className="text-lg font-bold text-gray-900">Artisan Capacity Tracker</CardTitle>
                            <CardDescription className="text-xs">Live monitoring of workload distribution to prevent over-scheduling and bottlenecking</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {safeWorkload.map((artisan: any) => {
                                    const capacity = getCapacityStatus(artisan.total_units);
                                    return (
                                        <Card key={artisan.name} className="hover:shadow-md transition-shadow duration-200 border-gray-200">
                                            <CardHeader className="pb-3 border-b bg-gray-50/30">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                                                            <Users className="h-4.5 w-4.5 text-blue-600" />
                                                            {artisan.name}
                                                        </CardTitle>
                                                        <CardDescription className="text-[11px] mt-0.5 font-medium">Production Assignee</CardDescription>
                                                    </div>
                                                    <Badge className={`${capacity.color} border font-bold px-2.5 py-0.5 text-xs`}>
                                                        {capacity.label}
                                                    </Badge>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="pt-4 space-y-4">
                                                {/* Capacity loading indicator */}
                                                <div className="space-y-1.5">
                                                    <div className="flex justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                                        <span>Capacity Load</span>
                                                        <span>{artisan.total_units} / 15 Units</span>
                                                    </div>
                                                    <Progress 
                                                        value={capacity.percent} 
                                                        className="h-2 bg-gray-100" 
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">Active Handout Items ({artisan.items.length})</p>
                                                    {artisan.items.length === 0 ? (
                                                        <div className="text-xs text-muted-foreground bg-gray-50 border border-dashed p-3 text-center rounded-md font-medium">
                                                            No active items assigned. Ready for scheduling!
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                                                            {artisan.items.map((item: any, idx: number) => {
                                                                const product = safeData.find((p: ProductionProduct) => p.id === item.product_id);
                                                                return (
                                                                    <div key={idx} className="flex justify-between items-center p-2.5 border rounded-lg text-xs bg-gray-50 hover:bg-gray-100/50 transition-colors">
                                                                        <div>
                                                                            <span className="font-bold text-gray-800">{product?.product_type?.replace(/_/g, " ") || "Unknown Item"}</span>
                                                                            <span className="mx-2 text-gray-300">|</span>
                                                                            <Badge className={`${getStageColor(item.category)} border text-[9px] font-bold px-1.5 py-0.1`}>
                                                                                {item.category}
                                                                            </Badge>
                                                                        </div>
                                                                        <span className="font-extrabold bg-white border px-2 py-0.5 rounded shadow-sm">
                                                                            {item.quantity} pcs
                                                                        </span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
