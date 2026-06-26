// app/(app)/(protected)/layout.tsx
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

const API_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:8000'

async function getSession() {
    const cookie = (await headers()).get('cookie') ?? ''

    const res = await fetch(`${API_URL}/api/auth/get-session`, {
        headers: { cookie },
        cache: 'no-store',
    })

    if (!res.ok) return null
    return res.json()
}

export default async function ProtectedLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await getSession()

    if (!session?.user) {
        redirect('/signIn')
    }

    return <>{children}</>
}
