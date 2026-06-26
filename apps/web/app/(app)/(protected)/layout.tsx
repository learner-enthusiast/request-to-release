import { ProtectedGate } from '~/components/app/ProtectedGate'
import type { ReactNode } from 'react'
export default function ProtectedLayout({ children }: { children: ReactNode }) {
    return <ProtectedGate>{children}</ProtectedGate>
}
