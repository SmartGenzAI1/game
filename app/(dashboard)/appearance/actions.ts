
'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { 
    updateProfileSchema, 
    generateBioSchema 
} from '@/lib/validation'
import { 
    sanitizeUsername, 
    sanitizeName, 
    sanitizeBio, 
    sanitizeAvatarUrl 
} from '@/lib/sanitize'

export async function updateProfile(formData: FormData) {
    const session = await auth()
    if (!session?.user?.email) return { error: 'Unauthorized' }

    const username = formData.get('username') as string
    const display_name = formData.get('display_name') as string
    const bio = formData.get('bio') as string
    const theme = formData.get('theme') as string
    const avatar_url = formData.get('avatar_url') as string

    // Validate input
    const validationResult = updateProfileSchema.safeParse({
        username,
        display_name,
        bio,
        theme,
        avatar_url,
    })

    if (!validationResult.success) {
        const errors = validationResult.error.errors.map(e => e.message).join(', ')
        return { error: errors }
    }

    const { 
        username: validatedUsername, 
        display_name: validatedDisplayName, 
        bio: validatedBio, 
        theme: validatedTheme, 
        avatar_url: validatedAvatarUrl 
    } = validationResult.data

    // Sanitize input
    const sanitizedUsername = sanitizeUsername(validatedUsername)
    const sanitizedDisplayName = sanitizeName(validatedDisplayName)
    const sanitizedBio = sanitizeBio(validatedBio)
    const sanitizedAvatarUrl = sanitizeAvatarUrl(validatedAvatarUrl || '')

    try {
        await prisma.user.update({
            where: { email: session.user.email },
            data: {
                username: sanitizedUsername,
                name: sanitizedDisplayName,
                bio: sanitizedBio,
                theme: validatedTheme,
                image: sanitizedAvatarUrl || null
            }
        })
    } catch (error) {
        console.error('Failed to update profile:', error)
        return { error: 'Failed to update profile' }
    }

    revalidatePath('/dashboard/appearance')
    return { success: true }
}

export async function generateBio(keywords: string) {
    // Validate input
    const validationResult = generateBioSchema.safeParse({ keywords })

    if (!validationResult.success) {
        const errors = validationResult.error.errors.map(e => e.message).join(', ')
        return { error: errors }
    }

    const { keywords: validatedKeywords } = validationResult.data

    const { generateBioWithFallback } = await import('@/lib/openai/client')

    try {
        const result = await generateBioWithFallback(validatedKeywords)
        
        if (result.error) {
            return { error: result.error }
        }
        
        // Sanitize the generated bio
        const sanitizedBio = sanitizeBio(result.bio || '')

        return { bio: sanitizedBio }
    } catch (e: any) {
        console.error('Failed to generate bio:', e)
        return { error: 'Failed to generate bio. Please try again.' }
    }
}
