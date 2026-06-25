'use client'

import Link from 'next/link'
import { useAuth } from '~/providers/auth'
import { Button } from '~/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Skeleton } from '~/components/ui/skeleton'

function getInitials(name?: string | null, email?: string | null) {
    if (name) {
        return name
            .split(' ')
            .map((part) => part[0])
            .join('')
            .slice(0, 2)
            .toUpperCase()
    }
    return email?.[0]?.toUpperCase() ?? '?'
}

export function Header() {
    const { user, isPending, isAuthenticated, signOut } = useAuth()

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
                <Link href="/" className="font-semibold tracking-tight">
                    Streamyst
                </Link>

                <div className="flex items-center gap-3">
                    {isPending ? (
                        <Skeleton className="h-8 w-24 rounded-full" />
                    ) : isAuthenticated && user ? (
                        <>
                            <div className="flex items-center gap-2">
                                <Avatar size="sm">
                                    {user.image ? (
                                        <AvatarImage
                                            src={user.image}
                                            alt={user.name ?? 'User'}
                                        />
                                    ) : null}
                                    <AvatarFallback>
                                        {getInitials(user.name, user.email)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="hidden flex-col sm:flex">
                                    <span className="text-sm font-medium leading-none">
                                        {user.name}
                                    </span>
                                    <span className="text-muted-foreground text-xs">
                                        {user.email}
                                    </span>
                                </div>
                            </div>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    signOut({ redirectTo: '/signIn' })
                                }
                            >
                                Sign out
                            </Button>
                        </>
                    ) : (
                        <Button variant="outline" size="sm">
                            <Link href="/signIn">Sign in</Link>
                        </Button>
                    )}
                </div>
            </div>
        </header>
    )
}
