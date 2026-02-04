
import OpenAI from 'openai'
import { executeWithCircuitBreaker, CircuitBreakerOpenError } from '@/lib/circuit-breaker'

// Initialize OpenAI client
const openaiClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    dangerouslyAllowBrowser: false, // Server side only
    timeout: 30000, // 30 second timeout
    maxRetries: 2, // Retry failed requests up to 2 times
})

/**
 * OpenAI client with circuit breaker protection
 * All API calls go through the circuit breaker to prevent cascading failures
 */
export const openai = {
    /**
     * Get the underlying OpenAI client (use with caution)
     */
    get client() {
        return openaiClient
    },

    /**
     * Chat completions with circuit breaker
     */
    async chat: {
        completions: {
            create: async (params: any) => {
                return executeWithCircuitBreaker(async () => {
                    return await openaiClient.chat.completions.create(params)
                })
            }
        }
    },

    /**
     * Generic method to call any OpenAI API with circuit breaker
     */
    async call<T>(fn: () => Promise<T>): Promise<T> {
        return executeWithCircuitBreaker(fn)
    }
}

/**
 * Check if OpenAI API is available
 */
export async function checkOpenAIHealth(): Promise<boolean> {
    try {
        await executeWithCircuitBreaker(async () => {
            // Simple health check - list models
            await openaiClient.models.list()
        })
        return true
    } catch (error) {
        if (error instanceof CircuitBreakerOpenError) {
            console.warn('OpenAI circuit breaker is open')
        } else {
            console.error('OpenAI health check failed:', error)
        }
        return false
    }
}

/**
 * Generate bio with circuit breaker and fallback
 */
export async function generateBioWithFallback(keywords: string): Promise<{ bio?: string; error?: string }> {
    try {
        const completion = await executeWithCircuitBreaker(async () => {
            return await openaiClient.chat.completions.create({
                messages: [
                    { 
                        role: "system", 
                        content: "You are a helpful assistant that generates professional social media bios." 
                    },
                    { 
                        role: "user", 
                        content: `Generate a short, professional bio for a link-in-bio page based on these keywords: ${keywords}. Keep it under 160 characters.` 
                    }
                ],
                model: "gpt-3.5-turbo",
                max_tokens: 100,
                temperature: 0.7,
            })
        })

        const bio = completion.choices[0]?.message?.content || ''
        return { bio }
    } catch (error) {
        if (error instanceof CircuitBreakerOpenError) {
            return { error: 'AI service is temporarily unavailable. Please try again later.' }
        }
        console.error('Failed to generate bio:', error)
        return { error: 'Failed to generate bio. Please try again.' }
    }
}
