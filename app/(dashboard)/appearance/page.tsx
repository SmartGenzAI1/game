
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { ProfileForm } from '@/components/appearance/profile-form'
import { redirect } from 'next/navigation'

export default async function AppearancePage() {
    const session = await auth()
    if (!session?.user?.email) return redirect('/login')

    const user = await prisma.user.findUnique({
        where: { email: session.user.email }
    })

    if (!user) return redirect('/login')

    // Transform Prisma User to match Profile type expected by ProfileForm
    const profile = {
        id: user.id,
        username: user.username || '',
        display_name: user.name,
        bio: user.bio,
        avatar_url: user.image,
        theme: user.theme,
        created_at: user.createdAt.toISOString()
    }

    return (
        <div className="container max-w-2xl mx-auto py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold">Appearance</h1>
                <p className="text-muted-foreground">
                    Customize your profile details and theme.
                </p>
            </div>

            <ProfileForm profile={profile} />
        </div>
    )
}
