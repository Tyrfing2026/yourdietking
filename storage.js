/**
 * 專門處理 LocalStorage 與 資料遷移的邏輯
 */
const storage = {
    keys: {
        config: 'macroTracker_v4_config',
        history: 'macroTracker_v4_history',
        common: 'macroTracker_v4_commonFoods'
    },

    // 搬家邏輯：確保舊版本資料不會消失
    migrate() {
        if (!localStorage.getItem(this.keys.history)) {
            const v3_history = localStorage.getItem('macroTracker_v3_history');
            const v3_config = localStorage.getItem('macroTracker_v3_config');
            const v3_common = localStorage.getItem('macroTracker_v3_commonFoods');

            if (v3_history) {
                const oldData = JSON.parse(v3_history);
                const newData = {};
                // 將舊格式轉換為 { food: [], water: [] } 格式
                Object.keys(oldData).forEach(date => {
                    newData[date] = {
                        food: oldData[date].map(item => ({ ...item, type: 'food' })),
                        water: []
                    };
                });
                localStorage.setItem(this.keys.history, JSON.stringify(newData));
            }
            if (v3_config) localStorage.setItem(this.keys.config, v3_config);
            if (v3_common) localStorage.setItem(this.keys.common, v3_common);
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

    export() {
        const data = this.load();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const date = new Date().toISOString().split('T')[0];
        a.href = url;
        a.download = `nutrition_backup_${date}.json`;
        a.click();
        URL.revokeObjectURL(url);
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
                    location.reload();
                }
            } catch (err) {
                alert("匯入失敗：檔案格式錯誤");
            }
        };
        reader.readAsText(file);
    }
};
