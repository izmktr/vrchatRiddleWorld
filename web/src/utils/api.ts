import { VRChatWorld, APIResponse, Stats } from '../types/index.js';

/**
 * APIのベースURL
 */
const getBaseURL = (): string => {
    // 本番環境（Vercel）の場合
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        console.log('🌐 Production environment detected');
        return window.location.origin;
    }
    
    // 開発環境でViteサーバー（3000番台ポート）を使用している場合
    if (window.location.port === '3000' || window.location.port === '3001') {
        console.log('🔧 Vite development server detected - using proxy');
        return window.location.origin; // Viteのプロキシを使用
    }
    
    // 開発環境でFlaskサーバーを直接使用している場合
    console.log('🔧 Direct Flask development server');
    return 'http://localhost:5000';
};

const BASE_URL = getBaseURL();

/**
 * APIクライアントクラス
 */
class APIClient {
    private baseURL: string;

    constructor() {
        this.baseURL = BASE_URL;
    }

    /**
     * HTTPリクエストを送信
     */
    private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
        try {
            console.log('🔄 API Request:', `${this.baseURL}${endpoint}`);
            
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options?.headers,
                },
                ...options,
            });

            console.log('📡 API Response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ API Error:', errorText);
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }

            const data = await response.json();
            console.log('✅ API Response data:', data);
            return data;
        } catch (error) {
            console.error('💥 API request failed:', error);
            throw error;
        }
    }

    /**
     * 統計情報を取得
     */
    async getStats(): Promise<Stats> {
        return this.request<Stats>('/api/stats');
    }

    /**
     * ワールド一覧を取得（制限付き）
     */
    async getWorlds(params?: {
        limit?: number;
        search?: string;
        releaseStatus?: string;
        sortBy?: string;
    }): Promise<APIResponse<VRChatWorld[]>> {
        const searchParams = new URLSearchParams();
        
        if (params?.limit) searchParams.append('limit', params.limit.toString());
        if (params?.search) searchParams.append('search', params.search);
        if (params?.releaseStatus && params.releaseStatus !== 'all') {
            searchParams.append('releaseStatus', params.releaseStatus);
        }
        if (params?.sortBy) searchParams.append('sortBy', params.sortBy);

        const endpoint = `/api/vrchat_worlds${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
        return this.request<APIResponse<VRChatWorld[]>>(endpoint);
    }

    /**
     * すべてのワールドを取得
     */
    async getAllWorlds(): Promise<VRChatWorld[]> {
        const response = await this.request<APIResponse<VRChatWorld[]>>('/api/vrchat_worlds/all');
        return response.data || [];
    }

    /**
     * ヘルスチェック
     */
    async healthCheck(): Promise<{ status: string; timestamp: string; database_connected: boolean }> {
        return this.request('/api/health');
    }
}

// シングルトンインスタンス
export const apiClient = new APIClient();

/**
 * 便利関数
 */

/**
 * 画像URLを取得（優先度順）
 */
export function getImageUrl(world: VRChatWorld): string {
    // 1. VRChat公式サムネイルURL
    if (world.thumbnailImageUrl) {
        return world.thumbnailImageUrl;
    }
    
    // 2. VRChat元画像URL
    if (world.imageUrl) {
        return world.imageUrl;
    }
    
    // 3. 外部URL
    if (world.thumbnail_url && world.thumbnail_url.startsWith('http')) {
        return world.thumbnail_url;
    }
    
    // 4. ローカルサムネイル（開発環境のみ）
    if (world.thumbnail_path && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        return `${BASE_URL}/thumbnail/${world.thumbnail_path.split('/').pop()}`;
    }
    
    // 5. プレースホルダー
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzIwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y0ZjRmNCIvPjx0ZXh0IHg9IjE2MCIgeT0iMTAwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM5OTk5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4=';
}

/**
 * 日付を日本語形式でフォーマット
 */
export function formatDate(dateString: string | undefined | null): string {
    if (!dateString) return '不明';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '不明';
        return date.toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return '不明';
    }
}

/**
 * 数値をカンマ区切りでフォーマット
 */
export function formatNumber(num: number | undefined | null): string {
    if (num == null || isNaN(num)) return '0';
    return num.toLocaleString('ja-JP');
}

/**
 * 公開状態を日本語に変換
 */
export function formatReleaseStatus(status: string | undefined | null): string {
    switch (status) {
        case 'public':
            return '公開';
        case 'private':
            return '非公開';
        default:
            return '不明';
    }
}

/**
 * エラーハンドリング用のユーティリティ
 */
export function handleError(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }
    return '不明なエラーが発生しました';
}
