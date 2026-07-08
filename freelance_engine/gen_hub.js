const fs = require("fs");
const path = require("path");

// Read existing style
const stylePath = path.join(__dirname, "public", "style.css");
let css = fs.readFileSync(stylePath, "utf8");

// Add horizontal layout CSS
css += `
/* Horizontal layout */
.topbar{position:fixed;top:0;left:0;right:0;z-index:100;background:var(--surface);border-bottom:1px solid var(--border);height:56px;display:flex;align-items:center;padding:0 20px;gap:20px;box-shadow:0 1px 3px rgba(0,0,0,.04)}
.topbar .logo{font-size:17px;font-weight:700;display:flex;align-items:center;gap:8px;white-space:nowrap}
.topbar .logo i{color:var(--primary);font-size:20px}
.topbar .nav{display:flex;gap:2px;flex:1;overflow-x:auto}
.topbar .nav a{padding:8px 14px;border-radius:6px;font-size:13px;font-weight:500;color:var(--text-secondary);text-decoration:none;white-space:nowrap;display:flex;align-items:center;gap:6px;transition:.15s}
.topbar .nav a:hover{background:var(--bg);color:var(--text)}
.topbar .nav a.active{background:#eef2ff;color:var(--primary);font-weight:600}
body{padding-top:56px}
.page{display:none}.page.active{display:block}
.page h2{font-size:20px;font-weight:700;margin-bottom:16px;display:flex;align-items:center;gap:8px}
.page h2 i{color:var(--primary)}
.hub-tabs{display:flex;gap:4px;background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:3px;margin-bottom:16px;overflow-x:auto}
.hub-tab{padding:6px 14px;border:none;border-radius:4px;font-size:12px;font-weight:500;cursor:pointer;background:transparent;color:var(--text-secondary);font-family:inherit;white-space:nowrap;transition:.15s}
.hub-tab:hover{color:var(--text)}.hub-tab.active{background:var(--primary);color:#fff}
.code-block{background:#1a1d29;color:#fff;padding:14px;border-radius:6px;font-size:12px;line-height:1.6;white-space:pre-wrap;font-family:monospace;margin-top:8px;max-height:300px;overflow-y:auto}
.lead-item,.file-item{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:var(--surface);border:1px solid var(--border);border-radius:6px;margin-bottom:6px;font-size:13px}
.lead-name{font-weight:600;font-size:14px}.lead-meta{font-size:11px;color:var(--text-muted);margin-top:2px}
@media(max-width:768px){.topbar .nav a span{display:none}}
`;

// Read the hub template
const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>创业中心 - 横板Hub</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://unpkg.com/lucide@0.475.0/font/lucide.css">
<style>${css}</style>
</head>
<body>
<nav class="topbar">
  <div class="logo"><i class="lci lci-wrench"></i> 创业中心</div>
  <div class="nav" id="topNav">
    <a href="#" class="active" data-page="home" onclick="switchPage('home')"><i class="lci lci-layout-dashboard"></i><span>首页</span></a>
    <a href="#" data-page="tools" onclick="switchPage('tools')"><i class="lci lci-tools"></i><span>工具台</span></a>
    <a href="#" data-page="ops" onclick="switchPage('ops')"><i class="lci lci-bot"></i><span>运营中心</span></a>
    <a href="#" data-page="chat" onclick="switchPage('chat')"><i class="lci lci-message-circle"></i><span>AI助手</span></a>
    <a href="#" data-page="output" onclick="switchPage('output')"><i class="lci lci-folder-open"></i><span>产出</span></a>
  </div>
  <div style="display:flex;gap:8px;align-items:center;flex-shrink:0;">
    <a href="http://127.0.0.1:5678/" target="_blank" class="btn btn-ghost btn-sm"><i class="lci lci-graduation-cap"></i> 学赚</a>
  </div>
</nav>
<main style="padding:20px;max-width:1200px;margin:0 auto">

