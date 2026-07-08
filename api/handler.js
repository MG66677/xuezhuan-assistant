// ===== 马振奥的学赚助手 - Vercel Serverless Handler =====
// In-memory data store (resets on cold start, sufficient for demo)
const DATA = {
  notes: [], tasks: [], flashcards: [], courses: [],
  leads: [], finance: { total: 0, records: [] },
  posts: [], opportunities: [], nextId: 1
};
let chatHistory = [];
let agentMode = "study";

function nextId() { return DATA.nextId++; }
function today() { return new Date().toISOString().slice(0, 10); }
function now() { return new Date().toLocaleString("zh-CN", { hour12: false }); }
function j(res, code, data) {
  res.status(code).json(data);
}

function generateListings() {
  return [
    { platform: "闲鱼", price: "¥100起", title: "Python编程～爬虫～Excel处理～脚本定制～学生优惠",
      content: "【服务说明】\nPython编程接单，在校学生诚信服务。\n\n❶ 网页数据采集\n爬取商品信息、文章内容、招聘数据等，输出Excel/CSV\n\n❷ Excel数据处理\n数据清洗、合并拆分、统计报表，量大从优\n\n❸ PDF报告生成\n从数据生成专业PDF报告\n\n❹ Python自动化脚本\n批量文件处理、数据整理\n\n直接私信我，发需求截图报价" },
  ];
}

// ===== AI API Call =====
async function callAI(messages) {
  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY || "";
  const apiUrl = process.env.AI_API_URL || "https://api.deepseek.com/v1/chat/completions";
  const model = process.env.AI_MODEL || "deepseek-chat";
  if (!apiKey) return null;
  try {
    const https = require("https");
    const data = JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 2000 });
    return new Promise((resolve) => {
      const urlObj = new URL(apiUrl);
      const opts = {
        hostname: urlObj.hostname, port: urlObj.port || 443, path: urlObj.pathname,
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + apiKey, "Content-Length": Buffer.byteLength(data) },
      };
      const req = https.request(opts, (res) => {
        let body = "";
        res.on("data", (chunk) => body += chunk);
        res.on("end", () => { try { const j = JSON.parse(body); resolve(j.choices?.[0]?.message?.content || null); } catch { resolve(null); } });
      });
      req.on("error", () => resolve(null));
      req.write(data); req.end();
    });
  } catch { return null; }
}

