
'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2, Edit2, Earth } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Link } from '@/types'
import { useState } from 'react'
import { deleteLink, updateLink } from '@/app/(dashboard)/links/actions'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'

interface LinkItemProps {
    link: Link
}

export function LinkItem({ link }: LinkItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: link.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
        opacity: isDragging ? 0.8 : 1
    }

    const [editOpen, setEditOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    async function handleDelete() {
        if (confirm('Are you sure you want to delete this link?')) {
            const result = await deleteLink(link.id)
            if (result.error) toast.error(result.error)
            else toast.success('Link deleted')
        }
    }

    async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        const formData = new FormData(e.currentTarget)
        const title = formData.get('title') as string
        const url = formData.get('url') as string

        const result = await updateLink(link.id, { title, url })
        setLoading(false)
        if (result.error) toast.error(result.error)
        else {
            toast.success('Link updated')
            setEditOpen(false)
        }
    }

    async function toggleActive(checked: boolean) {
        await updateLink(link.id, { is_active: checked })
    }

    return (
        <>
            <div ref={setNodeRef} style={style} className="mb-3">
                <Card className="flex items-center p-4">
                    {/* Drag Handle */}
                    <div {...attributes} {...listeners} className="cursor-grab mr-4 text-muted-foreground hover:text-foreground">
                        <GripVertical className="h-5 w-5" />
                    </div>

                    <div className="flex-1 grid gap-1">
                        <div className="font-semibold">{link.title}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <Earth className="h-3 w-3" />
                            {link.url}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Switch checked={link.is_active} onCheckedChange={toggleActive} />
                        <Button variant="ghost" size="icon" onClick={() => setEditOpen(true)}>
                            <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={handleDelete}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </Card>
            </div>

            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Link</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleUpdate}>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="title">Title</Label>
                                <Input id="title" name="title" defaultValue={link.title} required />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="url">URL</Label>
                                <Input id="url" name="url" defaultValue={link.url} required />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={loading}>
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    )
}
