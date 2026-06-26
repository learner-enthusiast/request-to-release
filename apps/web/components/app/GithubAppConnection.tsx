'use client'

import { format } from 'date-fns'
import { CheckCircle2, Github, Loader2, Plug, Unplug } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'

import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '~/components/ui/card'
import { Skeleton } from '~/components/ui/skeleton'
import { useGithub } from '~/hooks/use-github'

export function GithubAppConnection() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const handledInstallRef = useRef(false)

    const {
        status,
        installUrl,
        installationId,
        saveInstallation,
        disconnect,
        isConnected,
        accountLogin,
        installHref,
    } = useGithub()

    // After GitHub redirects back with ?installation_id=...
    useEffect(() => {
        const rawId = searchParams.get('installation_id')
        if (!rawId || handledInstallRef.current) return

        const installationIdFromUrl = Number(rawId)
        if (
            !Number.isInteger(installationIdFromUrl) ||
            installationIdFromUrl <= 0
        ) {
            toast.error('Invalid installation id from GitHub')
            return
        }

        handledInstallRef.current = true

        saveInstallation.mutate(
            { installationId: installationIdFromUrl },
            {
                onSuccess: () => {
                    toast.success('GitHub App connected')
                    router.replace('/githubapp')
                },
                onError: (error) => {
                    handledInstallRef.current = false
                    toast.error(error.message ?? 'Failed to save installation')
                },
            }
        )
    }, [searchParams, saveInstallation, router])

    const isLoading =
        status.isLoading ||
        installUrl.isLoading ||
        installationId.isLoading ||
        saveInstallation.isPending

    const isSavingFromRedirect = saveInstallation.isPending

    if (isLoading && !status.data) {
        return (
            <Card className="w-full max-w-lg">
                <CardHeader>
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-full" />
                </CardHeader>
                <CardContent className="space-y-3">
                    <Skeleton className="h-10 w-full" />
                </CardContent>
            </Card>
        )
    }

    if (status.isError) {
        return (
            <Card className="w-full max-w-lg border-destructive/50">
                <CardHeader>
                    <CardTitle>GitHub App</CardTitle>
                    <CardDescription>
                        Could not load connection status.
                    </CardDescription>
                </CardHeader>
                <CardFooter>
                    <Button variant="outline" onClick={() => status.refetch()}>
                        Retry
                    </Button>
                </CardFooter>
            </Card>
        )
    }

    if (isConnected && status.data?.connected) {
        return (
            <Card className="w-full max-w-lg">
                <CardHeader>
                    <div className="flex items-center justify-between gap-3">
                        <CardTitle className="flex items-center gap-2">
                            <Github className="size-5" />
                            GitHub App
                        </CardTitle>
                        <Badge variant="secondary" className="gap-1">
                            <CheckCircle2 className="size-3.5" />
                            Connected
                        </Badge>
                    </div>
                    <CardDescription>
                        Your GitHub App installation is linked to this account.
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                    <dl className="grid gap-3 text-sm">
                        <div className="flex justify-between gap-4">
                            <dt className="text-muted-foreground">Account</dt>
                            <dd className="font-medium">
                                {accountLogin ??
                                    status.data.accountLogin ??
                                    '—'}
                            </dd>
                        </div>
                        <div className="flex justify-between gap-4">
                            <dt className="text-muted-foreground">
                                Installation ID
                            </dt>
                            <dd className="font-mono">
                                {installationId.data?.installationId ?? '—'}
                            </dd>
                        </div>
                        <div className="flex justify-between gap-4">
                            <dt className="text-muted-foreground">
                                Connected on
                            </dt>
                            <dd>
                                {format(
                                    new Date(status.data.installedAt),
                                    'PPP'
                                )}
                            </dd>
                        </div>
                    </dl>
                </CardContent>

                <CardFooter>
                    <Button
                        variant="destructive"
                        disabled={disconnect.isPending}
                        onClick={() =>
                            disconnect.mutate(undefined, {
                                onSuccess: () =>
                                    toast.success('GitHub App disconnected'),
                                onError: (error) =>
                                    toast.error(
                                        error.message ?? 'Failed to disconnect'
                                    ),
                            })
                        }
                    >
                        {disconnect.isPending ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : (
                            <Unplug className="size-4" />
                        )}
                        Disconnect
                    </Button>
                </CardFooter>
            </Card>
        )
    }

    return (
        <Card className="w-full max-w-lg">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Github className="size-5" />
                    Connect GitHub App
                </CardTitle>
                <CardDescription>
                    Install the Request to Release GitHub App on your org or
                    account to sync repositories and pull requests.
                </CardDescription>
            </CardHeader>

            <CardContent>
                {isSavingFromRedirect ? (
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" />
                        Finishing installation…
                    </p>
                ) : null}
            </CardContent>

            <CardFooter>
                {!saveInstallation.isPending && (
                    <Button
                        size="lg"
                        className="w-full"
                        disabled={!installHref || installUrl.isLoading}
                        onClick={() => {
                            if (installHref) {
                                window.location.href = installHref
                            }
                        }}
                    >
                        {installUrl.isLoading ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : (
                            <Plug className="size-4" />
                        )}
                        Install GitHub App
                    </Button>
                )}
            </CardFooter>
        </Card>
    )
}
