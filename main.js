/**
 * 飲控助手 - 主邏輯 (main.js)
 */

let config = { protein: 150, carbs: 200, fat: 65, waterGoal: 2000, kcal: 2000 };
let historyData = {};
let commonFoods = [];
let editingEntryId = null; // 用於追蹤正在編輯的紀錄

window.onload = () => {
    storage.migrate();
    const data = storage.load();
    if (data.config) {
        config = data.config;
        ui.syncGoalInputs();
    }
    historyData = data.history || {};
    commonFoods = data.common || [];

    calendar.init();
    lucide.createIcons();
    app.updateUI(); 
    ui.initClickOutside();
};

window.app = {
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

    // 應用營養素模板
    applyTemplate(type) {
        const templates = {
            lose: { p: 160, c: 120, f: 50, w: 2500 },
            keep: { p: 150, c: 200, f: 65, w: 2000 },
            gain: { p: 180, c: 320, f: 80, w: 3000 }
        };
        const t = templates[type];
        if (!t) return;

        document.getElementById('targetProtein').value = t.p;
        document.getElementById('targetCarbs').value = t.c;
        document.getElementById('targetFat').value = t.f;
        document.getElementById('targetWater').value = t.w;

        // 更新按鈕樣式
        document.querySelectorAll('.template-btn').forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');

        this.updateTargets();
        ui.showMessage(`已套用模板`);
    },

    // 編輯食物紀錄
    editFoodEntry(id) {
        const entry = historyData[calendar.selectedDate]?.food.find(e => e.id === id);
        if (!entry) return;

        editingEntryId = id;
        document.getElementById('editItemName').value = entry.name;
        document.getElementById('editProtein').value = entry.rawP || (entry.p / 1); // 兼容舊數據
        document.getElementById('editCarbs').value = entry.rawC || (entry.c / 1);
        document.getElementById('editFat').value = entry.rawF || (entry.f / 1);

        ui.openModal('editFoodModal');
    },

    saveFoodEdit() {
        const name = document.getElementById('editItemName').value;
        const p = parseFloat(document.getElementById('editProtein').value) || 0;
        const c = parseFloat(document.getElementById('editCarbs').value) || 0;
        const f = parseFloat(document.getElementById('editFat').value) || 0;

        const date = calendar.selectedDate;
        const entry = historyData[date].food.find(e => e.id === editingEntryId);
        
        if (entry) {
            entry.name = name;
            entry.rawP = p;
            entry.rawC = c;
            entry.rawF = f;
            entry.p = p; // 編輯時直接存為總量以便計算
            entry.c = c;
            entry.f = f;
            entry.kcal = Math.round((p * 4) + (c * 4) + (f * 9));
            
            storage.save(config, historyData, commonFoods);
            this.updateUI();
            ui.closeModal('editFoodModal');
            ui.showMessage("修改成功");
        }
    },

    showCommon() { document.getElementById('commonFoodDropdown').classList.add('dropdown-active'); ui.filterCommon(); },
    hideCommon() { document.getElementById('commonFoodDropdown').classList.remove('dropdown-active'); },
    toggleCommon(e) { if (e) e.stopPropagation(); const d = document.getElementById('commonFoodDropdown'); d.classList.contains('dropdown-active') ? this.hideCommon() : this.showCommon(); },

    toggleCommonFromHistory(id) {
        const entry = historyData[calendar.selectedDate]?.food.find(e => e.id === id);
        if (!entry) return;
        const idx = commonFoods.findIndex(f => f.name === entry.name);
        if (idx > -1) { commonFoods.splice(idx, 1); ui.showMessage(`已從常用清單移除`); }
        else { commonFoods.push({ id: Date.now(), name: entry.name, p: entry.rawP || entry.p, c: entry.rawC || entry.c, f: entry.rawF || entry.f }); ui.showMessage(`"${entry.name}" 已存為常用`); }
        storage.save(config, historyData, commonFoods);
        ui.filterCommon(); this.updateUI(); 
    },

    addFood() {
        const name = document.getElementById('itemName').value || "未命名餐點";
        const srv = parseFloat(document.getElementById('inputServings').value) || 1;
        const p_per = parseFloat(document.getElementById('inputProtein').value) || 0;
        const c_per = parseFloat(document.getElementById('inputCarbs').value) || 0;
        const f_per = parseFloat(document.getElementById('inputFat').value) || 0;
        if (p_per === 0 && c_per === 0 && f_per === 0) return ui.showMessage("請輸入數值", "error");

        const entry = {
            id: Date.now(), type: 'food', name, 
            p: p_per * srv, c: c_per * srv, f: f_per * srv, 
            rawP: p_per, rawC: c_per, rawF: f_per,
            kcal: Math.round(((p_per * srv) * 4) + ((c_per * srv) * 4) + ((f_per * srv) * 9)),
            time: this.getTaipeiTime()
        };
        const date = calendar.selectedDate;
        if (!historyData[date]) historyData[date] = { food: [], water: [] };
        historyData[date].food.unshift(entry);
        ui.resetFoodInputs();
        storage.save(config, historyData, commonFoods);
        this.updateUI(); ui.closeModal('foodModal'); ui.showMessage(`已記錄：${name}`);
    },

    deleteEntry(type, id) {
        if (historyData[calendar.selectedDate]) {
            historyData[calendar.selectedDate][type] = historyData[calendar.selectedDate][type].filter(e => e.id !== id);
            storage.save(config, historyData, commonFoods);
            this.updateUI();
        }
    },

    deleteCommon(id, e) { if (e) e.stopPropagation(); commonFoods = commonFoods.filter(f => f.id !== id); storage.save(config, historyData, commonFoods); ui.filterCommon(); this.updateUI(); },

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
        if (!historyData[calendar.selectedDate]) historyData[calendar.selectedDate] = { food: [], water: [] };
        historyData[calendar.selectedDate].water.unshift(entry);
        document.getElementById('waterInput').value = "";
        storage.save(config, historyData, commonFoods);
        this.updateUI(); ui.closeModal('waterModal'); ui.showMessage(`飲水 +${ml}ml`);
    },
    getTaipeiTime() { return new Date().toLocaleTimeString('zh-TW', { timeZone: 'Asia/Taipei', hour: '2-digit', minute: '2-digit', hour12: false }); }
};

