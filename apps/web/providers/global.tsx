'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { useState, type ReactNode } from 'react'
import { toast } from 'sonner'

import { Toaster } from '~/components/ui/sonner'
import { normalizeTRPCError } from '~/lib/error'
import { trpc } from '~/trpc/client'
import { createTRPCHttpBatchClientClient } from '~/trpc/create-client'
import { AuthProvider } from './auth'

function makeQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                refetchOnMount: true,
                staleTime: Infinity,
                retry: (failureCount, error) => {
                    const { code } = normalizeTRPCError(error)
                    if (code === 'UNAUTHORIZED' || code === 'FORBIDDEN')
                        return false
                    return failureCount < 2
                },
            },
            mutations: {
                onError: (error) => {
                    const { message } = normalizeTRPCError(error)
                    toast.error(message)
                },
            },
        },
    })
}

export function GlobalProviders({ children }: { children: ReactNode }) {
    const [queryClient] = useState(makeQueryClient)
    const [trpcClient] = useState(() =>
        trpc.createClient({
            links: [createTRPCHttpBatchClientClient()],
        })
    )

    return (
        <QueryClientProvider client={queryClient}>
            <NextThemesProvider
                attribute="class"
                defaultTheme="light"
                enableSystem
                disableTransitionOnChange
            >
                <trpc.Provider client={trpcClient} queryClient={queryClient}>
                    <AuthProvider>
                        {children}

                        <Toaster />
                    </AuthProvider>
                </trpc.Provider>
            </NextThemesProvider>
        </QueryClientProvider>
    )
}
