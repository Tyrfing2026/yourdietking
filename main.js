/**
 * 飲控助手 - 主邏輯 (main.js)
 */

let config = { protein: 150, carbs: 200, fat: 65, waterGoal: 2000, kcal: 2000 };
let historyData = {};
let commonFoods = [];

window.onload = () => {
    if (typeof storage !== 'undefined') {
        storage.migrate();
        const data = storage.load();
        if (data.config) {
            config = data.config;
            ui.syncGoalInputs();
        }
        historyData = data.history || {};
        commonFoods = data.common || [];
    }

    if (typeof calendar !== 'undefined') calendar.init();
    if (typeof lucide !== 'undefined') lucide.createIcons();
    
    app.updateUI(); 
    ui.initClickOutside();
};

window.app = {
    // UI 渲染：與日曆日期同步
    updateUI() {
        const date = calendar.selectedDate;
        const data = historyData[date] || { food: [], water: [] };
        
        const tp = data.food.reduce((s, e) => s + e.p, 0);
        const tc = data.food.reduce((s, e) => s + e.c, 0);
        const tf = data.food.reduce((s, e) => s + e.f, 0);
        const tk = data.food.reduce((s, e) => s + (e.kcal || 0), 0);

        const circle = document.getElementById('calorieCircle');
        if (circle) {
            const circ = 452.38;
            const kcalPct = Math.min(tk / (config.kcal || 1), 1);
            circle.style.strokeDashoffset = circ - (kcalPct * circ);
            circle.classList.toggle('text-rose-500', config.kcal - tk < 0);
            circle.classList.toggle('text-emerald-500', config.kcal - tk >= 0);
        }

        document.getElementById('displayCalories').innerText = Math.round(tk);
        const rem = config.kcal - tk;
        const statusEl = document.getElementById('calorieStatus');
        if (statusEl) {
            statusEl.innerHTML = rem < 0 ? `超過 <span class="text-rose-500 font-black">${Math.abs(Math.round(rem))}</span>` : `剩餘 <span class="text-emerald-500 font-black">${Math.round(rem)}</span>`;
        }

        ui.setBar('protein', tp, config.protein);
        ui.setBar('carbs', tc, config.carbs);
        ui.setBar('fat', tf, config.fat);

        const tw = data.water.reduce((s, e) => s + e.amount, 0);
        const wPct = Math.min(tw / (config.waterGoal || 1) * 100, 100);
        const wBar = document.getElementById('waterMainBar');
        if (wBar) wBar.style.width = wPct + '%';
        document.getElementById('waterMainText').innerText = Math.round(wPct) + '%';

        ui.renderList(data.food, data.water);
        document.getElementById('targetKcalDisplay').innerText = config.kcal;
    },

    // 常用食物選單控制
    showCommon() {
        const dropdown = document.getElementById('commonFoodDropdown');
        if (dropdown) {
            dropdown.classList.add('dropdown-active');
            ui.filterCommon();
        }
    },

    hideCommon() {
        const dropdown = document.getElementById('commonFoodDropdown');
        if (dropdown) {
            dropdown.classList.remove('dropdown-active');
        }
    },

    // 切換選單狀態 (點擊箭頭按鈕用)
    toggleCommon(e) {
        if (e) e.stopPropagation();
        const dropdown = document.getElementById('commonFoodDropdown');
        if (dropdown) {
            const isActive = dropdown.classList.contains('dropdown-active');
            if (isActive) {
                this.hideCommon();
            } else {
                this.showCommon();
            }
        }
    },

    // 智慧星號功能 (雙向切換) - 修改重點：僅儲存單份營養素
    toggleCommonFromHistory(id) {
        const date = calendar.selectedDate;
        const entry = historyData[date]?.food.find(e => e.id === id);
        if (!entry) return;

        const commonIndex = commonFoods.findIndex(f => f.name === entry.name);
        if (commonIndex > -1) {
            // 已存在於常用清單 -> 移除
            commonFoods.splice(commonIndex, 1);
            ui.showMessage(`已從常用清單移除`);
        } else {
            // 不存在 -> 存入單份營養素
            commonFoods.push({ 
                id: Date.now(), 
                name: entry.name, 
                p: entry.rawP, // 存入記錄時保留的單份數據
                c: entry.rawC, 
                f: entry.rawF 
            });
            ui.showMessage(`"${entry.name}" (單份) 已存為常用食物`);
        }
        storage.save(config, historyData, commonFoods);
        ui.filterCommon();
        this.updateUI(); 
    },

    // 新增飲食紀錄 - 修改重點：額外保留單份數據
    addFood() {
        const name = document.getElementById('itemName').value || "未命名餐點";
        const srv = parseFloat(document.getElementById('inputServings').value) || 1;
        const p_per = parseFloat(document.getElementById('inputProtein').value) || 0;
        const c_per = parseFloat(document.getElementById('inputCarbs').value) || 0;
        const f_per = parseFloat(document.getElementById('inputFat').value) || 0;

        if (p_per === 0 && c_per === 0 && f_per === 0) return ui.showMessage("請輸入數值", "error");

        const entry = {
            id: Date.now(),
            type: 'food',
            name, 
            p: p_per * srv,       // 當日總攝取量 (顯示於明細)
            c: c_per * srv, 
            f: f_per * srv, 
            rawP: p_per,          // 保留單份蛋白質 (存常用時使用)
            rawC: c_per,          // 保留單份碳水
            rawF: f_per,          // 保留單份脂肪
            kcal: Math.round(((p_per * srv) * 4) + ((c_per * srv) * 4) + ((f_per * srv) * 9)),
            time: this.getTaipeiTime()
        };

        const date = calendar.selectedDate;
        if (!historyData[date]) historyData[date] = { food: [], water: [] };
        historyData[date].food.unshift(entry);
        
        ui.resetFoodInputs();
        storage.save(config, historyData, commonFoods);
        this.updateUI();
        ui.closeModal('foodModal');
        ui.showMessage(`已記錄：${name}`);
    },

    deleteEntry(type, id) {
        const date = calendar.selectedDate;
        if (historyData[date]) {
            historyData[date][type] = historyData[date][type].filter(e => e.id !== id);
            storage.save(config, historyData, commonFoods);
            this.updateUI();
        }
    },

    deleteCommon(id, e) {
        if (e) e.stopPropagation(); 
        commonFoods = commonFoods.filter(f => f.id !== id);
        storage.save(config, historyData, commonFoods);
        ui.filterCommon();
        this.updateUI(); 
    },

    updateTargets() {
        config.protein = parseFloat(document.getElementById('targetProtein').value) || 0;
        config.carbs = parseFloat(document.getElementById('targetCarbs').value) || 0;
        config.fat = parseFloat(document.getElementById('targetFat').value) || 0;
        config.waterGoal = parseFloat(document.getElementById('targetWater').value) || 2000;
        config.kcal = Math.round((config.protein * 4) + (config.carbs * 4) + (config.fat * 9));
        storage.save(config, historyData, commonFoods);
        this.updateUI();
    },

    quickWater(ml) { document.getElementById('waterInput').value = ml; },
    addWater() {
        const ml = parseFloat(document.getElementById('waterInput').value) || 0;
        if (ml <= 0) return ui.showMessage("請輸入飲水量", "error");
        const entry = { id: Date.now(), type: 'water', amount: ml, time: this.getTaipeiTime() };
        const date = calendar.selectedDate;
        if (!historyData[date]) historyData[date] = { food: [], water: [] };
        historyData[date].water.unshift(entry);
        document.getElementById('waterInput').value = "";
        storage.save(config, historyData, commonFoods);
        this.updateUI();
        ui.closeModal('waterModal');
        ui.showMessage(`飲水 +${ml}ml`);
    },
    getTaipeiTime() { return new Date().toLocaleTimeString('zh-TW', { timeZone: 'Asia/Taipei', hour: '2-digit', minute: '2-digit', hour12: false }); }
};

