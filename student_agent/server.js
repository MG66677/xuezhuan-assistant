// ===== 学赚助手 - Node.js 后端（零依赖） =====
const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");
const crypto = require("crypto");

const PORT = 5678;
const PUBLIC = path.join(__dirname, "public");
const DATA = path.join(__dirname, "data");
const DB_FILE = path.join(DATA, "database.json");
const CHAT_FILE = path.join(DATA, "chat.json");
const SECRET = crypto.randomBytes(16).toString("hex");

// ===== 数据层 =====
let agentMode = "study";
let db = initDb();
let chatHistory = loadJson(CHAT_FILE, []);

function initDb() {
    try { return JSON.parse(fs.readFileSync(DB_FILE, "utf8")); }
    catch { return { notes: [], tasks: [], flashcards: [], courses: [], projects: [], goals: [], nextId: 1 }; }
}
function saveDb() { writeJson(DB_FILE, db); }

function loadJson(file, def) {
    try { return JSON.parse(fs.readFileSync(file, "utf8")); }
    catch { return def; }
}
function writeJson(file, data) { fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8"); }

function nextId() { return db.nextId++; }
function now() { return new Date().toLocaleString("zh-CN", { hour12: false }); }
function today() { return new Date().toISOString().slice(0, 10); }

// ===== MIME 类型 =====
const MIME = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
};

// ===== 路由 =====
async function handle(req, res) {
    const u = url.parse(req.url, true);
    const method = req.method;
    const segs = u.pathname.split("/").filter(Boolean);

    // CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (method === "OPTIONS") return end(res, 204);

    try {
        // API 路由
        if (segs[0] === "api") return await handleApi(method, segs.slice(1), u, req, res);
        // 静态文件
        return serveStatic(u.pathname, res);
    } catch (e) {
        console.error("Error:", e.message);
        json(res, 500, { error: e.message });
    }
}

