/**
 * 飲控助手 - 日曆元件 (calendar.js)
 */
const calendar = {
    selectedDate: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' }),
    viewDate: new Date(),

    init() {
        this.updateDisplay();
        this.render();
    },

    toggle() {
        const modal = document.getElementById('calendarModal');
        if (!modal) return;
        if (modal.classList.contains('active')) {
            this.close();
        } else {
            this.render();
            modal.classList.add('active');
        }
    },

    close() {
        const modal = document.getElementById('calendarModal');
        if (modal) modal.classList.remove('active');
    },

    changeViewMonth(offset) {
        this.viewDate.setMonth(this.viewDate.getMonth() + offset);
        this.render();
    },

    // 關鍵修復：選取日期後正確觸發 UI 更新
    selectDate(dateStr) {
        this.selectedDate = dateStr;
        this.viewDate = new Date(dateStr);
        this.updateDisplay();
        this.close();
        // 確保主程式知道日期變了
        if (window.app && typeof window.app.updateUI === 'function') {
            window.app.updateUI();
        }
    },

    changeDateRelative(days) {
        let current = new Date(this.selectedDate);
        current.setDate(current.getDate() + days);
        this.selectedDate = current.toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });
        this.viewDate = new Date(this.selectedDate);
        this.updateDisplay();
        if (window.app) window.app.updateUI();
    },

    goToToday() {
        this.selectedDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });
        this.viewDate = new Date(this.selectedDate);
        this.updateDisplay();
        if (window.app) window.app.updateUI();
        if (window.ui) window.ui.showMessage("回至今天數據");
    },

    updateDisplay() {
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });
        const display = document.getElementById('dateDisplay');
        const label = document.getElementById('currentDateLabel');
        if (display) display.innerText = this.selectedDate;
        if (label) label.innerText = (this.selectedDate === today) ? "今天" : this.selectedDate;
    },

    render() {
        const y = this.viewDate.getFullYear();
        const m = this.viewDate.getMonth();
        const label = document.getElementById('calendarViewLabel');
        if (label) label.innerText = `${y}年${String(m + 1).padStart(2, '0')}月`;
        
        const firstDay = new Date(y, m, 1).getDay();
        const daysInMonth = new Date(y, m + 1, 0).getDate();
        const lastMonthDays = new Date(y, m, 0).getDate();
        
        const grid = document.getElementById('calendarGrid');
        if (!grid) return;
        grid.innerHTML = '';

        // 上個月灰色日期
        for (let i = firstDay - 1; i >= 0; i--) {
            grid.appendChild(this.createCell(lastMonthDays - i, 'day-other'));
        }
        
        // 當月日期
        for (let i = 1; i <= daysInMonth; i++) {
            const s = `${y}-${String(m + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const c = this.createCell(i, s === this.selectedDate ? 'day-selected' : '');
            c.onclick = () => this.selectDate(s);
            grid.appendChild(c);
        }
        
        // 下個月灰色日期
        const remaining = (7 - (grid.children.length % 7)) % 7;
        for (let i = 1; i <= remaining; i++) {
            grid.appendChild(this.createCell(i, 'day-other'));
        }
    },

    createCell(num, className) {
        const div = document.createElement('div');
        div.className = `day-cell ${className}`;
        div.innerText = num;
        return div;
    }
};
