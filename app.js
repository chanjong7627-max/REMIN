console.log("App script loaded");

// --- State ---
let state = {
    currentScreen: 'screen-splash',
    mode: 'reminer',
    historyStack: [],
    breathing: { active: false, paused: false, phase: 'idle', timeLeft: 0, totalTime: 0, interval: null, cycle: 0, maxCycles: 4 },
    currentTab: 'home',
    recordDraft: { step: 1, emotions: [], text: "", triggers: [], intensity: 3 },
    records: [],
    // Helper Mode State
    helperLibrary: {
        currentCategory: 'all',
        query: ''
    },
    helperChat: {
        messages: [{ from: 'system', text: "안녕하세요, 헬퍼님! 어떤 도움이 필요하신가요?" }]
    }
};

const HELPER_SENTENCES = [
    { cat: '공감', text: "“지금 많이 힘들었겠다. 여기까지 온 것만 해도 충분히 잘한 거야.”" },
    { cat: '공감', text: "“그 상황이면 그렇게 느끼는 게 너무 자연스러워.”" },
    { cat: '공감', text: "“네가 예민한 게 아니라, 상황이 버거운 거였을 수도 있어.”" },
    { cat: '공감', text: "“말로 다 못해도 괜찮아. 그냥 같이 있어줄게.”" },
    { cat: '공감', text: "“그 감정, 지금은 억지로 없애려 하지 않아도 돼.”" },
    { cat: '공감', text: "“네가 겪은 걸 가볍게 보지 않을게.”" },
    { cat: '질문', text: "“지금 제일 크게 드는 감정이 뭐야?”" },
    { cat: '질문', text: "“그 일이 일어난 뒤에 몸이 어떻게 반응했어? (숨, 심장, 어깨 같은 거)”" },
    { cat: '질문', text: "“그 순간에 가장 필요했던 건 뭐였을까?”" },
    { cat: '질문', text: "“혹시 비슷한 상황이 예전에도 있었어?”" },
    { cat: '질문', text: "“지금 당장 해결보다, ‘덜 힘들게’ 만드는 게 목표라면 뭐부터 해볼 수 있을까?”" },
    { cat: '질문', text: "“내가 어떻게 도와주면 좋을까? 들어주기/정리해주기/조언 중에.”" },
    { cat: '정리', text: "“정리하면, (상황) 때문에 (감정) 이 올라온 거네.”" },
    { cat: '정리', text: "“핵심은 ‘내가 잘못해서’가 아니라 ‘상황이 과부하’였던 것 같아.”" },
    { cat: '정리', text: "“지금은 (A)를 당장 바꾸기 어렵고, (B)는 지금 할 수 있는 영역 같아.”" },
    { cat: '정리', text: "“오늘은 해결보다 회복이 우선인 날로 잡아도 될 것 같아.”" },
    { cat: '정리', text: "“지금 감정이 100이라면, 70만 돼도 숨통 트일 듯해.”" },
    { cat: '정리', text: "“이 문제는 ‘네가’ 아니라 ‘네가 겪는 환경’ 쪽 이슈가 커 보여.”" },
    { cat: '격려', text: "“지금 당장 완벽히 처리 못해도 괜찮아. 한 단계만 내려가자.”" },
    { cat: '격려', text: "“네가 버틴 시간이 그냥 시간이 아니라 ‘힘’이었어.”" },
    { cat: '격려', text: "“오늘은 작은 행동 하나만 해도 성공이야.”" },
    { cat: '격려', text: "“지금 멈추는 건 포기가 아니라, 회복을 위한 선택이야.”" },
    { cat: '격려', text: "“네가 스스로를 지키려는 시도 자체가 이미 방향이 맞아.”" },
    { cat: '격려', text: "“내가 네 편이라는 건 확실해.”" },
    { cat: '경계', text: "“그 말은 듣기 힘들었겠다. 그건 정당화될 수 없는 표현이야.”" },
    { cat: '경계', text: "“지금은 네 감정을 먼저 보호하자. 대화는 잠깐 멈춰도 돼.”" },
    { cat: '경계', text: "“상대의 감정까지 네가 책임질 필요는 없어.”" },
    { cat: '경계', text: "“‘지금은 얘기하기 어렵다’고 말해도 충분해.”" },
    { cat: '경계', text: "“불편한 요청은 거절해도 돼. 거절은 무례가 아니야.”" },
    { cat: '경계', text: "“이건 네 잘못이 아니라, 상대의 방식 문제일 가능성이 커.”" }
];

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
                state.currentTab = 'home'; // Reset tab to home on switch
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