async function handleApi(method, segs, u, req, res) {
    const body = method === "GET" || method === "DELETE" ? {} : await readBody(req);

    // ===== 聊天 =====
    if (segs[0] === "chat" && segs.length === 1 && method === "POST") {
        const msg = (body.message || "").trim();
        if (!msg) return json(res, 400, { error: "消息不能为空" });

        chatHistory.push({ role: "user", content: msg, created_at: now() });

        // 本地记忆检索
        const notes = db.notes.filter(n =>
            n.title.includes(msg) || n.content.includes(msg) || (n.tags || "").includes(msg)
        ).slice(0, 3);
        let context = "";
        if (notes.length) {
            context = "相关笔记：\n" + notes.map(n => `[${n.title}] ${(n.content || "").slice(0, 200)}`).join("\n");
        }

        // 模式提示
        const modePrompt = agentMode === "study"
            ? "你是学业助手。帮助整理笔记、规划作业、准备考试、安排学习时间。"
            : "你是赚钱助手。帮助发现线上赚钱机会、管理项目、写文案、匹配技能与市场。";

        // 本地智能回复（基于匹配）
        let reply = localReply(msg, context, modePrompt);

        chatHistory.push({ role: "assistant", content: reply, created_at: now() });
        if (chatHistory.length > 200) chatHistory = chatHistory.slice(-100);
        writeJson(CHAT_FILE, chatHistory);

        return json(res, 200, { reply, mode: agentMode === "study" ? "学业" : "赚钱" });
    }

    if (segs[0] === "chat" && segs[1] === "history") {
        return json(res, 200, chatHistory);
    }
    if (segs[0] === "chat" && segs[1] === "clear" && method === "POST") {
        chatHistory = [];
        writeJson(CHAT_FILE, chatHistory);
        return json(res, 200, { ok: true });
    }

    // ===== 笔记 =====
    if (segs[0] === "notes" && segs.length === 1 && method === "GET") {
        let notes = [...db.notes].reverse();
        const search = u.query.search;
        const tag = u.query.tag;
        if (search) notes = notes.filter(n =>
            n.title.includes(search) || n.content.includes(search)
        );
        if (tag) notes = notes.filter(n => (n.tags || "").includes(tag));
        return json(res, 200, notes.map(n => ({ ...n, preview: (n.content || "").slice(0, 200) })));
    }
    if (segs[0] === "notes" && segs.length === 1 && method === "POST") {
        const n = { id: nextId(), title: body.title || "", content: body.content || "", tags: body.tags || "", created_at: today(), updated_at: today() };
        db.notes.push(n); saveDb();
        return json(res, 200, { id: n.id, ok: true });
    }
    if (segs[0] === "notes" && segs.length === 2) {
        const nid = parseInt(segs[1]);
        const idx = db.notes.findIndex(n => n.id === nid);
        if (idx === -1) return json(res, 404, { error: "未找到" });
        if (method === "GET") return json(res, 200, db.notes[idx]);
        if (method === "PUT") {
            db.notes[idx] = { ...db.notes[idx], title: body.title, content: body.content || "", tags: body.tags || "", updated_at: today() };
            saveDb(); return json(res, 200, { ok: true });
        }
        if (method === "DELETE") {
            db.notes.splice(idx, 1); saveDb();
            return json(res, 200, { ok: true });
        }
    }

    // ===== 任务 =====
    if (segs[0] === "tasks" && segs.length === 1 && method === "GET") {
        let tasks = [...db.tasks].reverse();
        if (u.query.status) tasks = tasks.filter(t => t.status === u.query.status);
        if (u.query.category) tasks = tasks.filter(t => t.category === u.query.category);
        return json(res, 200, tasks);
    }
    if (segs[0] === "tasks" && segs.length === 1 && method === "POST") {
        const t = { id: nextId(), title: body.title, description: body.description || "", deadline: body.deadline || "", priority: body.priority || "中", category: body.category || "学业", status: "待办", created_at: today() };
        db.tasks.push(t); saveDb();
        return json(res, 200, { id: t.id, ok: true });
    }
    if (segs[0] === "tasks" && segs.length === 2) {
        const tid = parseInt(segs[1]);
        const idx = db.tasks.findIndex(t => t.id === tid);
        if (idx === -1) return json(res, 404, { error: "未找到" });
        if (method === "DELETE") { db.tasks.splice(idx, 1); saveDb(); return json(res, 200, { ok: true }); }
        if (method === "PUT") {
            const updates = body;
            if (updates.status && Object.keys(updates).length === 1) {
                db.tasks[idx].status = updates.status;
            } else {
                db.tasks[idx] = { ...db.tasks[idx], ...updates };
            }
            saveDb(); return json(res, 200, { ok: true });
        }
    }

    // ===== 闪卡 =====
    if (segs[0] === "flashcards" && segs.length === 1 && method === "GET") {
        let cards = [...db.flashcards];
        if (u.query.deck) cards = cards.filter(c => c.deck === u.query.deck);
        return json(res, 200, cards);
    }
    if (segs[0] === "flashcards" && segs.length === 1 && method === "POST") {
        const fc = { id: nextId(), front: body.front, back: body.back, deck: body.deck || "默认", difficulty: body.difficulty || "中", next_review: today(), created_at: today() };
        db.flashcards.push(fc); saveDb();
        return json(res, 200, { id: fc.id, ok: true });
    }
    if (segs[0] === "flashcards" && segs[1] === "decks") {
        const decks = {};
        db.flashcards.forEach(c => { decks[c.deck] = (decks[c.deck] || 0) + 1; });
        return json(res, 200, Object.entries(decks).map(([deck, count]) => ({ deck, count })));
    }
    if (segs[0] === "flashcards" && segs.length === 3 && segs[2] === "review" && method === "POST") {
        const fid = parseInt(segs[1]);
        const idx = db.flashcards.findIndex(c => c.id === fid);
        if (idx === -1) return json(res, 404, { error: "未找到" });
        const days = { "简单": 7, "中": 3, "难": 1 };
        const delta = days[body.difficulty] || 3;
        const d = new Date();
        d.setDate(d.getDate() + delta);
        db.flashcards[idx].difficulty = body.difficulty;
        db.flashcards[idx].next_review = d.toISOString().slice(0, 10);
        saveDb();
        return json(res, 200, { ok: true });
    }
    if (segs[0] === "flashcards" && segs.length === 2 && method === "DELETE") {
        const fid = parseInt(segs[1]);
        const idx = db.flashcards.findIndex(c => c.id === fid);
        if (idx > -1) { db.flashcards.splice(idx, 1); saveDb(); }
        return json(res, 200, { ok: true });
    }

    // ===== 课程 =====
    if (segs[0] === "courses" && segs.length === 1 && method === "GET") {
        return json(res, 200, db.courses);
    }
    if (segs[0] === "courses" && segs.length === 1 && method === "POST") {
        const c = { id: nextId(), name: body.name, teacher: body.teacher || "", location: body.location || "", day_of_week: parseInt(body.day_of_week), start_time: body.start_time, end_time: body.end_time, color: body.color || "#4f6ef7", semester: body.semester || "", created_at: today() };
        db.courses.push(c); saveDb();
        return json(res, 200, { id: c.id, ok: true });
    }
    if (segs[0] === "courses" && segs.length === 2 && method === "DELETE") {
        const cid = parseInt(segs[1]);
        const idx = db.courses.findIndex(c => c.id === cid);
        if (idx > -1) { db.courses.splice(idx, 1); saveDb(); }
        return json(res, 200, { ok: true });
    }

    // ===== 项目 =====
    if (segs[0] === "projects" && segs.length === 1 && method === "GET") {
        let projects = [...db.projects].reverse();
        if (u.query.status) projects = projects.filter(p => p.status === u.query.status);
        return json(res, 200, projects);
    }
    if (segs[0] === "projects" && segs.length === 1 && method === "POST") {
        const p = { id: nextId(), name: body.name, client: body.client || "", description: body.description || "", budget: parseFloat(body.budget) || 0, earned: parseFloat(body.earned) || 0, status: body.status || "进行中", deadline: body.deadline || "", created_at: today() };
        db.projects.push(p); saveDb();
        return json(res, 200, { id: p.id, ok: true });
    }
    if (segs[0] === "projects" && segs.length === 2) {
        const pid = parseInt(segs[1]);
        const idx = db.projects.findIndex(p => p.id === pid);
        if (idx === -1) return json(res, 404, { error: "未找到" });
        if (method === "DELETE") { db.projects.splice(idx, 1); saveDb(); return json(res, 200, { ok: true }); }
        if (method === "PUT") {
            db.projects[idx] = { ...db.projects[idx], name: body.name, client: body.client || "", description: body.description || "", budget: parseFloat(body.budget) || 0, earned: parseFloat(body.earned) || 0, status: body.status || "进行中", deadline: body.deadline || "" };
            saveDb(); return json(res, 200, { ok: true });
        }
    }

    // ===== 模式切换 =====
    if (segs[0] === "toggle-mode" && method === "POST") {
        agentMode = agentMode === "study" ? "earn" : "study";
        return json(res, 200, { mode: agentMode === "study" ? "学业" : "赚钱" });
    }

    // ===== 仪表盘数据 =====
    if (segs[0] === "dashboard" && method === "GET") {
        const tasksTodo = db.tasks.filter(t => t.status === "待办");
        const projectsActive = db.projects.filter(p => p.status === "进行中");
        return json(res, 200, {
            stats: {
                tasks_todo: tasksTodo.length,
                notes_count: db.notes.length,
                projects_active: projectsActive.length,
                flashcards_count: db.flashcards.length,
            },
            tasks: tasksTodo.slice(0, 5),
            notes: db.notes.reverse().slice(0, 4).map(n => ({ ...n, preview: (n.content || "").slice(0, 200) })),
        });
    }

    return json(res, 404, { error: "未找到路由" });
}

