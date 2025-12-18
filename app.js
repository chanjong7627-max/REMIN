console.log("App script loaded");

// --- State ---
let state = {
    currentScreen: 'screen-splash',
    mode: 'reminer',
    historyStack: [],
    breathing: { active: false, paused: false, phase: 'idle', timeLeft: 0, totalTime: 0, interval: null, cycle: 0, maxCycles: 4 },
    currentTab: 'home',
    recordDraft: { step: 1, emotions: [], text: "", triggers: [], intensity: 3 },
    records: []
};

const STORAGE_KEY = 'remin_emotion_logs_v1';

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded fired - Initializing App");

    // 1. Splash
    const splash = document.getElementById('screen-splash');
    if (splash) splash.classList.add('active');

    // 2. Load Data or Seed
    loadOrSeedData();

    // 3. Bind Events
    bindGlobalEvents();

    // 3.1 Unconditionally render bottom nav
    renderBottomNav();

    // 4. Initial Mode
    const savedMode = sessionStorage.getItem('app_mode');
    if (savedMode) state.mode = savedMode;

    // 5. Verify Functions
    console.log("startEmailTyping attached:", typeof window.startEmailTyping);
});

function loadOrSeedData() {
    console.log("storage key:", STORAGE_KEY);
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
        state.records = JSON.parse(saved);
        console.log("loaded logs count:", state.records.length);
    } else {
        // Seed Dummy Data if empty
        console.log("Storage empty, seeding dummy data");
        seedDummyData();
    }
}

function seedDummyData() {
    const dummy = [
        { id: 101, timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), emotions: ['평온', '안도'], text: "오랜만에 산책을 하니 마음이 가벼워졌다.", triggers: ['날씨', '건강'], intensity: 4 },
        { id: 102, timestamp: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(), emotions: ['답답함'], text: "생각보다 일이 잘 풀리지 않아서 고민이다.", triggers: ['업무', '미래불안'], intensity: 3 },
        { id: 103, timestamp: new Date(Date.now() - 1000 * 60 * 60 * 50).toISOString(), emotions: ['설렘'], text: "새로운 프로젝트 시작 전, 기대된다.", triggers: ['학업'], intensity: 5 }
    ];
    state.records = dummy;
    // Note: We DO NOT save dummy data to localStorage immediately to allow 'true' empty state handling if user deletes them, 
    // or we can save them. Use request instruction: "Seed automatic dummy data... if user saves real record do not mix".
    // Strategy: We will just display them in memory. But if user saves a new record, we keep them? 
    // User requested: "If user saves real record, do not mix". 
    // Actually simplicity: Let's just put them in state. If user saves, they get appended. If user deletes, they go.
    // For persistence of dummy data until first action, let's NOT save to localStorage so if they clear, it comes back? 
    // Or save it so it persists?
    // Request: "migrate storage to localStorage... seed dummy data if empty"
    // Let's save it to be safe and consistent.
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.records));
    console.log("Dummy data seeded and saved:", state.records.length);
}

function bindGlobalEvents() {
    const btnSettings = document.getElementById('btnSettings');
    if (btnSettings) btnSettings.onclick = () => openOverlay('settingsOverlay');

    const btnNotif = document.getElementById('btnNotif');
    if (btnNotif) btnNotif.onclick = () => openOverlay('notificationOverlay');

    document.body.addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (!target) return;
        if (target.id === 'btnNewRecord') openCompose();
    });

    const btnSettingsClose = document.getElementById('btnSettingsClose');
    if (btnSettingsClose) btnSettingsClose.onclick = () => closeOverlay('settingsOverlay');

    const btnNotifClose = document.getElementById('btnNotifClose');
    if (btnNotifClose) btnNotifClose.onclick = () => closeOverlay('notificationOverlay');

    const btnCloseCompose = document.getElementById('btnCloseCompose');
    if (btnCloseCompose) btnCloseCompose.onclick = () => closeOverlay('composeOverlay');

    const btnRecordNext = document.getElementById('btn-record-next');
    if (btnRecordNext) btnRecordNext.onclick = nextRecordStep;

    // Mode Switch Logic in Settings
    const segMode = document.getElementById('segMode');
    if (segMode) {
        segMode.addEventListener('click', (e) => {
            const seg = e.target.closest('.segment');
            if (!seg) return;
            const newMode = seg.dataset.val;
            if (newMode && newMode !== state.mode) {
                // UI
                segMode.querySelectorAll('.segment').forEach(s => s.classList.remove('active'));
                seg.classList.add('active');

                // Logic
                closeOverlay('settingsOverlay');
                window.selectDirection(newMode);
            } else if (newMode === state.mode) {
                // Already active, just close? or do nothing? 
                // User said "Toggle... move to helper". If I click Helper and I am Reminer -> Toggle & Move. 
                // If I click Helper and I am Helper -> Do nothing? Or re-navigate? 
                // Let's re-navigate to be responsive.
                closeOverlay('settingsOverlay');
                window.selectDirection(newMode);
            }
        });
    }
}

