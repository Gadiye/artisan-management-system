"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

// Lightweight local avatar components. These replace the Radix Avatar
// primitive to avoid the build-time module resolution issue.

type DivProps = React.HTMLAttributes<HTMLDivElement>
type ImgProps = React.ImgHTMLAttributes<HTMLImageElement>

function Avatar({ className, children, ...props }: DivProps) {
  return (
    <div
      data-slot="avatar"
      className={cn("relative flex h-8 w-8 shrink-0 overflow-hidden rounded-full", className)}
      {...props}
    >
      {children}
    </div>
  )
}

function AvatarImage({ className, alt, ...props }: ImgProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      data-slot="avatar-image"
      alt={alt}
      className={cn("object-cover h-full w-full", className)}
      {...props}
    />
  )
}

function AvatarFallback({ className, children, ...props }: DivProps) {
  return (
    <div
      data-slot="avatar-fallback"
      className={cn("bg-muted flex h-full w-full items-center justify-center rounded-full", className)}
      {...props}
    >
      {children}
    </div>
  )
}

export { Avatar, AvatarImage, AvatarFallback }
