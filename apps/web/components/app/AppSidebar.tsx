'use client'

import Link from 'next/link'
import { Home, GitBranch } from 'lucide-react'
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

export function AppSidebar() {
    return (
        <Sidebar collapsible="offcanvas">
            <SidebarHeader>
                <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton render={<Link href="/" />}>
                                    <Home />
                                    Home
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            {/* add more items */}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
        </Sidebar>
    )
}
