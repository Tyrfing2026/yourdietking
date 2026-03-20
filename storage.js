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
        // 如果發現舊版本 v2 的資料，嘗試遷移一次
        if (!localStorage.getItem(this.keys.history)) {
            const v2History = localStorage.getItem('macroTracker_v2_history');
            if (v2History) {
                localStorage.setItem(this.keys.history, v2History);
                localStorage.setItem(this.keys.config, localStorage.getItem('macroTracker_v2_config') || '');
                localStorage.setItem(this.keys.common, localStorage.getItem('macroTracker_v2_commonFoods') || '');
            }
        }
    },

    save(config, history, common, templates) {
        if (config) localStorage.setItem(this.keys.config, JSON.stringify(config));
        if (history) localStorage.setItem(this.keys.history, JSON.stringify(history));
        if (common) localStorage.setItem(this.keys.common, JSON.stringify(common));
        if (templates) localStorage.setItem(this.keys.templates, JSON.stringify(templates));
    },

    load() {
        try {
            const templatesData = localStorage.getItem(this.keys.templates);
            return {
                config: JSON.parse(localStorage.getItem(this.keys.config)) || null,
                history: JSON.parse(localStorage.getItem(this.keys.history)) || {},
                common: JSON.parse(localStorage.getItem(this.keys.common)) || [],
                templates: templatesData ? JSON.parse(templatesData) : []
            };
        } catch (e) {
            console.error("Storage Load Error", e);
            return { config: null, history: {}, common: [], templates: [] };
        }
    },

    export() {
        const data = this.load();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const dateStr = new Date().toISOString().split('T')[0];
        a.href = url; a.download = `飲控助手備份_${dateStr}.json`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
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
                // 支援 v2 與 v5 的匯入格式相容
                const config = data.config;
                const history = data.history || data.historyData;
                const common = data.common || data.commonFoods || [];
                const templates = data.templates || [];
                
                if (config && history) {
                    this.save(config, history, common, templates);
                    if (window.ui) ui.showMessage("匯入成功！即將重新整理");
                    setTimeout(() => location.reload(), 1000);
                } else { throw new Error("Format Error"); }
            } catch (err) {
                if (window.ui) ui.showMessage("匯入失敗：格式不符", "error");
            }
        };
        reader.readAsText(file);
    }
};
