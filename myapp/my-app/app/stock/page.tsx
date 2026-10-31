"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownToLine,
  Boxes,
  Calculator,
  Check,
  Copy,
  DollarSign,
  Download,
  Eye,
  Layers,
  LayoutGrid,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { useFinishedStock, useProductMetadata } from "@/hooks/useResource";
import { useProductPrice } from "@/hooks/useProductPrice";
import { usePairsInput } from "@/hooks/usePairsInput";
import { finishedStockApi } from "@/lib/api/services/finishedStock";
import { FinishedStockMovementsModal } from "@/components/finished-stock-movements-modal";
import { AddFinishedStockPayload, FinishedStock, Product } from "@/types";
import { splitPairsAndItems } from "@/lib/utils";
import {
  ANIMAL_TYPES,
  PRODUCT_TYPES,
  SIZE_CATEGORIES,
} from "@/lib/constants";

const RECENT_STOCK_ITEMS_CACHE_KEY = "recent-finished-stock-items";

type StockStatus = "IN_STOCK" | "BELOW_MINIMUM" | "OUT_OF_STOCK" | "OVERSTOCK";

interface StockForm {
  productType: string;
  animalType: string;
  sizeCategory: string;
  quantity: string;
  averageCost: string;
  note: string;
}

interface BatchStockItem {
  id: string;
  product: number;
  productType: string;
  animalType: string;
  sizeCategory: string;
  unitOfMeasure?: string;
  quantity: number;
  averageCost: number;
  basePrice: number;
  note: string;
}

interface RecentStockItem {
  productType: string;
  animalType: string;
  sizeCategory: string;
}

interface ReceiptSummary {
  lines: number;
  units: number;
  value: number;
}

const EMPTY_FORM: StockForm = {
  productType: "",
  animalType: "",
  sizeCategory: "",
  quantity: "",
  averageCost: "",
  note: "",
};

const STATUS_LABELS: Record<StockStatus, string> = {
  IN_STOCK: "In stock",
  BELOW_MINIMUM: "Below minimum",
  OUT_OF_STOCK: "Out of stock",
  OVERSTOCK: "Overstock",
};

function getProduct(item: FinishedStock): Product | null {
  return typeof item.product === "object" && item.product !== null
    ? (item.product as Product)
    : null;
}

function productLabel(product: Product): string {
  return [
    product.product_type?.replace(/_/g, " "),
    product.animal_type,
    product.size_category?.replace(/_/g, " "),
  ]
    .filter(Boolean)
    .join(" • ");
}

function getStockStatus(item: FinishedStock): StockStatus {
  const minimum = Number(item.reorder_level ?? 0);
  const maximum = Number(item.max_level ?? 0);

  if (item.quantity === 0) return "OUT_OF_STOCK";
  if (minimum > 0 && item.quantity <= minimum) return "BELOW_MINIMUM";
  if (maximum > 0 && item.quantity > maximum) return "OVERSTOCK";
  return "IN_STOCK";
}

function getStatusColor(status: StockStatus): string {
  switch (status) {
    case "BELOW_MINIMUM":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "OUT_OF_STOCK":
      return "bg-red-100 text-red-800 border-red-200";
    case "OVERSTOCK":
      return "bg-purple-100 text-purple-800 border-purple-200";
    default:
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
  }
}

function getStatusIcon(status: StockStatus) {
  switch (status) {
    case "BELOW_MINIMUM":
      return <TrendingDown className="h-3.5 w-3.5" />;
    case "OUT_OF_STOCK":
      return <AlertTriangle className="h-3.5 w-3.5" />;
    case "OVERSTOCK":
      return <Layers className="h-3.5 w-3.5" />;
    default:
      return <Package className="h-3.5 w-3.5" />;
  }
}

function daysInStock(item: FinishedStock): number {
  if (typeof item.days_in_stock === "number") return item.days_in_stock;
  if (!item.last_updated) return 0;
  const diff = Date.now() - new Date(item.last_updated).getTime();
  return Math.max(0, Math.floor(diff / 86_400_000));
}

function getColorForString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  const colorCombos = [
    "bg-blue-50/70 text-blue-700 border-blue-200 hover:bg-blue-100/70",
    "bg-emerald-50/70 text-emerald-700 border-emerald-200 hover:bg-emerald-100/70",
    "bg-amber-50/70 text-amber-800 border-amber-200 hover:bg-amber-100/70",
    "bg-rose-50/70 text-rose-700 border-rose-200 hover:bg-rose-100/70",
    "bg-purple-50/70 text-purple-700 border-purple-200 hover:bg-purple-100/70",
    "bg-indigo-50/70 text-indigo-700 border-indigo-200 hover:bg-indigo-100/70",
    "bg-sky-50/70 text-sky-700 border-sky-200 hover:bg-sky-100/70",
    "bg-teal-50/70 text-teal-700 border-teal-200 hover:bg-teal-100/70",
  ];

  return colorCombos[Math.abs(hash) % colorCombos.length];
}

