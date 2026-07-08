// ===== 马振奥的学赚助手 - 统一后端服务器（零外部依赖） =====
const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");
const { spawn } = require("child_process");
const PORT = process.env.PORT || 5677;
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, "public");
const DATA_DIR = path.join(ROOT, "data");
const FE_DIR = path.join(ROOT, "freelance_engine");
const FE_TOOLS = path.join(FE_DIR, "tools");
const FE_OUTPUT = path.join(FE_DIR, "output");
const PYTHON = "C:\\Users\\21938\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe";
[PUBLIC, DATA_DIR, FE_OUTPUT].forEach(d => { try { fs.mkdirSync(d, { recursive: true }); } catch {} });
const DB_FILE = path.join(DATA_DIR, "database.json");
const CHAT_FILE = path.join(DATA_DIR, "chat.json");
let db = {};
let chatHistory = [];
let agentMode = "study";
function loadDb() {
  try { db = JSON.parse(fs.readFileSync(DB_FILE, "utf8")); }
  catch { db = { notes: [], tasks: [], flashcards: [], courses: [], leads: [], finance: { total: 0, records: [] }, posts: [], opportunities: [], nextId: 1 }; }
}
function saveDb() { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf8"); }
function nextId() { return db.nextId++; }
function today() { return new Date().toISOString().slice(0, 10); }
function now() { return new Date().toLocaleString("zh-CN", { hour12: false }); }
loadDb();
try { chatHistory = JSON.parse(fs.readFileSync(CHAT_FILE, "utf8")); } catch { chatHistory = []; }
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".pdf": "application/pdf",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".csv": "text/csv; charset=utf-8", ".ico": "image/x-icon",
};
function runPython(script, args) {
  return new Promise(resolve => {
    const sp = path.join(FE_TOOLS, script);
    if (!fs.existsSync(sp)) return resolve({ error: "脚本不存在" });
    const p = spawn(PYTHON, [sp, ...args]);
    let out = "", err = "";
    p.stdout.on("data", d => out += d);
    p.stderr.on("data", d => err += d);
    p.on("close", c => { try { resolve(JSON.parse(out)); } catch { resolve({ error: err || out || "执行失败", code: c }); } });
  });
}function generateListings() {
  return [
    { platform: "闲鱼", price: "\u00a5100\u8d77", title: "Python编程～爬虫～Excel处理～脚本定制～学生优惠",
      content: "【服务说明】\nPython编程接单，在校学生诚信服务。\n\n❶ 网页数据采集\n爬取商品信息、文章内容、招聘数据等，输出Excel/CSV\n\n❷ Excel数据处理\n数据清洗、合并拆分、统计报表，量大从优\n\n❸ PDF报告生成\n从数据生成专业PDF报告\n\n❹ Python自动化脚本\n批量文件处理、数据整理\n\n直接私信我，发需求截图报价" },
  ];
}
function generateReply(context) {
  const tpls = [
    { m: ["价格","多少钱","报价","收费"], r: "你好！方便说一下具体的量级和要求吗？一般这类单在\u00a5100-500之间，看复杂度。" },
    { m: ["时间","多久"], r: "这个任务大概需要1-2天完成。加急最快2-6小时交付。" },
    { m: ["样例","案例"], r: "没问题，我发一个类似的案例给你看看效果。方便说一下具体要什么格式吗？" },
    { m: ["便宜","优惠","砍价"], r: "理解预算。我先做一部分给你看效果，满意再继续，总价打7折。怎么样？" },
    { m: ["你好","在吗","您好"], r: "你好！有什么Python相关的问题可以问我，爬虫、Excel、自动化都可以。说需求我帮你报价 \ud83d\ude04" },
  ];
  for (const t of tpls) { if (t.m.some(k => context.includes(k))) return t.r; }
  return "好的，我了解你的需求了。方便留一下联系方式或者具体说一下需要处理什么吗？我帮你评估报价和交付时间。";
}