<div class="page active" id="page-home">
  <h2><i class="lci lci-layout-dashboard"></i> 创业中心</h2>
  <div class="stats-row" id="hubStats"></div>
  <p style="color:var(--text-secondary);font-size:13px;margin-bottom:12px;">快速操作</p>
  <div class="action-grid" style="margin-bottom:16px">
    <button class="action-btn" onclick="switchPage('tools');setTimeout(()=>switchTool('scraper'),100)"><i class="lci lci-globe"></i>数据采集</button>
    <button class="action-btn" onclick="switchPage('tools');setTimeout(()=>switchTool('excel'),100)"><i class="lci lci-file-spreadsheet"></i>Excel处理</button>
    <button class="action-btn" onclick="switchPage('ops')"><i class="lci lci-send"></i>自动发帖</button>
    <button class="action-btn" onclick="switchPage('ops')"><i class="lci lci-users"></i>客户管理</button>
    <button class="action-btn" onclick="switchPage('chat')"><i class="lci lci-message-square"></i>AI对话</button>
    <button class="action-btn" onclick="switchPage('output')"><i class="lci lci-download"></i>查看产出</button>
  </div>
  <div id="recentActivity"></div>
</div>

<div class="page" id="page-tools">
  <h2><i class="lci lci-tools"></i> 工具台</h2>
  <div class="hub-tabs">
    <button class="hub-tab active" onclick="switchTool('scraper')">🌐 数据采集</button>
    <button class="hub-tab" onclick="switchTool('excel')">📊 Excel</button>
    <button class="hub-tab" onclick="switchTool('pdf')">📄 PDF报告</button>
  </div>
  <div id="toolScraper">
    <div class="form-group"><label>目标网址</label><input type="url" id="tsUrl" placeholder="https://example.com"></div>
    <div class="form-row"><div class="form-group"><label>CSS选择器</label><input type="text" id="tsSelector" placeholder=".title" value="body"></div><div class="form-group"><label>格式</label><select id="tsFormat"><option>json</option><option>csv</option></select></div></div>
    <button class="btn btn-primary" onclick="runTool('scraper')"><i class="lci lci-play"></i> 开始采集</button>
    <div id="tsResult"></div>
  </div>
  <div id="toolExcel" style="display:none">
    <div class="form-group"><label>功能</label><select id="teCmd"><option value="clean">数据清洗</option><option value="analyze">统计分析</option><option value="format">格式美化</option></select></div>
    <div class="form-group"><label>上传文件</label><input type="file" id="teFile" accept=".xlsx,.csv" onchange="uploadFile(this,'excel')"></div>
    <button class="btn btn-primary" onclick="runTool('excel')" id="teBtn" disabled>处理</button>
    <div id="teResult"></div>
  </div>
  <div id="toolPdf" style="display:none">
    <div class="form-group"><label>数据文件</label><input type="file" id="tpFile" accept=".xlsx,.csv,.json" onchange="uploadFile(this,'pdf')"></div>
    <div class="form-group"><label>报告标题</label><input type="text" id="tpTitle" placeholder="数据分析报告"></div>
    <button class="btn btn-primary" onclick="runTool('pdf')" id="tpBtn" disabled>生成</button>
    <div id="tpResult"></div>
  </div>
</div>

