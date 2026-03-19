/**
 * 飲控助手 - 資料層 (storage.js)
 */
const storage = {
    keys: {
        config: 'macroTracker_v4_config',
        history: 'macroTracker_v4_history',
        common: 'macroTracker_v4_commonFoods'
    },

    migrate() {
        // 檢查是否需要從舊版 v2/v3 遷移
        if (!localStorage.getItem(this.keys.history)) {
            const oldHistory = localStorage.getItem('macroTracker_v2_history');
            if (oldHistory) {
                const data = JSON.parse(oldHistory);
                const newData = {};
                Object.keys(data).forEach(date => {
                    newData[date] = { food: data[date], water: [] };
                });
                localStorage.setItem(this.keys.history, JSON.stringify(newData));
            }
        }
    },

    save(config, history, common) {
        localStorage.setItem(this.keys.config, JSON.stringify(config));
        localStorage.setItem(this.keys.history, JSON.stringify(history));
        localStorage.setItem(this.keys.common, JSON.stringify(common));
    },

    load() {
        return {
            config: JSON.parse(localStorage.getItem(this.keys.config)),
            history: JSON.parse(localStorage.getItem(this.keys.history)) || {},
            common: JSON.parse(localStorage.getItem(this.keys.common)) || []
        };
    },

    // 核心修復：正確下載 JSON 檔案
    export() {
        const data = this.load();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const dateStr = new Date().toISOString().split('T')[0];
        
        a.href = url;
        a.download = `飲控助手備份_${dateStr}.json`;
        document.body.appendChild(a); // 必須附加到 DOM
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        if (window.ui) ui.showMessage("備份下載中...");
    },

    // 核心修復：正確讀取與儲存
    import(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                // 驗證必要欄位
                if (data.config && data.history) {
                    localStorage.setItem(this.keys.config, JSON.stringify(data.config));
                    localStorage.setItem(this.keys.history, JSON.stringify(data.history));
                    localStorage.setItem(this.keys.common, JSON.stringify(data.common || []));
                    
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
