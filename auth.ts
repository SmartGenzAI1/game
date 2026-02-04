
import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { 
    checkAccountLockout, 
    recordFailedLoginAttempt, 
    resetFailedLoginAttempts,
    getTimeRemaining 
} from '@/lib/account-lockout';
import { passwordSchema, emailSchema } from '@/lib/validation';

export const { auth, signIn, signOut } = NextAuth({
    ...authConfig,
    providers: [
        Credentials({
            async authorize(credentials) {
                // Validate input with strong password requirements
                const parsedCredentials = z
                    .object({ 
                        email: emailSchema,
                        password: z.string().min(1, 'Password is required')
                    })
                    .safeParse(credentials);

                if (!parsedCredentials.success) {
                    console.log('Invalid credentials format');
                    return null;
                }

                const { email, password } = parsedCredentials.data;

                // Check account lockout status
                const lockoutStatus = await checkAccountLockout(email);
                
                if (lockoutStatus.isLocked) {
                    console.log(`Account locked for ${email}`);
                    throw new Error(`Account locked. Please try again in ${getTimeRemaining(lockoutStatus.lockoutUntil!)}.`);
                }

                // Find user
                const user = await prisma.user.findUnique({ 
                    where: { email },
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        username: true,
                        image: true,
                        password: true,
                        emailVerified: true,
                        emailVerifiedAt: true,
                    }
                });

                if (!user) {
                    // Record failed attempt even for non-existent users (prevents enumeration)
                    await recordFailedLoginAttempt(email);
                    console.log('User not found');
                    return null;
                }

                // Check if email is verified
                if (!user.emailVerifiedAt) {
                    console.log('Email not verified');
                    throw new Error('Please verify your email before logging in.');
                }

                // Verify password
                const passwordsMatch = await bcrypt.compare(password, user.password || '');
                
                if (!passwordsMatch) {
                    // Record failed attempt
                    const newLockoutStatus = await recordFailedLoginAttempt(email);
                    
                    if (newLockoutStatus.isLocked) {
                        throw new Error(`Account locked due to too many failed attempts. Please try again in ${getTimeRemaining(newLockoutStatus.lockoutUntil!)}.`);
                    }
                    
                    console.log('Invalid password');
                    return null;
                }

                // Reset failed attempts on successful login
                await resetFailedLoginAttempts(email);

                // Return user without password
                const { password: _, ...userWithoutPassword } = user;
                return userWithoutPassword;
            },
        }),
    ],
});
