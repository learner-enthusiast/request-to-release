'use client'

import { Suspense } from 'react'
import { GithubAppConnection } from '~/components/app/GithubAppConnection'
import { Skeleton } from '~/components/ui/skeleton'

export default function GithubAppPage() {
    return (
        <div className="flex flex-1 flex-col py-10">
            <Suspense fallback={<Skeleton className="h-64 w-full max-w-lg" />}>
                <GithubAppConnection />
            </Suspense>
        </div>
    )
}
