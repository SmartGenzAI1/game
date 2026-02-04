
import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Metadata } from 'next'
import { Globe, Github, Twitter, Linkedin, ExternalLink } from 'lucide-react'
import { usernameParamSchema } from '@/lib/validation'
import { sanitizeBio, sanitizeUrl } from '@/lib/sanitize'
import { cachePublicPage, getCachedPublicPage } from '@/lib/cache'

// Helper to determine icon based on URL (simple check)
function getIcon(url: string) {
    if (url.includes('github')) return <Github className="mr-2 h-4 w-4" />
    if (url.includes('twitter') || url.includes('x.com')) return <Twitter className="mr-2 h-4 w-4" />
    if (url.includes('linkedin')) return <Linkedin className="mr-2 h-4 w-4" />
    return <Globe className="mr-2 h-4 w-4" />
}

export async function generateMetadata({ params }: { params: { username: string } }): Promise<Metadata> {
    // Validate username
    const validation = usernameParamSchema.safeParse(params.username)
    if (!validation.success) {
        return { title: 'Not Found' }
    }

    // Optimized query: Only select needed fields
    const user = await prisma.user.findUnique({
        where: { username: params.username },
        select: {
            name: true,
            username: true,
            bio: true,
        }
    })

    if (!user) return { title: 'Not Found' }

    // Sanitize user-generated content for metadata
    const sanitizedName = user.name || user.username || 'User'
    const sanitizedBio = user.bio ? sanitizeBio(user.bio) : ''

    return {
        title: `${sanitizedName} | LinkHub`,
        description: sanitizedBio || `Check out ${user.username}'s links on LinkHub`,
    }
}

export default async function PublicPage({ params }: { params: { username: string } }) {
    const { username } = params

    // Validate username
    const validation = usernameParamSchema.safeParse(username)
    if (!validation.success) {
        return notFound()
    }

    // Prevent reserved paths from querying DB
    const reserved = ['favicon.ico', 'robots.txt', 'sitemap.xml', 'sw.js', 'manifest.json', 'login', 'signup', 'dashboard', 'api']
    if (reserved.includes(username)) return notFound()

    // Try to get from cache first
    let cachedData = getCachedPublicPage(username)
    
    let user, links
    
    if (cachedData) {
        user = cachedData.user
        links = cachedData.links
    } else {
        // Cache miss - fetch from database
        // Optimized: Use single query with select to avoid over-fetching
        user = await prisma.user.findUnique({
            where: { username },
            select: {
                id: true,
                name: true,
                username: true,
                bio: true,
                image: true,
                theme: true,
            }
        })

        if (!user) return notFound()

        // Optimized: Only select needed fields for links
        links = await prisma.link.findMany({
            where: { userId: user.id, isActive: true },
            select: {
                id: true,
                title: true,
                url: true,
                position: true,
            },
            orderBy: { position: 'asc' }
        })

        // Cache the result for 10 minutes (public pages can be cached longer)
        cachePublicPage(username, { user, links }, 600)
    }

    // Theme styling
    const themes: Record<string, string> = {
        default: "bg-gradient-to-br from-zinc-50 to-zinc-200 text-zinc-900",
        dark: "bg-zinc-950 text-white",
        blue: "bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white",
        purple: "bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-900 text-white",
    }

    const bgClass = themes[user.theme || 'default'] || themes.default
    const isDark = user.theme !== 'default'

    // Sanitize user-generated content
    const sanitizedName = user.name || user.username || 'User'
    const sanitizedBio = user.bio ? sanitizeBio(user.bio) : ''

    return (
        <div className={`min-h-screen flex flex-col items-center py-20 px-4 transition-colors duration-500 ${bgClass}`}>
            {/* Main Card Container */}
            <div className="w-full max-w-lg z-10">

                {/* Profile Header */}
                <div className="flex flex-col items-center gap-6 mb-10 animate-in slide-in-from-bottom-5 duration-700 fade-in">
                    <div className="relative group">
                        <div className={`absolute -inset-0.5 rounded-full blur opacity-50 group-hover:opacity-75 transition duration-500 ${isDark ? 'bg-gradient-to-r from-pink-600 to-purple-600' : 'bg-gradient-to-r from-zinc-400 to-zinc-600'}`}></div>
                        <div className="relative h-28 w-28 rounded-full overflow-hidden border-4 border-background shadow-2xl">
                            {user.image ? (
                                <Image
                                    src={user.image}
                                    alt={user.username || 'User'}
                                    fill
                                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                                    priority
                                />
                            ) : (
                                <div className="h-full w-full bg-muted flex items-center justify-center text-4xl font-bold opacity-70">
                                    {(sanitizedName?.[0] || 'U').toUpperCase()}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="text-center space-y-2">
                        <h1 className="text-3xl font-extrabold tracking-tight drop-shadow-sm">{sanitizedName}</h1>
                        {sanitizedBio && <p className="text-sm font-medium opacity-80 leading-relaxed max-w-xs mx-auto" dangerouslySetInnerHTML={{ __html: sanitizedBio }}></p>}
                    </div>
                </div>

                {/* Links Grid */}
                <div className="flex flex-col gap-4">
                    {links && links.length > 0 ? (
                        links.map((link, index) => {
                            // Sanitize link URL
                            const sanitizedUrl = sanitizeUrl(link.url)
                            if (!sanitizedUrl) return null // Skip invalid links

                            return (
                                <a
                                    key={link.id}
                                    href={`/r/${link.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group block w-full outline-none"
                                    style={{
                                        animationDelay: `${index * 100}ms`
                                    }}
                                >
                                    <div className={`
                                relative overflow-hidden rounded-2xl p-4 transition-all duration-300
                                hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]
                                ${isDark
                                            ? 'bg-white/10 hover:bg-white/20 border border-white/10 backdrop-blur-sm'
                                            : 'bg-white hover:bg-zinc-50 border border-zinc-200 shadow-sm'}
                              `}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-full ${isDark ? 'bg-white/10' : 'bg-zinc-100'}`}>
                                                    {getIcon(sanitizedUrl)}
                                                </div>
                                                <span className="font-semibold text-lg">{link.title}</span>
                                            </div>
                                            <ExternalLink className="opacity-0 group-hover:opacity-50 transition-opacity h-4 w-4" />
                                        </div>
                                    </div>
                                </a>
                            )
                        })
                    ) : (
                        <div className="p-8 text-center rounded-2xl border border-dashed border-opacity-30">
                            <p className="opacity-60">No links added yet.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="mt-16 text-center opacity-40 hover:opacity-80 transition-opacity">
                <a href="/" className="inline-flex items-center gap-1.5 text-xs font-medium">
                    <span>Powered by</span>
                    <span className="font-bold tracking-wide">LinkHub AI</span>
                </a>
            </div>
        </div>
    )
}
