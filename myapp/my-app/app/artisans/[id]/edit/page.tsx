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
import { User, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function EditArtisanPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    const [artisan, setArtisan] = useState<Artisan | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (id) {
            const fetchArtisan = async () => {
                setLoading(true);
                try {
                    const data = await api.artisans.get(parseInt(id));
                    setArtisan(data);
                } catch (err) {
                    setError("Failed to fetch artisan data.");
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

        try {
            await api.artisans.update(parseInt(id), artisan);
            alert("Artisan updated successfully!");
            router.push("/artisans");
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            setError(errorMessage);
            alert(`Failed to update artisan: ${errorMessage}`);
        } finally {
            setUpdating(false);
        }
    };

    if (loading) {
        return (
            <div className="container mx-auto p-6">
                <Skeleton className="h-10 w-64 mb-8" />
                <Card className="max-w-2xl mx-auto">
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
                        <div className="flex justify-end gap-2 pt-4">
                            <Skeleton className="h-10 w-24" />
                            <Skeleton className="h-10 w-32" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error) {
        return <div className="container mx-auto p-6 text-red-500">{error}</div>;
    }

    if (!artisan) {
        return <div className="container mx-auto p-6">Artisan not found.</div>;
    }

    return (
        <div className="container mx-auto p-6">
            <div className="mb-8">
                <h1 className="text-3xl font-bold">Edit Artisan</h1>
                <p className="text-muted-foreground mt-2">Update the details for {artisan.name}.</p>
            </div>

            <Card className="max-w-2xl mx-auto">
                <CardHeader>
                    <CardTitle>Artisan Information</CardTitle>
                    <CardDescription>Update the form below with the new artisan details.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="name">Name *</Label>
                        <Input
                            id="name"
                            value={artisan.name}
                            onChange={(e) => setArtisan({ ...artisan, name: e.target.value })}
                            placeholder="e.g., Jane Artisan"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                            id="phone"
                            value={artisan.phone || ""}
                            onChange={(e) => setArtisan({ ...artisan, phone: e.target.value })}
                            placeholder="e.g., +1 415-555-2671"
                        />
                    </div>

                    <div className="flex items-center space-x-2 pt-2">
                        <Switch
                            id="is_active"
                            checked={artisan.is_active}
                            onCheckedChange={(checked) => setArtisan({ ...artisan, is_active: checked })}
                        />
                        <Label htmlFor="is_active">Active Status</Label>
                    </div>

                    {error && (
                        <div className="text-red-500 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={() => router.back()}>
                            Cancel
                        </Button>
                        <Button onClick={handleSubmit} disabled={updating || !artisan.name}>
                            {updating ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <User className="mr-2 h-4 w-4" />
                            )}
                            {updating ? "Saving..." : "Save Changes"}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
