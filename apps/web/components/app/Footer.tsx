import Image from 'next/image'
import Link from 'next/link'

const footerLinks = [
    { label: 'Terms', href: '/terms' },
    { label: 'Privacy', href: '/privacy' },
    { label: 'Security', href: '/security' },
    { label: 'Contact', href: '/contact' },
    {
        label: 'Repository',
        href: 'https://github.com/your-org/request-to-releaseV2',
    },
    { label: 'About Founder', href: '/about-founder' },
] as const

export function Footer() {
    return (
        <footer className="bg-background-secondary">
            <div className="mx-auto flex max-w-full flex-col gap-8 px-8 py-10">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <Image
                            src="/Logo.svg"
                            alt="Request to Release logo"
                            width={40}
                            height={40}
                        />
                        <span className="font-josefin text-2xl uppercase leading-none sm:text-[28px]">
                            Request to Release
                        </span>
                    </Link>

                    <nav
                        aria-label="Footer"
                        className="flex flex-wrap gap-x-6 gap-y-2"
                    >
                        {footerLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                                {...(link.href.startsWith('http')
                                    ? {
                                          target: '_blank',
                                          rel: 'noopener noreferrer',
                                      }
                                    : {})}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </nav>
                </div>

                <p className="text-sm text-muted-foreground">
                    © 2026 Request to Release. All rights reserved.
                </p>
            </div>
        </footer>
    )
}
