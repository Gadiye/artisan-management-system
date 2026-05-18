"use client"

import { useApi } from "@/hooks/useApi"
import type { Artisan } from "@/lib/api/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AlertCircle, Star, DollarSign, Briefcase, Calendar, Phone, Award, Clock, TrendingUp } from "lucide-react"

import React from "react"

interface ArtisanDetailPageProps {
  params: Promise<{
    id: string
  }>
}

function StatCard({
  icon: Icon,
  title,
  value,
  subtitle,
  variant = "default",
}: {
  icon: React.ElementType
  title: string
  value: string | number
  subtitle?: string
  variant?: "default" | "primary" | "secondary"
}) {
  const getVariantStyles = () => {
    switch (variant) {
      case "primary":
        return "border-primary/20 bg-primary/5"
      case "secondary":
        return "border-secondary/20 bg-secondary/5"
      default:
        return "border-border bg-card"
    }
  }

  return (
    <Card className={`${getVariantStyles()} transition-all hover:shadow-md`}>
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div
            className={`p-3 rounded-full ${
              variant === "primary"
                ? "bg-primary text-primary-foreground"
                : variant === "secondary"
                  ? "bg-secondary text-secondary-foreground"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-card-foreground">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function ArtisanDetailPage({ params }: ArtisanDetailPageProps) {
  const unwrappedParams = React.use(params)
  const artisanId = unwrappedParams.id

  const { data: artisan, loading, error } = useApi<Artisan>(`/artisans/${artisanId}/`)

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-8 max-w-6xl">
          <div className="space-y-8">
            <div className="flex items-center gap-6">
              <Skeleton className="h-24 w-24 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-16 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-32 w-full" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-32 w-full" />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="container mx-auto p-8 max-w-md">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Loading Artisan</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  if (!artisan) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="container mx-auto p-8 max-w-md">
          <Alert variant="default">
            <AlertTitle>Artisan Not Found</AlertTitle>
            <AlertDescription>The artisan with ID {artisanId} could not be found.</AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  const rating = artisan.average_rating || 0
  const fullStars = Math.floor(rating)
  const hasHalfStar = rating % 1 >= 0.5

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-to-br from-primary/5 to-secondary/5 border-b border-border">
        <div className="container mx-auto p-8 max-w-6xl">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
            <Avatar className="h-32 w-32 border-4 border-primary/20 shadow-lg">
              <AvatarImage
                src={`/professional-artisan-.png?height=128&width=128&query=professional+artisan+${artisan.name}`}
                alt={artisan.name}
              />
              <AvatarFallback className="text-3xl font-bold bg-primary text-primary-foreground">
                {artisan.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-4">
              <div>
                <h1 className="text-5xl font-bold text-foreground text-balance leading-tight">{artisan.name}</h1>
                <div className="flex items-center gap-6 mt-3">
                  <div className="flex items-center gap-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-5 w-5 ${
                          i < fullStars
                            ? "fill-primary text-primary"
                            : i === fullStars && hasHalfStar
                              ? "fill-primary/50 text-primary"
                              : "text-muted-foreground"
                        }`}
                      />
                    ))}
                    <span className="text-base font-medium text-card-foreground ml-1">{rating.toFixed(1)} rating</span>
                  </div>
                  <Badge
                    variant={artisan.is_active ? "default" : "secondary"}
                    className="bg-primary text-primary-foreground px-3 py-1"
                  >
                    {artisan.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-6 text-base text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Phone className="h-5 w-5 text-primary" />
                  <span className="font-medium">{artisan.phone || "N/A"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <span className="font-medium">
                    Member since {new Date(artisan.created_date).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto p-8 max-w-6xl space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            icon={Briefcase}
            title="Total Jobs"
            value={artisan.total_jobs || 0}
            subtitle="Completed projects"
            variant="primary"
          />
          <StatCard
            icon={Star}
            title="Average Rating"
            value={`${(artisan.average_rating || 0).toFixed(1)}/5`}
            subtitle="Customer satisfaction"
            variant="secondary"
          />
          <StatCard
            icon={DollarSign}
            title="Total Earnings"
            value={`Ksh ${(artisan.total_earnings || 0).toLocaleString()}`}
            subtitle="Lifetime revenue"
          />
          <StatCard
            icon={TrendingUp}
            title="Pending Payment"
            value={`Ksh ${(artisan.pending_payment || 0).toLocaleString()}`}
            subtitle="Awaiting payment"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Award className="h-6 w-6 text-primary" />
                </div>
                Specialties & Skills
              </CardTitle>
              <CardDescription className="text-base">Areas of expertise and craftsmanship</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {artisan.specialties && artisan.specialties.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {artisan.specialties.map((specialty, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="border-primary/30 text-primary bg-primary/5 px-3 py-1 text-sm font-medium"
                    >
                      {specialty}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-base">No specialties listed</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 rounded-lg bg-secondary/10">
                  <Clock className="h-6 w-6 text-secondary" />
                </div>
                Recent Activity
              </CardTitle>
              <CardDescription className="text-base">Latest work and account information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-base font-medium text-foreground">Last Job Date</span>
                  <span className="text-base text-card-foreground font-medium">
                    {artisan.last_job_date ? new Date(artisan.last_job_date).toLocaleDateString() : "No recent jobs"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-base font-medium text-foreground">Account Status</span>
                  <Badge
                    variant={artisan.is_active ? "default" : "secondary"}
                    className="bg-primary text-primary-foreground px-3 py-1"
                  >
                    {artisan.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-base font-medium text-foreground">Artisan ID</span>
                  <span className="text-base text-card-foreground font-mono bg-muted px-2 py-1 rounded">
                    #{artisan.id}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}