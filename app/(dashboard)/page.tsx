
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PlusCircle, ExternalLink } from 'lucide-react'
import { redirect } from 'next/navigation'
import { cacheUserProfile } from '@/lib/cache'

export default async function DashboardPage() {
    const session = await auth()

    if (!session?.user?.email) return redirect('/login')

    // Optimized query: Only select needed fields
    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: {
            id: true,
            username: true,
            email: true,
        }
    })

    // Should not happen if auth is working
    if (!user) return redirect('/login')

    // Cache user profile for subsequent requests
    cacheUserProfile(user.id, user, 300) // Cache for 5 minutes

    // Optimized: Use single query with aggregation instead of separate count and aggregate
    const [linkCount, clicksAggregation] = await Promise.all([
        prisma.link.count({
            where: { userId: user.id }
        }),
        prisma.link.aggregate({
            where: { userId: user.id },
            _sum: {
                clicks: true
            }
        })
    ])

    const totalClicks = clicksAggregation._sum.clicks || 0

    return (
        <div className="flex flex-col gap-4">
            <h1 className="text-lg font-semibold md:text-2xl">Dashboard</h1>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Clicks
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalClicks}</div>
                        <p className="text-xs text-muted-foreground">
                            Across all your links
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Active Links
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{linkCount || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            Active links on your page
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Your Page</CardTitle>
                        <CardDescription>
                            Your public page is live at:
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/50">
                            <span className="font-mono text-sm truncate">
                                {process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/{user.username}
                            </span>
                            <Button size="sm" variant="outline" asChild>
                                <Link href={`/${user.username}`} target="_blank">
                                    <ExternalLink className="mr-2 h-3 w-3" />
                                    Visit
                                </Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-2">
                        <Button className="w-full" asChild>
                            <Link href="/dashboard/links">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add New Link
                            </Link>
                        </Button>
                        <Button variant="outline" className="w-full" asChild>
                            <Link href="/dashboard/appearance">
                                Customize Appearance
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