<div class="page" id="page-ops">
  <h2><i class="lci lci-bot"></i> 运营中心</h2>
  <div class="hub-tabs">
    <button class="hub-tab active" onclick="switchOpsTab('post')">📢 自动发帖</button>
    <button class="hub-tab" onclick="switchOpsTab('leads')">👥 客户</button>
    <button class="hub-tab" onclick="switchOpsTab('projects')">📋 项目</button>
    <button class="hub-tab" onclick="switchOpsTab('finance')">💰 财务</button>
    <button class="hub-tab" onclick="switchOpsTab('replies')">💬 话术</button>
  </div>
  <div id="opsPost">
    <p style="font-size:13px;color:var(--text-secondary);margin-bottom:12px;">一键生成全平台发帖文案，复制去发布</p>
    <button class="btn btn-primary" onclick="generatePosts()"><i class="lci lci-magic-wand"></i> 一键生成</button>
    <div id="postResults"></div>
  </div>
  <div id="opsLeads" style="display:none">
    <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap"><button class="btn btn-primary btn-sm" onclick="showForm('lead')"><i class="lci lci-plus"></i> 添加客户</button><div class="search-bar" style="max-width:250px"><i class="lci lci-search"></i><input type="text" placeholder="搜索..." oninput="searchLeads(this.value)"></div></div>
    <div id="leadsList"></div>
  </div>
  <div id="opsProjects" style="display:none">
    <button class="btn btn-primary btn-sm" onclick="showForm('project')" style="margin-bottom:12px"><i class="lci lci-plus"></i> 新建项目</button>
    <div id="projectsList"></div>
  </div>
  <div id="opsFinance" style="display:none">
    <div class="stats-row" id="finStats"></div>
    <button class="btn btn-primary btn-sm" onclick="showForm('finance')" style="margin-bottom:12px"><i class="lci lci-plus"></i> 记一笔</button>
    <div id="finRecords"></div>
  </div>
  <div id="opsReplies" style="display:none">
    <div class="hub-tabs"><button class="hub-tab active" onclick="loadReplies('inquiry')">💬 询价</button><button class="hub-tab" onclick="loadReplies('confirm')">✅ 交付</button><button class="hub-tab" onclick="loadReplies('followup')">📞 跟进</button></div>
    <div id="replyList"></div>
  </div>
</div>

<div class="page" id="page-chat">
  <h2><i class="lci lci-message-circle"></i> AI助手</h2>
  <div class="chat-area">
    <div class="chat-msgs" id="chatMsgs"><div class="chat-msg bot">你好！我是你的创业助手。有什么需要？</div></div>
    <div class="chat-input"><textarea id="chatInput" rows="1" placeholder="输入消息..." onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendChatMsg()}"></textarea><button class="btn btn-primary" onclick="sendChatMsg()" style="border-radius:50%;width:36px;height:36px;padding:0"><i class="lci lci-send"></i></button></div>
  </div>
</div>

<div class="page" id="page-output">
  <h2><i class="lci lci-folder-open"></i> 产出文件</h2>
  <p style="font-size:13px;color:var(--text-secondary);margin-bottom:12px;">所有生成的文件，可直接下载发给客户</p>
  <div id="outputList"></div>
</div>

</main>
<script>
let leadsData=[];
let uploadedFile=null;
function switchPage(n){document.querySelectorAll('#topNav a').forEach(a=>a.classList.remove('active'));document.querySelector('#topNav a[data-page=\"'+n+'\"]')?.classList.add('active');document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));const el=document.getElementById('page-'+n);if(el)el.classList.add('active');if(n==='home')loadHome();if(n==='output')loadOutputs();if(n==='ops'){loadLeads();loadProjects();loadFinance()}}
function switchTool(n){document.querySelectorAll('#page-tools .hub-tab').forEach(t=>t.classList.remove('active'));[...document.querySelectorAll('#page-tools .hub-tab')].find(t=>t.textContent.includes(n==='scraper'?'采集':n==='excel'?'Excel':'PDF'))?.classList.add('active');['toolScraper','toolExcel','toolPdf'].forEach(i=>{const e=document.getElementById(i);if(e)e.style.display='none'});const e=document.getElementById('tool'+n.charAt(0).toUpperCase()+n.slice(1));if(e)e.style.display='block'}
function switchOpsTab(n){document.querySelectorAll('#page-ops .hub-tab').forEach(t=>t.classList.remove('active'));const m={post:'发帖',leads:'客户',projects:'项目',finance:'财务',replies:'话术'};const t=[...document.querySelectorAll('#page-ops .hub-tab')].find(t=>t.textContent.includes(m[n]));if(t)t.classList.add('active');['opsPost','opsLeads','opsProjects','opsFinance','opsReplies'].forEach(i=>{const e=document.getElementById(i);if(e)e.style.display='none'});const e=document.getElementById('ops'+n.charAt(0).toUpperCase()+n.slice(1));if(e)e.style.display='block'}
async function api(m,p,b){const o={method:m,headers:{}};if(b){o.headers['Content-Type']='application/json';o.body=JSON.stringify(b)}const r=await fetch('/api/'+p,o);return r.json()}
function esc(s){const d=document.createElement('div');d.textContent=s||'';return d.innerHTML}

