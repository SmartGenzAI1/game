
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { updateProfile, generateBio } from '@/app/(dashboard)/appearance/actions'
import { toast } from 'sonner'
import { Profile } from '@/types'
import { Sparkles } from 'lucide-react'

export function ProfileForm({ profile }: { profile: Profile }) {
    const [loading, setLoading] = useState(false)
    const [generating, setGenerating] = useState(false)
    const [bio, setBio] = useState(profile.bio || '')

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        const formData = new FormData(e.currentTarget)

        const result = await updateProfile(formData)
        setLoading(false)
        if (result.error) toast.error(result.error)
        else toast.success('Profile updated')
    }

    async function handleGenerateBio() {
        // Prompt user for keywords
        const keywords = prompt("Enter keywords for your bio:")
        if (!keywords) return

        setGenerating(true)
        const result = await generateBio(keywords)
        setGenerating(false)
        if (result.error) toast.error(result.error)
        else if (result.bio) {
            setBio(result.bio)
            toast.success('Bio generated!')
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Profile Details</CardTitle>
                <CardDescription>Update your public profile information.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <Input id="username" name="username" defaultValue={profile.username} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="display_name">Display Name</Label>
                        <Input id="display_name" name="display_name" defaultValue={profile.display_name || ''} placeholder="My Name" />
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="bio">Bio</Label>
                            <Button type="button" variant="outline" size="sm" onClick={handleGenerateBio} disabled={generating}>
                                <Sparkles className="mr-2 h-3 w-3" />
                                {generating ? 'Generating...' : 'Auto-Generate'}
                            </Button>
                        </div>
                        <Textarea id="bio" name="bio" value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell us about yourself" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="avatar_url">Avatar URL</Label>
                        <Input id="avatar_url" name="avatar_url" defaultValue={profile.avatar_url || ''} placeholder="https://example.com/me.jpg" />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="theme">Theme</Label>
                        <select id="theme" name="theme" defaultValue={profile.theme || 'default'} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                            <option value="default">Default (White/Black)</option>
                            <option value="dark">Dark Mode</option>
                            <option value="blue">Blue Horizon</option>
                            <option value="purple">Purple Haze</option>
                        </select>
                    </div>

                    <Button type="submit" disabled={loading}>
                        {loading ? 'Saving...' : 'Save Changes'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
}
