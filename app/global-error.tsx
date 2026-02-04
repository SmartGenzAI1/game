
'use client'

import { useEffect } from "react"

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error(error)
    }, [error])

    return (
        <html>
            <body>
                <div style={{ display: 'flex', height: '100vh', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                    <h2>Something went wrong!</h2>
                    <p>{error.message}</p>
                    <button
                        onClick={() => reset()}
                        style={{ padding: '0.5rem 1rem', borderRadius: '0.25rem', backgroundColor: black, color: white, cursor: 'pointer' }}
                    >
                        Try again
                    </button>
                </div>
            </body>
        </html>
    )
}
