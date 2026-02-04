
export type Profile = {
    id: string
    username: string
    display_name: string | null
    bio: string | null
    avatar_url: string | null
    theme: string
    created_at: string
}

export type Link = {
    id: string
    user_id: string
    title: string
    url: string
    position: number
    is_active: boolean
    clicks: number
    created_at: string
}

export type Click = {
    id: number
    link_id: string
    created_at: string
    referrer: string | null
    country: string | null
    city: string | null
    user_agent: string | null
}
