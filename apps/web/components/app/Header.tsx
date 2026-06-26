'use client'

import Link from 'next/link'
import { useAuth } from '~/providers/auth'
import { Button } from '~/components/ui/button'

import { Skeleton } from '~/components/ui/skeleton'
import Image from 'next/image'
import { ModeToggle } from './modeToggle'
import Avatar from './Avatar'

import { LogOut, Menu, Settings, User } from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { useRouter } from 'next/navigation'

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

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
    const { user, isPending, isAuthenticated, signOut } = useAuth()
    const router = useRouter()
    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background backdrop-blur supports-backdrop-filter:bg-background/60">
            <div className="mx-auto flex h-28 max-w-full items-center justify-between px-8">
                <span className="flex items-center gap-4">
                    {isAuthenticated && (
                        <Menu
                            onClick={onMenuClick}
                            className="cursor-pointer"
                        />
                    )}
                    <span className="flex items-center gap-2">
                        <Image
                            src="/Logo.svg"
                            alt="Logo"
                            width={50}
                            height={50}
                        />
                        <p className="font-josefin text-[35px] uppercase leading-none">
                            {isAuthenticated
                                ? user?.name
                                : ' Request to Release'}
                        </p>
                    </span>
                </span>

                <span className="flex items-center gap-4">
                    <ModeToggle />
                    {isAuthenticated && user && (
                        <DropdownMenu>
                            <DropdownMenuTrigger>
                                <Avatar
                                    src={user.image ?? ''}
                                    alt={user.name ?? ''}
                                    badgeColor="green"
                                />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" side="bottom">
                                <DropdownMenuGroup>
                                    <DropdownMenuLabel>
                                        {user.name}
                                    </DropdownMenuLabel>
                                    <DropdownMenuLabel className="font-normal text-muted-foreground">
                                        {user.email}
                                    </DropdownMenuLabel>
                                </DropdownMenuGroup>
                                <DropdownMenuSeparator />
                                <DropdownMenuGroup>
                                    <DropdownMenuItem>
                                        <User />
                                        Profile
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                        <Settings />
                                        Settings
                                    </DropdownMenuItem>
                                </DropdownMenuGroup>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    variant="destructive"
                                    onClick={() =>
                                        signOut({ redirectTo: '/signIn' })
                                    }
                                >
                                    <LogOut />
                                    Sign out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}

                    {!isAuthenticated && (
                        <Button
                            size="lg"
                            onClick={() => router.push('/signIn')}
                        >
                            Sign In
                        </Button>
                    )}
                </span>
            </div>
        </header>
    )
}
