/**
 * 飲控助手 - 日曆邏輯 (calendar.js)
 */

window.calendar = {
    selectedDate: '', // 格式: YYYY-MM-DD
    viewDate: new Date(), // 當前日曆切換到的月份查看點

    init() {
        // 1. 取得台北時間的今天
        const now = new Date();
        this.selectedDate = this.formatDate(now);
        this.viewDate = new Date(now);

        // 2. 立即更新介面上的文字標籤，防止出現 "--"
        this.updateDisplayLabel();
        
        // 3. 渲染日曆網格
        this.renderGrid();
    },

    // 格式化日期為 YYYY-MM-DD
    formatDate(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    },

    // 更新底部導航欄的日期文字
    updateDisplayLabel() {
        const el = document.getElementById('dateDisplay');
        const label = document.getElementById('currentDateLabel');
        
        if (el) {
            el.innerText = this.selectedDate;
        }

        // 更新頂部標題旁的「今天/日期」標籤
        if (label) {
            const todayStr = this.formatDate(new Date());
            label.innerText = (this.selectedDate === todayStr) ? "今天" : this.selectedDate;
        }
    },

    toggle() {
        const modal = document.getElementById('calendarModal');
        modal.classList.toggle('active');
    },

    close() {
        const modal = document.getElementById('calendarModal');
        if (modal) modal.classList.remove('active');
    },

    changeDateRelative(days) {
        const current = new Date(this.selectedDate);
        current.setDate(current.getDate() + days);
        this.selectedDate = this.formatDate(current);
        this.viewDate = new Date(current);
        
        this.updateDisplayLabel();
        this.renderGrid();
        
        // 連動主 App 更新數據
        if (window.app) app.updateUI();
    },

    goToToday() {
        const now = new Date();
        this.selectedDate = this.formatDate(now);
        this.viewDate = new Date(now);
        
        this.updateDisplayLabel();
        this.renderGrid();
        if (window.app) app.updateUI();
        this.close();
    },

    changeViewMonth(offset) {
        this.viewDate.setMonth(this.viewDate.getMonth() + offset);
        this.renderGrid();
    },

    selectDate(dateStr) {
        this.selectedDate = dateStr;
        this.updateDisplayLabel();
        this.renderGrid();
        if (window.app) app.updateUI();
        this.close();
    },

    renderGrid() {
        const grid = document.getElementById('calendarGrid');
        const viewLabel = document.getElementById('calendarViewLabel');
        if (!grid || !viewLabel) return;

        grid.innerHTML = '';
        
        const year = this.viewDate.getFullYear();
        const month = this.viewDate.getMonth();
        viewLabel.innerText = `${year}年 ${month + 1}月`;

        // 計算該月第一天與最後一天
        const firstDay = new Date(year, month, 1).getDay();
        const lastDate = new Date(year, month + 1, 0).getDate();

        // 填充上個月的空白
        for (let i = 0; i < firstDay; i++) {
            const empty = document.createElement('div');
            empty.className = 'day-cell day-other opacity-0';
            grid.appendChild(empty);
        }

        // 填充本月日期
        for (let d = 1; d <= lastDate; d++) {
            const dateObj = new Date(year, month, d);
            const dateStr = this.formatDate(dateObj);
            const isSelected = dateStr === this.selectedDate;

            const cell = document.createElement('div');
            cell.className = `day-cell ${isSelected ? 'day-selected' : ''}`;
            cell.innerText = d;
            cell.onclick = () => this.selectDate(dateStr);
            grid.appendChild(cell);
        }
    }
};
