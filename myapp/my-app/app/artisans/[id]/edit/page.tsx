"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useRouter, useParams } from "next/navigation";
import { api } from '@/lib/api';
import { Artisan } from "@/types";
import { User, Loader2, ArrowLeft, Save, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function EditArtisanPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    const [artisan, setArtisan] = useState<Artisan | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formSuccess, setFormSuccess] = useState<string | null>(null);

    useEffect(() => {
        if (id) {
            const fetchArtisan = async () => {
                setLoading(true);
                try {
                    const data = await api.artisans.get(parseInt(id));
                    setArtisan(data);
                } catch (err) {
                    setError("Failed to fetch artisan profile data.");
                } finally {
                    setLoading(false);
                }
            };
            fetchArtisan();
        }
    }, [id]);

    const handleSubmit = async () => {
        if (!artisan || !artisan.name) {
            setError("Artisan name is required.");
            return;
        }

        setUpdating(true);
        setError(null);
        setFormSuccess(null);

        try {
            await api.artisans.update(parseInt(id), artisan);
            setFormSuccess("Artisan profile updated successfully!");
            setTimeout(() => {
                router.push("/artisans");
            }, 1200);
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            setError(errorMessage);
        } finally {
            setUpdating(false);
        }
    };

    if (loading) {
        return (
            <div className="container mx-auto p-6 space-y-8 max-w-2xl">
                <div className="space-y-2">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-10 w-64" />
                </div>
                <Card className="border-gray-200">
                    <CardHeader>
                        <Skeleton className="h-6 w-48 mb-2" />
                        <Skeleton className="h-4 w-64" />
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="space-y-2">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-10 w-full" />
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error && !artisan) {
        return (
            <div className="container mx-auto p-6 max-w-2xl">
                <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-950">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertTitle>Profile Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
                <Button onClick={() => router.back()} className="mt-4">Go Back</Button>
            </div>
        );
    }

    if (!artisan) {
        return <div className="container mx-auto p-6 text-center font-bold text-muted-foreground">Artisan profile not found.</div>;
    }

    return (
        <div className="container mx-auto p-6 max-w-2xl space-y-8 animate-in fade-in duration-300">
            {/* Header */}
            <div className="space-y-2">
                <Button variant="ghost" size="sm" onClick={() => router.back()} className="hover:bg-gray-100 transition-colors -ml-3 mb-1">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Directory
                </Button>
                <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Edit Artisan</h1>
                <p className="text-sm font-semibold text-muted-foreground">Update profile details and active workload status for {artisan.name}</p>
            </div>

            {error && (
                <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-950">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertTitle>Update Failure</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {formSuccess && (
                <Alert className="border-emerald-200 bg-emerald-50 text-emerald-950">
                    <AlertCircle className="h-4 w-4 text-emerald-600" />
                    <AlertTitle>Success</AlertTitle>
                    <AlertDescription>{formSuccess}</AlertDescription>
                </Alert>
            )}

            <Card className="border-gray-200 shadow-sm overflow-hidden">
                <CardHeader className="bg-gray-50/50 border-b pb-4">
                    <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <User className="h-5 w-5 text-blue-600" />
                        Artisan Information
                    </CardTitle>
                    <CardDescription className="text-xs font-semibold">Modify core registry credentials and active flags</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="name" className="text-xs font-bold uppercase text-gray-500 tracking-wider">Full Name *</Label>
                        <Input
                            id="name"
                            value={artisan.name}
                            onChange={(e) => setArtisan({ ...artisan, name: e.target.value })}
                            placeholder="e.g. John Mwangi"
                            className="h-11 border-gray-300 font-medium text-sm"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="phone" className="text-xs font-bold uppercase text-gray-500 tracking-wider">Phone Contact</Label>
                        <Input
                            id="phone"
                            value={artisan.phone || ""}
                            onChange={(e) => setArtisan({ ...artisan, phone: e.target.value })}
                            placeholder="e.g. +254 712 345 678"
                            className="h-11 border-gray-300 font-medium text-sm"
                        />
                    </div>

                    <div className="flex items-center space-x-3 pt-3 border-t">
                        <Switch
                            id="is_active"
                            checked={artisan.is_active}
                            onCheckedChange={(checked) => setArtisan({ ...artisan, is_active: checked })}
                        />
                        <div>
                            <Label htmlFor="is_active" className="text-sm font-extrabold text-gray-900 cursor-pointer">Active Work Roster</Label>
                            <p className="text-[11px] text-muted-foreground font-semibold">Toggling off prevents assigning new jobs</p>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t mt-8">
                        <Button variant="outline" onClick={() => router.back()} className="h-11 px-4 text-xs font-bold uppercase">
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleSubmit} 
                            disabled={updating || !artisan.name}
                            className="h-11 px-5 text-xs font-bold uppercase bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/10"
                        >
                            {updating ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="mr-2 h-4 w-4 stroke-[2.5]" />
                            )}
                            {updating ? "Saving Changes..." : "Save Changes"}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
