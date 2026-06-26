import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import { GlobalProviders } from '~/providers/global'
import { Montserrat, Playfair_Display } from 'next/font/google'
import { cn } from '~/lib/utils'
import { TooltipProvider } from '~/components/ui/tooltip'

const playfairDisplayHeading = Playfair_Display({
    subsets: ['latin'],
    variable: '--font-heading',
})

const montserrat = Montserrat({ subsets: ['latin'], variable: '--font-sans' })

const geistSans = localFont({
    src: './fonts/GeistVF.woff',
    variable: '--font-geist-sans',
})
const geistMono = localFont({
    src: './fonts/GeistMonoVF.woff',
    variable: '--font-geist-mono',
})

export const metadata: Metadata = {
    title: 'Streamyst',
    description: 'Media Forwarding',
}

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html
            lang="en"
            className={cn(
                'dark',
                'font-sans',
                montserrat.variable,
                playfairDisplayHeading.variable
            )}
            suppressHydrationWarning
        >
            <body className={`${geistSans.variable} ${geistMono.variable}`}>
                <GlobalProviders>
                    <TooltipProvider>{children}</TooltipProvider>
                </GlobalProviders>
            </body>
        </html>
    )
}