export default function FinishedStockPage() {
  const { data: finishedStock, loading, error, refetch } = useFinishedStock();
  const {
    data: productMetadata,
    loading: metadataLoading,
    refetch: refetchProductMetadata,
  } = useProductMetadata();

  const safeFinishedStock = useMemo(
    () => (Array.isArray(finishedStock) ? finishedStock : []),
    [finishedStock]
  );

  const [form, setForm] = useState<StockForm>(EMPTY_FORM);
  const [batchItems, setBatchItems] = useState<BatchStockItem[]>([]);
  const [recentItems, setRecentItems] = useState<RecentStockItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<ReceiptSummary | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | StockStatus>("all");

  const [selectedStockId, setSelectedStockId] = useState<number | null>(null);
  const [selectedProductLabel, setSelectedProductLabel] = useState<string>("");
  const [isMovementsOpen, setIsMovementsOpen] = useState(false);

  const pairsInput = usePairsInput();
  const lastProductIdRef = useRef<number | null>(null);

  const shouldFetchProduct = Boolean(
    form.productType && form.animalType && form.sizeCategory
  );

  const {
    data: productPrice,
    loading: priceLoading,
    error: priceError,
  } = useProductPrice(
    form.productType,
    form.animalType,
    form.sizeCategory,
    "FINISHED",
    { enabled: shouldFetchProduct }
  );

  useEffect(() => {
    const cached = localStorage.getItem(RECENT_STOCK_ITEMS_CACHE_KEY);
    if (cached) {
      try {
        setRecentItems(JSON.parse(cached));
      } catch {
        localStorage.removeItem(RECENT_STOCK_ITEMS_CACHE_KEY);
      }
    }
  }, []);

  useEffect(() => {
    if (productPrice?.id && productPrice.id !== lastProductIdRef.current) {
      lastProductIdRef.current = productPrice.id;
      const existing = safeFinishedStock.find(
        (item) => getProduct(item)?.id === productPrice.id
      );
      const suggestedCost = existing
        ? Number(existing.average_cost || 0)
        : Number(productPrice.price || 0);

      setForm((previous) => ({
        ...previous,
        averageCost: String(suggestedCost),
      }));
    }

    if (!productPrice?.id) {
      lastProductIdRef.current = null;
    }
  }, [productPrice?.id, productPrice?.price, safeFinishedStock]);

  const stats = useMemo(() => {
    const totalProducts = safeFinishedStock.length;
    const totalQuantity = safeFinishedStock.reduce((sum, item) => sum + item.quantity, 0);
    const totalValue = safeFinishedStock.reduce(
      (sum, item) => sum + item.quantity * Number(item.average_cost || 0),
      0
    );
    const oldestDays = safeFinishedStock.reduce(
      (oldest, item) => Math.max(oldest, daysInStock(item)),
      0
    );

    const counts: Record<StockStatus, number> = {
      IN_STOCK: 0,
      BELOW_MINIMUM: 0,
      OUT_OF_STOCK: 0,
      OVERSTOCK: 0,
    };

    safeFinishedStock.forEach((item) => {
      counts[getStockStatus(item)] += 1;
    });

    const attentionCount =
      counts.BELOW_MINIMUM + counts.OUT_OF_STOCK + counts.OVERSTOCK;

    return {
      totalProducts,
      totalQuantity,
      totalValue,
      oldestDays,
      counts,
      attentionCount,
    };
  }, [safeFinishedStock]);

  const alertItems = useMemo(
    () =>
      safeFinishedStock
        .filter((item) => getStockStatus(item) !== "IN_STOCK")
        .sort((a, b) => {
          const priority: Record<StockStatus, number> = {
            OUT_OF_STOCK: 0,
            BELOW_MINIMUM: 1,
            OVERSTOCK: 2,
            IN_STOCK: 3,
          };
          return priority[getStockStatus(a)] - priority[getStockStatus(b)];
        }),
    [safeFinishedStock]
  );

  const filteredStock = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return safeFinishedStock.filter((item) => {
      const status = getStockStatus(item);
      if (statusFilter !== "all" && status !== statusFilter) return false;

      if (!query) return true;

      const product = getProduct(item);
      const searchable = product
        ? `${product.product_type} ${product.animal_type} ${product.size_category}`.toLowerCase()
        : "";
      return searchable.includes(query);
    });
  }, [safeFinishedStock, searchTerm, statusFilter]);

  const batchTotals = useMemo(
    () => ({
      lines: batchItems.length,
      units: batchItems.reduce((sum, item) => sum + item.quantity, 0),
      value: batchItems.reduce(
        (sum, item) => sum + item.quantity * item.averageCost,
        0
      ),
    }),
    [batchItems]
  );

  const isAddDisabled =
    !productPrice?.id ||
    !form.productType ||
    !form.animalType ||
    !form.sizeCategory ||
    priceLoading ||
    (productPrice?.unit_of_measure === "PAIRS"
      ? pairsInput.totalQuantity <= 0
      : !form.quantity || Number(form.quantity) <= 0) ||
    form.averageCost === "" ||
    Number(form.averageCost) < 0;

  const updateSelection = (patch: Partial<StockForm>) => {
    lastProductIdRef.current = null;
    pairsInput.reset();
    setForm((previous) => ({
      ...previous,
      ...patch,
      quantity: "",
      averageCost: "",
      note: "",
    }));
  };

  const rememberItem = (item: RecentStockItem) => {
    setRecentItems((previous) => {
      const updated = [
        item,
        ...previous.filter(
          (entry) =>
            !(
              entry.productType === item.productType &&
              entry.animalType === item.animalType &&
              entry.sizeCategory === item.sizeCategory
            )
        ),
      ].slice(0, 20);
      localStorage.setItem(RECENT_STOCK_ITEMS_CACHE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const addBatchItem = () => {
    if (!productPrice?.id) {
      alert("Select a valid finished product first.");
      return;
    }

    const quantity =
      productPrice.unit_of_measure === "PAIRS"
        ? pairsInput.totalQuantity
        : Number.parseInt(form.quantity || "0", 10);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      alert("Enter a quantity greater than zero.");
      return;
    }

    const averageCost = Number(form.averageCost);
    if (!Number.isFinite(averageCost) || averageCost < 0) {
      alert("Enter a valid average cost.");
      return;
    }

    const newItem: BatchStockItem = {
      id: `${productPrice.id}-${Date.now()}`,
      product: productPrice.id,
      productType: form.productType,
      animalType: form.animalType,
      sizeCategory: form.sizeCategory,
      unitOfMeasure: productPrice.unit_of_measure,
      quantity,
      averageCost: Number(averageCost.toFixed(2)),
      basePrice: Number(productPrice.price || 0),
      note: form.note.trim(),
    };

    setBatchItems((previous) => {
      const existing = previous.find((item) => item.product === newItem.product);
      if (!existing) return [...previous, newItem];

      const combinedQuantity = existing.quantity + newItem.quantity;
      const combinedCost =
        (existing.averageCost * existing.quantity +
          newItem.averageCost * newItem.quantity) /
        combinedQuantity;

      return previous.map((item) =>
        item.product === newItem.product
          ? {
              ...item,
              quantity: combinedQuantity,
              averageCost: Number(combinedCost.toFixed(2)),
              note: newItem.note || item.note,
            }
          : item
      );
    });

    rememberItem({
      productType: form.productType,
      animalType: form.animalType,
      sizeCategory: form.sizeCategory,
    });

    setForm((previous) => ({
      ...previous,
      quantity: "",
      note: "",
    }));
    pairsInput.reset();
  };

  const removeBatchItem = (id: string) => {
    setBatchItems((previous) => previous.filter((item) => item.id !== id));
  };

  const clearForm = () => {
    lastProductIdRef.current = null;
    pairsInput.reset();
    setForm(EMPTY_FORM);
  };

  const duplicateLastItem = () => {
    if (batchItems.length === 0) {
      alert("There are no stock lines to duplicate.");
      return;
    }

    const lastItem = batchItems[batchItems.length - 1];
    lastProductIdRef.current = lastItem.product;

    setForm({
      productType: lastItem.productType,
      animalType: lastItem.animalType,
      sizeCategory: lastItem.sizeCategory,
      quantity:
        lastItem.unitOfMeasure === "PAIRS"
          ? ""
          : String(lastItem.quantity),
      averageCost: String(lastItem.averageCost),
      note: lastItem.note,
    });

    pairsInput.reset(
      lastItem.unitOfMeasure === "PAIRS" ? lastItem.quantity : 0
    );
  };

  const handleSubmit = async () => {
    if (batchItems.length === 0) return;

    setSubmitting(true);
    setSubmitError(null);

    const payload: AddFinishedStockPayload = {
      reference: "Manual stock entry",
      items: batchItems.map((item) => ({
        product: item.product,
        quantity: item.quantity,
        average_cost: item.averageCost,
        note: item.note,
      })),
    };

    try {
      await finishedStockApi.addStock(payload);
      await refetch();

      setLastReceipt(batchTotals);
      setBatchItems([]);
      clearForm();
      setShowSuccessDialog(true);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Could not add finished stock."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportCsv = () => {
    const headers = [
      "Product Type",
      "Animal",
      "Size",
      "Quantity",
      "Unit",
      "Average Cost",
      "Retail Price",
      "Margin %",
      "Days in Stock",
      "Stock Value",
      "Status",
      "Last Updated",
    ];

    const escapeValue = (value: unknown) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    const rows = filteredStock.map((item) => {
      const product = getProduct(item);
      const averageCost = Number(item.average_cost || 0);
      const basePrice = Number(product?.base_price || 0);
      const margin =
        basePrice > 0 ? ((basePrice - averageCost) / basePrice) * 100 : 0;
      const status = getStockStatus(item);

      return [
        product?.product_type?.replace(/_/g, " ") || "",
        product?.animal_type || "",
        product?.size_category?.replace(/_/g, " ") || "",
        item.quantity,
        product?.unit_of_measure || "ITEMS",
        averageCost.toFixed(2),
        basePrice.toFixed(2),
        margin.toFixed(1),
        daysInStock(item),
        (item.quantity * averageCost).toFixed(2),
        STATUS_LABELS[status],
        item.last_updated ? new Date(item.last_updated).toLocaleString() : "",
      ];
    });

    const csv = [
      headers.map(escapeValue).join(","),
      ...rows.map((row) => row.map(escapeValue).join(",")),
    ].join("\n");

    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `finished-stock-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const openMovements = (item: FinishedStock) => {
    const product = getProduct(item);
    setSelectedStockId(item.id);
    setSelectedProductLabel(product ? productLabel(product) : "");
    setIsMovementsOpen(true);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-8">
        <div className="flex justify-between items-center border-b pb-6">
          <div className="space-y-2">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, index) => (
            <Card key={index}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24 mb-1" />
                <Skeleton className="h-4 w-40" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-72 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTitle>Error loading finished stock</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={() => refetch()} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b pb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2.5 text-3xl font-extrabold tracking-tight text-gray-900">
            <Boxes className="h-8 w-8 text-blue-600" />
            Finished Stock
          </h1>
          <p className="mt-1.5 text-sm font-medium text-muted-foreground">
            Warehouse view of sale-ready stock, movements, and reorder risks
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-full border border-blue-150 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800 shadow-sm">
            <LayoutGrid className="h-3.5 w-3.5 text-blue-600" />
            <span>Warehouse Inventory System</span>
          </div>
          <Button
            variant="outline"
            className="h-9 border-gray-300 text-xs font-bold uppercase"
            onClick={() => refetch()}
          >
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
            Refresh
          </Button>
          <Button
            className="h-9 text-xs font-bold uppercase shadow-sm"
            onClick={handleExportCsv}
            disabled={filteredStock.length === 0}
          >
            <Download className="mr-2 h-3.5 w-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <Card className="relative overflow-hidden border-blue-100 bg-gradient-to-br from-blue-50/50 to-white shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-lg">
          <div className="absolute right-0 top-0 p-4 opacity-15">
            <Package className="h-16 w-16 text-blue-600" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-800">
              <span className="h-2 w-2 rounded-full bg-blue-600"></span>
              Active Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold tracking-tight text-blue-600">
              {stats.totalProducts}
            </div>
            <p className="mt-1 text-xs font-medium text-blue-800/80">
              Product lines in the warehouse
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-purple-100 bg-gradient-to-br from-purple-50/50 to-white shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-lg">
          <div className="absolute right-0 top-0 p-4 opacity-15">
            <Boxes className="h-16 w-16 text-purple-600" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-purple-800">
              <span className="h-2 w-2 rounded-full bg-purple-600"></span>
              Quantity in Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold tracking-tight text-purple-600">
              {stats.totalQuantity.toLocaleString()} <span className="text-lg">units</span>
            </div>
            <p className="mt-1 text-xs font-medium text-purple-800/80">
              Ready-to-sell pieces
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-emerald-100 bg-gradient-to-br from-emerald-50/50 to-white shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-lg">
          <div className="absolute right-0 top-0 p-4 opacity-15">
            <DollarSign className="h-16 w-16 text-emerald-600" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-800">
              <span className="h-2 w-2 rounded-full bg-emerald-600"></span>
              Stock Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold tracking-tight text-emerald-600">
              Ksh{" "}
              {stats.totalValue.toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </div>
            <p className="mt-1 text-xs font-medium text-emerald-800/80">
              Quantity × average cost
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-orange-100 bg-gradient-to-br from-orange-50/50 to-white shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-lg">
          <div className="absolute right-0 top-0 p-4 opacity-15">
            <AlertTriangle className="h-16 w-16 text-orange-600" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-orange-800">
              <span className="h-2 w-2 animate-pulse rounded-full bg-orange-600"></span>
              Needs Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold tracking-tight text-orange-600">
              {stats.attentionCount}
            </div>
            <p className="mt-1 text-xs font-medium text-orange-800/80">
              {stats.oldestDays > 0
                ? `Oldest stock: ${stats.oldestDays} day${stats.oldestDays === 1 ? "" : "s"}`
                : "No ageing stock yet"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {alertItems.length > 0 && (
        <Card className="overflow-hidden border-red-100 bg-red-50/30 shadow-sm">
          <CardHeader className="border-b border-red-100 bg-red-50/50 pb-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <CardTitle className="text-lg font-bold text-red-900">
                    Inventory Alerts
                  </CardTitle>
                </div>
                <CardDescription className="mt-1 text-xs font-medium text-red-800/70">
                  Warehouse items that need a decision today
                </CardDescription>
              </div>

              <div className="flex flex-wrap gap-2">
                {stats.counts.OUT_OF_STOCK > 0 && (
                  <Badge className="border-red-200 bg-red-100 text-red-800">
                    Out of stock: {stats.counts.OUT_OF_STOCK}
                  </Badge>
                )}
                {stats.counts.BELOW_MINIMUM > 0 && (
                  <Badge className="border-amber-200 bg-amber-100 text-amber-800">
                    Below minimum: {stats.counts.BELOW_MINIMUM}
                  </Badge>
                )}
                {stats.counts.OVERSTOCK > 0 && (
                  <Badge className="border-purple-200 bg-purple-100 text-purple-800">
                    Overstock: {stats.counts.OVERSTOCK}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {alertItems.map((item) => {
                const product = getProduct(item);
                if (!product) return null;
                const status = getStockStatus(item);

                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-xl border border-red-100 bg-white p-3 shadow-sm"
                  >
                    <div className="min-w-0 space-y-1">
                      <Badge
                        variant="outline"
                        className="border-none bg-slate-50 text-[9px] font-bold uppercase tracking-tight text-gray-700"
                      >
                        {(product.product_type || "").replace(/_/g, " ")}
                      </Badge>
                      <p className="truncate text-xs font-bold text-gray-900">
                        {product.animal_type} (
                        {(product.size_category || "").replace(/_/g, " ")})
                      </p>
                      <p className="text-[10px] font-semibold text-muted-foreground">
                        {item.quantity === 0
                          ? "No units left"
                          : status === "OVERSTOCK"
                            ? `Above max: ${item.max_level}`
                            : `Reorder at: ${item.reorder_level ?? 0}`}
                      </p>
                    </div>

                    <div className="ml-3 space-y-1 text-right">
                      <div className="text-sm font-extrabold text-gray-900">
                        {item.quantity} pcs
                      </div>
                      <Badge
                        className={`${getStatusColor(status)} flex w-fit items-center gap-1 border px-1.5 text-[9px] font-bold uppercase`}
                      >
                        {getStatusIcon(status)}
                        {STATUS_LABELS[status]}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add stock workspace */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="overflow-hidden border-gray-200 shadow-sm">
            <CardHeader className="border-b bg-gray-50/50 pb-4">
              <CardTitle className="flex items-center gap-2 text-base font-bold text-gray-900">
                <Plus className="h-4 w-4 text-blue-600" />
                Receive Finished Stock
              </CardTitle>
              <CardDescription className="text-xs font-semibold">
                Add sale-ready stock to the warehouse in batches
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                      Product Category *
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-gray-400 hover:text-blue-500"
                      onClick={() => refetchProductMetadata()}
                      title="Refresh categories"
                    >
                      <RefreshCw
                        className={`h-3 w-3 ${metadataLoading ? "animate-spin" : ""}`}
                      />
                    </Button>
                  </div>
                  <Select
                    value={form.productType}
                    onValueChange={(value) => updateSelection({ productType: value })}
                  >
                    <SelectTrigger className="h-11 border-gray-300 bg-white text-sm font-medium">
                      <SelectValue placeholder="Choose product category..." />
                    </SelectTrigger>
                    <SelectContent>
                      {productMetadata?.product_types?.map((type) => (
                        <SelectItem
                          key={type.value}
                          value={type.value}
                          className="text-sm font-semibold"
                        >
                          {type.label}
                        </SelectItem>
                      )) ||
                        PRODUCT_TYPES.map((type) => (
                          <SelectItem
                            key={type}
                            value={type}
                            className="text-sm font-semibold"
                          >
                            {type.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Animal Profile *
                  </Label>
                  <Select
                    value={form.animalType}
                    onValueChange={(value) => updateSelection({ animalType: value })}
                  >
                    <SelectTrigger className="h-11 border-gray-300 bg-white text-sm font-medium">
                      <SelectValue placeholder="Choose animal type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {ANIMAL_TYPES.map((type) => (
                        <SelectItem
                          key={type}
                          value={type}
                          className="text-sm font-semibold"
                        >
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Size Segment *
                  </Label>
                  <Select
                    value={form.sizeCategory}
                    onValueChange={(value) => updateSelection({ sizeCategory: value })}
                  >
                    <SelectTrigger className="h-11 border-gray-300 bg-white text-sm font-medium">
                      <SelectValue placeholder="Choose size category..." />
                    </SelectTrigger>
                    <SelectContent>
                      {productMetadata?.size_categories?.map((size) => (
                        <SelectItem
                          key={size.value}
                          value={size.value}
                          className="text-sm font-semibold"
                        >
                          {size.label}
                        </SelectItem>
                      )) ||
                        SIZE_CATEGORIES.map((size) => (
                          <SelectItem
                            key={size}
                            value={size}
                            className="text-sm font-semibold"
                          >
                            {size.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Average Cost per Unit (Ksh) *
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.averageCost}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        averageCost: event.target.value,
                      }))
                    }
                    placeholder="0.00"
                    className="h-11 border-gray-300 text-sm font-extrabold"
                  />
                </div>

                {shouldFetchProduct && (
                  <div className="md:col-span-2">
                    {priceLoading && (
                      <div className="flex items-center gap-2 rounded-xl border bg-slate-50 p-3 text-xs font-bold text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                        Checking product and retail price...
                      </div>
                    )}

                    {priceError && (
                      <Alert
                        variant="destructive"
                        className="border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-950"
                      >
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <AlertTitle>Product not found</AlertTitle>
                        <AlertDescription>{priceError}</AlertDescription>
                      </Alert>
                    )}

                    {productPrice && !priceLoading && (
                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                          <Calculator className="h-4 w-4 text-emerald-500" />
                          <span>
                            Retail price:{" "}
                            <strong className="text-sm font-extrabold text-blue-700">
                              Ksh{" "}
                              {Number(productPrice.price || 0).toLocaleString()}
                            </strong>
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className="border-slate-200 bg-white text-[10px] font-bold text-slate-600"
                          >
                            {productPrice.unit_of_measure || "ITEMS"}
                          </Badge>
                          <span className="text-[10px] font-semibold text-muted-foreground">
                            Product ID: {productPrice.id}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Quantity Received *
                  </Label>

                  {productPrice?.unit_of_measure === "PAIRS" ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold uppercase text-gray-400">
                            Pairs
                          </Label>
                          <Input
                            type="number"
                            min="0"
                            value={pairsInput.pairs}
                            onChange={(event) => pairsInput.setPairs(event.target.value)}
                            placeholder="0"
                            className="h-11 border-gray-300 text-sm font-extrabold"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold uppercase text-gray-400">
                            Singles
                          </Label>
                          <Input
                            type="number"
                            min="0"
                            value={pairsInput.singles}
                            onChange={(event) => pairsInput.setSingles(event.target.value)}
                            placeholder="0"
                            className="h-11 border-gray-300 text-sm font-extrabold"
                            onKeyDown={(event) => {
                              if (event.key === "Enter" && !isAddDisabled) {
                                event.preventDefault();
                                addBatchItem();
                              }
                            }}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <Badge
                          variant="secondary"
                          className="border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600"
                        >
                          Total: {pairsInput.totalQuantity} individual items
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    <Input
                      type="number"
                      min="1"
                      value={form.quantity}
                      onChange={(event) =>
                        setForm((previous) => ({
                          ...previous,
                          quantity: event.target.value,
                        }))
                      }
                      placeholder="Enter quantity received..."
                      className="h-11 border-gray-300 text-sm font-extrabold"
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !isAddDisabled) {
                          event.preventDefault();
                          addBatchItem();
                        }
                      }}
                    />
                  )}
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Receipt Note (Optional)
                  </Label>
                  <Textarea
                    value={form.note}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        note: event.target.value,
                      }))
                    }
                    placeholder="e.g. production batch received from finishing team..."
                    className="min-h-[70px] border-gray-300 text-sm font-medium focus-visible:ring-indigo-500 focus-visible:ring-offset-0"
                  />
                </div>
              </div>

              <div className="mt-6 flex gap-3 border-t pt-6">
                <Button
                  onClick={addBatchItem}
                  disabled={isAddDisabled}
                  className="h-11 flex-1 px-5 text-xs font-bold uppercase shadow-md shadow-primary/20 hover:scale-[1.01]"
                >
                  <Plus className="mr-2 h-4 w-4 stroke-[3]" />
                  Add to Batch
                </Button>
                <Button
                  onClick={clearForm}
                  variant="outline"
                  className="h-11 border-gray-300 px-4 text-xs font-bold uppercase"
                >
                  <RotateCcw className="mr-2 h-4 w-4 stroke-[2.5]" />
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>

          {recentItems.length > 0 && (
            <Card className="overflow-hidden border-gray-200 shadow-sm">
              <CardHeader className="border-b bg-gray-50/50 pb-4">
                <CardTitle className="text-base font-bold text-gray-900">
                  Quick Pick
                </CardTitle>
                <CardDescription className="text-xs font-semibold">
                  Click a recent product combination to fill the form
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2 pt-6">
                {recentItems.map((item, index) => (
                  <Button
                    key={`${item.productType}-${item.animalType}-${item.sizeCategory}-${index}`}
                    variant="outline"
                    className={`h-9 rounded-full border px-3.5 text-xs font-semibold uppercase transition-all duration-200 ${getColorForString(item.productType)}`}
                    onClick={() => {
                      lastProductIdRef.current = null;
                      pairsInput.reset();
                      setForm((previous) => ({
                        ...previous,
                        productType: item.productType,
                        animalType: item.animalType,
                        sizeCategory: item.sizeCategory,
                        quantity: "",
                        averageCost: "",
                        note: "",
                      }));
                    }}
                  >
                    {item.productType.replace(/_/g, " ")} • {item.animalType} •{" "}
                    {item.sizeCategory.replace(/_/g, " ")}
                  </Button>
                ))}
              </CardContent>
            </Card>
          )}

          {batchItems.length > 0 && (
            <Card className="overflow-hidden border-gray-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between border-b bg-gray-50/50 pb-4">
                <div>
                  <CardTitle className="text-base font-bold text-gray-900">
                    Stock Receipt Lines ({batchItems.length})
                  </CardTitle>
                  <CardDescription className="text-xs font-semibold">
                    Review lines before adding them to the warehouse
                  </CardDescription>
                </div>
                <Button
                  onClick={duplicateLastItem}
                  variant="outline"
                  size="sm"
                  className="h-8 border-gray-300 px-3 text-[10px] font-bold uppercase"
                >
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                  Copy Last
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-gray-50/30">
                    <TableRow>
                      <TableHead className="pl-6 text-xs font-bold text-gray-700">
                        Product
                      </TableHead>
                      <TableHead className="text-right text-xs font-bold text-gray-700">
                        Qty
                      </TableHead>
                      <TableHead className="text-right text-xs font-bold text-gray-700">
                        Avg Cost
                      </TableHead>
                      <TableHead className="text-right text-xs font-bold text-gray-700">
                        Line Value
                      </TableHead>
                      <TableHead className="pr-6 text-center"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batchItems.map((item) => (
                      <TableRow key={item.id} className="transition-colors hover:bg-slate-50/20">
                        <TableCell className="py-3.5 pl-6">
                          <div className="font-extrabold text-sm text-gray-950">
                            {item.productType.replace(/_/g, " ")}
                          </div>
                          <div className="text-[10px] font-bold text-muted-foreground">
                            {item.animalType} • {item.sizeCategory.replace(/_/g, " ")}
                          </div>
                          {item.note && (
                            <div className="mt-1 max-w-[240px] truncate text-[10px] font-medium text-muted-foreground">
                              {item.note}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-xs font-bold text-gray-800">
                          {item.unitOfMeasure === "PAIRS"
                            ? (() => {
                                const { pairs, singles } = splitPairsAndItems(item.quantity);
                                return `${pairs}P / ${singles}S`;
                              })()
                            : `${item.quantity} pcs`}
                          <div className="text-[10px] font-semibold text-muted-foreground">
                            ({item.quantity} total)
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-xs font-bold text-gray-600">
                          Ksh {item.averageCost.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-sm font-black text-gray-950">
                          Ksh{" "}
                          {(item.quantity * item.averageCost).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell className="py-3.5 pr-6 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeBatchItem(item.id)}
                            className="mx-auto flex h-8 w-8 items-center justify-center rounded-full border border-transparent p-0 text-rose-600 transition-all hover:border-gray-200 hover:bg-gray-100"
                            title="Remove line"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sticky receipt summary */}
        <div>
          <Card className="sticky top-6 overflow-hidden border-gray-200 shadow-sm">
            <CardHeader className="border-b bg-gray-50/50 pb-4">
              <CardTitle className="flex items-center gap-2 text-base font-bold text-gray-900">
                <Sparkles className="h-4 w-4 text-blue-600" />
                Receipt Summary
              </CardTitle>
              <CardDescription className="text-xs font-semibold">
                Confirm the batch before adding it to stock
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="grid grid-cols-2 gap-4 border-y border-gray-150 py-3">
                <div className="space-y-0.5">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    Lines
                  </Label>
                  <div className="text-sm font-extrabold text-gray-900">
                    {batchTotals.lines}
                  </div>
                </div>
                <div className="space-y-0.5">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    Total Units
                  </Label>
                  <div className="text-sm font-extrabold text-gray-900">
                    {batchTotals.units.toLocaleString()} pcs
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between py-1">
                <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Batch Value
                </Label>
                <span className="text-xl font-black text-emerald-600">
                  Ksh{" "}
                  {batchTotals.value.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>

              {submitError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Could not add stock</AlertTitle>
                  <AlertDescription>{submitError}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2 border-t pt-4">
                <Button
                  onClick={handleSubmit}
                  disabled={batchItems.length === 0 || submitting}
                  className="h-11 w-full px-4 text-xs font-bold uppercase shadow-md shadow-primary/20 hover:scale-[1.01]"
                >
                  {submitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowDownToLine className="mr-2 h-4 w-4 stroke-[2.5]" />
                  )}
                  {submitting ? "Adding stock..." : "Add Stock to Warehouse"}
                </Button>

                <Button
                  onClick={handleExportCsv}
                  variant="outline"
                  disabled={filteredStock.length === 0}
                  className="h-11 w-full border-gray-300 px-4 text-xs font-bold uppercase text-gray-700 hover:bg-gray-50"
                >
                  <Download className="mr-2 h-4 w-4 text-muted-foreground" />
                  Export Current Stock
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Stock table */}
      <Card className="overflow-hidden border-gray-200 shadow-sm">
        <CardHeader className="border-b pb-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-lg font-bold text-gray-900">
                Finished Stock
              </CardTitle>
              <CardDescription className="text-xs">
                {filteredStock.length} of {safeFinishedStock.length} product
                {safeFinishedStock.length === 1 ? "" : "s"} shown
              </CardDescription>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search product, animal, size..."
                  className="h-9 pl-9 text-xs"
                />
              </div>

              <Select
                value={statusFilter}
                onValueChange={(value) =>
                  setStatusFilter(value as "all" | StockStatus)
                }
              >
                <SelectTrigger className="h-9 w-full border-gray-300 bg-white text-xs font-semibold sm:w-44">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    All statuses
                  </SelectItem>
                  <SelectItem value="IN_STOCK" className="text-xs">
                    In stock
                  </SelectItem>
                  <SelectItem value="BELOW_MINIMUM" className="text-xs">
                    Below minimum
                  </SelectItem>
                  <SelectItem value="OUT_OF_STOCK" className="text-xs">
                    Out of stock
                  </SelectItem>
                  <SelectItem value="OVERSTOCK" className="text-xs">
                    Overstock
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-gray-50/70">
              <TableRow>
                <TableHead className="text-xs font-bold text-gray-700">
                  Product
                </TableHead>
                <TableHead className="text-right text-xs font-bold text-gray-700">
                  Qty in Stock
                </TableHead>
                <TableHead className="text-right text-xs font-bold text-gray-700">
                  Avg Cost
                </TableHead>
                <TableHead className="text-right text-xs font-bold text-gray-700">
                  Retail
                </TableHead>
                <TableHead className="text-center text-xs font-bold text-gray-700">
                  Margin
                </TableHead>
                <TableHead className="text-right text-xs font-bold text-gray-700">
                  Days in Stock
                </TableHead>
                <TableHead className="text-right text-xs font-bold text-gray-700">
                  Stock Value
                </TableHead>
                <TableHead className="text-xs font-bold text-gray-700">
                  Status
                </TableHead>
                <TableHead className="pr-6 text-right text-xs font-bold text-gray-700">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStock.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-12 text-center">
                    <Package className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                    <p className="text-sm font-semibold text-muted-foreground">
                      No finished stock matches this view.
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground/80">
                      Try a different search or status filter.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredStock.map((item) => {
                  const product = getProduct(item);
                  if (!product) return null;

                  const basePrice = Number(product.base_price || 0);
                  const averageCost = Number(item.average_cost || 0);
                  const margin =
                    basePrice > 0
                      ? ((basePrice - averageCost) / basePrice) * 100
                      : 0;
                  const status = getStockStatus(item);
                  const age = daysInStock(item);

                  return (
                    <TableRow
                      key={item.id}
                      className="transition-colors hover:bg-gray-50/50"
                    >
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm font-bold text-gray-900">
                            {(product.product_type || "").replace(/_/g, " ")}
                          </div>
                          <div className="text-[11px] font-medium uppercase tracking-tight text-muted-foreground">
                            {product.animal_type} •{" "}
                            {(product.size_category || "").replace(/_/g, " ")}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="text-sm font-extrabold text-gray-900">
                          {product.unit_of_measure === "PAIRS"
                            ? (() => {
                                const { pairs, singles } = splitPairsAndItems(item.quantity);
                                return `${pairs}P / ${singles}S`;
                              })()
                            : `${item.quantity} pcs`}
                        </div>
                        <div className="text-[10px] font-bold text-muted-foreground">
                          ({item.quantity} total)
                        </div>
                      </TableCell>

                      <TableCell className="text-right text-xs font-medium text-gray-600">
                        Ksh {averageCost.toLocaleString()}
                      </TableCell>

                      <TableCell className="text-right text-sm font-extrabold text-blue-700">
                        Ksh {basePrice.toLocaleString()}
                      </TableCell>

                      <TableCell className="text-center">
                        <div
                          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            margin > 0
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {margin > 0 ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          {margin.toFixed(1)}%
                        </div>
                      </TableCell>

                      <TableCell className="text-right">
                        <div
                          className={`text-xs font-bold ${
                            age >= 60
                              ? "text-amber-700"
                              : age >= 30
                                ? "text-orange-600"
                                : "text-gray-700"
                          }`}
                        >
                          {age} day{age === 1 ? "" : "s"}
                        </div>
                        <div className="text-[10px] font-medium text-muted-foreground">
                          since last update
                        </div>
                      </TableCell>

                      <TableCell className="text-right text-sm font-extrabold text-emerald-700">
                        Ksh{" "}
                        {(item.quantity * averageCost).toLocaleString(undefined, {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        })}
                      </TableCell>

                      <TableCell>
                        <Badge
                          className={`${getStatusColor(status)} flex w-fit items-center gap-1.5 border px-2 py-0.5 text-[10px] font-bold uppercase`}
                        >
                          {getStatusIcon(status)}
                          {STATUS_LABELS[status]}
                        </Badge>
                      </TableCell>

                      <TableCell className="pr-6 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 border-blue-200 text-[10px] font-bold uppercase tracking-wider text-blue-700 shadow-sm hover:bg-blue-50"
                          onClick={() => openMovements(item)}
                        >
                          <Eye className="mr-1.5 h-3.5 w-3.5" />
                          View movements
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <FinishedStockMovementsModal
        stockId={selectedStockId}
        productLabel={selectedProductLabel}
        isOpen={isMovementsOpen}
        onClose={() => setIsMovementsOpen(false)}
      />

      {/* Success dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="max-w-md rounded-2xl border-gray-250 p-6 shadow-xl">
          <DialogHeader className="border-b pb-3 text-center sm:text-left">
            <DialogTitle className="flex items-center justify-center gap-2 text-lg font-bold text-gray-900 sm:justify-start">
              <Check className="h-6 w-6 rounded-full bg-emerald-50 p-1 text-emerald-500 stroke-[3.5]" />
              Stock Added Successfully
            </DialogTitle>
            <DialogDescription className="mt-1 text-xs font-semibold text-muted-foreground">
              The warehouse balance has been updated
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-2.5 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex justify-between text-xs font-semibold text-gray-600">
              <span>Stock lines:</span>
              <span className="font-extrabold text-gray-950">
                {lastReceipt?.lines ?? 0}
              </span>
            </div>
            <div className="flex justify-between text-xs font-semibold text-gray-600">
              <span>Units received:</span>
              <span className="font-extrabold text-gray-950">
                {(lastReceipt?.units ?? 0).toLocaleString()} pcs
              </span>
            </div>
            <div className="flex justify-between text-xs font-semibold text-gray-600">
              <span>Cost value:</span>
              <span className="font-black text-emerald-600">
                Ksh{" "}
                {(lastReceipt?.value ?? 0).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>

          <DialogFooter className="mt-6 flex flex-col gap-3 border-t pt-6 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => setShowSuccessDialog(false)}
              className="h-11 px-4 text-xs font-bold uppercase sm:flex-1"
            >
              Add More Stock
            </Button>
            <Button
              onClick={() => setShowSuccessDialog(false)}
              className="h-11 px-5 text-xs font-bold uppercase shadow-md sm:flex-1"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
