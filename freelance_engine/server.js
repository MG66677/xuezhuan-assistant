// ===== 副业引擎 - HTTP 服务器（零外部依赖） =====
const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");
const { spawn, execSync } = require("child_process");

const PORT = 5679;
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, "public");
const TOOLS = path.join(ROOT, "tools");
const OUTPUT = path.join(ROOT, "output");
const DATA = path.join(ROOT, "data");
const PYTHON = "C:\\Users\\21938\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe";

// 确保目录存在
[PUBLIC, TOOLS, OUTPUT, DATA].forEach(d => { try { fs.mkdirSync(d, { recursive: true }); } catch {} });

const MIME = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png", ".jpg": "image/jpeg", ".pdf": "application/pdf",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".csv": "text/csv; charset=utf-8",
};

const PYTHON_TOOLS = {
    scraper: { script: "scraper.py", desc: "网页数据采集" },
    excel: { script: "excel_tools.py", desc: "Excel自动化" },
    pdf: { script: "pdf_report.py", desc: "PDF报告生成" },
};

function runPython(script, args) {
    return new Promise(resolve => {
        const p = spawn(PYTHON, [path.join(TOOLS, script), ...args]);
        let out = "", err = "";
        p.stdout.on("data", d => out += d);
        p.stderr.on("data", d => err += d);
        p.on("close", code => {
            try { resolve(JSON.parse(out)); }
            catch { resolve({ error: err || out || "执行失败", code }); }
        });
    });
}

