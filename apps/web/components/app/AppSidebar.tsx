'use client'

import Link from 'next/link'
import {
    Github,
    LayoutDashboard,
    GitPullRequest,
    Settings,
    type LucideIcon,
} from 'lucide-react'
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '~/components/ui/sidebar'

const navItems: {
    href: string
    label: string
    icon: LucideIcon
}[] = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/githubapp', label: 'GitHub App', icon: Github },
    { href: '/pullrequests', label: 'Pull requests', icon: GitPullRequest },
    { href: '/settings', label: 'Settings', icon: Settings },
]

export function AppSidebar() {
    return (
        <div className="[&_[data-slot=sidebar-gap]]:!w-0 bg-background">
            <Sidebar
                collapsible="offcanvas"
                className="top-28 z-40 h-[calc(100svh-7rem)] [&_[data-slot=sidebar-inner]]:bg-background [&_[data-mobile=true]]:bg-background"
            >
                <SidebarHeader>
                    <SidebarGroupLabel>Navigation</SidebarGroupLabel>
                </SidebarHeader>
                <SidebarContent>
                    <SidebarGroup>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {navItems.map(({ href, label, icon: Icon }) => (
                                    <SidebarMenuItem key={href}>
                                        <SidebarMenuButton
                                            render={<Link href={href} />}
                                        >
                                            <Icon />
                                            {label}
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                </SidebarContent>
            </Sidebar>
        </div>
    )
}
