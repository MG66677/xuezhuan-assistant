/* ===== 学赚助手 - 前端脚本 ===== */

// ===== 工具 =====
function $(id) { return document.getElementById(id); }
function qs(s) { return document.querySelector(s); }
function qsa(s) { return document.querySelectorAll(s); }
function esc(s) { const d = document.createElement("div"); d.textContent = s || ""; return d.innerHTML; }
function today() { return new Date().toISOString().slice(0, 10); }

function closeModal() { qsa(".modal-overlay").forEach(m => m.style.display = "none"); }
function closeModalOutside(e) { if (e.target.classList.contains("modal-overlay")) closeModal(); }
document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });

// ===== API =====
async function api(method, path, body) {
    const opts = { method, headers: { "Content-Type": "application/json" } };
    if (body) opts.body = JSON.stringify(body);
    const r = await fetch("/api/" + path, opts);
    return r.json();
}

// ===== 模式切换 =====
async function toggleMode() {
    const d = await api("POST", "toggle-mode");
    const label = document.getElementById("modeLabel");
    if (label) label.textContent = d.mode;
}

// ===== CHAT =====
async function sendMessage() {
    const input = $("chatInput");
    if (!input) return;
    const msg = input.value.trim();
    if (!msg) return;
    input.value = "";
    addMessage("user", msg);
    const think = document.getElementById("thinkingIndicator");
    if (think) think.style.display = "flex";
    scrollChat();
    try {
        const d = await api("POST", "chat", { message: msg });
        if (think) think.style.display = "none";
        addMessage("assistant", d.reply);
        const ml = document.getElementById("modeLabel");
        if (ml && d.mode) ml.textContent = d.mode;
    } catch (e) {
        if (think) think.style.display = "none";
        addMessage("assistant", "出错了，检查一下后端是否运行。");
    }
    scrollChat();
    input.focus();
}

function addMessage(role, content) {
    const container = document.getElementById("chatMessages");
    if (!container) return;
    const div = document.createElement("div");
    div.className = `msg msg-${role}`;
    div.innerHTML = `<div class="msg-avatar"><i class="lci lci-${role === "user" ? "user" : "bot"}"></i></div>
        <div class="msg-content">${esc(content)}</div>`;
    const think = document.getElementById("thinkingIndicator");
    if (think) container.insertBefore(div, think);
    else container.appendChild(div);
}

function scrollChat() {
    const c = document.getElementById("chatMessages");
    if (c) c.scrollTop = c.scrollHeight;
}

function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
}

function sendSuggestion(text) {
    const input = $("chatInput");
    if (input) { input.value = text; sendMessage(); }
}

async function clearChat() {
    if (!confirm("确定清空对话？")) return;
    await api("POST", "chat/clear");
    qsa("#chatMessages .msg").forEach(el => el.remove());
}

async function loadChatHistory() {
    try {
        const data = await api("GET", "chat/history");
        data.forEach(h => addMessage(h.role, h.content));
        scrollChat();
    } catch(e) {}
}