// --- Email Typing Logic ---
window.startEmailTyping = () => {
    const field = document.getElementById('email-field');
    const nextBtn = document.getElementById('btn-email-next');
    const targetEmail = "name@remin.com";
    if (!field || field.value === targetEmail) return;
    field.value = "";
    let i = 0;
    const typeInterval = setInterval(() => {
        field.value += targetEmail.charAt(i); i++;
        if (i >= targetEmail.length) {
            clearInterval(typeInterval);
            if (nextBtn) nextBtn.classList.remove('disabled');
        }
    }, 50);
};

// --- Navigation ---
function navigateTo(screenId) {
    const current = document.getElementById(state.currentScreen);
    const next = document.getElementById('screen-' + screenId);

    if (!next) return;
    next.style.display = 'flex';
    void next.offsetWidth;
    requestAnimationFrame(() => {
        next.classList.add('active');
        if (current && current.id !== next.id) {
            current.classList.remove('active');
            setTimeout(() => { if (!current.classList.contains('active')) current.style.display = 'none'; }, 300);
        }
    });

    state.historyStack.push(state.currentScreen);
    state.currentScreen = 'screen-' + screenId;
    updateGlobalHeader(screenId);
    if (screenId === 'main' && state.currentTab === 'home') renderTabContent();
}

function handleBack() {
    if (state.historyStack.length > 0) {
        state.historyStack.pop();
        const prev = state.historyStack.pop();
        if (prev) navigateTo(prev.replace('screen-', ''));
        else navigateTo('splash');
    }
}

function updateGlobalHeader(screenId) {
    const header = document.getElementById('global-header');
    if (!header) return;
    const showHeaderScreens = ['main', 'deepen'];
    if (showHeaderScreens.includes(screenId)) {
        header.classList.remove('hidden');
        header.style.display = 'flex';
        const backBtn = document.getElementById('header-back-btn');
        if (backBtn) {
            backBtn.style.visibility = (screenId === 'main') ? 'hidden' : 'visible';
            backBtn.style.pointerEvents = (screenId === 'main') ? 'none' : 'auto';
        }
    } else {
        header.classList.add('hidden');
        header.style.display = 'none';
    }
}

// --- Overlay Logic ---
function openOverlay(id) {
    const overlay = document.getElementById(id);
    if (!overlay) return;
    overlay.classList.remove('hidden');
    void overlay.offsetWidth;
    overlay.classList.add('show');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
}

function closeOverlay(id) {
    const overlay = document.getElementById(id);
    if (!overlay) return;

    // Fix ARIA error: Focus must not be hidden. Blur if focus is inside.
    if (overlay.contains(document.activeElement)) {
        document.activeElement.blur();
    }

    overlay.classList.remove('show');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    setTimeout(() => { overlay.classList.add('hidden'); }, 300);
}


// --- Compose (Record Flow) Logic ---
// --- Compose (Record Flow) Logic ---
function openCompose() {
    state.recordDraft = { step: 1, emotions: [], text: "", triggers: [], intensity: 3 };
    updateComposeUI();
    openOverlay('composeOverlay');
}