// ===== 本地智能回复 =====
function localReply(msg, context, modePrompt) {
    const m = msg.toLowerCase();
    const isEarn = agentMode === "earn";

    // 工具调用模拟
    if (m.includes("保存") && (m.includes("笔记") || m.includes("记录") || m.includes("记"))) {
        const title = msg.replace(/保存|笔记|记录|记|：|:/g, "").trim().slice(0, 30) || "快速笔记";
        const note = { id: nextId(), title, content: msg, tags: "快速", created_at: today(), updated_at: today() };
        db.notes.push(note); saveDb();
        return `已保存笔记「${title}」`;
    }
    if (m.includes("创建任务") || m.includes("添加任务") || (m.includes("任务") && (m.includes("创建") || m.includes("添加")))) {
        const title = msg.replace(/创建任务|添加任务|任务|：|:/g, "").trim() || "新任务";
        const t = { id: nextId(), title, description: "", deadline: "", priority: "中", category: isEarn ? "赚钱" : "学业", status: "待办", created_at: today() };
        db.tasks.push(t); saveDb();
        return `已创建任务「${title}」`;
    }
    if (m.includes("切换模式") || m.includes("换赚钱") || m.includes("换学业")) {
        agentMode = agentMode === "study" ? "earn" : "study";
        return `已切换到${agentMode === "study" ? "学业" : "赚钱"}模式`;
    }
    if (m.includes("待办") || m.includes("任务列表") || m.includes("我的任务")) {
        const tasks = db.tasks.filter(t => t.status !== "已完成").slice(0, 8);
        if (!tasks.length) return "📭 没有待办任务，给自己定个小目标吧";
        return "📋 待办任务：\n" + tasks.map(t =>
            `  • ${t.title} [${t.priority}] ${t.deadline ? "截止:" + t.deadline.slice(0, 10) : ""}`
        ).join("\n");
    }

    if (context) return `根据你的笔记，我找到以下相关内容：\n\n${context}\n\n你想深入了解哪个方面？`;

    // 场景回复
    if (isEarn) {
        if (m.includes("副业") || m.includes("赚钱") || m.includes("兼职")) {
            return `💡 适合大学生的线上赚钱方向：\n\n1️⃣ **内容创作**：写公众号/小红书/知乎，积累影响力\n2️⃣ **技能接单**：Python编程、PPT设计、视频剪辑\n3️⃣ **知识变现**：做家教、卖课程笔记、考研资料\n4️⃣ **轻创业**：跨境电商（TikTok/Shopee）、闲鱼转卖\n\n你可以先选一个方向，我帮你拆解第一步做什么。`;
        }
        if (m.includes("报价") || m.includes("定价")) {
            return `💰 报价参考（学生友好）：\n• 简单Python脚本：¥100-300\n• 网页开发（简单）：¥500-2000\n• PPT设计/页：¥20-50\n• 视频剪辑/个：¥200-800\n• 家教/小时：¥60-150\n\n建议从低价开始积累口碑，逐步提价。`;
        }
        return `你在赚钱模式！我可以帮你：\n• 💡 发掘副业机会\n• 📋 管理项目进度\n• ✍️ 写文案/润色\n• 📊 技能分析与报价\n\n告诉我你想做什么方向的？`;
    }

    if (m.includes("复习") || m.includes("考试") || m.includes("期末")) {
        return `📚 期末复习建议：\n\n1️⃣ **整理笔记**：把每门课的知识点梳理成框架\n2️⃣ **制作闪卡**：把重点概念做成复习卡片\n3️⃣ **真题练习**：找往年试题计时练习\n4️⃣ **组队学习**：和同学互相讲解查漏补缺\n\n需要我帮你整理某门课的复习计划吗？`;
    }
    if (m.includes("笔记") || m.includes("整理")) {
        return `📝 我可以帮你：\n• 保存新笔记（说"保存笔记：[内容]"）\n• 搜索已有笔记\n• 整理知识点框架\n• 制作复习闪卡\n\n你在学什么课程？`;
    }
    if (m.includes("作业") || m.includes("论文") || m.includes("报告")) {
        return `📄 作业/论文辅助：\n\n1️⃣ **搭大纲**：帮你理清论文结构\n2️⃣ **找思路**：针对题目给你切入点\n3️⃣ **润色**：改语法、调逻辑\n4️⃣ **参考文献**：推荐相关方向\n\n可以说具体题目，我来帮你。`;
    }

    return `你好！我是你的学赚助手。当前是${agentMode === "study" ? "🎓 学业" : "💰 赚钱"}模式。\n\n你可以：\n• 跟我说你今天学了什么\n• 让我保存笔记/创建任务\n• 问学习/副业相关的问题\n• 说「换赚钱」或「换学业」切换模式\n\n需要什么帮助？`;
}

