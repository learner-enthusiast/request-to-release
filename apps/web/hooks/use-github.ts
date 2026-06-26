'use client'

import { useAuth } from '~/providers/auth'
import { trpc } from '~/trpc/client'

function useGithubQueryEnabled() {
    const { isAuthenticated, isPending } = useAuth()
    return isAuthenticated && !isPending
}

/** Connected / disconnected GitHub App status for the current user */
export function useGithubInstallationStatus() {
    const enabled = useGithubQueryEnabled()

    return trpc.github.getInstallationStatus.useQuery(undefined, {
        enabled,
    })
}

/** GitHub App install URL (includes `state=userId`) */
export function useGithubInstallUrl() {
    const enabled = useGithubQueryEnabled()

    return trpc.github.getInstallUrl.useQuery(undefined, {
        enabled,
    })
}

/** Numeric GitHub installation id for the current user, if linked */
export function useGithubInstallationId() {
    const enabled = useGithubQueryEnabled()

    return trpc.github.getUserInstallationId.useQuery(undefined, {
        enabled,
    })
}

/** Lookup user id by GitHub installation id (usually webhook/server-side) */
export function useGithubUserIdByInstallationId(installationId: number | null) {
    const enabled = useGithubQueryEnabled() && installationId != null

    return trpc.github.getUserIdByInstallationId.useQuery(
        { installationId: installationId! },
        { enabled }
    )
}

/** Persist installation after GitHub redirect / webhook */
export function useSaveGithubInstallation() {
    const utils = trpc.useUtils()

    return trpc.github.saveInstallation.useMutation({
        onSuccess: async () => {
            await Promise.all([
                utils.github.getInstallationStatus.invalidate(),
                utils.github.getUserInstallationId.invalidate(),
            ])
        },
    })
}
export function useSyncRepoCodebase() {
    return trpc.github.syncRepoCodebase.useMutation()
}
/** Remove linked GitHub App installation for current user */
export function useDisconnectGithub() {
    const utils = trpc.useUtils()

    return trpc.github.disconnect.useMutation({
        onSuccess: async () => {
            await Promise.all([
                utils.github.getInstallationStatus.invalidate(),
                utils.github.getUserInstallationId.invalidate(),
            ])
        },
    })
}
/** One page of repos for the user's GitHub App installation */
export function useGithubInstallationRepos(page = 1) {
    const enabled = useGithubQueryEnabled()

    return trpc.github.getInstallationRepos.useQuery({ page }, { enabled })
}
export function useRepoSyncStatuses(repoFullNames: string[]) {
    const enabled = useGithubQueryEnabled() && repoFullNames.length > 0
    return trpc.github.getRepoSyncStatuses.useQuery(
        { repoFullNames },
        { enabled }
    )
}
/** Infinite scroll — call `fetchNextPage()` while `hasNextPage` is true */

/** Convenience bundle for dashboard / settings UI */
export function useGithub() {
    const status = useGithubInstallationStatus()
    const installUrl = useGithubInstallUrl()
    const installationId = useGithubInstallationId()
    const saveInstallation = useSaveGithubInstallation()
    const disconnect = useDisconnectGithub()
    const syncRepoCodebase = useSyncRepoCodebase()
    const installationRepos = useGithubInstallationRepos()

    return {
        status,
        installUrl,
        installationId,
        saveInstallation,
        syncRepoCodebase,
        disconnect,
        isConnected: status.data?.connected === true,
        accountLogin: status.data?.connected ? status.data.accountLogin : null,
        installHref: installUrl.data?.url,
        installationRepos,
    }
}
