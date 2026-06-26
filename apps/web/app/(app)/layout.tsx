'use client'

import { useState } from 'react'
import { AppSidebar } from '~/components/app/AppSidebar'
import { Footer } from '~/components/app/Footer'
import { Header } from '~/components/app/Header'
import { SidebarProvider, useSidebar } from '~/components/ui/sidebar'
import { useAuth } from '~/providers/auth'

function AppShell({ children }: { children: React.ReactNode }) {
    const { isAuthenticated } = useAuth()
    const { toggleSidebar, open, openMobile, isMobile } = useSidebar()
    const sidebarOpen = isMobile ? openMobile : open

    return (
        <div className="flex min-h-svh flex-col w-full">
            {/* Full-width header — does not move */}
            <Header onMenuClick={toggleSidebar} />

            <div className="relative flex flex-1 flex-col">
                {isAuthenticated && <AppSidebar />}

                {/* Backdrop like GitHub */}
                {isAuthenticated && sidebarOpen && (
                    <button
                        type="button"
                        aria-label="Close menu"
                        className="fixed inset-0 top-28 z-30 bg-black/40"
                        onClick={toggleSidebar}
                    />
                )}

                <main className="relative z-0 flex flex-1 flex-col px-8 max-w-6xl mx-auto">
                    {children}
                </main>
                <div className="max-w-6xl mx-auto">
                    <Footer />
                </div>
            </div>
        </div>
    )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const [isMenuOpen, setIsMenuOpen] = useState(false)

    return (
        <SidebarProvider
            defaultOpen={false}
            open={isMenuOpen}
            onOpenChange={setIsMenuOpen}
        >
            <AppShell>{children}</AppShell>
        </SidebarProvider>
    )
}