async function handle(req, res) {
    const u = url.parse(req.url, true);
    const method = req.method;
    const segs = u.pathname.split("/").filter(Boolean);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (method === "OPTIONS") return end(res, 204);

    try {
        // ===== API =====
        // 执行爬虫
        if (segs[0] === "api" && segs[1] === "tools" && segs[2] === "scraper" && method === "POST") {
            const body = await readBody(req);
            const args = [body.url, body.selector || "body", body.format || "json", OUTPUT];
            const result = await runPython("scraper.py", args);
            return json(res, 200, result);
        }
        // 执行Excel工具
        if (segs[0] === "api" && segs[1] === "tools" && segs[2] === "excel" && method === "POST") {
            const body = await readBody(req);
            const args = [body.command, body.input, body.output || ""];
            if (body.extra) args.push(body.extra);
            const result = await runPython("excel_tools.py", args);
            return json(res, 200, result);
        }
        // 生成PDF报告
        if (segs[0] === "api" && segs[1] === "tools" && segs[2] === "pdf" && method === "POST") {
            const body = await readBody(req);
            const args = [body.data_file, body.output || path.join(OUTPUT, "report.pdf"), body.title || "数据分析报告"];
            const result = await runPython("pdf_report.py", args);
            return json(res, 200, result);
        }
        // 上传文件（用于Excel处理等）
        if (segs[0] === "api" && segs[1] === "upload" && method === "POST") {
            const body = await readBodyRaw(req);
            const filename = u.query.name || "upload.xlsx";
            const filepath = path.join(OUTPUT, filename);
            fs.writeFileSync(filepath, body);
            return json(res, 200, { file: filepath, name: filename });
        }
        // 获取输出文件列表
        if (segs[0] === "api" && segs[1] === "output" && method === "GET") {
            const files = fs.readdirSync(OUTPUT).filter(f => !f.startsWith("."));
            return json(res, 200, files.map(f => {
                const st = fs.statSync(path.join(OUTPUT, f));
                return { name: f, size: st.size, time: st.mtime };
            }));
        }
        // 获得副业机会（从各类平台）
        if (segs[0] === "api" && segs[1] === "opportunities" && method === "GET") {
            const opps = loadOpportunities();
            return json(res, 200, opps);
        }
        // 报价指南
        if (segs[0] === "api" && segs[1] === "pricing" && method === "GET") {
            return json(res, 200, getPricing());
        }


        // ===== 运营中心 =====
        if (segs[0] === "api" && segs[1] === "ops" && segs[2] === "generate" && method === "POST") {
            const body = await readBody(req);
            const platform = body.platform || "xianyu";
            const custom = body.custom || {};
            const tmpl = LISTING_TEMPLATES[platform];
            if (!tmpl) return json(res, 400, { error: "未知平台" });
            let title = tmpl.title; let desc = tmpl.desc;
            if (custom.skills) title = custom.skills + " 接单 " + (custom.price || "");
            if (custom.notes) desc = custom.notes + "\n\n" + desc;
            return json(res, 200, { platform, title, description: desc });
        }
        if (segs[0] === "api" && segs[1] === "ops" && segs[2] === "leads" && method === "GET") { const d = loadOps(); return json(res, 200, d.leads.reverse()); }
        if (segs[0] === "api" && segs[1] === "ops" && segs[2] === "leads" && method === "POST") {
            const body = await readBody(req); const d = loadOps();
            const lead = { id: d.leads.length + 1, name: body.name || "未知", source: body.source || "", contact: body.contact || "", requirement: body.requirement || "", status: body.status || "新询价", price: body.price || "", note: body.note || "", created_at: new Date().toISOString().slice(0,16) };
            d.leads.push(lead); saveOps(d); return json(res, 200, lead);
        }
        if (segs[0] === "api" && segs[1] === "ops" && segs[2] === "projects" && method === "GET") { const d = loadOps(); return json(res, 200, d.projects.reverse()); }
        if (segs[0] === "api" && segs[1] === "ops" && segs[2] === "projects" && method === "POST") {
            const body = await readBody(req); const d = loadOps();
            const p = { id: d.projects.length + 1, name: body.name, client: body.client || "", description: body.description || "", status: body.status || "进行中", price: parseFloat(body.price) || 0, paid: parseFloat(body.paid) || 0, deadline: body.deadline || "", created_at: new Date().toISOString().slice(0,10) };
            d.projects.push(p); saveOps(d); return json(res, 200, p);
        }
        if (segs[0] === "api" && segs[1] === "ops" && segs[2] === "finance" && method === "GET") { const d = loadOps(); return json(res, 200, d.finance); }
        if (segs[0] === "api" && segs[1] === "ops" && segs[2] === "finance" && method === "POST") {
            const body = await readBody(req); const d = loadOps();
            d.finance.records.push({ amount: parseFloat(body.amount) || 0, type: body.type || "收入", note: body.note || "", date: new Date().toISOString().slice(0,10) });
            d.finance.total = d.finance.records.reduce((s, r) => s + (r.type === "收入" ? r.amount : -r.amount), 0);
            saveOps(d); return json(res, 200, d.finance);
        }
        if (segs[0] === "api" && segs[1] === "ops" && segs[2] === "reply" && method === "POST") {
            const body = await readBody(req);
            const context = body.context || "";
            const replies = getReplyTemplates(context);
            return json(res, 200, replies);
        }

        // ===== 文件下载 =====
        if (segs[0] === "download") {
            const filepath = path.join(OUTPUT, segs.slice(1).join("/"));
            if (fs.existsSync(filepath)) {
                const ext = path.extname(filepath);
                res.writeHead(200, {
                    "Content-Type": MIME[ext] || "application/octet-stream",
                    "Content-Disposition": `attachment; filename="${encodeURIComponent(path.basename(filepath))}"`,
                    "Content-Length": fs.statSync(filepath).size
                });
                fs.createReadStream(filepath).pipe(res);
                return;
            }
            return json(res, 404, { error: "文件未找到" });
        }

        // ===== 静态文件 =====
        serveStatic(u.pathname, res);
    } catch (e) {
        console.error("Error:", e.message);
        json(res, 500, { error: e.message });
    }
}

function loadOpportunities() {
    const file = path.join(DATA, "opportunities.json");
    try { return JSON.parse(fs.readFileSync(file, "utf8")); }
    catch { return []; }
}

function getPricing() {
    return [
        { service: "网页数据采集", price: "¥100-500", desc: "爬取商品信息、文章、招聘数据等，输出Excel/CSV/JSON", demand: "⭐⭐⭐⭐" },
        { service: "Excel数据处理", price: "¥100-300", desc: "数据清洗、合并拆分、统计分析、格式美化", demand: "⭐⭐⭐⭐" },
        { service: "PDF报告生成", price: "¥200-1000", desc: "从Excel数据生成专业PDF报告，带表格和统计", demand: "⭐⭐⭐" },
        { service: "自动化脚本", price: "¥200-500", desc: "定制Python脚本，批量处理文件/数据/网页操作", demand: "⭐⭐⭐⭐" },
        { service: "数据可视化", price: "¥200-600", desc: "把杂乱数据变成好看的图表和报表", demand: "⭐⭐⭐" },
    ];
}

const OPS_FILE = path.join(DATA, "operations.json");
function loadOps() { try { return JSON.parse(fs.readFileSync(OPS_FILE, "utf8")); } catch { return { leads: [], projects: [], finance: { total: 0, records: [] } }; } }
function saveOps(d) { fs.writeFileSync(OPS_FILE, JSON.stringify(d, null, 2), "utf8"); }

