/**
 * 飲控助手 - 主邏輯 (main.js)
 */

let config = { protein: 150, carbs: 200, fat: 65, waterGoal: 2000, kcal: 2000 };
let historyData = {};
let commonFoods = [];
let customTemplates = []; 
let editingEntryId = null; 

window.onload = () => {
    storage.migrate();
    const data = storage.load();
    if (data.config) {
        config = data.config;
        ui.syncGoalInputs();
    }
    historyData = data.history || {};
    commonFoods = data.common || [];
    customTemplates = data.templates || [];

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

    // --- 模板功能 ---
    toggleTemplateDropdown() {
        const dropdown = document.getElementById('templateDropdown');
        if (!dropdown.classList.contains('dropdown-active')) {
            this.renderTemplateDropdown(); 
            dropdown.classList.add('dropdown-active');
        } else {
            dropdown.classList.remove('dropdown-active');
        }
    },

    hideTemplateDropdown() {
        const dropdown = document.getElementById('templateDropdown');
        if (dropdown) dropdown.classList.remove('dropdown-active');
    },

    renderTemplateDropdown() {
        const list = document.getElementById('templateDropdownList');
        if (!list) return;
        let html = `<div class="p-4 hover:bg-emerald-50 cursor-pointer border-b border-slate-50 flex items-center gap-2 text-emerald-600 font-black text-sm" onclick="app.openNewTemplateModal()"><i data-lucide="plus-circle" size="16"></i> 新增模板</div>`;
        customTemplates.forEach(t => {
            html += `<div class="flex items-center justify-between p-4 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-none group"><div onclick="app.selectTemplate('${t.id}')" class="flex-1"><div class="text-sm font-black text-slate-700">${t.name}</div><div class="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">P:${t.p} | C:${t.c} | F:${t.f} | W:${t.w}</div></div><button onclick="app.deleteTemplate('${t.id}', event)" class="p-2 text-slate-300 hover:text-rose-500 transition-all"><i data-lucide="trash-2" size="14"></i></button></div>`;
        });
        list.innerHTML = html;
        lucide.createIcons();
    },

    openNewTemplateModal() { this.hideTemplateDropdown(); ui.closeModal('goalModal'); ui.openModal('newTemplateModal'); },
    selectTemplate(id) {
        const t = customTemplates.find(x => x.id === id);
        if (t) {
            document.getElementById('targetProtein').value = t.p;
            document.getElementById('targetCarbs').value = t.c;
            document.getElementById('targetFat').value = t.f;
            document.getElementById('targetWater').value = t.w;
            document.getElementById('currentTemplateLabel').innerText = t.name;
            this.updateTargets();
            ui.showMessage(`已套用：${t.name}`);
        }
        this.hideTemplateDropdown();
    },

    deleteTemplate(id, e) {
        if (e) e.stopPropagation();
        customTemplates = customTemplates.filter(t => t.id !== id);
        storage.save(config, historyData, commonFoods, customTemplates);
        this.renderTemplateDropdown();
        ui.showMessage("模板已刪除");
    },

    saveNewTemplate() {
        const name = document.getElementById('tplName').value.trim();
        const p = parseFloat(document.getElementById('tplProtein').value) || 0;
        const c = parseFloat(document.getElementById('tplCarbs').value) || 0;
        const f = parseFloat(document.getElementById('tplFat').value) || 0;
        const w = parseFloat(document.getElementById('tplWater').value) || 2000;
        if (!name) return ui.showMessage("請輸入名稱", "error");
        const newId = 'tpl_' + Date.now();
        customTemplates.push({ id: newId, name, p, c, f, w });
        storage.save(config, historyData, commonFoods, customTemplates);
        this.renderTemplateDropdown();
        this.selectTemplate(newId);
        ui.closeModal('newTemplateModal');
        ui.openModal('goalModal');
    },

    // --- 常用食物功能 (核心修復：防止事件衝突) ---
    toggleCommonFromHistory(id) {
        const entry = historyData[calendar.selectedDate]?.food.find(e => e.id === id);
        if (!entry) return;

        const commonIndex = commonFoods.findIndex(f => f.name === entry.name);
        if (commonIndex > -1) {
            commonFoods.splice(commonIndex, 1);
            ui.showMessage(`已從常用清單移除`);
        } else {
            commonFoods.push({ 
                id: Date.now(), 
                name: entry.name, 
                p: entry.rawP || entry.p, 
                c: entry.rawC || entry.c, 
                f: entry.rawF || entry.f 
            });
            ui.showMessage(`"${entry.name}" 已存為常用`);
        }
        storage.save(config, historyData, commonFoods, customTemplates);
        ui.filterCommon();
        this.updateUI(); 
    },

    // --- 飲食記錄 ---
    addFood() {
        const name = document.getElementById('itemName').value || "未命名餐點";
        const srv = parseFloat(document.getElementById('inputServings').value) || 1;
        const p_per = parseFloat(document.getElementById('inputProtein').value) || 0;
        const c_per = parseFloat(document.getElementById('inputCarbs').value) || 0;
        const f_per = parseFloat(document.getElementById('inputFat').value) || 0;
        if (p_per === 0 && c_per === 0 && f_per === 0) return ui.showMessage("請輸入數值", "error");
        const entry = {
            id: Date.now(), type: 'food', name, srv, p: p_per * srv, c: c_per * srv, f: f_per * srv, 
            rawP: p_per, rawC: c_per, rawF: f_per,
            kcal: Math.round(((p_per * srv) * 4) + ((c_per * srv) * 4) + ((f_per * srv) * 9)),
            time: this.getTaipeiTime()
        };
        const date = calendar.selectedDate;
        if (!historyData[date]) historyData[date] = { food: [], water: [] };
        historyData[date].food.unshift(entry);
        ui.resetFoodInputs();
        storage.save(config, historyData, commonFoods, customTemplates);
        this.updateUI(); ui.closeModal('foodModal'); ui.showMessage(`已記錄：${name}`);
    },

    editFoodEntry(id) {
        const entry = historyData[calendar.selectedDate]?.food.find(e => e.id === id);
        if (!entry) return;
        editingEntryId = id;
        document.getElementById('editItemName').value = entry.name;
        document.getElementById('editProtein').value = entry.p.toFixed(1);
        document.getElementById('editCarbs').value = entry.c.toFixed(1);
        document.getElementById('editFat').value = entry.f.toFixed(1);
        ui.openModal('editFoodModal');
    },

    saveFoodEdit() {
        const name = document.getElementById('editItemName').value;
        const p = parseFloat(document.getElementById('editProtein').value) || 0;
        const c = parseFloat(document.getElementById('editCarbs').value) || 0;
        const f = parseFloat(document.getElementById('editFat').value) || 0;
        const entry = historyData[calendar.selectedDate].food.find(e => e.id === editingEntryId);
        if (entry) {
            entry.name = name; entry.p = p; entry.c = c; entry.f = f;
            entry.kcal = Math.round((p * 4) + (c * 4) + (f * 9));
            entry.rawP = p; entry.rawC = c; entry.rawF = f; entry.srv = 1;
            storage.save(config, historyData, commonFoods, customTemplates);
            this.updateUI(); ui.closeModal('editFoodModal'); ui.showMessage("已更新紀錄");
        }
    },

    deleteEntry(type, id) {
        if (historyData[calendar.selectedDate]) {
            historyData[calendar.selectedDate][type] = historyData[calendar.selectedDate][type].filter(e => e.id !== id);
            storage.save(config, historyData, commonFoods, customTemplates);
            this.updateUI();
        }
    },

    updateTargets() {
        config.protein = parseFloat(document.getElementById('targetProtein').value) || 0;
        config.carbs = parseFloat(document.getElementById('targetCarbs').value) || 0;
        config.fat = parseFloat(document.getElementById('targetFat').value) || 0;
        config.waterGoal = parseFloat(document.getElementById('targetWater').value) || 2000;
        config.kcal = Math.round((config.protein * 4) + (config.carbs * 4) + (config.fat * 9));
        storage.save(config, historyData, commonFoods, customTemplates);
        this.updateUI();
    },

    showCommon() { document.getElementById('commonFoodDropdown').classList.add('dropdown-active'); ui.filterCommon(); },
    hideCommon() { document.getElementById('commonFoodDropdown').classList.remove('dropdown-active'); },
    toggleCommon(e) { if (e) e.stopPropagation(); const d = document.getElementById('commonFoodDropdown'); d.classList.contains('dropdown-active') ? this.hideCommon() : this.showCommon(); },
    deleteCommon(id, e) { if (e) e.stopPropagation(); commonFoods = commonFoods.filter(f => f.id !== id); storage.save(config, historyData, commonFoods, customTemplates); ui.filterCommon(); this.updateUI(); },

    quickWater(ml) { document.getElementById('waterInput').value = ml; },
    addWater() {
        const ml = parseFloat(document.getElementById('waterInput').value) || 0;
        if (ml <= 0) return ui.showMessage("請輸入飲水量", "error");
        const entry = { id: Date.now(), type: 'water', amount: ml, time: this.getTaipeiTime() };
        if (!historyData[calendar.selectedDate]) historyData[calendar.selectedDate] = { food: [], water: [] };
        historyData[calendar.selectedDate].water.unshift(entry);
        document.getElementById('waterInput').value = "";
        storage.save(config, historyData, commonFoods, customTemplates);
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
                const servingText = `<span class="text-[#9E9796] text-[10px] font-normal ml-1 tabular-nums">×${e.srv || 1}</span>`;
                return `
                    <div class="glass-card p-4 rounded-3xl flex items-center justify-between animate-fadeIn gap-2">
                        <div class="flex items-center gap-3 cursor-pointer overflow-hidden flex-1" onclick="app.editFoodEntry(${e.id})">
                            <div class="w-9 h-9 bg-blue-50 rounded-2xl flex-shrink-0 flex items-center justify-center text-blue-500"><i data-lucide="utensils" size="16"></i></div>
                            <div class="overflow-hidden">
                                <div class="flex items-center gap-1">
                                    <span class="font-bold text-sm text-slate-800 truncate max-w-[100px] sm:max-w-[180px] inline-block">${e.name}</span>
                                    ${servingText}
                                    <span class="text-[9px] text-slate-300 font-bold tabular-nums ml-auto">${e.time}</span>
                                </div>
                                <div class="text-[9px] font-bold text-slate-400 tabular-nums uppercase tracking-tighter">P ${e.p.toFixed(1)} | C ${e.c.toFixed(1)} | F ${e.f.toFixed(1)}</div>
                            </div>
                        </div>
                        <div class="flex items-center gap-0.5 flex-shrink-0">
                            <div class="text-right mr-1.5"><span class="text-sm font-black text-slate-700 tabular-nums">${e.kcal}</span><span class="text-[8px] font-bold text-slate-300 block leading-none">kcal</span></div>
                            <button onclick="event.stopPropagation(); app.toggleCommonFromHistory(${e.id})" class="${isCommon ? 'text-amber-400' : 'text-slate-200'} p-1"><i data-lucide="star" ${isCommon ? 'fill="currentColor"' : ''} size="14"></i></button>
                            <button onclick="event.stopPropagation(); app.deleteEntry('food', ${e.id})" class="text-slate-200 hover:text-rose-500 p-1"><i data-lucide="x" size="14"></i></button>
                        </div>
                    </div>`;
            } else {
                return `<div class="glass-card p-4 rounded-3xl flex items-center justify-between animate-fadeIn gap-2">
                        <div class="flex items-center gap-3 overflow-hidden flex-1"><div class="w-9 h-9 bg-sky-50 rounded-2xl flex-shrink-0 flex items-center justify-center text-sky-500"><i data-lucide="droplets" size="16"></i></div>
                        <div class="overflow-hidden"><div class="flex items-center gap-1"><span class="font-bold text-sm text-slate-800">水分補充</span><span class="text-[9px] text-slate-300 font-bold tabular-nums ml-auto">${e.time}</span></div>
                        <div class="text-[9px] font-bold text-sky-400 tabular-nums">💧 ${e.amount} ml</div></div></div>
                        <button onclick="app.deleteEntry('water', ${e.id})" class="text-slate-200 hover:text-rose-500 p-1 flex-shrink-0"><i data-lucide="x" size="14"></i></button></div>`;
            }
        }).join('');
        lucide.createIcons();
    },

    filterCommon() {
        const q = document.getElementById('commonSearch').value.toLowerCase();
        const f = q ? commonFoods.filter(x => x.name.toLowerCase().includes(q)) : commonFoods;
        const l = document.getElementById('commonDropdownList');
        if (!l) return;
        l.innerHTML = f.length === 0 ? `<div class="p-6 text-xs text-slate-400 text-center font-bold">目前無常用食物</div>` : f.map(x => `<div class="flex items-center justify-between p-4 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-none"><div onclick="ui.fillCommon(${x.id})" class="flex-1"><div class="text-sm font-black text-slate-700">${x.name}</div><div class="text-[10px] text-slate-400 font-bold uppercase tabular-nums">P:${x.p.toFixed(1)} | C:${x.c.toFixed(1)} | F:${x.f.toFixed(1)}</div></div><button onclick="app.deleteCommon(${x.id}, event)" class="p-2 text-slate-300 hover:text-rose-500 transition-all"><i data-lucide="trash-2" size="14"></i></button></div>`).join('');
        lucide.createIcons();
    },

    fillCommon(id) {
        const x = commonFoods.find(f => f.id === id);
        if (x) { document.getElementById('itemName').value = x.name; document.getElementById('inputProtein').value = x.p; document.getElementById('inputCarbs').value = x.c; document.getElementById('inputFat').value = x.f; document.getElementById('inputServings').value = 1; app.hideCommon(); }
    },

    initClickOutside() {
        document.addEventListener('mousedown', (e) => {
            const foodDropdown = document.getElementById('commonFoodDropdown');
            if (foodDropdown && !foodDropdown.contains(e.target)) app.hideCommon();
            const tplDropdown = document.getElementById('templateDropdown');
            if (tplDropdown && !tplDropdown.contains(e.target)) app.hideTemplateDropdown();
            const calendarArea = document.getElementById('calendarWrapper');
            if (calendarArea && !calendarArea.contains(e.target) && window.calendar) window.calendar.close();
        });
    }
};