// ===== 仪表盘 =====
async function loadDashboard() {
    try {
        const d = await api("GET", "dashboard");
        const statsHtml = `
            <div class="stat-card"><div class="stat-icon" style="background:#eef2ff;color:#4f6ef7"><i class="lci lci-list-checks"></i></div>
                <div class="stat-info"><div class="stat-value">${d.stats.tasks_todo}</div><div class="stat-label">待办任务</div></div></div>
            <div class="stat-card"><div class="stat-icon" style="background:#f0fdf4;color:#22c55e"><i class="lci lci-notebook"></i></div>
                <div class="stat-info"><div class="stat-value">${d.stats.notes_count}</div><div class="stat-label">笔记总数</div></div></div>
            <div class="stat-card"><div class="stat-icon" style="background:#fff7ed;color:#f97316"><i class="lci lci-briefcase"></i></div>
                <div class="stat-info"><div class="stat-value">${d.stats.projects_active}</div><div class="stat-label">进行中项目</div></div></div>
            <div class="stat-card"><div class="stat-icon" style="background:#f5f3ff;color:#8b5cf6"><i class="lci lci-brain"></i></div>
                <div class="stat-info"><div class="stat-value">${d.stats.flashcards_count}</div><div class="stat-label">闪卡张数</div></div></div>`;
        const sg = document.getElementById("statsGrid");
        if (sg) sg.innerHTML = statsHtml;

        const tlist = document.getElementById("taskList");
        if (tlist) {
            if (d.tasks.length) {
                tlist.innerHTML = d.tasks.map(t => {
                    const pclass = { "高": "high", "中": "mid", "低": "low" }[t.priority] || "mid";
                    const catClass = t.category === "赚钱" ? "earn" : "study";
                    return `<div class="task-item">
                        <div class="task-priority priority-${pclass}"></div>
                        <div class="task-info"><div class="task-title">${esc(t.title)}</div>
                        ${t.deadline ? `<div class="task-meta">截止：${t.deadline}</div>` : ""}</div>
                        <span class="category-tag ${catClass}">${t.category}</span></div>`;
                }).join("");
            } else {
                tlist.innerHTML = '<div class="empty-state"><i class="lci lci-check-circle-2"></i><p>暂无待办任务</p></div>';
            }
        }

        const nlist = document.getElementById("notesList");
        if (nlist) {
            if (d.notes.length) {
                nlist.innerHTML = d.notes.map(n => `<div class="note-preview-item" onclick="location.href='/notes'">
                    <div class="note-preview-title">${esc(n.title)}</div>
                    <div class="note-preview-excerpt">${esc((n.content || "").slice(0, 100))}</div>
                    <div class="note-preview-meta"><span>${n.created_at}</span>${n.tags ? `<span class="tags">${esc(n.tags)}</span>` : ""}</div></div>`
                ).join("");
            } else {
                nlist.innerHTML = '<div class="empty-state"><i class="lci lci-sticky-note"></i><p>还没有笔记</p></div>';
            }
        }
    } catch(e) {
        console.error("Dashboard load error:", e);
    }
}

// ===== 笔记 =====
let editingNoteId = null;
function openNoteEditor() {
    editingNoteId = null;
    ["noteTitle", "noteContent", "noteTags"].forEach(id => { const el = $(id); if (el) el.value = ""; });
    const btn = $("deleteNoteBtn");
    if (btn) btn.style.display = "none";
    const m = $("noteModal");
    if (m) { m.style.display = "flex"; setTimeout(() => { const t = $("noteTitle"); if (t) t.focus(); }, 100); }
}
async function editNote(id) {
    editingNoteId = id;
    const d = await api("GET", `notes/${id}`);
    if ($("noteTitle")) $("noteTitle").value = d.title || "";
    if ($("noteContent")) $("noteContent").value = d.content || "";
    if ($("noteTags")) $("noteTags").value = d.tags || "";
    const btn = $("deleteNoteBtn");
    if (btn) btn.style.display = "inline-flex";
    const m = $("noteModal");
    if (m) m.style.display = "flex";
}
async function saveNote() {
    const title = ($("noteTitle")?.value || "").trim();
    if (!title) { alert("请输入标题"); return; }
    const data = { title, content: ($("noteContent")?.value || "").trim(), tags: ($("noteTags")?.value || "").trim() };
    if (editingNoteId) await api("PUT", `notes/${editingNoteId}`, data);
    else await api("POST", "notes", data);
    closeModal(); location.reload();
}
async function deleteNote() {
    if (!editingNoteId || !confirm("确定删除？")) return;
    await api("DELETE", `notes/${editingNoteId}`);
    closeModal(); location.reload();
}
async function searchNotes() {
    const q = ($("searchNotes")?.value || "").trim();
    const data = await api("GET", `notes?search=${encodeURIComponent(q)}`);
    const grid = $("notesGrid");
    if (!grid) return;
    if (!data.length) { grid.innerHTML = '<div class="empty-state"><i class="lci lci-sticky-note"></i><p>没有匹配的笔记</p></div>'; return; }
    grid.innerHTML = data.map(n => `<div class="note-card" onclick="editNote(${n.id})">
        <div class="note-card-header"><h3>${esc(n.title)}</h3></div>
        <div class="note-card-body"><p>${esc((n.preview || "").slice(0, 120))}</p></div>
        <div class="note-card-footer"><span class="note-date">${n.created_at || ""}</span>
        ${n.tags ? `<span class="note-tags">${esc(n.tags)}</span>` : ""}</div></div>`
    ).join("");
}