// Old renderTabContent removed. Now specific render functions are below.
// See renderTabContent definition at the bottom for logic.

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

// --- Helper Mode Render Functions ---

function renderHelperHome() {
    return `
        <div class="tab-view-container">
            <h2 class="section-title">Helper</h2>
            <p style="color:var(--text-secondary); margin-bottom:24px">어떤 도움이 필요하신가요?</p>
            
            <!-- Search Dummy -->
            <div style="background:#F3F4F6; border-radius:12px; padding:12px; display:flex; align-items:center; margin-bottom:24px">
                <span class="material-icons-outlined" style="color:#9CA3AF; margin-right:8px">search</span>
                <span style="color:#9CA3AF; font-size:14px">궁금한 내용을 검색해보세요</span>
            </div>

            <div class="card-white" style="margin-bottom:24px; padding:20px 0 0 0; overflow:hidden">
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:1px; background:#F3F4F6">
                    <div style="background:white; padding:20px; text-align:center; cursor:pointer" onclick="window.switchTab('inquiry')">
                        <span class="material-icons-outlined" style="color:var(--primary); font-size:28px">chat_bubble_outline</span>
                        <div style="font-size:14px; margin-top:8px; font-weight:600">1:1 문의</div>
                    </div>
                     <div style="background:white; padding:20px; text-align:center; cursor:pointer" onclick="window.switchTab('guide')">
                        <span class="material-icons-outlined" style="color:var(--primary); font-size:28px">help_outline</span>
                        <div style="font-size:14px; margin-top:8px; font-weight:600">FAQ / 가이드</div>
                    </div>
                     <div style="background:white; padding:20px; text-align:center; cursor:pointer" onclick="window.switchTab('example')">
                        <span class="material-icons-outlined" style="color:var(--primary); font-size:28px">menu_book</span>
                        <div style="font-size:14px; margin-top:8px; font-weight:600">문장 라이브러리</div>
                    </div>
                     <div style="background:white; padding:20px; text-align:center; cursor:pointer" onclick="alert('준비 중입니다')">
                        <span class="material-icons-outlined" style="color:var(--primary); font-size:28px">lightbulb</span>
                        <div style="font-size:14px; margin-top:8px; font-weight:600">감정 이해 팁</div>
                    </div>
                </div>
            </div>

            <h3 class="section-title" style="font-size:18px">빠른 해결</h3>
            <div class="menu-list">
                 <div class="menu-item" onclick="window.switchTab('guide')"><span class="text">비밀번호를 잊어버렸어요</span><span class="material-icons-outlined arrow">chevron_right</span></div>
                 <div class="menu-item" onclick="window.switchTab('guide')"><span class="text">알림이 오지 않아요</span><span class="material-icons-outlined arrow">chevron_right</span></div>
                 <div class="menu-item" onclick="window.switchTab('inquiry')"><span class="text">상담사와 연결하기</span><span class="material-icons-outlined arrow">chevron_right</span></div>
            </div>
        </div>
    `;
}

