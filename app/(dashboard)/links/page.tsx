
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { LinkManager } from '@/components/links/link-manager'
import { redirect } from 'next/navigation'
import { cacheUserLinks, getCachedUserLinks } from '@/lib/cache'

// We need to map Prisma Link to the frontend Link type if they differ
// Currently keys are snake_case in Frontend Type (from Supabase) but camelCase in Prisma.
// We must update the frontend type or transform the data.
// Let's transform data here to match frontend "Link" interface for now to avoid breaking components.
// OR better, update client components to use camelCase. 
// Plan: Transform here to snake_case to minimize UI churn for now.

export default async function LinksPage() {
    const session = await auth()
    if (!session?.user?.email) return redirect('/login')

    // Optimized query: Only select needed fields
    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: {
            id: true,
            email: true,
        }
    })

    if (!user) return redirect('/login')

    // Try to get from cache first
    let links = getCachedUserLinks(user.id)
    
    if (!links) {
        // Cache miss - fetch from database
        const dbLinks = await prisma.link.findMany({
            where: { userId: user.id },
            select: {
                id: true,
                userId: true,
                title: true,
                url: true,
                position: true,
                isActive: true,
                clicks: true,
                createdAt: true,
            },
            orderBy: { position: 'asc' }
        })

        // Transform to match existing Link type (snake_case)
        links = dbLinks.map(l => ({
            id: l.id,
            user_id: l.userId,
            title: l.title,
            url: l.url,
            position: l.position,
            is_active: l.isActive,
            clicks: l.clicks,
            created_at: l.createdAt.toISOString()
        }))

        // Cache the result for 5 minutes
        cacheUserLinks(user.id, links, 300)
    }

    return (
        <div className="container max-w-2xl mx-auto py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold">Links</h1>
                <p className="text-muted-foreground">
                    Manage and reorder your public links.
                </p>
            </div>

            <LinkManager initialLinks={links} />
        </div>
    )
}