// ===== 静态文件服务 =====
function serveStatic(pathname, res) {
    let filePath = path.join(PUBLIC, pathname === "/" ? "index.html" : pathname);
    // 如果没有文件扩展名，尝试 .html
    if (!path.extname(filePath)) {
        const htmlPath = filePath + ".html";
        if (fs.existsSync(htmlPath)) filePath = htmlPath;
    }
    const ext = path.extname(filePath);
    const mime = MIME[ext] || "application/octet-stream";

    try {
        const content = fs.readFileSync(filePath);
        res.writeHead(200, { "Content-Type": mime });
        res.end(content);
    } catch {
        // 404 fallback
        try {
            const notFound = fs.readFileSync(path.join(PUBLIC, "404.html"), "utf8");
            res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
            res.end(notFound);
        } catch {
            res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
            res.end("404 Not Found");
        }
    }
}

// ===== 工具函数 =====
function readBody(req) {
    return new Promise(resolve => {
        let data = "";
        req.on("data", chunk => data += chunk);
        req.on("end", () => {
            try { resolve(JSON.parse(data || "{}")); }
            catch { resolve({}); }
        });
    });
}
function json(res, status, data) {
    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(data));
}
function end(res, status) { res.writeHead(status); res.end(); }

// ===== 启动 =====
const server = http.createServer(handle);
server.listen(PORT, "127.0.0.1", () => {
    console.log(`✓ 学赚助手已启动`);
    console.log(`  http://127.0.0.1:${PORT}/`);
    console.log(`  按 Ctrl+C 停止`);
});

