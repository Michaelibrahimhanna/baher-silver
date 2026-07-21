import * as React from "react"
import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-none bg-muted/60 relative overflow-hidden",
        className
      )}
      {...props}
    >
      {/* Subtle luxury shimmer effect over the pulse */}
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent animate-[shimmer_2s_infinite_ease-in-out]" />
    </div>
  )
}

export { Skeleton }
