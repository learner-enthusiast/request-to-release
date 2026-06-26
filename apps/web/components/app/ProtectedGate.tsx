'use client'
import type { ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { PageLoadingOverlay } from '~/components/app/PageLoadingOverlay'
import { useAuth } from '~/providers/auth'

export function ProtectedGate({ children }: { children: ReactNode }) {
    const router = useRouter()
    const pathname = usePathname()
    const { isAuthenticated, isPending } = useAuth()

    useEffect(() => {
        if (isPending) return
        if (!isAuthenticated) {
            const callbackUrl = encodeURIComponent(pathname)
            router.replace(`/signIn?callbackUrl=${callbackUrl}`)
        }
    }, [isAuthenticated, isPending, pathname, router])

    if (isPending) {
        return <PageLoadingOverlay show label="Checking session…" />
    }

    if (!isAuthenticated) {
        return null
    }

    return <>{children}</>
}
