/**
 * 飲控助手 - 資料層 (storage.js)
 */
const storage = {
    keys: {
        config: 'macroTracker_v5_config',
        history: 'macroTracker_v5_history',
        common: 'macroTracker_v5_commonFoods',
        templates: 'macroTracker_v5_templates'
    },

    migrate() {
        if (!localStorage.getItem(this.keys.history)) {
            const oldHistory = localStorage.getItem('macroTracker_v4_history');
            if (oldHistory) {
                localStorage.setItem(this.keys.history, oldHistory);
                localStorage.setItem(this.keys.config, localStorage.getItem('macroTracker_v4_config'));
                localStorage.setItem(this.keys.common, localStorage.getItem('macroTracker_v4_commonFoods'));
            }
        }
    },

    // 核心修正：明確要求 4 個參數，若沒傳則抓取目前已有的
    save(config, history, common, templates) {
        if (config) localStorage.setItem(this.keys.config, JSON.stringify(config));
        if (history) localStorage.setItem(this.keys.history, JSON.stringify(history));
        if (common) localStorage.setItem(this.keys.common, JSON.stringify(common));
        // 防止模板被 undefined 覆蓋成 null
        if (templates) localStorage.setItem(this.keys.templates, JSON.stringify(templates));
    },

    load() {
        return {
            config: JSON.parse(localStorage.getItem(this.keys.config)),
            history: JSON.parse(localStorage.getItem(this.keys.history)) || {},
            common: JSON.parse(localStorage.getItem(this.keys.common)) || [],
            templates: JSON.parse(localStorage.getItem(this.keys.templates)) || []
        };
    },

    export() {
        const data = this.load();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const dateStr = new Date().toISOString().split('T')[0];
        
        a.href = url;
        a.download = `飲控助手備份_${dateStr}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        if (window.ui) ui.showMessage("備份下載中...");
    },

    import(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.config && data.history) {
                    localStorage.setItem(this.keys.config, JSON.stringify(data.config));
                    localStorage.setItem(this.keys.history, JSON.stringify(data.history));
                    localStorage.setItem(this.keys.common, JSON.stringify(data.common || []));
                    if (data.templates) localStorage.setItem(this.keys.templates, JSON.stringify(data.templates));
                    
                    if (window.ui) ui.showMessage("匯入成功！即將重新整理");
                    setTimeout(() => location.reload(), 1000);
                } else {
                    throw new Error("格式錯誤");
                }
            } catch (err) {
                if (window.ui) ui.showMessage("匯入失敗：檔案格式不相符", "error");
            }
        };
        reader.readAsText(file);
    }
};
