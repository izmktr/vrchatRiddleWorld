// 型定義
export interface VRChatWorld {
    id: string;
    name?: string;
    title?: string; // Firebase データで使用される場合がある
    description?: string;
    author?: string;
    authorDisplayName?: string;
    authorName?: string; // Firebase データで使用される場合がある
    releaseStatus?: 'public' | 'private';
    visits?: number;
    created_at?: string;
    updated_at?: string;
    thumbnailImageUrl?: string;
    imageUrl?: string;
    thumbnail_path?: string;
    thumbnail_url?: string;
    tags?: string[];
    unity_version?: string;
    platform?: string;
    instances?: Array<{
        type: string;
        count: number;
    }>;
    // Firebase固有のフィールド
    authorId?: string;
    creator?: string;
    capacity?: number;
    recommendedCapacity?: number;
    favorites?: number;
    heat?: number;
    popularity?: number;
    labsPublicationDate?: string;
    publicationDate?: string;
    published?: string;
    scraped_at?: string;
    version?: number;
    world_id?: string;
}

export interface APIResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    count?: number;
}

export interface Stats {
    total_worlds: number;
    public_worlds: number;
    private_worlds: number;
    avg_visits: number;
    last_updated: string;
}

export interface SearchFilters {
    search?: string;
    releaseStatus?: 'all' | 'public' | 'private';
    sortBy?: 'name_asc' | 'name_desc' | 'updated_at_asc' | 'updated_at_desc' | 'visits_asc' | 'visits_desc';
    page?: number;
    limit?: number;
}
