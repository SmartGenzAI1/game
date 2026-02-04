
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AnalyticsChart } from '@/components/analytics/chart'
import { redirect } from 'next/navigation'

export default async function AnalyticsPage() {
    const session = await auth()
    if (!session?.user?.email) return redirect('/login')

    const user = await prisma.user.findUnique({
        where: { email: session.user.email }
    })

    if (!user) return redirect('/login')

    const links = await prisma.link.findMany({
        where: { userId: user.id },
        orderBy: { clicks: 'desc' }
    })

    const chartData = links.map(link => ({
        name: link.title,
        total: link.clicks
    }))

    const totalClicks = links.reduce((acc, curr) => acc + (curr.clicks || 0), 0)
    const topLink = links[0]?.title || 'None'

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Analytics</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Clicks
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalClicks}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Top Performer
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold truncate">{topLink}</div>
                    </CardContent>
                </Card>
            </div>

            <Card className="col-span-4">
                <CardHeader>
                    <CardTitle>Clicks per Link</CardTitle>
                </CardHeader>
                <CardContent className="pl-2">
                    <AnalyticsChart data={chartData} />
                </CardContent>
            </Card>
        </div>
    )
}
