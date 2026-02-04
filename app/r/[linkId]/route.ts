
import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { linkIdSchema } from '@/lib/validation'
import { sanitizeUrl } from '@/lib/sanitize'
import { 
    clickRateLimiter, 
    CLICK_RATE_LIMIT, 
    checkRateLimit 
} from '@/lib/rate-limit'
import { createLoggerFromRequest, extractCorrelationId } from '@/lib/logger'
import { linkClicks } from '@/lib/metrics'

export async function GET(request: NextRequest, { params }: { params: { linkId: string } }) {
    const log = createLoggerFromRequest(request)
    const startTime = Date.now()
    
    // Check rate limit
    const rateLimitResponse = checkRateLimit(request, clickRateLimiter, CLICK_RATE_LIMIT)
    if (rateLimitResponse) {
        log.warn('Link redirect rate limited', { linkId: params.linkId })
        return rateLimitResponse
    }

    const linkId = params.linkId

    log.info('Link redirect attempt', { linkId })

    // Validate link ID
    const idValidation = linkIdSchema.safeParse(linkId)
    if (!idValidation.success) {
        log.warn('Link redirect failed: Invalid link ID', { linkId })
        return new NextResponse('Invalid link ID', { status: 400 })
    }

    const link = await prisma.link.findUnique({
        where: { id: linkId }
    })

    if (!link) {
        log.warn('Link redirect failed: Link not found', { linkId })
        return new NextResponse('Link not found', { status: 404 })
    }

    // Sanitize and validate URL
    let destination = sanitizeUrl(link.url)
    if (!destination) {
        log.warn('Link redirect failed: Invalid destination', { linkId, url: link.url })
        return new NextResponse('Invalid link destination', { status: 400 })
    }

    // Ensure protocol
    if (!destination.startsWith('http')) {
        destination = `https://${destination}`
    }

    // Analytics - sanitize user agent and referrer
    const userAgent = request.headers.get('user-agent')?.substring(0, 500) || 'unknown'
    const referrer = request.headers.get('referer')?.substring(0, 500) || 'unknown'

    // Insert click record and increment count
    // We can do this async without awaiting if we want faster redirect, 
    // but Vercel serverless might kill it. Best to await.

    try {
        await prisma.$transaction([
            prisma.click.create({
                data: {
                    linkId: link.id,
                    userAgent,
                    referrer
                }
            }),
            prisma.link.update({
                where: { id: link.id },
                data: { clicks: { increment: 1 } }
            })
        ])
        
        const duration = (Date.now() - startTime) / 1000
        log.info('Link redirect successful', { 
            linkId, 
            userId: link.userId, 
            destination,
            duration 
        })
        linkClicks.inc({ link_id: link.id, user_id: link.userId })
    } catch (error) {
        const duration = (Date.now() - startTime) / 1000
        log.error('Failed to record link click', error as Error, { linkId, duration })
        // Still redirect even if analytics fails
    }

    return NextResponse.redirect(destination)
}
