import { VRChatWorld } from './types/index.js';
import { apiClient, getImageUrl, formatDate, formatNumber, formatReleaseStatus, handleError } from './utils/api.js';

/**
 * メインページのクラス
 */
class MainPage {
    private worlds: VRChatWorld[] = [];
    private filteredWorlds: VRChatWorld[] = [];
    private currentPage = 1;
    private itemsPerPage = 12;
    private isLoading = false;

    constructor() {
        this.init();
    }

    /**
     * 初期化
     */
    private async init(): Promise<void> {
        this.setupEventListeners();
        await this.loadStats();
        await this.loadWorlds();
    }

    /**
     * イベントリスナーを設定
     */
    private setupEventListeners(): void {
        // 検索
        const searchInput = document.getElementById('search-input') as HTMLInputElement;
        const searchBtn = document.getElementById('search-btn') as HTMLButtonElement;
        
        searchBtn?.addEventListener('click', () => this.handleSearch());
        searchInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleSearch();
            }
        });

        // ソート
        const sortSelect = document.getElementById('sort-select') as HTMLSelectElement;
        sortSelect?.addEventListener('change', () => this.handleSort());

        // フィルター
        const releaseStatusFilter = document.getElementById('release-status-filter') as HTMLSelectElement;
        releaseStatusFilter?.addEventListener('change', () => this.handleFilter());

        // ページネーション
        const prevBtn = document.getElementById('prev-btn') as HTMLButtonElement;
        const nextBtn = document.getElementById('next-btn') as HTMLButtonElement;
        
        prevBtn?.addEventListener('click', () => this.previousPage());
        nextBtn?.addEventListener('click', () => this.nextPage());
    }

    /**
     * 統計情報を読み込み
     */
    private async loadStats(): Promise<void> {
        try {
            const stats = await apiClient.getStats();
            
            document.getElementById('total-worlds')!.textContent = formatNumber(stats.total_worlds);
            document.getElementById('public-worlds')!.textContent = formatNumber(stats.public_worlds);
            document.getElementById('avg-visits')!.textContent = formatNumber(Math.round(stats.avg_visits));
            document.getElementById('last-updated')!.textContent = formatDate(stats.last_updated);
        } catch (error) {
            console.error('統計情報の読み込みに失敗:', error);
        }
    }

    /**
     * ワールドデータを読み込み
     */
    private async loadWorlds(): Promise<void> {
        if (this.isLoading) return;
        
        console.log('🔄 loadWorlds開始');
        this.isLoading = true;
        this.showLoading(true);

        try {
            console.log('📡 APIクライアントでワールドデータを取得中...');
            const response = await apiClient.getWorlds({ limit: 100 });
            console.log('✅ APIレスポンス:', response);
            
            this.worlds = response.data || [];
            this.filteredWorlds = [...this.worlds];
            this.currentPage = 1;
            
            console.log(`📊 読み込み完了: ${this.worlds.length}件のワールドデータ`);
            
            this.renderWorlds();
            this.updatePagination();
        } catch (error) {
            console.error('❌ ワールドデータの読み込みに失敗:', error);
            this.showError(handleError(error));
        } finally {
            this.isLoading = false;
            this.showLoading(false);
            console.log('🏁 loadWorlds終了');
        }
    }

    /**
     * ワールドカードをレンダリング
     */
    private renderWorlds(): void {
        const container = document.getElementById('worlds-grid')!;
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const worldsToShow = this.filteredWorlds.slice(startIndex, endIndex);

        if (worldsToShow.length === 0) {
            container.innerHTML = '<div class="no-results">該当するワールドが見つかりませんでした。</div>';
            return;
        }

        container.innerHTML = worldsToShow.map(world => this.createWorldCard(world)).join('');
    }

    /**
     * ワールドカードのHTMLを生成
     */
    private createWorldCard(world: VRChatWorld): string {
        const imageUrl = getImageUrl(world);
        const statusClass = world.releaseStatus === 'public' ? 'status-public' : 'status-private';
        
        // Firebaseデータのプロパティ名の違いに対応
        const authorName = world.authorDisplayName || world.author || (world as any).authorName || 'Unknown';
        const worldName = world.name || (world as any).title || 'Unknown World';
        const worldDescription = world.description || '説明なし';
        
        return `
            <div class="world-card" data-world-id="${world.id}">
                <div class="world-thumbnail">
                    <img src="${imageUrl}" alt="${this.escapeHtml(worldName)}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzIwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y0ZjRmNCIvPjx0ZXh0IHg9IjE2MCIgeT0iMTAwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM5OTk5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4='">
                    <div class="world-status ${statusClass}">
                        ${formatReleaseStatus(world.releaseStatus)}
                    </div>
                </div>
                <div class="world-info">
                    <h3 class="world-name">${this.escapeHtml(worldName)}</h3>
                    <div class="world-author">作者: ${this.escapeHtml(authorName)}</div>
                    <p class="world-description">${this.escapeHtml(worldDescription)}</p>
                    <div class="world-meta">
                        <span class="world-visits">👥 ${formatNumber(world.visits || 0)}</span>
                        <span class="world-updated">${formatDate(world.updated_at)}</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * 検索を処理
     */
    private handleSearch(): void {
        const searchInput = document.getElementById('search-input') as HTMLInputElement;
        const searchTerm = searchInput.value.toLowerCase().trim();
        
        console.log('🔍 検索実行:', searchTerm);
        
        if (searchTerm === '') {
            this.filteredWorlds = [...this.worlds];
        } else {
            this.filteredWorlds = this.worlds.filter(world => {
                // Firebaseデータのプロパティ名の違いに対応した安全な検索
                const worldName = (world.name || (world as any).title || '').toLowerCase();
                const authorName = (world.author || world.authorDisplayName || (world as any).authorName || '').toLowerCase();
                const description = (world.description || '').toLowerCase();
                
                return worldName.includes(searchTerm) ||
                       authorName.includes(searchTerm) ||
                       description.includes(searchTerm);
            });
        }
        
        console.log(`📊 検索結果: ${this.filteredWorlds.length}件 (全体: ${this.worlds.length}件)`);
        
        this.currentPage = 1;
        this.renderWorlds();
        this.updatePagination();
    }

    /**
     * ソートを処理
     */
    private handleSort(): void {
        const sortSelect = document.getElementById('sort-select') as HTMLSelectElement;
        const sortBy = sortSelect.value;
        
        console.log('🔄 ソート実行:', sortBy);
        
        this.filteredWorlds.sort((a, b) => {
            switch (sortBy) {
                case 'name_asc':
                    const nameA = (a.name || (a as any).title || '').toLowerCase();
                    const nameB = (b.name || (b as any).title || '').toLowerCase();
                    return nameA.localeCompare(nameB);
                case 'name_desc':
                    const nameDescA = (a.name || (a as any).title || '').toLowerCase();
                    const nameDescB = (b.name || (b as any).title || '').toLowerCase();
                    return nameDescB.localeCompare(nameDescA);
                case 'visits_asc':
                    return (a.visits || 0) - (b.visits || 0);
                case 'visits_desc':
                    return (b.visits || 0) - (a.visits || 0);
                case 'updated_at_asc':
                    const dateA = new Date(a.updated_at || 0).getTime();
                    const dateB = new Date(b.updated_at || 0).getTime();
                    return dateA - dateB;
                case 'updated_at_desc':
                default:
                    const dateDescA = new Date(a.updated_at || 0).getTime();
                    const dateDescB = new Date(b.updated_at || 0).getTime();
                    return dateDescB - dateDescA;
            }
        });
        
        this.currentPage = 1;
        this.renderWorlds();
        this.updatePagination();
    }

    /**
     * フィルターを処理
     */
    private handleFilter(): void {
        const releaseStatusFilter = document.getElementById('release-status-filter') as HTMLSelectElement;
        const releaseStatus = releaseStatusFilter.value;
        
        console.log('🔍 フィルター実行:', releaseStatus);
        
        if (releaseStatus === 'all') {
            this.filteredWorlds = [...this.worlds];
        } else {
            this.filteredWorlds = this.worlds.filter(world => world.releaseStatus === releaseStatus);
        }
        
        // 検索条件も適用
        const searchInput = document.getElementById('search-input') as HTMLInputElement;
        const searchTerm = searchInput.value.toLowerCase().trim();
        if (searchTerm !== '') {
            this.filteredWorlds = this.filteredWorlds.filter(world => {
                // Firebaseデータのプロパティ名の違いに対応した安全な検索
                const worldName = (world.name || (world as any).title || '').toLowerCase();
                const authorName = (world.author || world.authorDisplayName || (world as any).authorName || '').toLowerCase();
                const description = (world.description || '').toLowerCase();
                
                return worldName.includes(searchTerm) ||
                       authorName.includes(searchTerm) ||
                       description.includes(searchTerm);
            });
        }
        
        console.log(`📊 フィルター結果: ${this.filteredWorlds.length}件`);
        
        this.currentPage = 1;
        this.renderWorlds();
        this.updatePagination();
    }

    /**
     * ページネーションを更新
     */
    private updatePagination(): void {
        const totalPages = Math.ceil(this.filteredWorlds.length / this.itemsPerPage);
        const prevBtn = document.getElementById('prev-btn') as HTMLButtonElement;
        const nextBtn = document.getElementById('next-btn') as HTMLButtonElement;
        const pageInfo = document.getElementById('page-info')!;
        const pagination = document.getElementById('pagination')!;
        
        if (totalPages <= 1) {
            pagination.style.display = 'none';
            return;
        }
        
        pagination.style.display = 'flex';
        prevBtn.disabled = this.currentPage <= 1;
        nextBtn.disabled = this.currentPage >= totalPages;
        pageInfo.textContent = `${this.currentPage} / ${totalPages}`;
    }

    /**
     * 前のページ
     */
    private previousPage(): void {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.renderWorlds();
            this.updatePagination();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    /**
     * 次のページ
     */
    private nextPage(): void {
        const totalPages = Math.ceil(this.filteredWorlds.length / this.itemsPerPage);
        if (this.currentPage < totalPages) {
            this.currentPage++;
            this.renderWorlds();
            this.updatePagination();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    /**
     * ローディング表示を制御
     */
    private showLoading(show: boolean): void {
        const loading = document.getElementById('loading')!;
        const worldsGrid = document.getElementById('worlds-grid')!;
        
        if (show) {
            loading.style.display = 'block';
            worldsGrid.style.display = 'none';
        } else {
            loading.style.display = 'none';
            worldsGrid.style.display = 'grid';
        }
    }

    /**
     * エラーメッセージを表示
     */
    private showError(message: string): void {
        const errorElement = document.getElementById('error-message')!;
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        
        const loading = document.getElementById('loading')!;
        const worldsGrid = document.getElementById('worlds-grid')!;
        loading.style.display = 'none';
        worldsGrid.style.display = 'none';
    }

    /**
     * HTMLエスケープ
     */
    private escapeHtml(unsafe: string | undefined | null): string {
        if (!unsafe) return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// DOMContentLoaded時に初期化
document.addEventListener('DOMContentLoaded', () => {
    new MainPage();
});
