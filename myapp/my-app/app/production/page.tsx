"use client";

import { useProductionGuide } from '@/hooks/useResource';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Factory, Users, ClipboardList, ArrowRightIcon } from "lucide-react";

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

const STAGES = [
    { key: 'DRAWING', label: 'Drawing' },
    { key: 'CARVING', label: 'Carving' },
    { key: 'CUTTING', label: 'Cutting' },
    { key: 'SANDING', label: 'Sanding' },
    { key: 'PAINTING', label: 'Painting' },
    { key: 'FINISHING', label: 'Finishing' }
];

export default function ProductionGuidePage() {
    const { data, loading, error } = useProductionGuide();

    if (loading) {
        return (
            <div className="container mx-auto p-6 space-y-8">
                <Skeleton className="h-10 w-64" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
                </div>
                <Skeleton className="h-[400px] w-full" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="container mx-auto p-6">
                <Alert variant="destructive">
                    <AlertTitle>Error Loading Guide</AlertTitle>
                    <AlertDescription>{error.message}</AlertDescription>
                </Alert>
            </div>
        )
    }

    const safeData = ((data as any)?.products || []) as ProductionProduct[];
    const safeWorkload = (data as any)?.artisan_workload || [];

    const totalShortage = safeData.reduce((sum: number, p: ProductionProduct) => {
        const totalWip = Object.values(p.inventory || {}).reduce((a: number, b: number) => a + b, 0) +
            Object.values(p.in_production || {}).reduce((a: number, b: number) => a + b, 0);
        const gap = (p.total_ordered || 0) - (p.stock + totalWip);
        return sum + (gap > 0 ? gap : 0);
    }, 0);

    return (
        <div className="container mx-auto p-6">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Factory className="h-8 w-8 text-blue-600" />
                        Production Guide
                    </h1>
                    <p className="text-muted-foreground mt-2">Active demand, stock levels, and work distribution planning</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Items to Produce</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">{totalShortage}</div>
                        <p className="text-xs text-muted-foreground">Total shortage across all products</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Active Demand</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {safeData.reduce((sum: number, p: ProductionProduct) => sum + (p.total_ordered || 0), 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">Units in active customer orders</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Work In Progress</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">
                            {safeData.reduce((sum: number, p: ProductionProduct) => sum + Object.values(p.in_production || {}).reduce((a: number, b: number) => a + b, 0), 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">Units currently with artisans</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="status" className="w-full">
                <TabsList className="mb-4">
                    <TabsTrigger value="status" className="flex gap-2">
                        <ClipboardList className="h-4 w-4" /> Status Board
                    </TabsTrigger>
                    <TabsTrigger value="distribution" className="flex gap-2">
                        <ArrowRightIcon className="h-4 w-4" /> Work Distribution
                    </TabsTrigger>
                    <TabsTrigger value="artisans" className="flex gap-2">
                        <Users className="h-4 w-4" /> Artisan Workload
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="status">
                    <Card>
                        <CardHeader>
                            <CardTitle>Production Status Board</CardTitle>
                            <CardDescription>Live tracking of products moving through production stages</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Product</TableHead>
                                        <TableHead>Demand</TableHead>
                                        <TableHead className="w-[300px]">Pipeline Progress</TableHead>
                                        <TableHead>Stock</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {safeData.map((p: ProductionProduct) => {
                                        const totalWip = Object.values(p.inventory || {}).reduce((a: number, b: number) => a + b, 0) +
                                            Object.values(p.in_production || {}).reduce((a: number, b: number) => a + b, 0);
                                        const totalSupply = p.stock + totalWip;
                                        const gap = (p.total_ordered || 0) - totalSupply;

                                        return (
                                            <TableRow key={p.id}>
                                                <TableCell>
                                                    <div className="font-medium">{p.product_type?.replace(/_/g, " ")}</div>
                                                    <div className="text-xs text-muted-foreground">{p.animal_type} • {p.size_category?.replace(/_/g, " ")}</div>
                                                </TableCell>
                                                <TableCell className="font-bold">{p.total_ordered || 0}</TableCell>
                                                <TableCell>
                                                    <div className="space-y-1">
                                                        <div className="flex justify-between text-[10px] text-muted-foreground">
                                                            {STAGES.map(s => {
                                                                const count = (p.inventory?.[s.key] || 0) + (p.in_production?.[s.key] || 0);
                                                                return count > 0 ? (
                                                                    <span key={s.key}>{s.label.charAt(0)}:{count}</span>
                                                                ) : null;
                                                            })}
                                                        </div>
                                                        <Progress value={Math.min((totalSupply / (p.total_ordered || 1)) * 100, 100)} className="h-2" />
                                                    </div>
                                                </TableCell>
                                                <TableCell>{p.stock}</TableCell>
                                                <TableCell>
                                                    {gap > 0 ? (
                                                        <Badge variant="destructive" className="animate-pulse">Short: {gap}</Badge>
                                                    ) : p.total_ordered > 0 ? (
                                                        <Badge variant="outline" className="text-green-600 border-green-200">Covered</Badge>
                                                    ) : (
                                                        <Badge variant="secondary">Stock Only</Badge>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="distribution">
                    <Card>
                        <CardHeader>
                            <CardTitle>Ready for Assignment</CardTitle>
                            <CardDescription>Items sitting on the shelf ready for the next artisan category</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {STAGES.map((stage, idx) => {
                                    const totalAtStage = safeData.reduce((sum: number, p: ProductionProduct) => sum + (p.inventory?.[stage.key] || 0), 0);
                                    if (totalAtStage === 0) return null;

                                    return (
                                        <Card key={stage.key} className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
                                            <CardHeader className="py-3">
                                                <CardTitle className="text-sm flex justify-between">
                                                    {stage.label}
                                                    <Badge variant="secondary">{totalAtStage} Units</Badge>
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="text-xs space-y-2">
                                                {safeData.filter((p: ProductionProduct) => (p.inventory?.[stage.key] || 0) > 0).map((p: ProductionProduct) => (
                                                    <div key={p.id} className="flex justify-between items-center bg-muted/50 p-2 rounded">
                                                        <span>{p.product_type?.replace(/_/g, " ")} ({p.animal_type})</span>
                                                        <span className="font-bold">{p.inventory[stage.key]}</span>
                                                    </div>
                                                ))}
                                                <div className="pt-2 text-blue-600 font-medium flex items-center gap-1">
                                                    <ArrowRightIcon className="h-3 w-3" /> Ready for {STAGES[idx + 1]?.label || "Final Stock"}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="artisans">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {safeWorkload.map((artisan: any) => (
                            <Card key={artisan.name} className="hover:shadow-md transition-shadow">
                                <CardHeader>
                                    <div className="flex justify-between items-center">
                                        <CardTitle className="text-lg">{artisan.name}</CardTitle>
                                        <Badge variant="outline">{artisan.total_units} units in hand</Badge>
                                    </div>
                                    <CardDescription>Current assignments by product</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {artisan.items.map((item: any, idx: number) => {
                                            const product = safeData.find((p: ProductionProduct) => p.id === item.product_id);
                                            return (
                                                <div key={idx} className="flex justify-between items-center p-2 border rounded-sm text-sm bg-slate-50">
                                                    <div>
                                                        <span className="font-medium">{product?.product_type?.replace(/_/g, " ") || "Unknown"}</span>
                                                        <span className="mx-2 text-muted-foreground">|</span>
                                                        <Badge variant="secondary" className="text-[10px] h-4">{item.category}</Badge>
                                                    </div>
                                                    <span className="font-bold">{item.quantity}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
