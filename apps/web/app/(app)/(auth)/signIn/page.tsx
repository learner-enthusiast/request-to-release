'use client'

import { useAuth } from '~/providers/auth'
import { Button } from '~/components/ui/button'
import { env } from 'process'

export default function SocialSignIn() {
    const { signInWithSocial, user } = useAuth()
    console.log(user)

    return (
        <div className="flex flex-col gap-2">
            <Button
                type="button"
                variant="outline"
                onClick={() =>
                    signInWithSocial({ provider: 'google', callbackURL: '/' })
                }
            >
                Continue with Google
            </Button>

            <Button
                type="button"
                variant="outline"
                onClick={() =>
                    signInWithSocial({
                        provider: 'github',
                        callbackURL: `http://localhost:3000/`,
                    })
                }
            >
                Continue with GitHub
            </Button>
        </div>
    )
}