window.ui = {
    openModal(id) { document.getElementById(id).classList.add('active'); document.body.classList.add('no-scroll'); },
    closeModal(id) { document.getElementById(id).classList.remove('active'); document.body.classList.remove('no-scroll'); },
    syncGoalInputs() { document.getElementById('targetProtein').value = config.protein; document.getElementById('targetCarbs').value = config.carbs; document.getElementById('targetFat').value = config.fat; document.getElementById('targetWater').value = config.waterGoal; },
    resetFoodInputs() { document.getElementById('itemName').value = ""; document.getElementById('inputProtein').value = ""; document.getElementById('inputCarbs').value = ""; document.getElementById('inputFat').value = ""; document.getElementById('inputServings').value = "1"; document.getElementById('commonSearch').value = ""; app.hideCommon(); },
    setBar(id, cur, max) { const t = document.getElementById(`${id}Text`), b = document.getElementById(`${id}Bar`), g = document.getElementById(`target${id.charAt(0).toUpperCase() + id.slice(1)}Display`); if (t) t.innerText = cur.toFixed(1); if (b) b.style.width = Math.min(cur / (max || 1) * 100, 100) + '%'; if (g) g.innerText = max; },

    renderList(food, water) {
        const list = document.getElementById('historyList');
        const all = [...food.map(e=>({...e, sort: e.id})), ...water.map(e=>({...e, sort: e.id}))].sort((a,b)=>b.sort - a.sort);
        if (all.length === 0) { list.innerHTML = `<div class="text-center py-12 glass-card rounded-[2.5rem] opacity-30 text-xs font-bold">尚無本日紀錄</div>`; return; }

        list.innerHTML = all.map(e => {
            if (e.type === 'food') {
                const isCommon = commonFoods.some(cf => cf.name === e.name);
                return `
                    <div class="glass-card p-4 rounded-3xl flex items-center justify-between animate-fadeIn">
                        <div class="flex items-center gap-4 cursor-pointer flex-1" onclick="app.editFoodEntry(${e.id})">
                            <div class="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500"><i data-lucide="utensils" size="18"></i></div>
                            <div>
                                <div class="flex items-center gap-2"><span class="font-bold text-sm text-slate-800">${e.name}</span><span class="text-[9px] text-slate-300 font-bold">${e.time}</span></div>
                                <div class="text-[9px] font-bold text-slate-400">P ${e.p.toFixed(1)} | C ${e.c.toFixed(1)} | F ${e.f.toFixed(1)}</div>
                            </div>
                        </div>
                        <div class="flex items-center gap-1">
                            <div class="text-right mr-2"><span class="text-sm font-black text-slate-700">${e.kcal}</span><span class="text-[8px] font-bold text-slate-300 block">kcal</span></div>
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
        const f = q ? commonFoods.filter(x => x.name.toLowerCase().includes(q)) : commonFoods;
        const l = document.getElementById('commonDropdownList');
        if (!l) return;
        l.innerHTML = f.length === 0 ? `<div class="p-6 text-xs text-slate-400 text-center font-bold">無匹配食物</div>` : f.map(x => `
            <div class="flex items-center justify-between p-4 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-none">
                <div onclick="ui.fillCommon(${x.id})" class="flex-1">
                    <div class="text-sm font-black text-slate-700">${x.name}</div>
                    <div class="text-[10px] text-slate-400 font-bold uppercase">P:${x.p.toFixed(1)} | C:${x.c.toFixed(1)} | F:${x.f.toFixed(1)}</div>
                </div>
                <button onclick="app.deleteCommon(${x.id}, event)" class="p-2 text-slate-300 hover:text-rose-500 transition-all"><i data-lucide="trash-2" size="14"></i></button>
            </div>`).join('');
        lucide.createIcons();
    },

    fillCommon(id) {
        const x = commonFoods.find(f => f.id === id);
        if (x) { document.getElementById('itemName').value = x.name; document.getElementById('inputProtein').value = x.p; document.getElementById('inputCarbs').value = x.c; document.getElementById('inputFat').value = x.f; document.getElementById('inputServings').value = 1; app.hideCommon(); }
    },

    showMessage(t, type) { const b = document.getElementById('msgBox'); if (!b) return; b.innerText = t; b.className = `fixed bottom-24 left-1/2 -translate-x-1/2 px-10 py-4 rounded-2xl shadow-2xl transition-all z-[7000] text-xs font-black uppercase tracking-widest ${type==='error'?'bg-rose-600':'bg-slate-900/95 backdrop-blur'} text-white opacity-100`; setTimeout(() => b.style.opacity = '0', 2500); },

    initClickOutside() {
        document.addEventListener('mousedown', (e) => {
            const dropdownArea = document.getElementById('commonFoodDropdown');
            if (dropdownArea && !dropdownArea.contains(e.target)) { app.hideCommon(); }
            const calendarArea = document.getElementById('calendarWrapper');
            if (calendarArea && !calendarArea.contains(e.target) && window.calendar) { window.calendar.close(); }
        });
    }
};