async function loadNotes() {
    const data = await api("GET", "notes");
    const grid = $("notesGrid");
    if (!grid) return;
    if (!data.length) { grid.innerHTML = '<div class="empty-state"><i class="lci lci-sticky-note"></i><p>还没有笔记，去创建一条吧</p></div>'; return; }
    grid.innerHTML = data.map(n => `<div class="note-card" onclick="editNote(${n.id})">
        <div class="note-card-header"><h3>${esc(n.title)}</h3></div>
        <div class="note-card-body"><p>${esc((n.preview || "").slice(0, 120))}</p></div>
        <div class="note-card-footer"><span class="note-date">${n.created_at || ""}</span>
        ${n.tags ? `<span class="note-tags">${esc(n.tags)}</span>` : ""}</div></div>`
    ).join("");
}

// ===== 任务 =====
let editingTaskId = null;
function openTaskEditor() {
    editingTaskId = null;
    ["taskTitle", "taskDesc", "taskDeadline"].forEach(id => { const el = $(id); if (el) el.value = ""; });
    ["taskPriority", "taskCategory", "taskStatus"].forEach(id => { const el = $(id); if (el) el.value = "中"; });
    if ($("taskCategory")) $("taskCategory").value = "学业";
    if ($("taskStatus")) $("taskStatus").value = "待办";
    const btn = $("deleteTaskBtn");
    if (btn) btn.style.display = "none";
    const m = $("taskModal");
    if (m) m.style.display = "flex";
}
async function editTask(id) {
    editingTaskId = id;
    const tasks = await api("GET", "tasks");
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    ["taskTitle", "taskDesc", "taskDeadline", "taskPriority", "taskCategory", "taskStatus"].forEach(k => {
        const el = $(k);
        if (el) el.value = t[k] || "";
    });
    const btn = $("deleteTaskBtn");
    if (btn) btn.style.display = "inline-flex";
    const m = $("taskModal");
    if (m) m.style.display = "flex";
}
async function saveTask() {
    const title = ($("taskTitle")?.value || "").trim();
    if (!title) { alert("请输入标题"); return; }
    const data = {
        title,
        description: ($("taskDesc")?.value || "").trim(),
        deadline: $("taskDeadline")?.value || "",
        priority: $("taskPriority")?.value || "中",
        category: $("taskCategory")?.value || "学业",
        status: $("taskStatus")?.value || "待办"
    };
    if (editingTaskId) await api("PUT", `tasks/${editingTaskId}`, data);
    else await api("POST", "tasks", data);
    closeModal(); location.reload();
}
async function deleteTask() {
    if (!editingTaskId || !confirm("确定删除？")) return;
    await api("DELETE", `tasks/${editingTaskId}`);
    closeModal(); location.reload();
}

function filterTasks(filter) {
    qsa(".filter-btn").forEach(b => b.classList.remove("active"));
    qsa(`[data-filter="${filter}"]`).forEach(b => b.classList.add("active"));
    qsa(".task-card").forEach(c => {
        c.style.display = (filter === "all" || c.dataset.status === filter) ? "" : "none";
    });
}

async function loadTasks() {
    const data = await api("GET", "tasks");
    const grid = $("taskGrid");
    if (!grid) return;
    if (!data.length) { grid.innerHTML = '<div class="empty-state"><i class="lci lci-list-checks"></i><p>还没有任务</p></div>'; return; }
    grid.innerHTML = data.map(t => {
        const pclass = { "高": "high", "中": "mid", "低": "low" }[t.priority] || "mid";
        const catClass = t.category === "赚钱" ? "earn" : "study";
        return `<div class="task-card" data-status="${t.status}" onclick="editTask(${t.id})">
            <div class="task-card-top"><span class="category-tag ${catClass}">${t.category}</span>
                <span class="priority-badge priority-${pclass}">${t.priority}</span></div>
            <div class="task-card-title">${esc(t.title)}</div>
            ${t.description ? `<div class="task-card-desc">${esc(t.description.slice(0, 80))}</div>` : ""}
            <div class="task-card-footer">
                <span class="task-status status-${t.status}">${t.status}</span>
                ${t.deadline ? `<span class="task-deadline${t.deadline < today() && t.status !== "已完成" ? " overdue" : ""}"><i class="lci lci-calendar"></i> ${t.deadline}</span>` : ""}
            </div></div>`;
    }).join("");
}