// Home
async function loadHome(){try{const d=await api('GET','dashboard');document.getElementById('hubStats').innerHTML='<div class=\"stat-box\"><div class=\"stat-value\">'+d.stats.tasks_todo+'</div><div class=\"stat-label\">待办</div></div><div class=\"stat-box\"><div class=\"stat-value\">'+d.stats.notes_count+'</div><div class=\"stat-label\">笔记</div></div><div class=\"stat-box\"><div class=\"stat-value\">'+d.stats.projects_active+'</div><div class=\"stat-label\">项目中</div></div><div class=\"stat-box\"><div class=\"stat-value\">'+d.stats.flashcards_count+'</div><div class=\"stat-label\">闪卡</div></div>'}catch(e){}}

// Tools
async function runTool(t){
  if(t==='scraper'){const url=document.getElementById('tsUrl')?.value?.trim();if(!url){alert('输入网址');return}const sel=document.getElementById('tsSelector')?.value||'body';const fmt=document.getElementById('tsFormat')?.value||'json';const r=document.getElementById('tsResult');r.innerHTML='<div class=\"loading\"><div class=\"spinner\"></div>采集中...</div>';const d=await api('POST','tools/scraper',{url,selector:sel,format:fmt});if(d.success){r.innerHTML='<div class=\"result-box\"><div class=\"result-header\"><span>'+'✅ '+d.count+'条</span>'+(d.file?'<a href=\"/download/'+encodeURIComponent(d.file.split(/[\\\\/]/).pop())+'\" class=\"btn btn-sm btn-primary\">下载</a>':'')+'</div><div class=\"result-body\"><pre>'+esc(JSON.stringify(d.data?.slice(0,5),null,2))+'</pre></div></div>'}else r.innerHTML='<div class=\"result-box\"><div class=\"result-header\">❌ 失败</div><div class=\"result-body\">'+esc(d.error)+'</div></div>'}
  if(t==='excel'&&uploadedFile){const cmd=document.getElementById('teCmd')?.value||'clean';const r=document.getElementById('teResult');r.innerHTML='<div class=\"loading\"><div class=\"spinner\"></div>处理中...</div>';const d=await api('POST','tools/excel',{command:cmd,input:uploadedFile,output:'r_'+Date.now()+'.xlsx'});r.innerHTML=d.success?'<div class=\"result-box\"><div class=\"result-header\"><span>✅ 完成</span>'+(d.file?'<a href=\"/download/'+encodeURIComponent(d.file.split(/[\\\\/]/).pop())+'\" class=\"btn btn-sm btn-primary\">下载</a>':'')+'</div></div>':'<div class=\"result-box\"><div class=\"result-header\">❌</div><div class=\"result-body\">'+esc(d.error)+'</div></div>'}
  if(t==='pdf'&&uploadedFile){const title=document.getElementById('tpTitle')?.value?.trim()||'报告';const r=document.getElementById('tpResult');r.innerHTML='<div class=\"loading\"><div class=\"spinner\"></div>生成中...</div>';const out='rep_'+Date.now()+'.pdf';const d=await api('POST','tools/pdf',{data_file:uploadedFile,output:out,title});r.innerHTML=d.success?'<div class=\"result-box\"><div class=\"result-header\"><span>✅ 已生成</span><a href=\"/download/'+encodeURIComponent(out)+'\" class=\"btn btn-sm btn-primary\">下载</a></div></div>':'<div class=\"result-box\"><div class=\"result-header\">❌</div><div class=\"result-body\">'+esc(d.error)+'</div></div>'}
}
async function uploadFile(input,type){const f=input?.files?.[0];if(!f)return;const reader=new FileReader();reader.onload=async e=>{const b=e.target.result.split(',')[1];const r=await fetch('/api/upload?name='+encodeURIComponent(f.name),{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:Uint8Array.from(atob(b),c=>c.charCodeAt(0))});const d=await r.json();uploadedFile=d.file;const btn=document.getElementById('t'+(type==='excel'?'e':'p')+'Btn');if(btn)btn.disabled=false};reader.readAsDataURL(f)}