// ===== Route Handler =====
async function handleApi(method, pathname, query, body, res) {
  const segs = pathname.split("/").filter(Boolean);
  const p = segs[0] || "";
  const db = DATA;

  if (p === "chat" && method === "POST") {
    const msg = (body.message || "").trim(); if (!msg) return j(res, 400, { error: "消息不能为空" });
    chatHistory.push({ role: "user", content: msg, created_at: now() });
    const m = msg.toLowerCase(); const isEarn = agentMode === "earn";
    let reply = "";

    if (m.includes("\u4fdd存") && (m.includes("\u7b14记")||m.includes("\u8bb0录"))) {
      const t = msg.replace(/\u4fdd存|\u7b14记|\u8bb0录|\uff1a|:/g,"").trim().slice(0,30)||"\u5feb速笔记";
      db.notes.push({id:nextId(),title:t,content:msg,tags:"\u5feb速笔记",created_at:today(),updated_at:today()});
      reply="\u5df2\u4fdd\u5b58\u7b14\u8bb0\u300c"+t+"\u300d";
    } else if (m.includes("\u521b\u5efa\u4efb\u52a1")||(m.includes("\u4efb\u52a1")&&(m.includes("\u521b\u5efa")||m.includes("\u6dfb\u52a0")))) {
      const t = msg.replace(/\u521b\u5efa\u4efb\u52a1|\u6dfb\u52a0\u4efb\u52a1|\u4efb\u52a1|\uff1a|:/g,"").trim()||"\u65b0\u4efb\u52a1";
      db.tasks.push({id:nextId(),title:t,description:"",deadline:"",priority:"\u4e2d",category:isEarn?"\u8d5a\u94b1":"\u5b66\u4e1a",status:"\u5f85\u529e",created_at:today()});
      reply="\u5df2\u521b\u5efa\u4efb\u52a1\u300c"+t+"\u300d";
    } else if (m.includes("\u5207\u6362\u6a21\u5f0f")||m.includes("\u6362\u8d5a\u94b1")||m.includes("\u6362\u5b66\u4e1a")) {
      agentMode=agentMode==="study"?"earn":"study";
      reply="\u5df2\u5207\u6362\u5230"+(agentMode==="study"?("🏗\ufe0f \u5b66\u4e1a"):("\U0001f4b5 \u8d5a\u94b1"))+"\u6a21\u5f0f";
    } else if (m.includes("\u526f\u4e1a")||m.includes("\u8d5a\u94b1")||m.includes("\u517c\u804c")||m.includes("\u63a5\u5355")) {
      reply="\n1⃣ \u6280\u80fd\u63a5\u5355\uff1aPython / Excel / PPT / \u89c6\u9891\u526a\u8f91\n2⃣ \u5185\u5bb9\u521b\u4f5c\uff1a\u5c0f\u7ea2\u4e66 / \u77e5\u4e4e / \u516c\u4f17\u53f7\n3⃣ \u77e5\u8bc6\u53d8\u73b0\uff1a\u5bb6\u6559 / \u5356\u7b14\u8bb0 / \u8003\u7814\u8d44\u6599\n4⃣ \u8f7b\u521b\u4e1a\uff1a\u95f2\u9c7c\u8f6c\u5356\n\n💡 \u5efa\u8bae\u4ece\u6280\u80fd\u63a5\u5355\u5f00\u59cb\uff0c\u9700\u6c42\u591a\u95e8\u69db\u4f4e\u3002\u9700\u8981\u6211\u5e2e\u4f60\u5199\u6587\u6848\u6216\u62a5\u4ef7\u5417\uff1f";
    } else if (process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY) {
      const systemPrompt = "\u4f60\u662f\u9a6c\u632f\u5965\u7684\u5b66\u8d5a\u52a9\u624b\uff0c\u4e00\u4e2a\u5e2e\u52a9\u7528\u6237\u7ba1\u7406\u5b66\u4e1a\u548c\u8d5a\u94b1\u7684AI\u52a9\u624b\u3002\u7528\u6237\u5f53\u524d\u6a21\u5f0f\uff1a" + (isEarn ? "\u8d5a\u94b1\u6a21\u5f0f" : "\u5b66\u4e1a\u6a21\u5f0f") + "\u3002\u56de\u590d\u8981\u7b80\u6d01\u3001\u5b9e\u7528\u3001\u53cb\u597d\u3002";
      const recentHistory = chatHistory.slice(-20).map(h => ({ role: h.role === "user" ? "user" : "assistant", content: h.content }));
      const aiReply = await callAI([{ role: "system", content: systemPrompt }, ...recentHistory]);
      reply = aiReply || "AI \u670d\u52a1\u6682\u65f6\u4e0d\u53ef\u7528\uff0c\u8bf7\u7a0d\u540e\u518d\u8bd5\u3002";
    } else {
      reply = (isEarn
        ? "\u5f53\u524d\u8d5a\u94b1\u6a21\u5f0f\uff01\U0001f4b5\n\n\U0001f4cc \u5e38\u7528\u6307\u4ee4\uff1a\n\u2022 \u300c\u4fdd\u5b58\u7b14\u8bb0\uff1axxx\u300d\u5feb\u901f\u8bb0\u5f55\n\u2022 \u300c\u521b\u5efa\u4efb\u52a1\uff1axxx\u300d\u6dfb\u52a0\u5f85\u529e\n\u2022 \u300c\u6362\u5b66\u4e1a\u300d\u5207\u6362\u5230\u5b66\u4e60\u6a21\u5f0f\n\n\U0001f527 \u5de6\u4fa7\u680f\u8fd8\u6709\u63a5\u5355\u5de5\u5177\u548c\u8fd0\u8425\u4e2d\u5fc3\u53ef\u4ee5\u5e2e\u4f60\uff01\n\n✨ \u8bbe\u7f6e DEEPSEEK_API_KEY \u53ef\u89e3\u9501AI\u667a\u80fd\u5bf9\u8bdd\uff01"
        : "\u4f60\u597d\uff01\u6211\u662f\u9a6c\u632f\u5965\u7684\u5b66\u8d5a\u52a9\u624b \U0001f3d7\ufe0f\n\n\U0001f4cc \u5e38\u7528\u6307\u4ee4\uff1a\n\u2022 \u300c\u4fdd\u5b58\u7b14\u8bb0\uff1axxx\u300d\u5feb\u901f\u8bb0\u5f55\n\u2022 \u300c\u521b\u5efa\u4efb\u52a1\uff1axxx\u300d\u6dfb\u52a0\u5f85\u529e\n\u2022 \u300c\u6362\u8d5a\u94b1\u300d\u5207\u6362\u5230\u8d5a\u94b1\u6a21\u5f0f\n\n✨ \u8bbe\u7f6e DEEPSEEK_API_KEY \u53ef\u89e3\u9501AI\u667a\u80fd\u5bf9\u8bdd\uff01");
    }
    chatHistory.push({ role: "assistant", content: reply, created_at: now() });
    if (chatHistory.length > 200) chatHistory = chatHistory.slice(-100);
    return j(res, 200, { reply, mode: agentMode === "study" ? "\u5b66\u4e1a" : "\u8d5a\u94b1", ai_enabled: !!(process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY) });
  }

  if (p === "chat/history") return j(res, 200, chatHistory);
  if (p === "chat/clear" && method === "POST") { chatHistory = []; return j(res, 200, { ok: true }); }
  if (p === "toggle-mode" && method === "POST") { agentMode = agentMode === "study" ? "earn" : "study"; return j(res, 200, { mode: agentMode === "study" ? "\u5b66\u4e1a" : "\u8d5a\u94b1" }); }
  if (p === "mode") return j(res, 200, { mode: agentMode === "study" ? "\u5b66\u4e1a" : "\u8d5a\u94b1" });

  if (p === "dashboard" && method === "GET") {
    const todo = db.tasks.filter(t => t.status === "\u5f85\u529e");
    return j(res, 200, {
      stats: { tasks_todo: todo.length, notes_count: db.notes.length, flashcards_count: db.flashcards.length, total_leads: db.leads.length, total_revenue: db.finance.total, pending_posts: db.posts.filter(p => p.status === "pending").length, ai_ready: (process.env.DEEPSEEK_API_KEY||process.env.OPENAI_API_KEY) ? 1 : 0 },
      tasks: todo.slice(0, 8).map(t => ({ id: t.id, title: t.title, priority: t.priority, deadline: t.deadline, category: t.category })),
      leads: db.leads.slice(-5).reverse(), finance: db.finance,
    });
  }

  if (p === "notes" && method === "GET") { let ns = [...db.notes].reverse(); if (query.search) ns = ns.filter(n => n.title.includes(query.search)||n.content.includes(query.search)); return j(res, 200, ns.map(n => ({...n, preview: (n.content||"").slice(0,200)}))); }
  if (p === "notes" && method === "POST") { const n = {id:nextId(),title:body.title||"",content:body.content||"",tags:body.tags||"",created_at:today(),updated_at:today()}; db.notes.push(n); return j(res, 200, {id:n.id}); }
  const nid = parseInt(segs[1]); const nIdx = db.notes.findIndex(n => n.id === nid);
  if (segs[0]==="notes"&&segs.length===2&&nIdx>-1) { if(method==="PUT"){db.notes[nIdx]={...db.notes[nIdx],...body,updated_at:today()};return j(res,200,{ok:true})} if(method==="DELETE"){db.notes.splice(nIdx,1);return j(res,200,{ok:true})} }

  if (p === "tasks" && method === "GET") { let ts=[...db.tasks].reverse(); if(query.category)ts=ts.filter(t=>t.category===query.category); return j(res,200,ts); }
  if (p === "tasks" && method === "POST") { const t={id:nextId(),title:body.title||"\u4efb\u52a1",description:body.description||"",deadline:body.deadline||"",priority:body.priority||"\u4e2d",category:body.category||"\u5b66\u4e1a",status:"\u5f85\u529e",created_at:today()}; db.tasks.push(t); return j(res,200,{id:t.id}); }
  const tid = parseInt(segs[1]); const tIdx = db.tasks.findIndex(t => t.id === tid);
  if (segs[0]==="tasks"&&segs.length===2&&tIdx>-1) { if(method==="PUT"){db.tasks[tIdx]={...db.tasks[tIdx],...body};return j(res,200,{ok:true})} if(method==="DELETE"){db.tasks.splice(tIdx,1);return j(res,200,{ok:true})} }

  if (p === "flashcards" && method === "GET") { let fs=[...db.flashcards].reverse(); if(query.search)fs=fs.filter(c=>c.front.includes(query.search)||c.back.includes(query.search)); return j(res,200,fs); }
  if (p === "flashcards" && method === "POST") { const c={id:nextId(),front:body.front||"",back:body.back||"",box:0,created_at:today()}; db.flashcards.push(c); return j(res,200,{id:c.id}); }
  const cid = parseInt(segs[1]); const cIdx = db.flashcards.findIndex(c => c.id === cid);
  if (segs[0]==="flashcards"&&segs.length===2&&cIdx>-1) { if(method==="PUT"){db.flashcards[cIdx]={...db.flashcards[cIdx],...body};return j(res,200,{ok:true})} if(method==="DELETE"){db.flashcards.splice(cIdx,1);return j(res,200,{ok:true})} }

  if (p === "courses" && method === "GET") { let cs=[...db.courses].reverse(); if(query.search)cs=cs.filter(c=>c.title.includes(query.search)||c.description.includes(query.search)); return j(res,200,cs); }
  if (p === "courses" && method === "POST") { const c={id:nextId(),title:body.title||"",description:body.description||"",progress:body.progress||0,url:body.url||"",created_at:today()}; db.courses.push(c); return j(res,200,{id:c.id}); }
  const coid = parseInt(segs[1]); const coIdx = db.courses.findIndex(c => c.id === coid);
  if (segs[0]==="courses"&&segs.length===2&&coIdx>-1) { if(method==="PUT"){db.courses[coIdx]={...db.courses[coIdx],...body};return j(res,200,{ok:true})} if(method==="DELETE"){db.courses.splice(coIdx,1);return j(res,200,{ok:true})} }

  if (p === "leads" && method === "GET") { let ls=[...db.leads].reverse(); if(query.status)ls=ls.filter(l=>l.status===query.status); return j(res,200,ls); }
  if (p === "leads" && method === "POST") { const l={id:nextId(),name:body.name||"\u533f\u540d",source:body.source||"\u672a\u77e5",contact:body.contact||"",requirement:body.requirement||"",status:"\u65b0\u54a8\u8be2",price:body.price||"",note:body.note||"",created_at:now()}; db.leads.push(l); return j(res,200,{id:l.id}); }
  const lid = parseInt(segs[1]); const lIdx = db.leads.findIndex(l => l.id === lid);
  if (segs[0]==="leads"&&segs.length===2&&lIdx>-1) { if(method==="PUT"){db.leads[lIdx]={...db.leads[lIdx],...body};return j(res,200,{ok:true})} if(method==="DELETE"){db.leads.splice(lIdx,1);return j(res,200,{ok:true})} }

  if (p === "finance" && method === "GET") return j(res, 200, db.finance);
  if (p === "finance" && method === "POST") { const r={id:nextId(),type:body.type||"\u6536\u5165",amount:parseFloat(body.amount)||0,category:body.category||"",note:body.note||"",created_at:today()}; db.finance.total+=r.type==="\u6536\u5165"?r.amount:-r.amount; db.finance.records.push(r); return j(res,200,{id:r.id}); }
  if (p === "finance/records" && method === "DELETE") { db.finance.records=[]; db.finance.total=0; return j(res,200,{ok:true}); }

  if (p === "posts" && method === "GET") { let ps=[...db.posts].reverse(); if(query.status)ps=ps.filter(p=>p.status===query.status); return j(res,200,ps); }
  if (p === "posts" && method === "POST") { const idx=db.posts.findIndex(p=>p.id===body.id); if(idx>-1){db.posts[idx].status="posted";db.posts[idx].posted_at=now();return j(res,200,{ok:true})} return j(res,404,{error:"\u672a\u627e\u5230"}); }
  if (p === "posts/delete" && method === "POST") { db.posts=db.posts.filter(p=>p.id!==body.id); return j(res,200,{ok:true}); }
  if (p === "leads/publish" && method === "POST") {
    const ls=db.leads.filter(l=>(body.ids||[]).includes(l.id));
    ls.forEach(l=>{ db.posts.push({id:db.posts.length+1,platform:l.platform||"\u95f2\u9c7c",title:l.title||l.name,content:l.requirement||l.note||"",price:l.price||"",status:"pending",created_at:now(),posted_at:null,views:0,inquiries:0}); });
    return j(res,200,{ok:true,count:ls.length,posts:db.posts.slice(-ls.length)});
  }

  if (p === "auto-ops/run" && method === "POST") {
    if (body.action === "generate") { const ls=generateListings();ls.forEach(l=>{db.posts.push({id:db.posts.length+1,platform:l.platform,title:l.title,content:l.content,price:l.price,status:"pending",created_at:now(),posted_at:null,views:0,inquiries:0})});return j(res,200,{ok:true,count:ls.length}) }
    if (body.action === "follow-up") {
      const fu=db.leads.filter(l=>l.status==="\u65b0\u54a8\u8be2");
      let followUpMsgs = [];
      if (process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY) {
        for (const lead of fu.slice(0, 5)) {
          const prompt = "\u4f60\u662f\u4e00\u4e2a\u63a5\u5355\u52a9\u7406\uff0c\u9700\u8981\u7ed9\u5ba2\u6237\u53d1\u8ddf\u8fdb\u6d88\u606f\u3002\u5ba2\u6237\u9700\u6c42\uff1a" + (lead.requirement || "") + "\u3002\u751f\u6210\u4e00\u6761\u7b80\u77ed\u53cb\u597d\u7684\u8ddf\u8fdb\u6d88\u606f\uff0c\u8be2\u95ee\u662f\u5426\u9700\u8981\u5e2e\u52a9\uff0c50\u5b57\u4ee5\u5185\u3002";
          const reply = await callAI([{ role: "user", content: prompt }]);
          followUpMsgs.push({ lead_id: lead.id, name: lead.name, message: reply || "\u60a8\u597d\uff0c\u8bf7\u95ee\u60a8\u5bf9\u8fd9\u4e2a\u9879\u76ee\u8fd8\u6709\u5174\u8da3\u5417\uff1f\u6709\u4ec0\u4e48\u6211\u53ef\u4ee5\u5e2e\u60a8\u7684\u5417\uff1f" });
        }
      } else {
        followUpMsgs = fu.slice(0, 10).map(l => ({ lead_id: l.id, name: l.name, message: "\u60a8\u597d\uff0c\u8bf7\u95ee\u60a8\u5bf9\u8fd9\u4e2a\u9879\u76ee\u8fd8\u6709\u5174\u8da3\u5417\uff1f\u6709\u4ec0\u4e48\u6211\u53ef\u4ee5\u5e2e\u60a8\u7684\u5417\uff1f" }));
      }
      return j(res,200,{ok:true,follow_ups:fu.length,leads:fu,messages:followUpMsgs});
    }
    if (body.action === "ai-content") {
      if (!(process.env.DEEPSEEK_API_KEY||process.env.OPENAI_API_KEY)) return j(res,200,{ok:false,error:"\u672a\u914d\u7f6e AI API Key"});
      const topic = body.topic || "\u7f16\u7a0b\u63a5\u5355\u670d\u52a1";
      const prompt = "\u4f60\u662f\u4e00\u4e2a\u5c0f\u7ea2\u4e66/\u95f2\u9c7c\u6587\u6848\u5199\u624b\u3002\u8bf7\u4e3a\u300c" + topic + "\u300d\u5199\u4e00\u6761\u63a8\u5e7f\u6587\u6848\uff0c\u5305\u62ec\u6807\u9898\u548c\u6b63\u6587\uff0c50-100\u5b57\uff0c\u8981\u6709\u5438\u5f15\u529b\uff0c\u5e26 emoji\u3002";
      const content = await callAI([{ role: "user", content: prompt }]);
      if (content) { db.posts.push({id:db.posts.length+1,platform:"\u5c0f\u7ea2\u4e66",title:topic,content:content,price:body.price||"",status:"pending",created_at:now(),posted_at:null,views:0,inquiries:0}); return j(res,200,{ok:true,content:content}); }
      return j(res,200,{ok:false,error:"AI \u751f\u6210\u5931\u8d25"});
    }
    if (body.action === "reply-suggestion") {
      if (!(process.env.DEEPSEEK_API_KEY||process.env.OPENAI_API_KEY)) return j(res,200,{ok:false,error:"\u672a\u914d\u7f6e AI API Key"});
      const question = body.question || "";
      const prompt = "\u4f60\u662f\u4e00\u4e2a\u63a5\u5355\u5ba2\u670d\uff0c\u5ba2\u6237\u95ee\uff1a\u300c" + question + "\u300d\uff0c\u8bf7\u7ed9\u51fa3\u6761\u4e0d\u540c\u98ce\u683c\u7684\u56de\u590d\u5efa\u8bae\uff0c\u6bcf\u676120-40\u5b57\u3002\u7528\u6570\u5b57\u7f16\u53f7\u3002";
      const suggestions = await callAI([{ role: "user", content: prompt }]);
      return j(res,200,{ok:true,suggestions: suggestions || "1. \u597d\u7684\uff0c\u6211\u4e86\u89e3\u4e00\u4e0b\u60a8\u7684\u9700\u6c42\n2. \u65b9\u4fbf\u8bf4\u4e00\u4e0b\u5177\u4f53\u8981\u6c42\u5417\uff1f\n3. \u6211\u7ed9\u60a8\u62a5\u4e2a\u4ef7"});
    }
    return j(res,200,{ok:true});
  }

  if (p === "auto-ops/status" && method === "GET") {
    const now_h = new Date().getHours();
    const tips = now_h < 6 ? "\u591c\u6df1\u4e86\uff0c\u5efa\u8bae\u660e\u5929\u518d\u8fd0\u8425" : now_h < 12 ? "\u2600\ufe0f \u4e0a\u5348\u597d\uff0c\u9002\u5408\u53d1\u5e16\u548c\u8ddf\u8fdb\u5ba2\u6237" : now_h < 18 ? "\u2604\ufe0f \u4e0b\u5348\u597d\uff0c\u9002\u5408\u5904\u7406\u8ba2\u5355" : "\U0001f319 \u665a\u4e0a\u597d\uff0c\u9002\u5408\u5185\u5bb9\u521b\u4f5c";
    return j(res,200,{ pending_posts: db.posts.filter(p=>p.status==="pending").length, posted: db.posts.filter(p=>p.status==="posted").length, total_posts: db.posts.length, leads: db.leads.length, new_leads: db.leads.filter(l=>l.status==="\u65b0\u54a8\u8be2").length, revenue: db.finance.total, ai_ready: !!(process.env.DEEPSEEK_API_KEY||process.env.OPENAI_API_KEY), tip: tips, today_income: db.finance.records.filter(r => r.created_at === today() && r.type === "\u6536\u5165").reduce((s, r) => s + r.amount, 0) });
  }

  if (p === "opportunities" && method === "GET") {
    let ops = [...(db.opportunities || [])].reverse();
    if (query.search) { const q = query.search.toLowerCase(); ops = ops.filter(o => o.title.toLowerCase().includes(q) || o.description.toLowerCase().includes(q) || (o.tags||"").toLowerCase().includes(q)); }
    if (query.category && query.category !== "all") ops = ops.filter(o => o.category === query.category);
    return j(res, 200, ops);
  }
  if (p === "opportunities" && method === "POST") {
    const o = { id: nextId(), title: body.title || "", description: body.description || "", category: body.category || "", income_range: body.income_range || "", difficulty: body.difficulty || "\u2b50\u4e2d\u7b49", platform: body.platform || "", source_url: body.source_url || "", tags: body.tags || "", source: body.source || "\u624b\u52a8\u6dfb\u52a0", status: "active", created_at: today(), updated_at: today() };
    if (!db.opportunities) db.opportunities = [];
    db.opportunities.push(o);
    return j(res, 200, { id: o.id });
  }
  const oid = parseInt(segs[1]); const oIdx = (db.opportunities || []).findIndex(o => o.id === oid);
  if (segs[0]==="opportunities"&&segs.length===2) { if(oIdx===-1)return j(res,404,{error:"\u672a\u627e\u5230"}); if(method==="GET")return j(res,200,db.opportunities[oIdx]); if(method==="PUT"){db.opportunities[oIdx]={...db.opportunities[oIdx],...body,updated_at:today()};return j(res,200,{ok:true})} if(method==="DELETE"){db.opportunities.splice(oIdx,1);return j(res,200,{ok:true})} }

  if (p === "news" && method === "GET") return j(res, 200, [
    {date:today(),title:"GPT-5 \u63a8\u7406\u80fd\u529b\u5927\u5e45\u63d0\u5347\uff0c\u7f16\u7a0b\u80fd\u529b\u63a5\u8fd1\u4e2d\u7ea7\u5de5\u7a0b\u5e08",source:"OpenAI"},
    {date:today(),title:"Claude \u65b0\u589e Artifacts \u5b9e\u65f6\u9884\u89c8\u529f\u80fd",source:"Anthropic"},
    {date:today(),title:"Cursor AI \u7f16\u8f91\u5668\u83b76000\u4e07\u7f8e\u5143\u878d\u8d44\uff0cAI\u7f16\u7a0b\u5de5\u5177\u52a0\u901f\u666e\u53ca",source:"TechCrunch"},
    {date:today(),title:"Google Gemini 2.0 \u53d1\u5e03\uff0c\u539f\u751f\u652f\u6301\u591a\u6a21\u6001\u548c\u5de5\u5177\u8c03\u7528",source:"Google"},
    {date:today(),title:"Meta \u53d1\u5e03 Llama 3.1 \u5f00\u6e90\u5927\u6a21\u578b\uff0c405B\u53c2\u6570\u6027\u80fd\u63a5\u8fd1GPT-4",source:"Meta"},
    {date:today(),title:"AI\u7f16\u7a0b\u52a9\u624b\u5e02\u573a\u9884\u8ba12027\u5e74\u8fbe270\u4ebf\u7f8e\u5143",source:"MarketsAndMarkets"},
    {date:today(),title:"Python 3.13 \u53d1\u5e03\uff0cJIT\u7f16\u8bd1\u5668\u5e26\u6765\u663e\u8457\u6027\u80fd\u63d0\u5347",source:"Python.org"},
    {date:today(),title:"Stable Diffusion 3 \u5f00\u6e90\uff0c\u56fe\u50cf\u751f\u6210\u8d28\u91cf\u5927\u5e45\u63d0\u5347",source:"Stability AI"},
  ]);

  if (p === "health" && method === "GET") return j(res, 200, { status: "ok", uptime: process.uptime(), version: "2.0" });

  if (p === "device-info" && method === "GET") {
    try {
      const os = require("os");
      const nets = os.networkInterfaces(); const ips = [];
      for (const name of Object.keys(nets)) { for (const net of nets[name]) { if (net.family === "IPv4" && !net.internal) ips.push({ name, address: net.address }); } }
      return j(res, 200, { ips, hostname: os.hostname(), port: 443, env: "vercel" });
    } catch(e) { return j(res, 200, { ips: [], hostname: "vercel", port: 443, env: "vercel" }); }
  }

  return j(res, 404, { error: "\u672a\u627e\u5230\u8def\u7531" });
}

// ===== Vercel Entry Point =====
module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { return res.status(204).end(); }

  const url = new URL(req.url, "http://localhost");
  const pathname = url.pathname.replace(/^\/api\/?/, ""); // Strip /api/ prefix
  const query = Object.fromEntries(url.searchParams.entries());

  try {
    let body = {};
    if (["POST","PUT","DELETE"].includes(req.method)) {
      const buffers = [];
      for await (const chunk of req) buffers.push(chunk);
      const raw = Buffer.concat(buffers).toString();
      if (raw) body = JSON.parse(raw);
    }
    await handleApi(req.method, pathname, query, body, res);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