async function handle(req, res) {
  const u = url.parse(req.url, true);
  const m = req.method;
  const s = u.pathname.split("/").filter(Boolean);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (m === "OPTIONS") { res.writeHead(204); res.end(); return; }
  try {
    if (s[0] === "api") return await handleApi(m, s.slice(1), u, req, res);
    let fp = path.join(PUBLIC, u.pathname === "/" ? "index.html" : u.pathname);
    if (!path.extname(fp)) { const h = fp + ".html"; if (fs.existsSync(h)) fp = h; }
    const ext = path.extname(fp);
    try {
      const c = fs.readFileSync(fp);
      res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
      res.end(c);
    } catch {
      try { const idx = fs.readFileSync(path.join(PUBLIC, "index.html")); res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); res.end(idx); }
      catch { res.writeHead(404); res.end("404"); }
    }
  } catch (e) { console.error(e.message); res.writeHead(500); res.end(JSON.stringify({ error: e.message })); }
}

async function handleApi(method, segs, u, req, res) {
  const body = method === "GET" || method === "DELETE" ? {} : await new Promise(r => { let d = ""; req.on("data", c => d += c); req.on("end", () => { try { r(JSON.parse(d || "{}")); } catch { r({}); } }); });
  const j = (status, data) => { res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" }); res.end(JSON.stringify(data)); };
  const p = segs.join("/");

  if (p === "chat" && method === "POST") {
    const msg = (body.message || "").trim(); if (!msg) return j(400, { error: "消息不能为空" });
    chatHistory.push({ role: "user", content: msg, created_at: now() });
    const m = msg.toLowerCase(); const isEarn = agentMode === "earn";
    let reply = "";
    if (m.includes("保存") && (m.includes("笔记")||m.includes("记录"))) { const t = msg.replace(/保存|笔记|记录|：|:/g,"").trim().slice(0,30)||"快速笔记"; db.notes.push({id:nextId(),title:t,content:msg,tags:"快速笔记",created_at:today(),updated_at:today()}); saveDb(); reply="已保存笔记「"+t+"」"; }
    else if (m.includes("创建任务")||(m.includes("任务")&&(m.includes("创建")||m.includes("添加")))) { const t = msg.replace(/创建任务|添加任务|任务|：|:/g,"").trim()||"新任务"; db.tasks.push({id:nextId(),title:t,description:"",deadline:"",priority:"中",category:isEarn?"赚钱":"学业",status:"待办",created_at:today()}); saveDb(); reply="已创建任务「"+t+"」"; }
    else if (m.includes("切换模式")||m.includes("换赚钱")||m.includes("换学业")) { agentMode=agentMode==="study"?"earn":"study"; reply="已切换到"+(agentMode==="study"?("🏗️ 学业"):("💵 赚钱"))+"模式"; }
    else if (isEarn) {
      if (m.includes("副业")||m.includes("赚钱")||m.includes("兼职")) reply="\n\n1⃣ 技能接单：Python编程、PPT设计、视频剪辑\n2⃣ 内容创作：写小红书/知乎/公众号\n3⃣ 知识变现：家教、卖笔记、考研资料\n4⃣ 轻创业：闲鱼转卖\n\n建议从技能接单开始，需求多门槛低。";
      else reply="\n• 运营中心自动发帖\n• 管理客户和项目\n• 记账和报价\n• 写文案回复\n\n去看看运营中心？";
    } else {
      if (m.includes("复习")||m.includes("考试")||m.includes("期末")) reply="\n\n1⃣ 整理笔记梳理框架\n2⃣ 制作闪卡反复记\n3⃣ 真题练习\n4⃣ 组队学习\n\n需要我帮你规划吗？";
      else if (m.includes("作业")||m.includes("论文")||m.includes("报告")) reply="作业辅助：搭大纲、找思路、润色、参考文献推荐。说具体题目我来帮你。";
      else reply="你好！我是马振奥的学赚助手，当前"+(isEarn?("💵 赚钱"):("🏗️ 学业"))+"\n\n你可以：\n• 跟我聊学习/副业\n• 「保存笔记：[内容]」快速记录\n• 「创建任务：[标题]」添加待办\n• 「换赚钱」/「换学业」切换\n• 去左侧栏用工具";
    }
    chatHistory.push({ role: "assistant", content: reply, created_at: now() });
    if (chatHistory.length > 200) chatHistory = chatHistory.slice(-100);
    fs.writeFileSync(CHAT_FILE, JSON.stringify(chatHistory), "utf8");
    return j(200, { reply, mode: agentMode === "study" ? "学业" : "赚钱" });
  }
  if (p === "chat/history") return j(200, chatHistory);
  if (p === "chat/clear" && method === "POST") { chatHistory = []; fs.writeFileSync(CHAT_FILE, JSON.stringify(chatHistory), "utf8"); return j(200, { ok: true }); }
  if (p === "toggle-mode" && method === "POST") { agentMode = agentMode === "study" ? "earn" : "study"; return j(200, { mode: agentMode === "study" ? "学业" : "赚钱" }); }
  if (p === "mode") return j(200, { mode: agentMode === "study" ? "学业" : "赚钱" });

  if (p === "dashboard" && method === "GET") {
    const todo = db.tasks.filter(t => t.status === "待办");
    return j(200, {
      stats: { tasks_todo: todo.length, notes_count: db.notes.length, flashcards_count: db.flashcards.length, total_leads: db.leads.length, total_revenue: db.finance.total, pending_posts: db.posts.filter(p => p.status === "pending").length },
      tasks: todo.slice(0, 8).map(t => ({ id: t.id, title: t.title, priority: t.priority, deadline: t.deadline, category: t.category })),
      leads: db.leads.slice(-5).reverse(), finance: db.finance,
    });
  }

  if (p === "notes" && method === "GET") {
    let ns = [...db.notes].reverse(); if (u.query.search) ns = ns.filter(n => n.title.includes(u.query.search)||n.content.includes(u.query.search));
    return j(200, ns.map(n => ({...n, preview: (n.content||"").slice(0,200)})));
  }
  if (p === "notes" && method === "POST") { const n = {id:nextId(),title:body.title||"",content:body.content||"",tags:body.tags||"",created_at:today(),updated_at:today()}; db.notes.push(n);saveDb();return j(200,{id:n.id}); }
  if (segs[0]==="notes"&&segs.length===2) { const nid=parseInt(segs[1]),idx=db.notes.findIndex(n=>n.id===nid); if(idx===-1) return j(404,{error:"未找到"}); if(method==="GET") return j(200,db.notes[idx]); if(method==="PUT"){db.notes[idx]={...db.notes[idx],...body,updated_at:today()};saveDb();return j(200,{ok:true})} if(method==="DELETE"){db.notes.splice(idx,1);saveDb();return j(200,{ok:true})} }

  if (p === "tasks" && method === "GET") { let ts=[...db.tasks].reverse(); if(u.query.category)ts=ts.filter(t=>t.category===u.query.category); return j(200,ts.map(t=>({...t}))); }
  if (p === "tasks" && method === "POST") { const t={id:nextId(),title:body.title||"任务",description:body.description||"",deadline:body.deadline||"",priority:body.priority||"中",category:body.category||"学业",status:"待办",created_at:today()}; db.tasks.push(t);saveDb();return j(200,{id:t.id}); }
  if (segs[0]==="tasks"&&segs.length===2) { const tid=parseInt(segs[1]),idx=db.tasks.findIndex(t=>t.id===tid); if(idx===-1)return j(404,{error:"未找到"}); if(method==="PUT"){db.tasks[idx]={...db.tasks[idx],...body};saveDb();return j(200,{ok:true})} if(method==="DELETE"){db.tasks.splice(idx,1);saveDb();return j(200,{ok:true})} }

  if (p === "flashcards" && method === "GET") { let fs=[...db.flashcards].reverse(); if(u.query.search)fs=fs.filter(c=>c.front.includes(u.query.search)||c.back.includes(u.query.search)); return j(200,fs); }
  if (p === "flashcards" && method === "POST") { const c={id:nextId(),front:body.front||"",back:body.back||"",box:0,created_at:today()}; db.flashcards.push(c);saveDb();return j(200,{id:c.id}); }
  if (segs[0]==="flashcards"&&segs.length===2) { const cid=parseInt(segs[1]),idx=db.flashcards.findIndex(c=>c.id===cid); if(idx===-1)return j(404,{error:"未找到"}); if(method==="PUT"){db.flashcards[idx]={...db.flashcards[idx],...body};saveDb();return j(200,{ok:true})} if(method==="DELETE"){db.flashcards.splice(idx,1);saveDb();return j(200,{ok:true})} }

  if (p === "courses" && method === "GET") { let cs=[...db.courses].reverse(); if(u.query.search)cs=cs.filter(c=>c.title.includes(u.query.search)||c.description.includes(u.query.search)); return j(200,cs); }
  if (p === "courses" && method === "POST") { const c={id:nextId(),title:body.title||"",description:body.description||"",progress:body.progress||0,url:body.url||"",created_at:today()}; db.courses.push(c);saveDb();return j(200,{id:c.id}); }
  if (segs[0]==="courses"&&segs.length===2) { const cid=parseInt(segs[1]),idx=db.courses.findIndex(c=>c.id===cid); if(idx===-1)return j(404,{error:"未找到"}); if(method==="PUT"){db.courses[idx]={...db.courses[idx],...body};saveDb();return j(200,{ok:true})} if(method==="DELETE"){db.courses.splice(idx,1);saveDb();return j(200,{ok:true})} }

  if (p === "leads" && method === "GET") { let ls=[...db.leads].reverse(); if(u.query.status)ls=ls.filter(l=>l.status===u.query.status); return j(200,ls); }
  if (p === "leads" && method === "POST") { const l={id:nextId(),name:body.name||"匿名",source:body.source||"未知",contact:body.contact||"",requirement:body.requirement||"",status:"新咨询",price:body.price||"",note:body.note||"",created_at:now()}; db.leads.push(l);saveDb();return j(200,{id:l.id}); }
  if (segs[0]==="leads"&&segs.length===2) { const lid=parseInt(segs[1]),idx=db.leads.findIndex(l=>l.id===lid); if(idx===-1)return j(404,{error:"未找到"}); if(method==="PUT"){db.leads[idx]={...db.leads[idx],...body};saveDb();return j(200,{ok:true})} if(method==="DELETE"){db.leads.splice(idx,1);saveDb();return j(200,{ok:true})} }

  if (p === "finance" && method === "GET") return j(200, db.finance);
  if (p === "finance" && method === "POST") { const r={id:nextId(),type:body.type||"收入",amount:parseFloat(body.amount)||0,category:body.category||"",note:body.note||"",created_at:today()}; db.finance.total+=r.type==="收入"?r.amount:-r.amount; db.finance.records.push(r);saveDb();return j(200,{id:r.id}); }
  if (p === "finance/records" && method === "DELETE") { db.finance.records=[]; db.finance.total=0; saveDb(); return j(200,{ok:true}); }

  if (p === "posts" && method === "GET") { let ps=[...db.posts].reverse(); if(u.query.status)ps=ps.filter(p=>p.status===u.query.status); return j(200,ps); }
  if (p === "posts" && method === "POST") { const idx=db.posts.findIndex(p=>p.id===body.id); if(idx>-1){db.posts[idx].status="posted";db.posts[idx].posted_at=now();saveDb();return j(200,{ok:true})} return j(404,{error:"未找到"}); }
  if (p === "posts/delete" && method === "POST") { db.posts=db.posts.filter(p=>p.id!==body.id);saveDb();return j(200,{ok:true}); }
  if (p === "leads/publish" && method === "POST") {
    const ls=db.leads.filter(l=>(body.ids||[]).includes(l.id));
    ls.forEach(l=>{ db.posts.push({id:db.posts.length+1,platform:l.platform||"闲鱼",title:l.title||l.name,content:l.requirement||l.note||"",price:l.price||"",status:"pending",created_at:now(),posted_at:null,views:0,inquiries:0}); });
    saveDb(); return j(200, { ok: true, count: ls.length, posts: db.posts.slice(-ls.length) });
  }
  if (p === "reply" && method === "POST") return j(200, { reply: generateReply(body.context || "") });

  if (p === "auto-ops/run" && method === "POST") {
    if (body.action === "generate") { const ls=generateListings();ls.forEach(l=>{db.posts.push({id:db.posts.length+1,platform:l.platform,title:l.title,content:l.content,price:l.price,status:"pending",created_at:now(),posted_at:null,views:0,inquiries:0})});saveDb();return j(200,{ok:true,count:ls.length}) }
    if (body.action === "follow-up") { const fu=db.leads.filter(l=>l.status==="新咨询"); return j(200,{ok:true,follow_ups:fu.length,leads:fu}); }
    return j(200,{ok:true});
  }
  if (p === "auto-ops/status" && method === "GET") return j(200, { pending_posts: db.posts.filter(p=>p.status==="pending").length, posted: db.posts.filter(p=>p.status==="posted").length, total_posts: db.posts.length, leads: db.leads.length, new_leads: db.leads.filter(l=>l.status==="新咨询").length, revenue: db.finance.total });

  if (p === "tools/scraper" && method === "POST") { const r = await runPython("scraper.py", [body.url, body.selector||"body", body.format||"json", FE_OUTPUT]); return j(200, r); }
  if (p === "tools/excel" && method === "POST") { const args=[body.command,body.input,body.output||""]; if(body.extra)args.push(body.extra); const r=await runPython("excel_tools.py",args); return j(200,r); }
  if (p === "tools/pdf" && method === "POST") { const r=await runPython("pdf_report.py",[body.data_file,body.output||path.join(FE_OUTPUT,"report.pdf"),body.title||"数据分析报告"]); return j(200,r); }
  if (p === "tools/opportunities" && method === "GET") { try { return j(200, JSON.parse(fs.readFileSync(path.join(path.join(FE_DIR,"data"),"opportunities.json"),"utf8"))); } catch { return j(200, []); } }
  if (p === "tools/pricing" && method === "GET") return j(200, [
    {service:"网页数据采集",price:"¥100-500",desc:"爬取商品/文章/招聘数据，输出Excel/CSV/JSON",demand:"⭐⭐"},
    {service:"Excel数据处理",price:"¥100-300",desc:"数据清洗、合并拆分、统计报表",demand:"⭐⭐"},
    {service:"PDF报告生成",price:"¥200-1000",desc:"从数据生成专业PDF报告",demand:"⭐"},
    {service:"自动化脚本",price:"¥200-500",desc:"定制Python脚本，批量处理",demand:"⭐⭐"},
    {service:"数据可视化",price:"¥200-600",desc:"把数据变成好看的图表",demand:"⭐"},
  ]);

  if (p === "output" && method === "GET") { const files=fs.readdirSync(FE_OUTPUT).filter(f=>!f.startsWith(".")); return j(200, files.map(f=>{const st=fs.statSync(path.join(FE_OUTPUT,f));return{name:f,size:st.size,time:st.mtime}})); }
  if (segs[0] === "download" && segs.length >= 2) {
    try {
      const fname = segs.slice(1).join("/");
      const fpath = path.join(FE_OUTPUT, fname);
      const c = fs.readFileSync(fpath);
      const ext = path.extname(fpath);
      res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream", "Content-Disposition": 'attachment; filename="' + encodeURIComponent(path.basename(fpath)) + '"', "Content-Length": fs.statSync(fpath).size });
      res.end(c);
    } catch { return j(404, { error: "File not found" }); }
    return;
  }

  if (p === "news" && method === "GET") return j(200, [
    {date:today(),title:"GPT-5 推理能力大幅提升，编程能力接近中级工程师",source:"OpenAI"},
    {date:today(),title:"Claude 新增 Artifacts 实时预览功能",source:"Anthropic"},
    {date:today(),title:"Cursor AI 编辑器获6000万美元融资，AI编程工具加速普及",source:"TechCrunch"},
    {date:today(),title:"Google Gemini 2.0 发布，原生支持多模态和工具调用",source:"Google"},
    {date:today(),title:"Meta 发布 Llama 3.1 开源大模型，405B参数性能接近GPT-4",source:"Meta"},
    {date:today(),title:"Python 3.13 发布，JIT编译器带来显著性能提升",source:"Python.org"},
    {date:today(),title:"AI编程助手市场预计2027年达270亿美元",source:"MarketsAndMarkets"},
    {date:today(),title:"Stable Diffusion 3 开源，图像生成质量大幅提升",source:"Stability AI"},
  ]);

  if (p === "opportunities" && method === "GET") {
    let ops = [...(db.opportunities || [])].reverse();
    if (u.query.search) { const q = u.query.search.toLowerCase(); ops = ops.filter(o => o.title.toLowerCase().includes(q) || o.description.toLowerCase().includes(q) || (o.tags||"").toLowerCase().includes(q)); }
    if (u.query.category && u.query.category !== "all") ops = ops.filter(o => o.category === u.query.category);
    return j(200, ops);
  }
  if (p === "opportunities" && method === "POST") {
    const o = {
      id: nextId(),
      title: body.title || "",
      description: body.description || "",
      category: body.category || "",
      income_range: body.income_range || "",
      difficulty: body.difficulty || "⭐中等",
      platform: body.platform || "",
      source_url: body.source_url || "",
      tags: body.tags || "",
      source: body.source || "手动添加",
      status: "active",
      created_at: today(),
      updated_at: today(),
    };
    if (!db.opportunities) db.opportunities = [];
    db.opportunities.push(o);
    saveDb();
    return j(200, { id: o.id });
  }
  if (segs[0] === "opportunities" && segs.length === 2) {
    const oid = parseInt(segs[1]);
    const idx = (db.opportunities || []).findIndex(o => o.id === oid);
    if (idx === -1) return j(404, { error: "未找到" });
    if (method === "GET") return j(200, db.opportunities[idx]);
    if (method === "PUT") {
      db.opportunities[idx] = { ...db.opportunities[idx], ...body, updated_at: today() };
      saveDb();
      return j(200, { ok: true });
    }
    if (method === "DELETE") {
      db.opportunities.splice(idx, 1);
      saveDb();
      return j(200, { ok: true });
    }
  }
  if (p === "device-info" && method === "GET") {
    try {
      const os = require("os");
      const nets = os.networkInterfaces();
      const ips = [];
      for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
          if (net.family === "IPv4" && !net.internal) {
            ips.push({ name, address: net.address });
          }
        }
      }
      return j(200, { ips, hostname: os.hostname(), port: PORT });
    } catch(e) {
      return j(200, { ips: [], hostname: "unknown", port: PORT });
    }
  }
  if (p === "health" && method === "GET") {
    return j(200, { status: "ok", uptime: process.uptime(), version: "2.0" });
  }
  return j(404, { error: "未找到路由" });
}
const server = http.createServer(handle);
server.listen(PORT, "0.0.0.0", () => {
  console.log("学赚工坊 v2.0 - 统一平台 http://127.0.0.1:" + PORT + "/");
});