// Auto-post
async function generatePosts(){const r=document.getElementById('postResults');r.innerHTML='<div class=\"loading\"><div class=\"spinner\"></div>生成中...</div>';try{const d=await api('POST','ops/generate',{platform:'xianyu',custom:{}});r.innerHTML='<div class=\"card\"><div class=\"card-title\">🐟 闲鱼</div><div class=\"result-box\" style=\"margin:0\"><div class=\"result-body\"><div class=\"code-block\" id=\"postCode\">'+esc(d.description||'')+'</div><div style=\"margin-top:8px;display:flex;gap:8px\"><button class=\"btn btn-sm btn-primary\" onclick=\"copyPost()\">📋 复制文案</button><button class=\"btn btn-sm btn-ghost\" onclick=\"window.open(\'https://2.taobao.com\',\'_blank\')\">🚀 去闲鱼发布</button></div></div></div></div>'}catch(e){r.innerHTML='<div class=\"result-box\"><div class=\"result-header\">❌</div><div class=\"result-body\">'+esc(e.message)+'</div></div>'}}
function copyPost(){const el=document.getElementById('postCode');if(!el)return;navigator.clipboard.writeText(el.textContent).then(()=>{alert('✅ 已复制到剪贴板！去闲鱼粘贴发布吧')})}

// Leads
async function loadLeads(){try{leadsData=await api('GET','ops/leads');const list=document.getElementById('leadsList');if(!leadsData.length){list.innerHTML='<div class=\"empty-state\"><i class=\"lci lci-inbox\"></i><p>暂无客户</p></div>';return}list.innerHTML=leadsData.map(l=>'<div class=\"lead-item\"><div><div class=\"lead-name\">'+esc(l.name)+'</div><div class=\"lead-meta\">'+esc(l.source||'')+(l.price?' · '+esc(l.price):'')+'</div></div></div>').join('')}catch(e){}}
function searchLeads(q){const f=leadsData.filter(l=>!q||l.name.includes(q)||(l.requirement||'').includes(q));const list=document.getElementById('leadsList');list.innerHTML=f.length?f.map(l=>'<div class=\"lead-item\"><div><div class=\"lead-name\">'+esc(l.name)+'</div><div class=\"lead-meta\">'+esc(l.source||'')+'</div></div></div>').join(''):'<div class=\"empty-state\"><p>无匹配</p></div>'}
function showForm(t){document.getElementById(t+'Modal').style.display='flex'}
async function saveLead(){const n=document.getElementById('leadName')?.value?.trim();if(!n){alert('输入名称');return}await api('POST','ops/leads',{name:n,source:document.getElementById('leadSource')?.value||'闲鱼',requirement:document.getElementById('leadReq')?.value?.trim(),status:document.getElementById('leadStatus')?.value||'新询价',price:document.getElementById('leadPrice')?.value?.trim()});document.getElementById('leadModal').style.display='none';loadLeads()}

// Projects
async function loadProjects(){const d=await api('GET','ops/projects');const list=document.getElementById('projectsList');if(!d.length){list.innerHTML='<div class=\"empty-state\"><i class=\"lci lci-trello\"></i><p>暂无项目</p></div>';return}list.innerHTML=d.map(p=>'<div class=\"lead-item\"><div><div class=\"lead-name\">'+esc(p.name)+'</div><div class=\"lead-meta\">'+esc(p.client||'')+' · ¥'+(p.price||0)+'</div></div></div>').join('')}
async function saveProject(){const n=document.getElementById('projName')?.value?.trim();if(!n){alert('输入名称');return}await api('POST','ops/projects',{name:n,client:document.getElementById('projClient')?.value?.trim(),price:parseFloat(document.getElementById('projPrice')?.value)||0,status:document.getElementById('projStatus')?.value||'进行中'});document.getElementById('projModal').style.display='none';loadProjects()}

