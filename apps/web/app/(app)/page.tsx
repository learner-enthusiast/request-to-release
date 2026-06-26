import { api } from '~/trpc/server'

export default async function Home() {
    const { status } = await api.health.getHealth.query()
    return <main className=""></main>
}
