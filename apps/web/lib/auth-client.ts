// lib/auth-client.ts
import { createAuthClient } from 'better-auth/react'
import { env } from '~/env'

export const authClient = createAuthClient({
    baseURL: env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:8000',
    fetchOptions: {
        credentials: 'include',
    },
})
export const { signIn, signUp, signOut, useSession } = authClient
export async function signUpWithEmail(input: {
    name: string
    email: string
    password: string
}) {
    return signUp.email(input)
}

export async function signInWithEmail(input: {
    email: string
    password: string
}) {
    return signIn.email(input)
}

export function useAuthSession() {
    return useSession()
}

export async function handleLogout() {
    const { error } = await signOut()
    if (error) {
        // handle error
        return error
    }
    // session cookie cleared — redirect if you want
    window.location.href = '/'
}

export type SocialProvider = 'google' | 'github'
export async function signInWithSocial(opts: {
    provider: SocialProvider
    callbackURL?: string
}) {
    return signIn.social({
        provider: opts.provider,
        callbackURL: opts.callbackURL ?? '/',
    })
}
