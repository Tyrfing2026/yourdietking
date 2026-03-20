/**
 * 飲控助手 - 日曆邏輯 (calendar.js)
 */

window.calendar = {
    selectedDate: '', // 格式: YYYY-MM-DD
    viewDate: new Date(),

    init() {
        // 1. 取得當前日期 (考慮台北時區)
        const now = new Date();
        this.selectedDate = this.formatDate(now);
        this.viewDate = new Date(now);

        // 2. 核心修正：立即將日期寫入介面，防止出現 "--"
        this.syncUIDate();
        
        // 3. 渲染日曆小視窗
        this.renderGrid();
    },

    // 格式化日期為 YYYY-MM-DD (手動拼接最安全)
    formatDate(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    },

    // 同步更新介面上所有的日期標籤
    syncUIDate() {
        const dateDisplay = document.getElementById('dateDisplay');
        const headerLabel = document.getElementById('currentDateLabel');
        const todayStr = this.formatDate(new Date());

        // 更新底部導航日期
        if (dateDisplay) {
            dateDisplay.innerText = this.selectedDate;
        }

        // 更新頂部標題旁的標籤
        if (headerLabel) {
            headerLabel.innerText = (this.selectedDate === todayStr) ? "今天" : this.selectedDate;
        }
    },

    toggle() {
        const modal = document.getElementById('calendarModal');
        if (modal) {
            modal.classList.toggle('active');
            if (modal.classList.contains('active')) this.renderGrid();
        }
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
        
        this.syncUIDate();
        this.renderGrid();
        if (window.app) app.updateUI();
    },

    goToToday() {
        const now = new Date();
        this.selectedDate = this.formatDate(now);
        this.viewDate = new Date(now);
        
        this.syncUIDate();
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
        this.syncUIDate();
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

        const firstDay = new Date(year, month, 1).getDay();
        const lastDate = new Date(year, month + 1, 0).getDate();

        // 填充空白
        for (let i = 0; i < firstDay; i++) {
            const empty = document.createElement('div');
            empty.className = 'day-cell day-other opacity-0';
            grid.appendChild(empty);
        }

        // 填充日期
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