function renderHelperExample() {
    const cats = ['all', '공감', '질문', '정리', '격려', '경계'];
    const currentCat = state.helperLibrary.currentCategory;
    const list = HELPER_SENTENCES.filter(s => currentCat === 'all' || s.cat === currentCat);

    // Grouping logic isn't strictly needed if we just filter, but list requirement asks for structure.
    // Let's render simple card list.

    return `
        <div class="tab-view-container">
            <h2 class="section-title">문장 라이브러리</h2>
            <div class="check-in-container" style="margin-bottom:20px">
                ${cats.map(c => `
                    <span class="chip ${currentCat === c ? 'selected' : ''}" 
                          onclick="window.setHelperCategory('${c}')"
                          style="margin-right:8px">${c === 'all' ? '전체' : c}</span>
                `).join('')}
            </div>

            <div style="display:flex; flex-direction:column; gap:12px">
                ${list.map(item => `
                    <div class="card-white" style="padding:16px; margin-bottom:0; display:flex; justify-content:space-between; align-items:start">
                        <div>
                            <span class="meta-tag" style="margin-bottom:8px">${item.cat}</span>
                            <p style="font-size:15px; margin-top:4px; line-height:1.5">${item.text}</p>
                        </div>
                        <div style="display:flex; flex-direction:column; gap:8px">
                             <button style="border:none; background:none; cursor:pointer; color:#9CA3AF" onclick="window.copyText('${item.text}')">
                                <span class="material-icons-outlined" style="font-size:20px">content_copy</span>
                             </button>
                             <button style="border:none; background:none; cursor:pointer; color:#9CA3AF" onclick="alert('즐겨찾기 추가됨')">
                                <span class="material-icons-outlined" style="font-size:20px">bookmark_border</span>
                             </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function renderHelperInquiry() {
    const msgs = state.helperChat.messages;
    return `
        <div class="tab-view-container" style="display:flex; flex-direction:column; height:calc(100vh - 160px)">
            <h2 class="section-title" style="flex:none">1:1 문의</h2>
            
            <div style="flex:1; overflow-y:auto; padding-bottom:20px; display:flex; flex-direction:column; gap:12px" id="chat-container">
                 ${msgs.map(m => `
                    <div style="align-self:${m.from === 'user' ? 'flex-end' : 'flex-start'}; 
                                background:${m.from === 'user' ? 'var(--primary)' : '#F3F4F6'}; 
                                color:${m.from === 'user' ? 'white' : 'black'};
                                padding:10px 16px; border-radius:16px; max-width:80%; font-size:14px; line-height:1.5;
                                border-bottom-${m.from === 'user' ? 'right' : 'left'}-radius: 4px;">
                        ${m.text}
                    </div>
                 `).join('')}
            </div>

            <div style="flex:none; padding-top:10px; border-top:1px solid #F3F4F6; background:white">
                <div style="display:flex; gap:8px;">
                    <input type="text" id="chat-input" placeholder="메시지를 입력하세요..." 
                           style="flex:1; padding:12px; border:1px solid #E5E7EB; border-radius:24px; outline:none"
                           onkeypress="if(event.key === 'Enter') window.sendHelperMessage()">
                    <button class="btn-capsule" style="width:auto; padding:0 20px" onclick="window.sendHelperMessage()">
                        <span class="material-icons-outlined">send</span>
                    </button>
                </div>
            </div>
        </div>
    `;
}

function renderHelperGuide() {
    return `
        <div class="tab-view-container">
            <h2 class="section-title">가이드 / FAQ</h2>
            <div style="margin-bottom:30px">
                <h3 style="font-size:18px; margin-bottom:12px">자주 묻는 질문</h3>
                <div class="menu-list">
                    ${['헬퍼 활동은 어떻게 하나요?', '포인트는 언제 정산되나요?', '부적절한 사용자를 신고하고 싶어요', '리미너 모드와 차이가 뭔가요?', '알림 설정을 변경하고 싶어요', '탈퇴는 어떻게 하나요?'].map((q, i) => `
                        <div class="menu-item" onclick="window.toggleFaq(${i})">
                            <div style="flex:1">
                                <div class="text" style="font-weight:500">${q}</div>
                                <div id="faq-ans-${i}" style="display:none; margin-top:10px; font-size:13px; color:#6B7280; line-height:1.5">
                                    이것은 더미 답변입니다. 상세한 내용은 추후 업데이트 됩니다. 헬퍼 가이드를 참고해주세요.
                                </div>
                            </div>
                            <span class="material-icons-outlined arrow" id="faq-icon-${i}">keyboard_arrow_down</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

function renderHelperProfile() {
    return `
         <div class="tab-view-container">
            <h2 class="section-title">프로필 (Helper)</h2>
            
            <div class="profile-header-card">
                 <div class="avatar-circle" style="background:#E0F2FE; color:#0369A1">
                    <span class="material-icons-outlined">face</span>
                </div>
                <h2 style="font-size:20px; font-weight:700; margin-bottom:4px">Helper #1024</h2>
                <div class="meta-row" style="justify-content:center; margin-top:8px">
                    <span class="meta-tag highlight">따뜻한 리스너</span>
                    <span class="meta-tag">공감 랭커</span>
                </div>
            </div>

            <div class="card-white" style="margin-top:20px">
                <h3 style="font-size:16px; margin-bottom:12px">활동 설정</h3>
                
                <p style="font-size:13px; color:#6B7280; margin-bottom:8px">주 사용 목적</p>
                <div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:20px">
                    <span class="chip selected">가족/친구 돕기</span>
                    <span class="chip">연인</span>
                    <span class="chip">동료</span>
                </div>

                <p style="font-size:13px; color:#6B7280; margin-bottom:8px">응답 톤</p>
                <div style="display:flex; gap:10px; background:#F3F4F6; padding:4px; border-radius:12px">
                    <div style="flex:1; text-align:center; padding:8px; background:white; border-radius:8px; font-size:13px; font-weight:600; box-shadow:0 1px 2px rgba(0,0,0,0.05)">따뜻하게</div>
                    <div style="flex:1; text-align:center; padding:8px; font-size:13px; color:#6B7280">단호하게</div>
                    <div style="flex:1; text-align:center; padding:8px; font-size:13px; color:#6B7280">조심스럽게</div>
                </div>
            </div>

            <button class="btn-capsule secondary" style="margin-top:24px; width:100%" onclick="window.switchToReminerMode()">
                리미너 모드로 전환
            </button>
         </div>
    `;
}


// --- Helper Logic Helpers ---
window.setHelperCategory = (c) => {
    state.helperLibrary.currentCategory = c;
    renderTabContent();
};

window.copyText = (text) => {
    // navigator.clipboard.writeText(text); // Might fail in non-secure context
    alert('클립보드에 복사되었습니다: ' + text.substring(0, 10) + '...');
};

window.toggleFaq = (i) => {
    const ans = document.getElementById(`faq-ans-${i}`);
    const icon = document.getElementById(`faq-icon-${i}`);
    if (ans.style.display === 'none') {
        ans.style.display = 'block';
        icon.innerText = 'keyboard_arrow_up';
    } else {
        ans.style.display = 'none';
        icon.innerText = 'keyboard_arrow_down';
    }
};

window.sendHelperMessage = () => {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;

    state.helperChat.messages.push({ from: 'user', text: text });
    input.value = '';
    renderTabContent(); // Re-render to show message

    setTimeout(() => {
        state.helperChat.messages.push({ from: 'system', text: "네, 말씀해주셔서 감사합니다. 어떤 부분이 가장 걱정되시나요?" });
        renderTabContent();
        // Scroll to bottom
        const container = document.getElementById('chat-container');
        if (container) container.scrollTop = container.scrollHeight;
    }, 1000);
};

window.switchToReminerMode = () => {
    if (confirm('리미너 모드로 전환하시겠습니까?')) {
        state.mode = 'reminer';
        sessionStorage.setItem('app_mode', 'reminer');
        state.currentTab = 'home';

        // Update Settings Toggle UI if it exists (not strictly needed as re-render handles, but good for sync)
        const segMode = document.getElementById('segMode');
        if (segMode) {
            // ...
        }

        renderBottomNav();
        renderTabContent();
    }
};


function renderTabContent() {
    const container = document.getElementById('tab-content');
    if (!container) return;

    const m = state.mode;
    const t = state.currentTab;

    console.log("[NAV]", { currentMode: m, targetTab: t });

    let content = "";

    if (m === 'reminer') {
        if (t === 'home') content = renderReminerHome();
        else if (t === 'breathe') content = renderReminerBreathe();
        else if (t === 'record') content = renderReminerRecord();
        else if (t === 'insight') content = renderReminerInsight();
        else if (t === 'profile') content = renderProfile();
        else content = renderReminerHome(); // Default fallback
    } else if (m === 'helper') {
        if (t === 'home') content = renderHelperHome();
        else if (t === 'example') content = renderHelperExample();
        else if (t === 'inquiry') content = renderHelperInquiry();
        else if (t === 'guide') content = renderHelperGuide();
        else if (t === 'profile') content = renderHelperProfile(); // Use distinct helper profile
        else content = renderHelperHome(); // Default fallback
    }

    container.innerHTML = content;
}

function renderBottomNav() {
    const nav = document.querySelector('.bottom-nav');
    if (!nav) return;

    let tabs = [];
    if (state.mode === 'reminer') {
        tabs = [
            { id: 'home', icon: 'home', label: '홈' },
            { id: 'breathe', icon: 'spa', label: '호흡' },
            { id: 'record', icon: 'edit', label: '기록' },
            { id: 'insight', icon: 'insights', label: '인사이트' },
            { id: 'profile', icon: 'person', label: '프로필' }
        ];
    } else { // Helper
        tabs = [
            { id: 'home', icon: 'home', label: '홈' },
            { id: 'example', icon: 'menu_book', label: '예시' },
            { id: 'inquiry', icon: 'chat_bubble_outline', label: '대화' },
            { id: 'guide', icon: 'help_outline', label: '가이드' },
            { id: 'profile', icon: 'person', label: '프로필' }
        ];
    }

    nav.innerHTML = '';
    tabs.forEach(t => {
        const div = document.createElement('div');
        div.className = `nav-item ${state.currentTab === t.id ? 'active' : ''}`;
        div.innerHTML = `<span class="material-icons-outlined">${t.icon}</span>`;
        div.addEventListener('click', () => {
            console.log("[HELPER TAB]", { tabName: t.id, currentMode: state.mode, visibleScreen: 'screen-main' });
            window.switchTab(t.id);
        });
        nav.appendChild(div);
    });
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

    // Force Re-render of Navigation for new mode
    renderBottomNav();

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

