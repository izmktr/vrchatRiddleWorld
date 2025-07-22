import { VRChatWorld } from './types/index.js';
import { apiClient, getImageUrl, formatDate, formatNumber, formatReleaseStatus, handleError } from './utils/api.js';

/**
 * 管理ページのクラス
 */
class ManagePage {
    private worlds: VRChatWorld[] = [];
    private filteredWorlds: VRChatWorld[] = [];
    private selectedWorlds: Set<string> = new Set();
    private currentPage = 1;
    private itemsPerPage = 20;
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
        const searchInput = document.getElementById('manage-search-input') as HTMLInputElement;
        const searchBtn = document.getElementById('manage-search-btn') as HTMLButtonElement;
        
        searchBtn?.addEventListener('click', () => this.handleSearch());
        searchInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleSearch();
            }
        });

        // ソート・フィルター
        const sortSelect = document.getElementById('manage-sort-select') as HTMLSelectElement;
        const releaseStatusFilter = document.getElementById('manage-release-status-filter') as HTMLSelectElement;
        
        sortSelect?.addEventListener('change', () => this.handleSort());
        releaseStatusFilter?.addEventListener('change', () => this.handleFilter());

        // 管理操作ボタン
        document.getElementById('select-all-btn')?.addEventListener('click', () => this.selectAll());
        document.getElementById('deselect-all-btn')?.addEventListener('click', () => this.deselectAll());
        document.getElementById('export-selected-btn')?.addEventListener('click', () => this.exportSelected());
        document.getElementById('export-all-btn')?.addEventListener('click', () => this.exportAll());

        // ヘッダーチェックボックス
        const headerCheckbox = document.getElementById('header-checkbox') as HTMLInputElement;
        headerCheckbox?.addEventListener('change', () => this.toggleAllVisible());

        // ページネーション
        const prevBtn = document.getElementById('manage-prev-btn') as HTMLButtonElement;
        const nextBtn = document.getElementById('manage-next-btn') as HTMLButtonElement;
        
        prevBtn?.addEventListener('click', () => this.previousPage());
        nextBtn?.addEventListener('click', () => this.nextPage());

        // モーダル
        this.setupModalListeners();
    }

    /**
     * モーダルのイベントリスナー
     */
    private setupModalListeners(): void {
        const modal = document.getElementById('export-modal')!;
        const closeBtn = modal.querySelector('.close')!;
        const cancelBtn = document.getElementById('cancel-export-btn')!;
        const confirmBtn = document.getElementById('confirm-export-btn')!;

        closeBtn.addEventListener('click', () => this.hideModal());
        cancelBtn.addEventListener('click', () => this.hideModal());
        confirmBtn.addEventListener('click', () => this.executeExport());

        // モーダル外クリックで閉じる
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideModal();
            }
        });
    }

    /**
     * 統計情報を読み込み
     */
    private async loadStats(): Promise<void> {
        try {
            const stats = await apiClient.getStats();
            
            document.getElementById('manage-total-worlds')!.textContent = formatNumber(stats.total_worlds);
            this.updateSelectedCount();
            this.updateFilteredCount();
        } catch (error) {
            console.error('統計情報の読み込みに失敗:', error);
        }
    }

    /**
     * ワールドデータを読み込み
     */
    private async loadWorlds(): Promise<void> {
        if (this.isLoading) return;
        
        console.log('🔄 管理画面: ワールドデータ読み込み開始');
        this.isLoading = true;
        this.showLoading(true);

        try {
            console.log('📡 APIクライアントで全ワールドデータを取得中...');
            this.worlds = await apiClient.getAllWorlds();
            this.filteredWorlds = [...this.worlds];
            this.currentPage = 1;
            
            console.log(`📊 管理画面: ${this.worlds.length}件のワールドデータを読み込み完了`);
            
            this.renderTable();
            this.updatePagination();
            this.updateFilteredCount();
        } catch (error) {
            console.error('❌ 管理画面: ワールドデータの読み込みに失敗:', error);
            this.showError(handleError(error));
        } finally {
            this.isLoading = false;
            this.showLoading(false);
            console.log('🏁 管理画面: ワールドデータ読み込み終了');
        }
    }

    /**
     * テーブルをレンダリング
     */
    private renderTable(): void {
        const tbody = document.getElementById('worlds-table-body')!;
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const worldsToShow = this.filteredWorlds.slice(startIndex, endIndex);

        if (worldsToShow.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center">該当するワールドが見つかりませんでした</td></tr>';
            return;
        }

        tbody.innerHTML = worldsToShow.map(world => this.createTableRow(world)).join('');
        
        // チェックボックスのイベントリスナーを追加
        worldsToShow.forEach(world => {
            const checkbox = document.getElementById(`checkbox-${world.id}`) as HTMLInputElement;
            checkbox?.addEventListener('change', () => this.toggleSelection(world.id));
        });
    }

    /**
     * テーブル行のHTMLを生成
     */
    private createTableRow(world: VRChatWorld): string {
        const imageUrl = getImageUrl(world);
        const isSelected = this.selectedWorlds.has(world.id);
        const statusClass = world.releaseStatus === 'public' ? 'status-public' : 'status-private';
        
        // Firebaseデータのプロパティ名の違いに対応
        const authorName = world.authorDisplayName || world.author || (world as any).authorName || 'Unknown';
        const worldName = world.name || (world as any).title || 'Unknown World';
        
        return `
            <tr>
                <td>
                    <input type="checkbox" id="checkbox-${world.id}" ${isSelected ? 'checked' : ''}>
                </td>
                <td class="thumbnail-cell">
                    <img src="${imageUrl}" alt="${this.escapeHtml(worldName)}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjZjRmNGY0Ii8+PHRleHQgeD0iMzAiIHk9IjIwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTAiIGZpbGw9IiM5OTk5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4='">
                </td>
                <td class="world-name-cell">${this.escapeHtml(worldName)}</td>
                <td class="author-cell">${this.escapeHtml(authorName)}</td>
                <td class="status-cell ${statusClass}">${formatReleaseStatus(world.releaseStatus)}</td>
                <td class="visits-cell">${formatNumber(world.visits || 0)}</td>
                <td>${formatDate(world.updated_at)}</td>
                <td class="table-actions">
                    <button class="edit-btn" onclick="alert('編集機能は準備中です')">編集</button>
                    <button class="delete-btn" onclick="alert('削除機能は準備中です')">削除</button>
                </td>
            </tr>
        `;
    }

    /**
     * 選択を切り替え
     */
    private toggleSelection(worldId: string): void {
        if (this.selectedWorlds.has(worldId)) {
            this.selectedWorlds.delete(worldId);
        } else {
            this.selectedWorlds.add(worldId);
        }
        this.updateSelectedCount();
        this.updateHeaderCheckbox();
    }

    /**
     * 表示中のすべてを切り替え
     */
    private toggleAllVisible(): void {
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const worldsToShow = this.filteredWorlds.slice(startIndex, endIndex);
        
        const headerCheckbox = document.getElementById('header-checkbox') as HTMLInputElement;
        const shouldSelect = headerCheckbox.checked;
        
        worldsToShow.forEach(world => {
            const checkbox = document.getElementById(`checkbox-${world.id}`) as HTMLInputElement;
            if (checkbox) {
                checkbox.checked = shouldSelect;
                if (shouldSelect) {
                    this.selectedWorlds.add(world.id);
                } else {
                    this.selectedWorlds.delete(world.id);
                }
            }
        });
        
        this.updateSelectedCount();
    }

    /**
     * すべて選択
     */
    private selectAll(): void {
        this.filteredWorlds.forEach(world => this.selectedWorlds.add(world.id));
        this.updateSelectedCount();
        this.renderTable(); // チェックボックスを更新
    }

    /**
     * 選択解除
     */
    private deselectAll(): void {
        this.selectedWorlds.clear();
        this.updateSelectedCount();
        this.renderTable(); // チェックボックスを更新
    }

    /**
     * 選択中のアイテム数を更新
     */
    private updateSelectedCount(): void {
        document.getElementById('selected-count')!.textContent = formatNumber(this.selectedWorlds.size);
    }

    /**
     * 表示中のアイテム数を更新
     */
    private updateFilteredCount(): void {
        document.getElementById('filtered-count')!.textContent = formatNumber(this.filteredWorlds.length);
    }

    /**
     * ヘッダーチェックボックスを更新
     */
    private updateHeaderCheckbox(): void {
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const worldsToShow = this.filteredWorlds.slice(startIndex, endIndex);
        
        const selectedInPage = worldsToShow.filter(world => this.selectedWorlds.has(world.id)).length;
        const headerCheckbox = document.getElementById('header-checkbox') as HTMLInputElement;
        
        if (selectedInPage === 0) {
            headerCheckbox.checked = false;
            headerCheckbox.indeterminate = false;
        } else if (selectedInPage === worldsToShow.length) {
            headerCheckbox.checked = true;
            headerCheckbox.indeterminate = false;
        } else {
            headerCheckbox.checked = false;
            headerCheckbox.indeterminate = true;
        }
    }

    /**
     * 検索を処理
     */
    private handleSearch(): void {
        const searchInput = document.getElementById('manage-search-input') as HTMLInputElement;
        const searchTerm = searchInput.value.toLowerCase().trim();
        
        console.log('🔍 管理画面検索実行:', searchTerm);
        
        this.applyFilters(searchTerm);
    }

    /**
     * ソートを処理
     */
    private handleSort(): void {
        const sortSelect = document.getElementById('manage-sort-select') as HTMLSelectElement;
        const sortBy = sortSelect.value;
        
        console.log('🔄 管理画面ソート実行:', sortBy);
        
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
        this.renderTable();
        this.updatePagination();
    }

    /**
     * フィルターを処理
     */
    private handleFilter(): void {
        const searchInput = document.getElementById('manage-search-input') as HTMLInputElement;
        const searchTerm = searchInput.value.toLowerCase().trim();
        
        this.applyFilters(searchTerm);
    }

    /**
     * フィルターを適用
     */
    private applyFilters(searchTerm: string): void {
        const releaseStatusFilter = document.getElementById('manage-release-status-filter') as HTMLSelectElement;
        const releaseStatus = releaseStatusFilter.value;
        
        console.log('🔍 管理画面フィルター実行:', { searchTerm, releaseStatus });
        
        this.filteredWorlds = this.worlds.filter(world => {
            // リリースステータスフィルター
            if (releaseStatus !== 'all' && world.releaseStatus !== releaseStatus) {
                return false;
            }
            
            // 検索フィルター
            if (searchTerm !== '') {
                // Firebaseデータのプロパティ名の違いに対応した安全な検索
                const worldName = (world.name || (world as any).title || '').toLowerCase();
                const authorName = (world.author || world.authorDisplayName || (world as any).authorName || '').toLowerCase();
                const description = (world.description || '').toLowerCase();
                
                return worldName.includes(searchTerm) ||
                       authorName.includes(searchTerm) ||
                       description.includes(searchTerm);
            }
            
            return true;
        });
        
        console.log(`📊 管理画面フィルター結果: ${this.filteredWorlds.length}件`);
        
        this.currentPage = 1;
        this.renderTable();
        this.updatePagination();
        this.updateFilteredCount();
    }

    /**
     * 選択されたワールドをエクスポート
     */
    private exportSelected(): void {
        if (this.selectedWorlds.size === 0) {
            alert('エクスポートするワールドを選択してください。');
            return;
        }
        this.showModal();
    }

    /**
     * すべてのワールドをエクスポート
     */
    private exportAll(): void {
        // 一時的にすべて選択
        this.filteredWorlds.forEach(world => this.selectedWorlds.add(world.id));
        this.showModal();
    }

    /**
     * モーダルを表示
     */
    private showModal(): void {
        const modal = document.getElementById('export-modal')!;
        modal.style.display = 'block';
    }

    /**
     * モーダルを非表示
     */
    private hideModal(): void {
        const modal = document.getElementById('export-modal')!;
        modal.style.display = 'none';
    }

    /**
     * エクスポートを実行
     */
    private executeExport(): void {
        const formatRadios = document.querySelectorAll('input[name="export-format"]') as NodeListOf<HTMLInputElement>;
        const fieldCheckboxes = document.querySelectorAll('input[name="export-field"]:checked') as NodeListOf<HTMLInputElement>;
        
        const format = Array.from(formatRadios).find(radio => radio.checked)?.value || 'csv';
        const fields = Array.from(fieldCheckboxes).map(checkbox => checkbox.value);
        
        const selectedWorldsData = this.worlds.filter(world => this.selectedWorlds.has(world.id));
        
        if (format === 'csv') {
            this.exportToCSV(selectedWorldsData, fields);
        } else {
            this.exportToJSON(selectedWorldsData, fields);
        }
        
        this.hideModal();
    }

    /**
     * CSVでエクスポート
     */
    private exportToCSV(worlds: VRChatWorld[], fields: string[]): void {
        const headers = fields.map(field => {
            switch (field) {
                case 'id': return 'ID';
                case 'name': return 'ワールド名';
                case 'author': return '作者';
                case 'description': return '説明';
                case 'visits': return '訪問数';
                case 'releaseStatus': return '公開状態';
                case 'updated_at': return '更新日';
                case 'tags': return 'タグ';
                default: return field;
            }
        });
        
        const csvContent = [
            headers.join(','),
            ...worlds.map(world => 
                fields.map(field => {
                    let value = world[field as keyof VRChatWorld] as string;
                    if (field === 'releaseStatus') {
                        value = formatReleaseStatus(value);
                    } else if (field === 'updated_at') {
                        value = formatDate(value);
                    } else if (field === 'tags' && Array.isArray(value)) {
                        value = value.join('; ');
                    }
                    const safeValue = (value || '').toString();
                    return `"${safeValue.replace(/"/g, '""')}"`;
                }).join(',')
            )
        ].join('\n');
        
        this.downloadFile(csvContent, `vrchat_worlds_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv');
    }

    /**
     * JSONでエクスポート
     */
    private exportToJSON(worlds: VRChatWorld[], fields: string[]): void {
        const data = worlds.map(world => {
            const filteredWorld: any = {};
            fields.forEach(field => {
                filteredWorld[field] = world[field as keyof VRChatWorld];
            });
            return filteredWorld;
        });
        
        const jsonContent = JSON.stringify(data, null, 2);
        this.downloadFile(jsonContent, `vrchat_worlds_${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
    }

    /**
     * ファイルをダウンロード
     */
    private downloadFile(content: string, filename: string, contentType: string): void {
        const blob = new Blob([content], { type: contentType });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }

    /**
     * ページネーション
     */
    private updatePagination(): void {
        const totalPages = Math.ceil(this.filteredWorlds.length / this.itemsPerPage);
        const prevBtn = document.getElementById('manage-prev-btn') as HTMLButtonElement;
        const nextBtn = document.getElementById('manage-next-btn') as HTMLButtonElement;
        const pageInfo = document.getElementById('manage-page-info')!;
        const pagination = document.getElementById('manage-pagination')!;
        
        if (totalPages <= 1) {
            pagination.style.display = 'none';
            return;
        }
        
        pagination.style.display = 'flex';
        prevBtn.disabled = this.currentPage <= 1;
        nextBtn.disabled = this.currentPage >= totalPages;
        pageInfo.textContent = `${this.currentPage} / ${totalPages}`;
    }

    private previousPage(): void {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.renderTable();
            this.updatePagination();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    private nextPage(): void {
        const totalPages = Math.ceil(this.filteredWorlds.length / this.itemsPerPage);
        if (this.currentPage < totalPages) {
            this.currentPage++;
            this.renderTable();
            this.updatePagination();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    /**
     * ローディング表示を制御
     */
    private showLoading(show: boolean): void {
        const loading = document.getElementById('manage-loading')!;
        const table = document.querySelector('.worlds-table-container')! as HTMLElement;
        
        if (show) {
            loading.style.display = 'block';
            table.style.display = 'none';
        } else {
            loading.style.display = 'none';
            table.style.display = 'block';
        }
    }

    /**
     * エラーメッセージを表示
     */
    private showError(message: string): void {
        const errorElement = document.getElementById('manage-error-message')!;
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        
        const loading = document.getElementById('manage-loading')!;
        const table = document.querySelector('.worlds-table-container')! as HTMLElement;
        loading.style.display = 'none';
        table.style.display = 'none';
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
    new ManagePage();
});
