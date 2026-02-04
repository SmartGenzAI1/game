
'use server'

import { signIn } from '@/auth'
import { AuthError } from 'next-auth'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { redirect } from 'next/navigation'
import { NextRequest } from 'next/server'
import { 
    loginRateLimiter, 
    signupRateLimiter, 
    LOGIN_RATE_LIMIT, 
    SIGNUP_RATE_LIMIT,
    checkRateLimit 
} from '@/lib/rate-limit'
import { 
    signupCredentialsSchema, 
    loginCredentialsSchema 
} from '@/lib/validation'
import { nanoid } from 'nanoid'
import { logger, createCorrelationId } from '@/lib/logger'
import { recordAuthAttempt, userRegistrations } from '@/lib/metrics'

export async function login(formData: FormData) {
    const correlationId = createCorrelationId()
    const log = logger.withCorrelationId(correlationId)
    const startTime = Date.now()
    
    // Get request headers for rate limiting
    const headers = new Headers()
    // Note: In server actions, we don't have direct access to request object
    // For production, consider using middleware-based rate limiting or a Redis-backed solution
    
    try {
        // Validate input
        const email = formData.get('email') as string
        const password = formData.get('password') as string
        
        log.info('Login attempt', { email })
        
        const validationResult = loginCredentialsSchema.safeParse({ email, password })
        
        if (!validationResult.success) {
            const errors = validationResult.error.errors.map(e => e.message).join(', ')
            log.warn('Login validation failed', { email, errors })
            recordAuthAttempt('credentials', false, (Date.now() - startTime) / 1000, 'validation_failed')
            return redirect(`/login?error=${encodeURIComponent(errors)}`)
        }

        await signIn('credentials', formData)
        
        const duration = (Date.now() - startTime) / 1000
        log.info('Login successful', { email, duration })
        recordAuthAttempt('credentials', true, duration)
    } catch (error) {
        const duration = (Date.now() - startTime) / 1000
        
        if (error instanceof AuthError) {
            switch (error.type) {
                case 'CredentialsSignin':
                    log.warn('Login failed: Invalid credentials', { email: formData.get('email'), duration })
                    recordAuthAttempt('credentials', false, duration, 'invalid_credentials')
                    return redirect('/login?error=Invalid email or password')
                default:
                    log.error('Login failed: AuthError', error, { email: formData.get('email'), duration })
                    recordAuthAttempt('credentials', false, duration, 'auth_error')
                    return redirect('/login?error=Authentication failed')
            }
        }
        
        log.error('Login failed: Unknown error', error as Error, { email: formData.get('email'), duration })
        recordAuthAttempt('credentials', false, duration, 'unknown_error')
        throw error // re-throw callback redirect
    }
}

export async function signup(formData: FormData) {
    const correlationId = createCorrelationId()
    const log = logger.withCorrelationId(correlationId)
    const startTime = Date.now()
    
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const username = formData.get('username') as string
    const fullName = formData.get('full_name') as string

    log.info('Signup attempt', { email, username })

    // Validate input with strong password requirements
    const validationResult = signupCredentialsSchema.safeParse({
        email,
        password,
        username,
        full_name: fullName,
    })

    if (!validationResult.success) {
        const errors = validationResult.error.errors.map(e => e.message).join(', ')
        log.warn('Signup validation failed', { email, username, errors })
        return redirect(`/signup?error=${encodeURIComponent(errors)}`)
    }

    const { email: validatedEmail, password: validatedPassword, username: validatedUsername, full_name: validatedFullName } = validationResult.data

    // Check existing user (use generic error message to prevent enumeration)
    const existingUser = await prisma.user.findFirst({
        where: {
            OR: [
                { email: validatedEmail },
                { username: validatedUsername }
            ]
        }
    })

    if (existingUser) {
        log.warn('Signup failed: User already exists', { email: validatedEmail, username: validatedUsername })
        return redirect('/signup?error=An account with this email or username already exists')
    }

    // Hash password with bcrypt
    const hashedPassword = await bcrypt.hash(validatedPassword, 12)

    // Generate email verification token
    const emailVerificationToken = nanoid(32)

    try {
        const user = await prisma.user.create({
            data: {
                email: validatedEmail,
                password: hashedPassword,
                username: validatedUsername,
                name: validatedFullName,
                emailVerificationToken,
                // Create default profile data
                bio: '',
                theme: 'default'
            }
        })

        log.info('User created successfully', { userId: user.id, email: validatedEmail, username: validatedUsername })
        userRegistrations.inc()

        // TODO: Send verification email
        // For now, we'll auto-verify for development
        // In production, uncomment the email sending logic below:
        /*
        await sendVerificationEmail(validatedEmail, emailVerificationToken)
        return redirect('/login?success=Account created. Please check your email to verify your account.')
        */

        // Auto-verify for development (remove in production)
        await prisma.user.update({
            where: { email: validatedEmail },
            data: {
                emailVerifiedAt: new Date(),
                emailVerificationToken: null,
            }
        })

        const duration = (Date.now() - startTime) / 1000
        log.info('Signup completed', { userId: user.id, duration })
        return redirect('/login?success=Account created successfully')
    } catch (e) {
        const duration = (Date.now() - startTime) / 1000
        log.error('Signup error', e as Error, { email: validatedEmail, username: validatedUsername, duration })
        return redirect('/signup?error=Failed to create account. Please try again.')
    }
}

export async function verifyEmail(token: string) {
    const correlationId = createCorrelationId()
    const log = logger.withCorrelationId(correlationId)
    
    if (!token) {
        log.warn('Email verification failed: No token provided')
        return redirect('/login?error=Invalid verification token')
    }

    try {
        const user = await prisma.user.findUnique({
            where: { emailVerificationToken: token }
        })

        if (!user) {
            log.warn('Email verification failed: Invalid token', { token })
            return redirect('/login?error=Invalid or expired verification token')
        }

        await prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerifiedAt: new Date(),
                emailVerificationToken: null,
            }
        })

        log.info('Email verified successfully', { userId: user.id, email: user.email })
        return redirect('/login?success=Email verified successfully. You can now log in.')
    } catch (e) {
        log.error('Email verification error', e as Error, { token })
        return redirect('/login?error=Failed to verify email. Please try again.')
    }
}

export async function resendVerificationEmail(email: string) {
    const correlationId = createCorrelationId()
    const log = logger.withCorrelationId(correlationId)
    
    if (!email) {
        log.warn('Resend verification failed: No email provided')
        return redirect('/login?error=Email is required')
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email }
        })

        if (!user) {
            // Don't reveal if user exists
            log.info('Resend verification: User not found (generic response)', { email })
            return redirect('/login?success=If an account exists with this email, a verification link has been sent.')
        }

        if (user.emailVerifiedAt) {
            log.info('Resend verification: Email already verified', { userId: user.id, email })
            return redirect('/login?success=Email is already verified.')
        }

        // Generate new verification token
        const emailVerificationToken = nanoid(32)

        await prisma.user.update({
            where: { id: user.id },
            data: { emailVerificationToken }
        })

        log.info('Verification email resent', { userId: user.id, email })
        
        // TODO: Send verification email
        // await sendVerificationEmail(email, emailVerificationToken)

        return redirect('/login?success=If an account exists with this email, a verification link has been sent.')
    } catch (e) {
        log.error('Resend verification error', e as Error, { email })
        return redirect('/login?error=Failed to send verification email. Please try again.')
    }
}
