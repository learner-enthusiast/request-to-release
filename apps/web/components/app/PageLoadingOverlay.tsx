'use client'

import { Loader2 } from 'lucide-react'

import { Skeleton } from '~/components/ui/skeleton'
import { cn } from '~/lib/utils'

type PageLoadingOverlayProps = {
    show?: boolean
    label?: string
    className?: string
}

export function PageLoadingOverlay({
    show = true,
    label = 'Loading…',
    className,
}: PageLoadingOverlayProps) {
    if (!show) return null

    return (
        <div
            role="status"
            aria-live="polite"
            aria-busy="true"
            className={cn(
                'fixed inset-0 z-[100] flex items-center justify-center',
                'bg-background/80 backdrop-blur-sm',
                className
            )}
        >
            {/* skeleton page shape behind spinner */}
            <div className="pointer-events-none absolute inset-0 px-8 py-28">
                <div className="mx-auto flex h-full max-w-6xl flex-col gap-6">
                    <Skeleton className="h-10 w-64" />
                    <Skeleton className="h-6 w-96" />
                    <div className="grid flex-1 gap-4 md:grid-cols-2">
                        <Skeleton className="h-40" />
                        <Skeleton className="h-40" />
                        <Skeleton className="h-40 md:col-span-2" />
                    </div>
                </div>
            </div>

            <div className="relative flex flex-col items-center gap-3">
                <Loader2 className="size-10 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">{label}</p>
            </div>
        </div>
    )
}