// Finance
async function loadFinance(){const d=await api('GET','ops/finance');const inc=d.records?.filter(r=>r.type==='收入').reduce((s,r)=>s+(r.amount||0),0)||0;document.getElementById('finStats').innerHTML='<div class=\"stat-box\"><div class=\"stat-value\" style=\"color:#22c55e\">¥'+((d.total||0).toFixed(0))+'</div><div class=\"stat-label\">净收入</div></div><div class=\"stat-box\"><div class=\"stat-value\" style=\"color:#4f6ef7\">¥'+(inc.toFixed(0))+'</div><div class=\"stat-label\">总收入</div></div>';const list=document.getElementById('finRecords');if(!d.records?.length){list.innerHTML='<div class=\"empty-state\"><i class=\"lci lci-wallet\"></i><p>暂无</p></div>';return}list.innerHTML=d.records.reverse().slice(0,15).map(r=>'<div class=\"lead-item\"><div>'+esc(r.note||'')+' <span style=\"color:var(--text-muted);font-size:11px\">'+r.date+'</span></div><span style=\"font-weight:600;color:'+(r.type==='收入'?'#22c55e':'#ef4444')+'\">'+(r.type==='收入'?'+':'-')+'¥'+(r.amount||0).toFixed(0)+'</span></div>').join('')}
async function saveFinance(){const a=parseFloat(document.getElementById('finAmount')?.value)||0;if(!a){alert('输入金额');return}await api('POST','ops/finance',{amount:a,type:document.getElementById('finType')?.value||'收入',note:document.getElementById('finNote')?.value?.trim()});document.getElementById('finModal').style.display='none';loadFinance()}

// Replies
async function loadReplies(ctx){document.querySelectorAll('#opsReplies .hub-tab').forEach(t=>t.classList.remove('active'));if(event?.target)event.target.classList.add('active');const r=await api('POST','ops/reply',{context:ctx});document.getElementById('replyList').innerHTML=r.map(r=>'<div class=\"card\" style=\"cursor:pointer\" onclick=\"copyReplyText(this)\"><div style=\"font-weight:600;font-size:13px;margin-bottom:4px\">'+esc(r.label)+'</div><div style=\"font-size:13px;color:var(--text-secondary);line-height:1.5\">'+esc(r.text)+'</div><div style=\"font-size:11px;color:var(--text-muted);margin-top:4px\">👆 点击复制</div></div>').join('')}
function copyReplyText(el){const t=el.querySelector('div:nth-child(2)')?.textContent;if(!t)return;navigator.clipboard.writeText(t).then(()=>{const h=el.querySelector('div:last-child');if(h){h.textContent='✅ 已复制';h.style.color='#22c55e';setTimeout(()=>{h.textContent='👆 点击复制';h.style.color=''},2000)}})} 

// Chat
async function sendChatMsg(){const i=document.getElementById('chatInput');const m=i?.value?.trim();if(!m)return;i.value='';const c=document.getElementById('chatMsgs');c.innerHTML+='<div class=\"chat-msg user\">'+esc(m)+'</div>';c.scrollTop=c.scrollHeight;try{const d=await api('POST','chat',{message:m});c.innerHTML+='<div class=\"chat-msg bot\">'+esc(d.reply||'收到')+'</div>';c.scrollTop=c.scrollHeight}catch(e){c.innerHTML+='<div class=\"chat-msg bot\">出错了</div>'}}

// Outputs
async function loadOutputs(){try{const files=await api('GET','output');const list=document.getElementById('outputList');if(!files.length){list.innerHTML='<div class=\"empty-state\"><i class=\"lci lci-inbox\"></i><p>暂无产出</p></div>';return}list.innerHTML=files.map(f=>'<div class=\"file-item\"><span>'+esc(f.name)+' <span style=\"color:var(--text-muted);font-size:11px\">'+(f.size/1024).toFixed(1)+'KB</span></span><a href=\"/download/'+encodeURIComponent(f.name)+'\" class=\"btn btn-sm btn-primary\">下载</a></div>').join('')}catch(e){}}

// Init
loadHome();loadOutputs();
</script>
</body></html>`;
fs.writeFileSync(path.join(__dirname, "public", "hub.html"), html, "utf8");
console.log("Hub page created: " + (html.length / 1024).toFixed(0) + "KB");
console.log("Includes: " + Object.keys(require.cache).length + " modules");
