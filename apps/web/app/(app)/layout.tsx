'use client'
import { useState } from 'react'
import { Footer } from '~/components/app/Footer'
import { Header } from '~/components/app/Header'
import { PageLoadingOverlay } from '~/components/app/PageLoadingOverlay'
import { SidebarProvider } from '~/components/ui/sidebar'
import { useAuth } from '~/providers/auth'

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { isPending } = useAuth()
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    return (
        <div className="flex flex-col min-h-screen">
            <PageLoadingOverlay show={isPending} label="Checking session…" />
            <SidebarProvider>
                <div className="flex flex-col flex-1">
                    <Header onMenuClick={() => setIsMenuOpen(!isMenuOpen)} />
                    <main className="flex flex-1 flex-col max-w-6xl mx-auto">
                        {children}
                    </main>
                    <div className="max-w-6xl mx-auto">
                        <Footer />
                    </div>
                </div>
            </SidebarProvider>
        </div>
    )
}
