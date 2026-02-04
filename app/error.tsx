
'use client' // Error components must be Client Components

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error(error)
    }, [error])

    return (
        <div className="flex h-[50vh] flex-col items-center justify-center gap-4">
            <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-8 w-8" />
                <h2 className="text-2xl font-bold">Something went wrong!</h2>
            </div>
            <p className="text-muted-foreground">
                {error.message || 'An unexpected error occurred.'}
            </p>
            <div className="flex gap-4">
                <Button
                    onClick={
                        // Attempt to recover by trying to re-render the segment
                        () => reset()
                    }
                >
                    Try again
                </Button>
                <Button variant="outline" onClick={() => window.location.reload()}>
                    Reload Page
                </Button>
            </div>
        </div>
    )
}
