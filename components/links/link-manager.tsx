
'use client'

import { useState, useEffect } from 'react'
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core'
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable'

import { Link } from '@/types'
import { LinkItem } from './link-item'
import { reorderLinks } from '@/app/(dashboard)/links/actions'
import { toast } from 'sonner'
import { AddLinkForm } from './add-link-form'

interface LinkManagerProps {
    initialLinks: Link[]
}

export function LinkManager({ initialLinks }: LinkManagerProps) {
    const [links, setLinks] = useState(initialLinks)

    // Sync with server data if it changes (e.g. added link)
    useEffect(() => {
        setLinks(initialLinks)
    }, [initialLinks])

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    async function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event

        if (active.id !== over?.id) {
            setLinks((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id)
                const newIndex = items.findIndex((item) => item.id === over?.id)

                const newItems = arrayMove(items, oldIndex, newIndex)

                // Optimistic update
                // Call server action
                const reorderedItems = newItems.map((item, index) => ({
                    id: item.id,
                    position: index
                }))

                reorderLinks(reorderedItems).catch(() => {
                    toast.error('Failed to save order')
                    setLinks(items) // Revert
                })

                return newItems
            })
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <AddLinkForm />
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext
                    items={links.map(l => l.id)}
                    strategy={verticalListSortingStrategy}
                >
                    {links.map((link) => (
                        <LinkItem key={link.id} link={link} />
                    ))}
                    {links.length === 0 && (
                        <div className="text-center p-8 text-muted-foreground border border-dashed rounded-lg">
                            No links yet. Add one to get started!
                        </div>
                    )}
                </SortableContext>
            </DndContext>
        </div>
    )
}
