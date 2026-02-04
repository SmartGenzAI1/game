
'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { Link } from '@/types'
import { 
    addLinkSchema, 
    updateLinkSchema, 
    reorderLinksSchema, 
    linkIdSchema 
} from '@/lib/validation'
import { 
    sanitizeLinkTitle, 
    sanitizeUrl 
} from '@/lib/sanitize'
import { logger, createCorrelationId } from '@/lib/logger'
import { linksCreated, linksDeleted } from '@/lib/metrics'

// Helper to get user
async function getUser() {
    const session = await auth()
    if (!session?.user?.email) return null

    return prisma.user.findUnique({
        where: { email: session.user.email }
    })
}

export async function addLink(formData: FormData) {
    const correlationId = createCorrelationId()
    const log = logger.withCorrelationId(correlationId)
    const startTime = Date.now()
    
    const user = await getUser()
    if (!user) {
        log.warn('Add link failed: Unauthorized')
        return { error: 'Unauthorized' }
    }

    const title = formData.get('title') as string
    const url = formData.get('url') as string

    log.info('Add link attempt', { userId: user.id, title, url })

    // Validate input
    const validationResult = addLinkSchema.safeParse({ title, url })
    
    if (!validationResult.success) {
        const errors = validationResult.error.errors.map(e => e.message).join(', ')
        log.warn('Add link validation failed', { userId: user.id, errors })
        return { error: errors }
    }

    const { title: validatedTitle, url: validatedUrl } = validationResult.data

    // Sanitize input
    const sanitizedTitle = sanitizeLinkTitle(validatedTitle)
    const sanitizedUrl = sanitizeUrl(validatedUrl)

    if (!sanitizedUrl) {
        log.warn('Add link failed: Invalid URL', { userId: user.id, url: validatedUrl })
        return { error: 'Invalid URL format or dangerous protocol detected' }
    }

    // Get max position
    const lastLink = await prisma.link.findFirst({
        where: { userId: user.id },
        orderBy: { position: 'desc' }
    })

    const position = (lastLink?.position ?? -1) + 1

    try {
        const link = await prisma.link.create({
            data: {
                userId: user.id,
                title: sanitizedTitle,
                url: sanitizedUrl,
                position
            }
        })
        
        const duration = (Date.now() - startTime) / 1000
        log.info('Link created successfully', { userId: user.id, linkId: link.id, duration })
        linksCreated.inc({ user_id: user.id })
    } catch (error) {
        const duration = (Date.now() - startTime) / 1000
        log.error('Failed to create link', error as Error, { userId: user.id, duration })
        return { error: 'Failed to create link' }
    }

    revalidatePath('/dashboard/links')
    return { success: true }
}

export async function updateLink(id: string, updates: Partial<Link>) {
    const correlationId = createCorrelationId()
    const log = logger.withCorrelationId(correlationId)
    const startTime = Date.now()
    
    const user = await getUser()
    if (!user) {
        log.warn('Update link failed: Unauthorized')
        return { error: 'Unauthorized' }
    }

    log.info('Update link attempt', { userId: user.id, linkId: id, updates })

    // Validate link ID
    const idValidation = linkIdSchema.safeParse(id)
    if (!idValidation.success) {
        log.warn('Update link failed: Invalid link ID', { userId: user.id, linkId: id })
        return { error: 'Invalid link ID' }
    }

    // Validate updates
    const validationResult = updateLinkSchema.safeParse(updates)
    
    if (!validationResult.success) {
        const errors = validationResult.error.errors.map(e => e.message).join(', ')
        log.warn('Update link validation failed', { userId: user.id, linkId: id, errors })
        return { error: errors }
    }

    const validatedUpdates = validationResult.data

    // Sanitize input
    const cleanUpdates: any = {}
    
    if (validatedUpdates.title) {
        cleanUpdates.title = sanitizeLinkTitle(validatedUpdates.title)
    }
    
    if (validatedUpdates.url) {
        const sanitizedUrl = sanitizeUrl(validatedUpdates.url)
        if (!sanitizedUrl) {
            log.warn('Update link failed: Invalid URL', { userId: user.id, linkId: id, url: validatedUpdates.url })
            return { error: 'Invalid URL format or dangerous protocol detected' }
        }
        cleanUpdates.url = sanitizedUrl
    }
    
    if (validatedUpdates.isActive !== undefined) {
        cleanUpdates.isActive = validatedUpdates.isActive
    }

    try {
        await prisma.link.update({
            where: { id, userId: user.id },
            data: cleanUpdates
        })
        
        const duration = (Date.now() - startTime) / 1000
        log.info('Link updated successfully', { userId: user.id, linkId: id, duration })
    } catch (error) {
        const duration = (Date.now() - startTime) / 1000
        log.error('Failed to update link', error as Error, { userId: user.id, linkId: id, duration })
        return { error: 'Failed to update link' }
    }

    revalidatePath('/dashboard/links')
    return { success: true }
}

export async function deleteLink(id: string) {
    const correlationId = createCorrelationId()
    const log = logger.withCorrelationId(correlationId)
    const startTime = Date.now()
    
    const user = await getUser()
    if (!user) {
        log.warn('Delete link failed: Unauthorized')
        return { error: 'Unauthorized' }
    }

    log.info('Delete link attempt', { userId: user.id, linkId: id })

    // Validate link ID
    const idValidation = linkIdSchema.safeParse(id)
    if (!idValidation.success) {
        log.warn('Delete link failed: Invalid link ID', { userId: user.id, linkId: id })
        return { error: 'Invalid link ID' }
    }

    try {
        await prisma.link.delete({
            where: { id, userId: user.id }
        })
        
        const duration = (Date.now() - startTime) / 1000
        log.info('Link deleted successfully', { userId: user.id, linkId: id, duration })
        linksDeleted.inc({ user_id: user.id })
    } catch (error) {
        const duration = (Date.now() - startTime) / 1000
        log.error('Failed to delete link', error as Error, { userId: user.id, linkId: id, duration })
        return { error: 'Failed to delete link' }
    }

    revalidatePath('/dashboard/links')
    return { success: true }
}

export async function reorderLinks(items: { id: string; position: number }[]) {
    const correlationId = createCorrelationId()
    const log = logger.withCorrelationId(correlationId)
    const startTime = Date.now()
    
    const user = await getUser()
    if (!user) {
        log.warn('Reorder links failed: Unauthorized')
        return { error: 'Unauthorized' }
    }

    log.info('Reorder links attempt', { userId: user.id, itemCount: items.length })

    // Validate input
    const validationResult = reorderLinksSchema.safeParse(items)
    
    if (!validationResult.success) {
        const errors = validationResult.error.errors.map(e => e.message).join(', ')
        log.warn('Reorder links validation failed', { userId: user.id, errors })
        return { error: errors }
    }

    const validatedItems = validationResult.data

    // Prisma transactions for safety
    try {
        await prisma.$transaction(
            validatedItems.map((item) =>
                prisma.link.update({
                    where: { id: item.id, userId: user.id },
                    data: { position: item.position }
                })
            )
        )
        
        const duration = (Date.now() - startTime) / 1000
        log.info('Links reordered successfully', { userId: user.id, itemCount: items.length, duration })
    } catch (error) {
        const duration = (Date.now() - startTime) / 1000
        log.error('Reorder failed', error as Error, { userId: user.id, duration })
        return { error: 'Failed to reorder links' }
    }

    revalidatePath('/dashboard/links')
    return { success: true }
}