// ===== 闪卡 =====
let cards = [];
let currentIndex = 0;

function flipCard() {
    const card = document.getElementById("currentCard");
    if (card) { card.classList.toggle("flipped"); }
    const btns = document.getElementById("reviewButtons");
    if (btns) btns.style.display = card?.classList.contains("flipped") ? "flex" : "none";
}

function prevCard() { if (cards.length) { currentIndex = (currentIndex - 1 + cards.length) % cards.length; showCard(); } }
function nextCard() { if (cards.length) { currentIndex = (currentIndex + 1) % cards.length; showCard(); } }

function showCard() {
    const card = document.getElementById("currentCard");
    if (!card || !cards.length) return;
    card.classList.remove("flipped");
    const btns = document.getElementById("reviewButtons");
    if (btns) btns.style.display = "none";
    const cf = document.getElementById("cardFront");
    const cb = document.getElementById("cardBack");
    if (cf) cf.textContent = cards[currentIndex].front;
    if (cb) cb.textContent = cards[currentIndex].back;
    const cp = document.getElementById("cardProgress");
    if (cp) cp.textContent = `${currentIndex + 1} / ${cards.length}`;
}

async function reviewCard(difficulty) {
    const fid = cards[currentIndex].id;
    await api("POST", `flashcards/${fid}/review`, { difficulty });
    cards.splice(currentIndex, 1);
    const viewer = document.getElementById("flashcardViewer");
    if (cards.length === 0) {
        if (viewer) viewer.innerHTML = '<div class="empty-state"><i class="lci lci-brain"></i><p>🎉 复习完成！</p></div>';
        return;
    }
    if (currentIndex >= cards.length) currentIndex = 0;
    showCard();
}

async function selectDeck(deck) {
    qsa(".deck-item").forEach(el => el.classList.remove("active"));
    qsa(".deck-item").forEach(el => {
        const span = el.querySelector("span");
        if ((deck === "all" && span?.textContent === "全部") || span?.textContent === deck) el.classList.add("active");
    });
    cards = await api("GET", `flashcards${deck !== "all" ? `?deck=${encodeURIComponent(deck)}` : ""}`);
    currentIndex = 0;
    const viewer = document.getElementById("flashcardViewer");
    if (!viewer) return;
    if (cards.length > 0) {
        viewer.innerHTML = `<div class="flashcard" id="currentCard" onclick="flipCard()">
            <div class="flashcard-inner">
                <div class="flashcard-front"><div class="flashcard-content" id="cardFront"></div><div class="flashcard-hint">点击翻转</div></div>
                <div class="flashcard-back"><div class="flashcard-content" id="cardBack"></div></div>
            </div></div>
            <div class="flashcard-controls">
                <div class="review-buttons" id="reviewButtons" style="display:none">
                    <button class="btn review-btn review-hard" onclick="reviewCard('难')">😰 再记一次</button>
                    <button class="btn review-btn review-ok" onclick="reviewCard('中')">😊 记住了</button>
                    <button class="btn review-btn review-easy" onclick="reviewCard('简单')">😎 很简单</button>
                </div>
                <div class="deck-progress"><span id="cardProgress">${cards.length} 张</span></div>
                <div class="card-nav"><button class="btn btn-ghost" onclick="prevCard()"><i class="lci lci-chevron-left"></i></button>
                <button class="btn btn-ghost" onclick="nextCard()"><i class="lci lci-chevron-right"></i></button></div>
            </div>`;
        showCard();
    } else {
        viewer.innerHTML = '<div class="empty-state"><i class="lci lci-brain"></i><p>这个牌组还没有卡片</p></div>';
    }
}