window.ui = {
    openModal(id) { 
        document.getElementById(id).classList.add('active'); 
        document.body.classList.add('no-scroll'); 
    },
    closeModal(id) { 
        document.getElementById(id).classList.remove('active'); 
        document.body.classList.remove('no-scroll'); 
    },
    
    syncGoalInputs() {
        document.getElementById('targetProtein').value = config.protein;
        document.getElementById('targetCarbs').value = config.carbs;
        document.getElementById('targetFat').value = config.fat;
        document.getElementById('targetWater').value = config.waterGoal;
    },

    resetFoodInputs() {
        document.getElementById('itemName').value = "";
        document.getElementById('inputProtein').value = "";
        document.getElementById('inputCarbs').value = "";
        document.getElementById('inputFat').value = "";
        document.getElementById('inputServings').value = "1";
        document.getElementById('commonSearch').value = "";
        app.hideCommon(); 
    },

    setBar(id, cur, max) {
        const textEl = document.getElementById(`${id}Text`);
        const barEl = document.getElementById(`${id}Bar`);
        const targetEl = document.getElementById(`target${id.charAt(0).toUpperCase() + id.slice(1)}Display`);
        if (textEl) textEl.innerText = cur.toFixed(1);
        if (barEl) barEl.style.width = Math.min(cur / (max || 1) * 100, 100) + '%';
        if (targetEl) targetEl.innerText = max;
    },

    renderList(food, water) {
        const list = document.getElementById('historyList');
        const all = [...food.map(e=>({...e, sort: e.id})), ...water.map(e=>({...e, sort: e.id}))].sort((a,b)=>b.sort - a.sort);

        if (all.length === 0) {
            list.innerHTML = `<div class="text-center py-12 glass-card rounded-[2.5rem] opacity-30 text-xs font-bold">尚無本日紀錄</div>`;
            return;
        }

        list.innerHTML = all.map(e => {
            if (e.type === 'food') {
                const isCommon = commonFoods.some(cf => cf.name === e.name);
                return `
                    <div class="glass-card p-4 rounded-3xl flex items-center justify-between animate-fadeIn">
                        <div class="flex items-center gap-4">
                            <div class="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500"><i data-lucide="utensils" size="18"></i></div>
                            <div>
                                <div class="flex items-center gap-2"><span class="font-bold text-sm text-slate-800">${e.name}</span><span class="text-[9px] text-slate-300 font-bold">${e.time}</span></div>
                                <div class="text-[9px] font-bold text-slate-400">P ${e.p.toFixed(1)} | C ${e.c.toFixed(1)} | F ${e.f.toFixed(1)}</div>
                            </div>
                        </div>
                        <div class="flex items-center gap-2">
                            <div class="text-right"><span class="text-sm font-black text-slate-700">${e.kcal}</span><span class="text-[8px] font-bold text-slate-300 block">kcal</span></div>
                            <button onclick="app.toggleCommonFromHistory(${e.id})" class="${isCommon ? 'text-amber-400' : 'text-slate-200'} p-2"><i data-lucide="star" ${isCommon ? 'fill="currentColor"' : ''} size="16"></i></button>
                            <button onclick="app.deleteEntry('food', ${e.id})" class="text-slate-200 hover:text-rose-500 p-2"><i data-lucide="x" size="16"></i></button>
                        </div>
                    </div>`;
            } else {
                return `
                    <div class="glass-card p-4 rounded-3xl flex items-center justify-between animate-fadeIn">
                        <div class="flex items-center gap-4">
                            <div class="w-10 h-10 bg-sky-50 rounded-2xl flex items-center justify-center text-sky-500"><i data-lucide="droplets" size="18"></i></div>
                            <div>
                                <div class="flex items-center gap-2"><span class="font-bold text-sm text-slate-800">水分補充</span><span class="text-[9px] text-slate-300 font-bold">${e.time}</span></div>
                                <div class="text-[9px] font-bold text-sky-400">💧 ${e.amount} ml</div>
                            </div>
                        </div>
                        <button onclick="app.deleteEntry('water', ${e.id})" class="text-slate-200 hover:text-rose-500 p-2"><i data-lucide="x" size="16"></i></button>
                    </div>`;
            }
        }).join('');
        lucide.createIcons();
    },

    filterCommon() {
        const q = document.getElementById('commonSearch').value.toLowerCase();
        const filtered = q ? commonFoods.filter(x => x.name.toLowerCase().includes(q)) : commonFoods;
        const l = document.getElementById('commonDropdownList');
        if (!l) return;
        
        l.innerHTML = filtered.length === 0 ? `<div class="p-6 text-xs text-slate-400 text-center font-bold">目前無常用食物</div>` : filtered.map(x => `
            <div class="flex items-center justify-between p-4 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-none">
                <div onclick="ui.fillCommon(${x.id})" class="flex-1">
                    <div class="text-sm font-black text-slate-700">${x.name}</div>
                    <div class="text-[10px] text-slate-400 font-bold uppercase">P:${x.p.toFixed(1)} | C:${x.c.toFixed(1)} | F:${x.f.toFixed(1)}</div>
                </div>
                <button onclick="app.deleteCommon(${x.id}, event)" class="p-2 text-slate-300 hover:text-rose-500 transition-all">
                    <i data-lucide="trash-2" size="14"></i>
                </button>
            </div>`).join('');
        lucide.createIcons();
    },

    fillCommon(id) {
        const x = commonFoods.find(f => f.id === id);
        if (x) {
            document.getElementById('itemName').value = x.name;
            document.getElementById('inputProtein').value = x.p;
            document.getElementById('inputCarbs').value = x.c;
            document.getElementById('inputFat').value = x.f;
            document.getElementById('inputServings').value = 1;
            app.hideCommon(); 
        }
    },

    showMessage(t, type) {
        const b = document.getElementById('msgBox');
        if (!b) return;
        b.innerText = t;
        b.className = `fixed bottom-24 left-1/2 -translate-x-1/2 px-8 py-4 rounded-2xl shadow-2xl transition-all z-[7000] text-xs font-black uppercase ${type==='error'?'bg-rose-600':'bg-slate-900'} text-white opacity-100`;
        setTimeout(() => b.style.opacity = '0', 2500);
    },

    initClickOutside() {
        document.addEventListener('mousedown', (e) => {
            const dropdownArea = document.getElementById('commonFoodDropdown');
            if (dropdownArea && !dropdownArea.contains(e.target)) {
                app.hideCommon();
            }

            const calendarArea = document.getElementById('calendarWrapper');
            if (calendarArea && !calendarArea.contains(e.target) && window.calendar) {
                window.calendar.close();
            }
        });
    }
};
