'use client'

import { format, formatDistanceToNow } from 'date-fns'
import { Github, Loader2, RefreshCw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '~/components/ui/card'
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationNext,
    PaginationPrevious,
} from '~/components/ui/pagination'
import { Skeleton } from '~/components/ui/skeleton'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '~/components/ui/table'
import {
    useGithub,
    useGithubInstallationRepos,
    useRepoSyncStatuses,
    useSyncRepoCodebase,
} from '~/hooks/use-github'

function syncStatusBadge(status?: string) {
    switch (status) {
        case 'synced':
            return <Badge variant="secondary">Synced</Badge>
        case 'syncing':
            return <Badge variant="outline">Syncing…</Badge>
        case 'pending':
            return <Badge variant="outline">Pending</Badge>
        case 'failed':
            return <Badge variant="destructive">Failed</Badge>
        default:
            return <Badge variant="ghost">Not synced</Badge>
    }
}

export function RepositoriesTable() {
    const [page, setPage] = useState(1)
    const { isConnected, installHref } = useGithub()
    const reposQuery = useGithubInstallationRepos(page)
    const syncMutation = useSyncRepoCodebase()

    const repos = reposQuery.data?.repos ?? []
    const repoFullNames = useMemo(() => repos.map((r) => r.fullName), [repos])

    const syncStatusesQuery = useRepoSyncStatuses(repoFullNames)

    const totalCount = reposQuery.data?.totalCount ?? 0
    const hasMore = reposQuery.data?.hasMore ?? false
    const totalPages = Math.max(1, Math.ceil(totalCount / 100))

    function handleSync(fullName: string, defaultBranch: string) {
        syncMutation.mutate(
            { repoFullName: fullName, branch: defaultBranch },
            {
                onSuccess: () => toast.success(`Sync started for ${fullName}`),
                onError: (err) => toast.error(err.message ?? 'Sync failed'),
            }
        )
    }

    if (!isConnected) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Github className="size-5" />
                        Repositories
                    </CardTitle>
                    <CardDescription>
                        Connect the GitHub App to list and sync repositories.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild disabled={!installHref}>
                        <a href={installHref ?? '#'}>Connect GitHub App</a>
                    </Button>
                </CardContent>
            </Card>
        )
    }

    if (reposQuery.isLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-4 w-64" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-64 w-full" />
                </CardContent>
            </Card>
        )
    }

    if (reposQuery.isError) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Repositories</CardTitle>
                    <CardDescription>
                        Could not load repositories.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button
                        variant="outline"
                        onClick={() => reposQuery.refetch()}
                    >
                        Retry
                    </Button>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Repositories</CardTitle>
                <CardDescription>
                    {totalCount} repo{totalCount === 1 ? '' : 's'} accessible to
                    your installation
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Repository</TableHead>
                                <TableHead>Branch</TableHead>
                                <TableHead>Language</TableHead>
                                <TableHead>Sync</TableHead>
                                <TableHead>Last synced</TableHead>
                                <TableHead className="text-right">
                                    Action
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {repos.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={6}
                                        className="text-center text-muted-foreground"
                                    >
                                        No repositories found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                repos.map((repo) => {
                                    const syncInfo =
                                        syncStatusesQuery.data?.[repo.fullName]
                                    const isSyncing =
                                        syncInfo?.status === 'pending' ||
                                        syncInfo?.status === 'syncing' ||
                                        (syncMutation.isPending &&
                                            syncMutation.variables
                                                ?.repoFullName ===
                                                repo.fullName)

                                    return (
                                        <TableRow key={repo.id}>
                                            <TableCell>
                                                <div className="font-medium">
                                                    {repo.fullName}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {repo.visibility}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {repo.defaultBranch}
                                            </TableCell>
                                            <TableCell>
                                                {repo.language ?? '—'}
                                            </TableCell>
                                            <TableCell>
                                                {syncStatusBadge(
                                                    syncInfo?.status
                                                )}
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {syncInfo?.syncedAt ? (
                                                    <>
                                                        {format(
                                                            new Date(
                                                                syncInfo.syncedAt
                                                            ),
                                                            'PPp'
                                                        )}
                                                        <span className="block text-xs">
                                                            {formatDistanceToNow(
                                                                new Date(
                                                                    syncInfo.syncedAt
                                                                ),
                                                                {
                                                                    addSuffix: true,
                                                                }
                                                            )}
                                                        </span>
                                                    </>
                                                ) : (
                                                    '—'
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    disabled={isSyncing}
                                                    onClick={() =>
                                                        handleSync(
                                                            repo.fullName,
                                                            repo.defaultBranch
                                                        )
                                                    }
                                                >
                                                    {isSyncing ? (
                                                        <Loader2 className="size-4 animate-spin" />
                                                    ) : (
                                                        <RefreshCw className="size-4" />
                                                    )}
                                                    Sync
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>

                <Pagination>
                    <PaginationContent>
                        <PaginationItem>
                            <PaginationPrevious
                                href="#"
                                onClick={(e) => {
                                    e.preventDefault()
                                    setPage((p) => Math.max(1, p - 1))
                                }}
                                aria-disabled={page <= 1}
                                className={
                                    page <= 1
                                        ? 'pointer-events-none opacity-50'
                                        : ''
                                }
                            />
                        </PaginationItem>

                        <PaginationItem>
                            <span className="px-3 text-sm text-muted-foreground">
                                Page {page} of {totalPages}
                            </span>
                        </PaginationItem>

                        <PaginationItem>
                            <PaginationNext
                                href="#"
                                onClick={(e) => {
                                    e.preventDefault()
                                    if (hasMore) setPage((p) => p + 1)
                                }}
                                aria-disabled={!hasMore}
                                className={
                                    !hasMore
                                        ? 'pointer-events-none opacity-50'
                                        : ''
                                }
                            />
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>
            </CardContent>
        </Card>
    )
}
