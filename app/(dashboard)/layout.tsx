
import Link from 'next/link'
import { auth, signOut } from '@/auth'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LayoutDashboard, Link as LinkIcon, Palette, BarChart3, Menu } from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { prisma } from '@/lib/db'

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await auth()

    // Middleware handles redirect, but type safety check
    if (!session?.user?.email) return null

    const user = await prisma.user.findUnique({
        where: { email: session.user.email }
    })

    // Fallback if db user missing but auth session exists (shouldn't happen)
    if (!user) {
        return (
            <div className="flex h-screen w-full flex-col items-center justify-center gap-4">
                <h2 className="text-xl font-bold">Session Invalid</h2>
                <p className="text-muted-foreground">Your account data is missing (database was likely reset).</p>
                <form
                    action={async () => {
                        "use server"
                        await signOut({ redirectTo: "/login" })
                    }}
                >
                    <Button type="submit">Reset Session & Login</Button>
                </form>
            </div>
        )
    }

    const navItems = [
        { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
        { href: '/dashboard/links', label: 'Links', icon: LinkIcon },
        { href: '/dashboard/appearance', label: 'Appearance', icon: Palette },
        { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
    ]

    return (
        <div className="flex min-h-screen flex-col md:flex-row bg-muted/40">
            {/* Sidebar (Desktop) */}
            <aside className="hidden w-64 border-r bg-background md:block">
                <div className="flex h-16 items-center border-b px-6">
                    <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
                        <span className="">LinkHub AI</span>
                    </Link>
                </div>
                <nav className="flex flex-col gap-2 p-4">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-muted"
                        >
                            <item.icon className="h-4 w-4" />
                            {item.label}
                        </Link>
                    ))}
                </nav>
            </aside>

            {/* Mobile Header / Main Content Wrapper */}
            <div className="flex flex-col flex-1">
                <header className="flex h-14 items-center gap-4 border-b bg-background px-6 md:hidden">
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="outline" size="icon" className="shrink-0 md:hidden">
                                <Menu className="h-5 w-5" />
                                <span className="sr-only">Toggle navigation menu</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="flex flex-col">
                            <nav className="grid gap-2 text-lg font-medium">
                                <Link href="#" className="flex items-center gap-2 text-lg font-semibold mb-4">
                                    <span className="">LinkHub AI</span>
                                </Link>
                                {navItems.map((item) => (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted"
                                    >
                                        <item.icon className="h-5 w-5" />
                                        {item.label}
                                    </Link>
                                ))}
                            </nav>
                        </SheetContent>
                    </Sheet>
                    <span className="font-semibold">LinkHub AI</span>
                </header>

                {/* Main Content */}
                <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6 overflow-y-auto">
                    <div className="hidden md:flex items-center justify-end">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="rounded-full">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={user.image || ''} alt={user.username || 'User'} />
                                        <AvatarFallback>{(user.username?.[0] || 'U').toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <span className="sr-only">Toggle user menu</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>
                                    <form action={async () => {
                                        'use server'
                                        await signOut()
                                    }}>
                                        <button className="w-full text-left">Logout</button>
                                    </form>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                    {children}
                </main>
            </div>
        </div>
    )
}