function updateComposeUI() {
    const indicator = document.getElementById('record-step-indicator');
    if (indicator) indicator.innerText = `Step ${state.recordDraft.step}/3`;

    const btnNext = document.getElementById('btn-record-next');
    if (btnNext) {
        let isValid = false;
        if (state.recordDraft.step === 1 && state.recordDraft.emotions.length > 0) isValid = true;
        else if (state.recordDraft.step === 2) isValid = true;
        else if (state.recordDraft.step === 3) isValid = true;

        if (isValid) btnNext.classList.remove('disabled');
        else btnNext.classList.add('disabled');

        if (state.recordDraft.step === 3) {
            btnNext.style.display = 'none';
        } else {
            btnNext.style.display = 'block';
            btnNext.innerText = '다음으로';
            btnNext.onclick = nextRecordStep;
        }
    }
    renderComposeContent();
}

function nextRecordStep() {
    if (state.recordDraft.step < 3) {
        state.recordDraft.step++;
        updateComposeUI();
    }
}

function renderComposeContent() {
    const container = document.getElementById('composeContent');
    const s = state.recordDraft;

    if (s.step === 1) {
        container.innerHTML = `
            <div class="step-title">지금 어떤 기분이 드나요?</div>
            <div class="selected-zone">
                ${s.emotions.length > 0 ? s.emotions.map(e => `<span class="chip selected">${e}</span>`).join('') : `<div class="selected-zone-placeholder">감정 선택</div>`}
                ${s.emotions.length > 0 ? `<div style="width:100%; text-align:right; margin-top:5px; cursor:pointer" onclick="window.clearEmotions()">초기화</div>` : ''}
            </div>
            <div class="emotion-grid" style="margin-bottom:30px">
                ${['불안함', '우울함', '답답함', '짜증', '분노', '긴장', '공허', '평온', '안도', '기쁨', '설렘', '지침', '예민함', '압박감', '혼란'].map(e => `
                    <div class="emotion-chip ${s.emotions.includes(e) ? 'selected' : ''}" onclick="window.toggleEmotion('${e}')">${e}</div>
                `).join('')}
            </div>
            <p class="section-desc">강도: <span id="val-intensity" style="color:var(--primary); font-weight:700">${s.intensity}</span></p>
            <input type="range" class="intensity-slider" min="1" max="5" value="${s.intensity}" oninput="window.updateIntensity(this.value)">
        `;
    } else if (s.step === 2) {
        container.innerHTML = `
            <div class="step-title">왜 그런 기분이 드나요?</div>
            <textarea id="record-text-input" style="width:100%; height:120px; padding:15px; border:1px solid #eee; border-radius:12px; resize:none;" placeholder="내용을 입력하세요..." oninput="window.updateDraftText(this.value)">${s.text}</textarea>
            <p class="section-desc" style="margin-top:20px; margin-bottom:10px">감정의 원인 (Trigger)</p>
            <div class="trigger-grid">
                ${['발표', '학업', '관계', '가족', '돈', '건강', '수면', '날씨', '미래불안', '외로움', '업무'].map(t => `<div class="trigger-chip ${s.triggers.includes(t) ? 'selected' : ''}" onclick="window.toggleTrigger('${t}')">#${t}</div>`).join('')}
            </div>
       `;
    } else {
        container.innerHTML = `
            <div class="step-title">저장할까요?</div>
            <div class="summary-card-auto">
                <p style="font-weight:600; font-size:14px; margin-bottom:5px">AI 요약 Preview</p>
                <p>"${s.text ? s.text.substring(0, 40) + '...' : s.emotions.join(', ')}"</p>
            </div>
            <button id="btnSaveRecord" class="btn-capsule" onclick="window.saveNewRecord()" style="margin-top:20px; width:100%">기록 저장하기</button>
        `;
    }
}

// Window actions
window.toggleEmotion = (e) => {
    if (state.recordDraft.emotions.includes(e)) state.recordDraft.emotions = state.recordDraft.emotions.filter(x => x !== e);
    else state.recordDraft.emotions.push(e);
    updateComposeUI();
};
window.clearEmotions = () => { state.recordDraft.emotions = []; updateComposeUI(); };
window.updateIntensity = (v) => { state.recordDraft.intensity = v; document.getElementById('val-intensity').innerText = v; };
window.updateDraftText = (v) => { state.recordDraft.text = v; };
window.toggleTrigger = (t) => {
    if (state.recordDraft.triggers.includes(t)) state.recordDraft.triggers = state.recordDraft.triggers.filter(x => x !== t);
    else state.recordDraft.triggers.push(t);
    renderComposeContent();
};
window.saveNewRecord = () => {
    const newRecord = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        emotions: state.recordDraft.emotions,
        text: state.recordDraft.text,
        triggers: state.recordDraft.triggers,
        intensity: state.recordDraft.intensity
    };
    state.records.unshift(newRecord);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.records));

    alert('저장되었습니다.');
    closeOverlay('composeOverlay');
    state.currentTab = 'record';
    renderBottomNav();
    renderTabContent();
};

// --- Tab Rendering (Restored Rich Logic) ---



// --- Tab Rendering (Restored Rich Logic) ---

function renderTabContent() {
    const container = document.getElementById('tab-content');
    if (!container) return;

    if (state.currentTab === 'home') container.innerHTML = renderReminerHome();
    else if (state.currentTab === 'breathe') container.innerHTML = renderReminerBreathe();
    else if (state.currentTab === 'record') container.innerHTML = renderReminerRecord();
    else if (state.currentTab === 'insight') container.innerHTML = renderReminerInsight();
    else if (state.currentTab === 'profile') container.innerHTML = renderProfile();
    else container.innerHTML = `<h2>${state.currentTab}</h2>`;
}

function renderReminerHome() {
    console.log("renderHome called");
    const today = new Date().toDateString();
    const todayRecord = state.records.find(r => new Date(r.timestamp).toDateString() === today);
    const recent = state.records.slice(0, 2);

    return `
        <div class="tab-view-container">
            <h2 class="section-title">오늘의 감정 날씨는<br>어떤가요?</h2>
            
            <div class="check-in-container">
                <span class="check-in-chip" onclick="alert('기록됨')">😌 평온해요</span>
                <span class="check-in-chip" onclick="alert('기록됨')">🥰 행복해요</span>
                <span class="check-in-chip" onclick="alert('기록됨')">😰 불안해요</span>
            </div>

            <div class="cta-large" onclick="window.switchTab('breathe');">
                <div>
                    <h3>1분 진정하기</h3>
                    <p>호흡을 통해 마음을 가라앉히세요</p>
                </div>
                <div class="icon-btn" style="background:var(--primary); color:white; width:48px; height:48px;">
                    <span class="material-icons-outlined">play_arrow</span>
                </div>
            </div>

            <div class="stats-grid">
                <div class="stat-card">
                    <span class="stat-val">${state.records.length}</span>
                    <span class="stat-label">전체 기록</span>
                </div>
                <div class="stat-card">
                    <span class="stat-val">${getMostFrequentEmotion('all') || '-'}</span>
                    <span class="stat-label">주요 감정</span>
                </div>
            </div>
             <div style="display:flex; justify-content:space-between; align-items:center;">
                <h3 class="section-title" style="font-size:18px; margin-bottom:0">최근 감정 기록</h3>
                <span style="font-size:13px; color:var(--primary); font-weight:600; cursor:pointer" onclick="window.switchTab('record')">전체보기</span>
            </div>
            ${recent.length > 0 ? recent.map(r => `
                 <div class="recent-card" onclick="window.switchTab('record')">
                    <div class="recent-date"><span>${new Date(r.timestamp).getDate()}</span></div>
                    <div class="recent-content">
                        <div class="recent-head"><span class="recent-chip">${r.emotions[0]}</span> <span style="font-size:11px; color:#9CA3AF; margin-left:auto">${getTimeAgo(r.timestamp)}</span></div>
                        <div class="recent-summary">${r.text || '내용 없음'}</div>
                    </div>
                </div>
            `).join('') : '<p style="color:#9CA3AF; padding:20px; text-align:center">기록이 없습니다.</p>'}
        </div>
    `;
}

function renderReminerRecord() {
    console.log("renderRecordList called");
    return `
        <div class="tab-view-container">
            <h2 class="section-title">감정 로그 & 리포트</h2>
            <button id="btnNewRecord" class="btn-capsule" style="margin-bottom:24px">
                <span class="material-icons-outlined" style="margin-right:8px">add</span> 새 기록 작성하기
            </button>

            <h3 class="section-title" style="font-size:16px">이번 달 기록</h3>
             <div class="record-list">
                ${state.records.length === 0 ?
            `<div class="card-white" style="text-align:center; padding:40px; border-style:dashed; color:#9CA3AF">
                    <span class="material-icons-outlined" style="font-size:36px; margin-bottom:10px; display:block">edit_note</span>
                    아직 기록이 없어요.
                  </div>`
            : state.records.map(r => `
                     <div class="recent-card" style="position:relative">
                         <div class="recent-date"><span>${new Date(r.timestamp).getDate()}</span></div>
                         <div class="recent-content">
                            <div class="recent-head">
                                ${r.emotions.map(e => `<span class="recent-chip">${e}</span>`).join('')}
                            </div>
                            <div class="recent-summary">${r.text || '내용 없음'}</div>
                            <div class="meta-row" style="margin-top:6px; flex-wrap:wrap">
                                ${r.triggers.slice(0, 2).map(t => `<span class="meta-tag">#${t}</span>`).join('')}
                            </div>
                         </div>
                         <button onclick="window.deleteRecord(${r.id})" style="position:absolute; top:12px; right:12px; border:none; background:transparent; color:#9CA3AF; cursor:pointer;">
                            <span class="material-icons-outlined" style="font-size:18px">close</span>
                         </button>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function renderReminerInsight() {
    const today = new Date().toDateString();
    const todayRecords = state.records.filter(r => new Date(r.timestamp).toDateString() === today);
    const topTodayEmotion = getMostFrequentEmotion('today');
    const avgIntensity = todayRecords.length > 0 ? (todayRecords.reduce((acc, r) => acc + parseInt(r.intensity), 0) / todayRecords.length).toFixed(1) : '-';

    // Weekly
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const weekCounts = [0, 0, 0, 0, 0, 0, 0];
    const now = new Date();
    state.records.forEach(r => {
        const d = new Date(r.timestamp);
        const diffTime = Math.abs(now - d);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays <= 7) weekCounts[d.getDay()]++;
    });

    return `
        <div class="tab-view-container">
            <h2 class="section-title">인사이트</h2>
            <div class="card-white" style="background:linear-gradient(135deg, white 0%, #F0F9FF 100%)">
                <h3 style="font-size:16px; margin-bottom:16px">오늘의 감정 날씨</h3>
                <div style="display:flex; justify-content:space-between; text-align:center">
                    <div>
                        <span style="font-size:12px; color:#6B7280; display:block">주요 감정</span>
                        <span style="font-size:18px; font-weight:700; color:var(--primary)">${topTodayEmotion || '-'}</span>
                    </div>
                    <div>
                        <span style="font-size:12px; color:#6B7280; display:block">평균 강도</span>
                        <span style="font-size:18px; font-weight:700; color:var(--primary)">${avgIntensity}/5</span>
                    </div>
                </div>
            </div>

            <div class="card-white" style="text-align:center; padding:30px;">
                <h3 style="margin-bottom:8px">지난 7일 기록</h3>
                <div style="height:150px; background:#F9FAFB; border-radius:12px; display:flex; align-items:end; justify-content:space-around; padding:10px;">
                     ${weekCounts.map((count, i) => {
        const h = Math.min(count * 20 + 10, 100);
        return `
                        <div style="display:flex; flex-direction:column; align-items:center; gap:4px; height:100%; justify-content:flex-end">
                            <div style="width:20px; height:${h}%; background:${count > 0 ? 'var(--primary)' : '#E5E7EB'}; border-radius:4px; transition:height 0.3s"></div>
                            <span style="font-size:10px; color:#9CA3AF">${days[i]}</span>
                        </div>`;
    }).join('')}
                </div>
            </div>
        </div>
    `;
}

function renderProfile() {
    return `
        <div style="background:#F9FAFB; min-height:100%; padding-bottom:100px;">
            <div class="profile-header-card">
                <div class="avatar-circle">
                    <span class="material-icons-outlined">person</span>
                </div>
                <h2 style="font-size:20px; font-weight:700; color:var(--text-primary); margin-bottom:4px">Reminer</h2>
                <p style="font-size:14px; color:var(--text-secondary)">name@remin.com</p>
                
                <div class="profile-stats-row">
                    <div class="profile-stat-box">
                        <span class="profile-stat-val">${state.records.length}</span>
                        <span class="profile-stat-label">총 기록</span>
                    </div>
                    <div class="profile-stat-box">
                        <span class="profile-stat-val">3일</span>
                        <span class="profile-stat-label">연속 작성</span>
                    </div>
                </div>
            </div>

            <div class="menu-list">
                <div class="menu-item" onclick="openOverlay('settingsOverlay')">
                    <span class="material-icons-outlined icon">settings</span>
                    <span class="text">설정</span>
                    <span class="material-icons-outlined arrow">chevron_right</span>
                </div>
                <div class="menu-item" onclick="showToast('준비 중인 기능입니다.')">
                    <span class="material-icons-outlined icon">notifications</span>
                    <span class="text">알림 설정</span>
                    <span class="material-icons-outlined arrow">chevron_right</span>
                </div>
                <div class="menu-item" onclick="showToast('준비 중인 기능입니다.')">
                    <span class="material-icons-outlined icon">help_outline</span>
                    <span class="text">고객센터</span>
                    <span class="material-icons-outlined arrow">chevron_right</span>
                </div>
            </div>

             <div class="menu-list" style="margin-top:12px; border-top:1px solid #F3F4F6">
                <div class="menu-item" onclick="alert('로그아웃 되었습니다.'); navigateTo('login')" style="color:#EF4444">
                    <span class="material-icons-outlined icon" style="color:#EF4444">logout</span>
                    <span class="text">로그아웃</span>
                </div>
            </div>
            
            <p style="text-align:center; color:#9CA3AF; font-size:12px; margin-top:30px">앱 버전 v0.1.0</p>
        </div>
    `;
}

// Stats Helpers
function getMostFrequentEmotion(period = 'all') {
    let targetRecords = state.records;
    if (period === 'today') {
        const today = new Date().toDateString();
        targetRecords = state.records.filter(r => new Date(r.timestamp).toDateString() === today);
    }
    if (targetRecords.length === 0) return null;
    const counts = {};
    targetRecords.forEach(r => {
        r.emotions.forEach(e => { counts[e] = (counts[e] || 0) + 1; });
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted.length > 0 ? sorted[0][0] : null;
}

function getTimeAgo(dateString) {
    const diff = new Date() - new Date(dateString);
    const min = Math.floor(diff / 60000);
    if (min < 60) return `${min}m ago`;
    const hour = Math.floor(min / 60);
    if (hour < 24) return `${hour}h ago`;
    return `${Math.floor(hour / 24)}d ago`;
}

function renderReminerBreathe() {
    return `
        <div class="tab-view-container">
            <h2 class="section-title">호흡 가이드</h2>
            
            <div class="card-white" style="text-align:center; padding:40px 20px; display:flex; flex-direction:column; align-items:center;">
                <h3 style="margin-bottom:20px; color:var(--primary)">4-7-8 호흡법</h3>
                
                <!-- Breathing Circle -->
                <div id="breathe-circle" 
                     style="width:200px; height:200px; border-radius:50%; background:#E0F2FE; 
                            display:flex; align-items:center; justify-content:center;
                            position:relative; margin-bottom:30px; transition: all 4s ease-in-out;">
                    <span id="breathe-status" style="font-size:20px; font-weight:700; color:#0369A1">준비</span>
                </div>

                <div style="display:flex; gap:16px;">
                    <button class="btn-capsule" style="width:120px" onclick="startBreathingSession()">시작하기</button>
                    <button class="btn-capsule secondary" style="width:120px" onclick="stopBreathingSession()">멈춤</button>
                </div>
                
                <p style="margin-top:24px; font-size:14px; color:#6B7280; line-height:1.6">
                    4초간 들이마시고 (Inhale)<br>
                    7초간 멈추고 (Hold)<br>
                    8초간 내뱉으세요 (Exhale)
                </p>
            </div>
        </div>
    `;
}

// Breathing Logic
let breatheInterval;
window.startBreathingSession = () => {
    const circle = document.getElementById('breathe-circle');
    const status = document.getElementById('breathe-status');
    if (!circle || !status) return;

    status.innerText = "들이마시기 (4초)";
    circle.style.transform = "scale(1.2)";
    circle.style.background = "#BAE6FD";

    let phase = 0; // 0:Inhale, 1:Hold, 2:Exhale

    if (breatheInterval) clearInterval(breatheInterval);

    // Initial Cycle
    runCycle(circle, status);

    breatheInterval = setInterval(() => {
        runCycle(circle, status);
    }, 19000); // 4+7+8 = 19s
};

function runCycle(circle, status) {
    // Inhale
    status.innerText = "들이마시기 (Inhale)";
    circle.style.transition = "all 4s ease-in-out";
    circle.style.transform = "scale(1.2)";
    circle.style.background = "#7DD3FC";

    setTimeout(() => {
        // Hold
        status.innerText = "멈춤 (Hold)";
        circle.style.transition = "none";
        circle.style.background = "#38BDF8";

        setTimeout(() => {
            // Exhale
            status.innerText = "내뱉기 (Exhale)";
            circle.style.transition = "all 8s ease-in-out";
            circle.style.transform = "scale(1.0)";
            circle.style.background = "#E0F2FE";
        }, 7000); // 7s hold
    }, 4000); // 4s inhale
}

window.stopBreathingSession = () => {
    if (breatheInterval) clearInterval(breatheInterval);
    const circle = document.getElementById('breathe-circle');
    const status = document.getElementById('breathe-status');
    if (circle && status) {
        status.innerText = "준비";
        circle.style.transform = "scale(1)";
        circle.style.background = "#E0F2FE";
    }
};

function renderBottomNav() {
    const nav = document.querySelector('.bottom-nav');
    if (!nav) return;
    // Added 'breathe' back to the list
    nav.innerHTML = ['home', 'breathe', 'record', 'insight', 'profile'].map(t => `
        <div class="nav-item ${state.currentTab === t ? 'active' : ''}" onclick="window.switchTab('${t}')">
            <span class="material-icons-outlined">
                ${t === 'home' ? 'home' : t === 'breathe' ? 'spa' : t === 'record' ? 'edit' : t === 'insight' ? 'insights' : 'person'}
            </span>
        </div>
    `).join('');
}

// Global Nav & Direction - adding for navigation safety
window.switchTab = (t) => { state.currentTab = t; renderBottomNav(); renderTabContent(); };
window.deleteRecord = (id) => {
    if (confirm('삭제하시겠습니까?')) {
        state.records = state.records.filter(r => r.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.records));
        renderTabContent();
    }
};

window.selectDirection = (mode, el) => {
    state.mode = mode;
    sessionStorage.setItem('app_mode', mode);

    // Visual feedback
    if (el) {
        el.style.border = "2px solid var(--primary)";
        setTimeout(() => {
            navigateTo('main');
        }, 150);
    } else {
        navigateTo('main');
    }
};

// Global navigateTo needed for inline calls
window.navigateTo = navigateTo;
window.handleBack = handleBack;
window.stopBreathing = () => { navigateTo('main'); };
window.toggleBreathing = () => { alert('호흡 세션 토글'); };

