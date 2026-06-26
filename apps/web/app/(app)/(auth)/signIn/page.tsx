'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { GithubIcon } from 'lucide-react'

import { Button } from '~/components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '~/components/ui/card'
import { useAuth } from '~/providers/auth'

export default function SignInPage() {
    const router = useRouter()
    const { signInWithSocial, isAuthenticated, isPending } = useAuth()

    useEffect(() => {
        if (!isPending && isAuthenticated) {
            router.replace('/')
        }
    }, [isAuthenticated, isPending, router])

    return (
        <div className="flex flex-1 items-center justify-center px-4 py-10">
            <Card className="w-full max-w-md">
                <CardHeader className="items-center text-center">
                    <span className="flex items-center justify-center">
                        <Image
                            src="/Logo.svg"
                            alt="Request to Release logo"
                            width={72}
                            height={72}
                            priority
                            className="mb-2"
                        />
                    </span>
                    <CardTitle className="font-josefin text-3xl uppercase tracking-tight">
                        Sign in
                    </CardTitle>
                    <CardDescription className="max-w-sm text-base leading-relaxed">
                        The all-in-one platform to manage feature requests and
                        ship releases with your team on GitHub.
                    </CardDescription>
                </CardHeader>

                <CardContent className="flex flex-col gap-3">
                    <Button
                        type="button"
                        size="lg"
                        variant="outline"
                        className="w-full"
                        disabled={isPending}
                        onClick={() =>
                            signInWithSocial({
                                provider: 'github',
                                callbackURL: 'http://localhost:3000',
                            })
                        }
                    >
                        <GithubIcon className="size-4" />
                        Continue with GitHub
                    </Button>

                    <p className="text-center text-xs text-muted-foreground">
                        By continuing, you agree to connect your GitHub account
                        to Request to Release.
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