async function loadFlashcards() {
    cards = await api("GET", "flashcards");
    const decks = await api("GET", "flashcards/decks");
    const dl = document.getElementById("deckList");
    if (dl) {
        dl.innerHTML = `<div class="deck-item active" onclick="selectDeck('all')"><span>全部</span><span class="deck-count">${cards.length}</span></div>`
            + decks.map(d => `<div class="deck-item" onclick="selectDeck('${esc(d.deck)}')"><span>${esc(d.deck)}</span><span class="deck-count">${d.count}</span></div>`).join("");
    }
    selectDeck("all");
}

function openFlashcardEditor() {
    ["fcFront", "fcBack"].forEach(id => { const el = $(id); if (el) el.value = ""; });
    if ($("fcDeck")) $("fcDeck").value = "默认";
    const m = $("flashcardModal");
    if (m) m.style.display = "flex";
}
async function saveFlashcard() {
    const front = ($("fcFront")?.value || "").trim();
    const back = ($("fcBack")?.value || "").trim();
    if (!front || !back) { alert("请填写正反面"); return; }
    await api("POST", "flashcards", { front, back, deck: ($("fcDeck")?.value || "").trim() || "默认" });
    closeModal(); location.reload();
}

// ===== 课程 =====
let selectedColor = "#4f6ef7";
function selectColor(el, color) {
    qsa(".color-swatch").forEach(s => s.classList.remove("selected"));
    el.classList.add("selected");
    selectedColor = color;
    const cc = $("courseColor");
    if (cc) cc.value = color;
}

function openCourseEditor() {
    ["courseName", "courseTeacher", "courseLocation"].forEach(id => { const el = $(id); if (el) el.value = ""; });
    if ($("courseStart")) $("courseStart").value = "08:00";
    if ($("courseEnd")) $("courseEnd").value = "09:35";
    if ($("courseDay")) $("courseDay").value = "0";
    selectedColor = "#4f6ef7";
    qsa(".color-swatch").forEach((s, i) => s.classList.toggle("selected", i === 0));
    const m = $("courseModal");
    if (m) m.style.display = "flex";
}

async function saveCourse() {
    const name = ($("courseName")?.value || "").trim();
    if (!name) { alert("请输入课程名称"); return; }
    await api("POST", "courses", {
        name, teacher: ($("courseTeacher")?.value || "").trim(),
        location: ($("courseLocation")?.value || "").trim(),
        day_of_week: parseInt($("courseDay")?.value || "0"),
        start_time: $("courseStart")?.value || "08:00",
        end_time: $("courseEnd")?.value || "09:35",
        color: selectedColor
    });
    closeModal(); location.reload();
}

async function deleteCourse(id) {
    if (!confirm("确定删除这门课？")) return;
    await api("DELETE", `courses/${id}`);
    location.reload();
}

async function loadSchedule() {
    const courses = await api("GET", "courses");
    const grid = document.getElementById("scheduleGrid");
    if (!grid) return;

    const days = ["周一","周二","周三","周四","周五","周六","周日"];
    const hours = [];
    for (let h = 8; h < 22; h++) hours.push(String(h).padStart(2, "0") + ":00");
    
    let html = '<div class="schedule-header time-col">时间</div>';
    days.forEach(d => { html += `<div class="schedule-header">${d}</div>`; });
    
    hours.forEach(hour => {
        html += `<div class="schedule-time">${hour}</div>`;
        for (let day = 0; day < 7; day++) {
            html += `<div class="schedule-cell" data-day="${day}" data-time="${hour}">`;
            courses.filter(c => c.day_of_week === day && c.start_time.slice(0, 5) === hour).forEach(c => {
                html += `<div class="schedule-course" style="background:${c.color}20;border-left:3px solid ${c.color}">
                    <div class="course-name">${esc(c.name)}</div>
                    <div class="course-meta">${c.start_time.slice(0,5)}-${c.end_time.slice(0,5)}</div>
                    ${c.location ? `<div class="course-meta">${esc(c.location)}</div>` : ""}
                    <button class="course-delete" onclick="event.stopPropagation();deleteCourse(${c.id})">&times;</button>
                </div>`;
            });
            html += "</div>";
        }
    });
    grid.innerHTML = html;
}