// 平台文案模板
const LISTING_TEMPLATES = {
    xianyu: {
        title: "Python编程 数据爬虫 Excel处理 脚本定制",
        desc: ["【服务说明】", "Python编程接单，在校学生诚信服务。", "", "✅ 网页数据采集", "爬取商品信息、文章内容、招聘数据、市场调研等", "输出Excel/CSV，整洁规范", "", "✅ Excel数据处理", "数据清洗、合并拆分、统计分析、报表美化", "量大从优", "", "✅ PDF报告生成", "从数据生成专业PDF报告", "适合汇报、论文、客户交付", "", "✅ Python自动化脚本", "批量文件处理、数据整理、网页自动化", "复杂的事情一键搞定", "", "【交易流程】", "沟通需求 → 确认报价 → 开始制作 → 交付验收", "直接私信我，发需求截图报价"].join("\n")
    }
};

function getReplyTemplates(context) {
    const templates = {
        inquiry: [
            { label: "客户问价格", text: "你好！这个需求我可以做。方便说一下具体的量级和要求吗？我可以根据复杂度给你报价，一般这个类型的单在¥100-500之间。" },
            { label: "客户问时间", text: "这个任务大概需要1-2天完成。如果比较急的话可以加急，最快4-6小时交付。" },
            { label: "客户要样例", text: "没问题，我发一个类似的案例给你看看效果。你方便说一下具体要什么样的数据/格式吗？" },
            { label: "客户砍价", text: "理解你的预算。这样吧，我先做一部分给你看看效果，满意了再继续，总价可以打个8折。你看怎么样？" },
        ],
        confirm: [
            { label: "确认接单", text: "好的，需求我了解了，报价¥XXX。交付时间X天。确认没问题的话我就开始做了。" },
            { label: "发送交付", text: "你好，任务已完成。文件在附件中，你看看效果。有什么需要调整的随时说，我免费帮你微调一次。" },
            { label: "催款礼貌版", text: "你好，之前交付的任务你觉得怎么样？如果没问题的话方便结一下尾款吗？后续有需要随时找我 😊" },
        ],
        followup: [
            { label: "求好评", text: "感谢信任！如果对我的服务满意的话，方便给个好评吗？这对学生党很重要 🙏" },
            { label: "推荐自己", text: "后续有Python相关的需求随时找我，爬虫、Excel、PDF、自动化脚本都可以做。老朋友有优惠 😊" },
        ]
    };
    if (context.includes("价格") || context.includes("多少钱") || context.includes("报价")) return templates.inquiry;
    if (context.includes("确认") || context.includes("开始") || context.includes("交付")) return templates.confirm;
    return [...templates.inquiry, ...templates.confirm, ...templates.followup];
}

function serveStatic(pathname, res) {
    let filePath = path.join(PUBLIC, pathname === "/" ? "index.html" : pathname);
    if (!path.extname(filePath)) {
        const htmlPath = filePath + ".html";
        if (fs.existsSync(htmlPath)) filePath = htmlPath;
    }
    const ext = path.extname(filePath);
    try {
        const content = fs.readFileSync(filePath);
        res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
        res.end(content);
    } catch {
        try {
            const idx = fs.readFileSync(path.join(PUBLIC, "index.html"));
            res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
            res.end(idx);
        } catch {
            res.writeHead(404); res.end("404");
        }
    }
}

function readBody(req) {
    return new Promise(resolve => {
        let d = "";
        req.on("data", c => d += c);
        req.on("end", () => { try { resolve(JSON.parse(d || "{}")); } catch { resolve({}); } });
    });
}
function readBodyRaw(req) {
    return new Promise(resolve => {
        const chunks = [];
        req.on("data", c => chunks.push(c));
        req.on("end", () => resolve(Buffer.concat(chunks)));
    });
}
function json(res, status, data) {
    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(data));
}
function end(res, status) { res.writeHead(status); res.end(); }

const server = http.createServer(handle);
server.listen(PORT, "127.0.0.1", () => {
    console.log(`═══════════════════════════════════`);
    console.log(`  副业引擎 v1.0 - 启动成功`);
    console.log(`  访问: http://127.0.0.1:${PORT}/`);
    console.log(`  工具: 数据采集 | Excel处理 | PDF报告`);
    console.log(`  副业机会监控: 运行中`);
    console.log(`═══════════════════════════════════`);
});