// ===== 项目 =====
let editingProjectId = null;
function openProjectEditor() {
    editingProjectId = null;
    ["projectName", "projectClient", "projectDesc", "projectBudget", "projectEarned", "projectDeadline"].forEach(id => {
        const el = $(id); if (el) el.value = "";
    });
    if ($("projectStatus")) $("projectStatus").value = "进行中";
    const btn = $("deleteProjectBtn");
    if (btn) btn.style.display = "none";
    const m = $("projectModal");
    if (m) m.style.display = "flex";
}
async function editProject(id) {
    editingProjectId = id;
    const projects = await api("GET", "projects");
    const p = projects.find(x => x.id === id);
    if (!p) return;
    ["projectName", "projectClient", "projectDesc", "projectBudget", "projectEarned", "projectDeadline", "projectStatus"].forEach(k => {
        const el = $(k);
        if (el) el.value = p[k] || "";
    });
    const btn = $("deleteProjectBtn");
    if (btn) btn.style.display = "inline-flex";
    const m = $("projectModal");
    if (m) m.style.display = "flex";
}
async function saveProject() {
    const name = ($("projectName")?.value || "").trim();
    if (!name) { alert("请输入项目名称"); return; }
    const data = {
        name, client: ($("projectClient")?.value || "").trim(),
        description: ($("projectDesc")?.value || "").trim(),
        budget: parseFloat($("projectBudget")?.value) || 0,
        earned: parseFloat($("projectEarned")?.value) || 0,
        deadline: $("projectDeadline")?.value || "",
        status: $("projectStatus")?.value || "进行中"
    };
    if (editingProjectId) await api("PUT", `projects/${editingProjectId}`, data);
    else await api("POST", "projects", data);
    closeModal(); location.reload();
}
async function deleteProject() {
    if (!editingProjectId || !confirm("确定删除？")) return;
    await api("DELETE", `projects/${editingProjectId}`);
    closeModal(); location.reload();
}

async function loadProjects() {
    const data = await api("GET", "projects");
    const grid = $("projectsGrid");
    const statsDiv = $("projectsStats");
    if (!grid) return;

    if (statsDiv) {
        const active = data.filter(p => p.status === "进行中");
        const completed = data.filter(p => p.status === "已完成");
        const totalEarned = data.reduce((s, p) => s + (p.earned || 0), 0);
        statsDiv.innerHTML = `
            <div class="mini-stat"><span class="mini-stat-value">${active.length}</span><span class="mini-stat-label">进行中</span></div>
            <div class="mini-stat"><span class="mini-stat-value">${completed.length}</span><span class="mini-stat-label">已完成</span></div>
            <div class="mini-stat"><span class="mini-stat-value">¥${Math.round(totalEarned)}</span><span class="mini-stat-label">已收入</span></div>`;
    }

    if (!data.length) { grid.innerHTML = '<div class="empty-state"><i class="lci lci-briefcase"></i><p>还没有项目</p></div>'; return; }
    grid.innerHTML = data.map(p => `<div class="project-card" onclick="editProject(${p.id})">
        <div class="project-card-header"><h3>${esc(p.name)}</h3><span class="project-status status-${p.status}">${p.status}</span></div>
        ${p.client ? `<div class="project-client"><i class="lci lci-user"></i> ${esc(p.client)}</div>` : ""}
        ${p.description ? `<div class="project-desc">${esc(p.description.slice(0, 100))}</div>` : ""}
        <div class="project-card-footer">
            ${p.budget ? `<span class="project-budget">预算：¥${p.budget}</span>` : ""}
            ${p.earned ? `<span class="project-earned">已收入：¥${p.earned}</span>` : ""}
            ${p.deadline ? `<span class="project-deadline">截止：${p.deadline}</span>` : ""}
        </div></div>`
    ).join("");
}

// ===== 页面初始化 =====
document.addEventListener("DOMContentLoaded", function() {
    const path = window.location.pathname;
    if (path === "/" || path === "/index.html") loadDashboard();
    else if (path === "/chat") loadChatHistory();
    else if (path === "/notes") loadNotes();
    else if (path === "/tasks") loadTasks();
    else if (path === "/flashcards") loadFlashcards();
    else if (path === "/schedule") loadSchedule();
    else if (path === "/projects") loadProjects();
});
