// ===== 学赚工坊 v2.0 - 前端脚本 ===== 
function $(id){return document.getElementById(id)}
function qs(s){return document.querySelector(s)}
function qsa(s){return document.querySelectorAll(s)}
function esc(s){const d=document.createElement("div");d.textContent=s||"";return d.innerHTML}
function today(){return new Date().toISOString().slice(0,10)}
function nowStr(){return new Date().toLocaleString("zh-CN",{hour12:false})}
function closeModal(){qsa(".modal-overlay").forEach(m=>m.style.display="none")}
// Global state variables
let editingTaskId = null;
let editingNoteId = null;
let editingFcId = null;

document.addEventListener("keydown",e=>{if(e.key==="Escape")closeModal()})

// ===== API ===== 
async function api(method,path,body){
  const opts={method,headers:{"Content-Type":"application/json"}};
  if(body)opts.body=JSON.stringify(body);
  try{const r=await fetch("/api/"+path,opts);return await r.json()}
  catch(e){return{error:e.message}}
}

// ===== 页面切换 ===== 
function switchPage(page){
  qsa(".nav-item").forEach(n=>n.classList.toggle("active",n.dataset.page===page));
  qsa(".page").forEach(p=>p.classList.toggle("active",p.id==="page-"+page));
}
qsa(".nav-item").forEach(n=>n.addEventListener("click",()=>switchPage(n.dataset.page)));

// ===== 子Tab切换 ===== 
function switchSubTab(parent,tab,btn){
  const par=document.getElementById("page-"+parent);
  par.querySelectorAll(".sub-tab").forEach(t=>t.classList.remove("active"));
  btn.classList.add("active");
  par.querySelectorAll(".sub-page").forEach(p=>p.classList.remove("active"));
  const sp=par.querySelector("#sub-"+parent+"-"+tab);
  if(sp)sp.classList.add("active");
}

// ===== 模式切换 ===== 
async function toggleMode(){
  const r=await api("POST","toggle-mode");
  if(r.mode)$("modeLabel").textContent=r.mode;
}

// ===== 工作台 ===== 
async function loadDashboard(){
const r=await api("GET","dashboard");
if(!r.stats)return;
const statHtml=Object.entries(r.stats).map(([k,v])=>`<div class="stat-card">
  <div class="stat-value">${v}</div>
  <div class="stat-label">${{"tasks_todo":"待办任务","notes_count":"笔记数","flashcards_count":"闪卡数","total_leads":"客户数","total_revenue":"总收入","pending_posts":"待发帖","ai_ready":"AI 已就绪"}[k]||k}</div>
</div>`).join("");
$("dashStats").innerHTML=statHtml;

const tl=$("dashTasks");
if(r.tasks&&r.tasks.length)tl.innerHTML=r.tasks.map(t=>`<div class="dash-task-item">
  <div class="task-prio ${t.priority==='高'?'high':t.priority==='中'?'mid':'low'}"></div>
  <div class="dt-title">${esc(t.title)}</div>
  <span class="task-cat ${t.category==='赚钱'?'earn':'study'}">${t.category}</span>
</div>`).join("");
else tl.innerHTML='<div class="empty-state"><p>暂无待办任务</p></div>';

const ll=$("dashLeads");
if(r.leads&&r.leads.length)ll.innerHTML=r.leads.slice(0,5).map(l=>`<div class="lead-item">
  <div class="lead-name">${esc(l.name)}</div>
  <span class="lead-status ${l.status}">${l.status}</span>
</div>`).join("");
else ll.innerHTML='<div class="empty-state"><p>暂无客户</p></div>';

const fi=$("dashFinance");
fi.innerHTML=`<div class="finance-summary"><span class="finance-total">¥${r.finance?.total||0}</span><span class="finance-label">累计收入</span></div>`;
  loadNews();
  loadDeviceInfo();
}

// ===== 学业: 任务 ===== 
async function loadTasks(){
const r=await api("GET","tasks");
if(!Array.isArray(r))return;
const fl=$("taskFilter")?.value||"";
const sq=$("taskSearch")?.value||"";
let ts=r;
if(fl)ts=ts.filter(t=>t.category===fl);
if(sq)ts=ts.filter(t=>t.title.includes(sq)||(t.description||"").includes(sq));
const list=$("tasksList");
if(!ts.length)list.innerHTML='<div class="empty-state"><p>暂无任务</p></div>';
else list.innerHTML=ts.map(t=>`<div class="task-card ${t.status==='待办'?'pending':'done'}" onclick="editTask(${t.id})">
  <div class="task-header"><h3>${esc(t.title)}</h3>
  <div class="task-actions">${t.status!=='已完成'?`<button class="done-btn" onclick="event.stopPropagation();completeTask(${t.id})">完成</button>`:''}
  <button class="del-btn" onclick="event.stopPropagation();deleteTask(${t.id})">删除</button></div></div>
${t.deadline||t.description?`<div class="task-meta">${t.deadline?'截止日期：'+t.deadline:''}${t.description?' · '+esc(t.description.slice(0,40)):''}</div>`:''}</div>`).join("");
}

async function openTaskModal(data){
editingTaskId=data?.id||null;
$("taskModalTitle").textContent=data?"编辑任务":"添加任务";
$("taskTitle").value=data?.title||"";
$("taskDesc").value=data?.description||"";
$("taskPriority").value=data?.priority||"中";
$("taskCategory").value=data?.category||"学业";
$("taskDeadline").value=data?.deadline||"";
$("taskModal").style.display="flex";
}

async function saveTask(){
const title=($("taskTitle")?.value||"").trim();if(!title){alert("请输入标题");return}
const data={title,description:$("taskDesc")?.value||"",deadline:$("taskDeadline")?.value||"",priority:$("taskPriority")?.value||"中",category:$("taskCategory")?.value||"学业"};
if(editingTaskId)await api("PUT",`tasks/${editingTaskId}`,data);
else await api("POST","tasks",data);
closeModal();loadTasks();loadDashboard();
}

async function completeTask(id){
await api("PUT",`tasks/${id}`,{status:"已完成"});loadTasks();loadDashboard();
}
async function deleteTask(id){
if(!confirm("确定删除？"))return;
await api("DELETE",`tasks/${id}`);loadTasks();loadDashboard();
}
async function editTask(id){
const r=await api("GET",`tasks/${id}`);
if(r&&!r.error)openTaskModal(r);
}

// ===== 学业: 笔记 ===== 
async function openNoteModal(data){
editingNoteId=data?.id||null;
["noteTitle","noteContent","noteTags"].forEach(id=>{const el=$(id);if(el)el.value=""});
$("noteModalTitle").textContent=data?"编辑笔记":"新建笔记";
if(data){$("noteTitle").value=data.title;$("noteContent").value=data.content;$("noteTags").value=data.tags||""}
$("deleteNoteBtn")&&($("deleteNoteBtn").style.display=data?"inline-block":"none");
$("noteModal").style.display="flex";
}
async function saveNote(){
const title=($("noteTitle")?.value||"").trim();
const content=$("noteContent")?.value||"";
if(!title&&!content){alert("请输入标题或内容");return}
const tags=$("noteTags")?.value||"";
const data={title,content,tags};
if(editingNoteId){await api("PUT",`notes/${editingNoteId}`,data)}
else{await api("POST","notes",data)}
closeModal();loadNotes();
}
async function loadNotes(){
const r=await api("GET","notes");
if(!Array.isArray(r))return;
const sq=$("noteSearch")?.value||"";
let ns=r;
if(sq)ns=ns.filter(n=>(n.title||"").includes(sq)||(n.content||"").includes(sq));
const grid=$("notesGrid");
if(!ns.length)grid.innerHTML='<div class="empty-state"><p>还没有笔记</p></div>';
else grid.innerHTML=ns.map(n=>`<div class="note-card" onclick="editNote(${n.id})"><h3>${esc(n.title)}</h3><p>${esc(n.preview||"")}</p><span class="note-date">${n.created_at}</span></div>`).join("");
}
async function editNote(id){
const r=await api("GET",`notes/${id}`);
if(r&&!r.error)openNoteModal(r);
}
async function deleteNote(id){
if(!confirm("确定删除？"))return;
await api("DELETE",`notes/${id}`);closeModal();loadNotes();
}

// ===== 学业: 闪卡 ===== 
async function loadFlashcards(){
const r=await api("GET","flashcards");
if(!Array.isArray(r))return;
const list=$("flashcardsList");
if(!r.length)list.innerHTML='<div class="empty-state"><p>还没有闪卡</p></div>';
else list.innerHTML=r.map(c=>`<div class="flashcard"><div class="fc-front" onclick="this.nextElementSibling.classList.toggle('show')">${esc(c.front)}</div><div class="fc-back">${esc(c.back)}</div><div class="fc-footer"><button class="fc-easy" onclick="reviewCard(${c.id},'简单')">简单</button><button class="fc-mid" onclick="reviewCard(${c.id},'中')">中</button><button class="fc-hard" onclick="reviewCard(${c.id},'难')">难</button><button class="del-btn" onclick="deleteFlashcard(${c.id})">删除</button></div></div>`).join("");
}
async function openFlashcardModal(data){
$("fcModalTitle").textContent=data?"编辑闪卡":"新建闪卡";
$("fcFront").value=data?.front||"";
$("fcBack").value=data?.back||"";
$("flashcardModal").style.display="flex";
}
async function saveFlashcard(){
const front=($("fcFront")?.value||"").trim();
const back=($("fcBack")?.value||"").trim();
if(!front){alert("请输入正面内容");return}
const data={front,back};
if(editingFcId)await api("PUT",`flashcards/${editingFcId}`,data);
else await api("POST","flashcards",data);
closeModal();loadFlashcards();
}
async function deleteFlashcard(id){
if(!confirm("确定删除？"))return;
await api("DELETE",`flashcards/${id}`);loadFlashcards();
}

// ===== 学业: 课程 ===== 
async function loadSchedule(){
const r=await api("GET","courses");
if(!Array.isArray(r))return;
const grid=$("scheduleGrid");
if(!r.length)grid.innerHTML='<div class="empty-state"><p>还没有课程</p></div>';
else grid.innerHTML=r.map(c=>`<div class="course-card"><h3>${esc(c.title)}</h3>${c.description?`<p>${esc(c.description)}</p>`:''}${c.url?`<a href="${c.url}" target="_blank">打开链接</a>`:''}<button class="del-btn" onclick="deleteCourse(${c.id})">删除</button></div>`).join("");
}
async function openCourseModal(){
$("courseTitle").value="";$("courseDesc").value="";$("courseUrl").value="";
$("courseModal").style.display="flex";
}
async function saveCourse(){
const title=($("courseTitle")?.value||"").trim();if(!title){alert("请输入课程名称");return}
const data={title,description:$("courseDesc")?.value||"",url:$("courseUrl")?.value||""};
await api("POST","courses",data);closeModal();loadSchedule();
}
async function deleteCourse(id){
if(!confirm("确定删除？"))return;
await api("DELETE",`courses/${id}`);loadSchedule();
}

// ===== 运营中心 ===== 
async function generatePosts(){
const r=await api("POST","auto-ops/run",{action:"generate"});
$("opsStatus").innerHTML=`<p>已生成${r.count}条帖子</p>`;
loadPosts();
}
async function followUp(){
const r=await api("POST","auto-ops/run",{action:"follow-up"});
$("followUpResult").innerHTML=`<p>有${r.follow_ups}位客户需要跟进</p>`;
}
async function loadPosts(){
const r=await api("GET","posts");
if(!Array.isArray(r))return;
const list=$("postsList");
if(!r.length)list.innerHTML='<div class="empty-state"><p>暂无帖子</p></div>';
else list.innerHTML=r.map(p=>`<div class="post-item"><div class="post-header"><strong>${esc(p.title)}</strong><span class="post-platform">${p.platform}</span></div><div class="post-status ${p.status}">${p.status==="pending"?"待发布":"已发布"}</div><div class="task-actions">${p.status==="pending"?`<button onclick="markPostPosted(${p.id})" style="padding:4px 8px;border:none;border-radius:4px;font-size:11px;cursor:pointer;background:var(--success);color:#fff">发布</button>`:''}<button onclick="deletePost(${p.id})" style="padding:4px 8px;border:none;border-radius:4px;font-size:11px;cursor:pointer;background:var(--border);color:var(--text-secondary)">删除</button></div></div>`).join("");
}
async function markPostPosted(id){
await api("POST","posts",{id});loadPosts();
}
async function deletePost(id){
await api("POST","posts/delete",{id});loadPosts();
}
async function loadOpsStatus(){
const r=await api("GET","auto-ops/status");
if(r)$("opsStatus").innerHTML=`<p>待发布:${r.pending_posts} | 已发布:${r.posted} | 客户:${r.leads} | 收入:¥${r.revenue}</p>`;
}

// ===== 客户管理 ===== 
async function loadLeads(){
const r=await api("GET","leads");
if(!Array.isArray(r))return;
const list=$("leadsList");
if(!r.length)list.innerHTML='<div class="empty-state"><p>暂无客户</p></div>';
else list.innerHTML=r.map(l=>`<div class="lead-item"><div class="lead-header"><strong>${esc(l.name)}</strong><span class="lead-status ${l.status}">${l.status}</span></div><div class="lead-info">${l.requirement||l.note?esc(l.requirement||l.note):''}</div><div class="task-actions"><button onclick="openLeadModal(${l.id})" style="padding:3px 6px;border:none;border-radius:4px;font-size:11px;cursor:pointer">编辑</button><button onclick="deleteLead(${l.id})" style="padding:3px 6px;border:none;border-radius:4px;font-size:11px;cursor:pointer;color:var(--danger)">删除</button></div></div>`).join("");
}

// ===== AI 聊天 ===== 
async function sendChat(){
const input=$("chatInput");
const msg=(input?.value||"").trim();
if(!msg)return;
input.value="";
const box=$("chatMessages");
box.innerHTML+=`<div class="chat-msg user-msg"><div class="msg-content">${esc(msg)}</div></div>`;
box.scrollTop=box.scrollHeight;
const r=await api("POST","chat",{message:msg});
if(r&&r.reply){
box.innerHTML+=`<div class="chat-msg bot-msg"><div class="msg-content">${esc(r.reply)}</div></div>`;
box.scrollTop=box.scrollHeight;
if(r.mode)$("modeLabel").textContent=r.mode;
}
}

async function loadChat(){
const r=await api("GET","chat/history");
if(!Array.isArray(r))return;
const box=$("chatMessages");
box.innerHTML=r.map(m=>`<div class="chat-msg ${m.role==="user"?"user-msg":"bot-msg"}"><div class="msg-content">${esc(m.content)}</div></div>`).join("");
box.scrollTop=box.scrollHeight;
}
async function clearChat(){
if(!confirm("确定清空聊天记录？"))return;
await api("POST","chat/clear");loadChat();
}

// ===== AI 资讯 ===== 
async function loadNews(){
const r=await api("GET","news");
if(!Array.isArray(r))return;
const list=$("newsList")||$("dashNews");
if(!list)return;
list.innerHTML=r.map(n=>`<div class="news-item"><div class="news-title">${esc(n.title)}</div><div class="news-meta">${n.source} · ${n.date}</div></div>`).join("");
}

// ===== 财务管理 ===== 
async function loadFinance(){
const r=await api("GET","finance");
if(!r)return;
$("financeTotal").textContent=`¥${r.total||0}`;
const list=$("financeRecords");
if(!r.records||!r.records.length)list.innerHTML='<div class="empty-state"><p>暂无记录</p></div>';
else list.innerHTML=r.records.slice().reverse().map(rec=>`<div class="finance-item"><span class="finance-type ${rec.type}">${rec.type==="收入"?"+":"-"}${rec.amount}</span><span>${rec.category||""}</span><span>${rec.note||""}</span><span class="finance-date">${rec.created_at}</span></div>`).join("");
}

async function openFinanceModal(){
$("financeType").value="收入";$("financeAmount").value="";$("financeCategory").value="";$("financeNote").value="";
$("financeModal").style.display="flex";
}
async function saveFinance(){
const type=$("financeType")?.value;
const amount=parseFloat($("financeAmount")?.value);
if(!amount){alert("请输入金额");return}
const data={type,amount,category:$("financeCategory")?.value||"",note:$("financeNote")?.value||""};
await api("POST","finance",data);closeModal();loadFinance();
}
async function clearFinance(){
if(!confirm("确定清空所有记录？"))return;
await api("DELETE","finance/records");loadFinance();
}

// ===== 接单工具 ===== 
async function runScraper(){
const url=$("scraperUrl")?.value;
if(!url){alert("请输入网址");return}
const selector=$("scraperSelector")?.value||"body";
const format=$("scraperFormat")?.value||"json";
$("scraperResult").innerHTML="<p>正在采集...</p>";
const r=await api("POST","tools/scraper",{url,selector,format});
$("scraperResult").innerHTML=`<pre>${esc(JSON.stringify(r,null,2))}</pre>`;
}
async function runExcel(){
const cmd=$("excelCommand")?.value;
const input=$("excelInput")?.value;
if(!input){alert("请输入文件路径");return}
$("excelResult").innerHTML="<p>正在处理...</p>";
const r=await api("POST","tools/excel",{command:cmd,input});
$("excelResult").innerHTML=`<pre>${esc(JSON.stringify(r,null,2))}</pre>`;
}
async function runPdf(){
const input=$("pdfInput")?.value;
if(!input){alert("请输入数据文件路径");return}
const title=$("pdfTitle")?.value||"报告";
$("pdfResult").innerHTML="<p>正在生成...</p>";
const r=await api("POST","tools/pdf",{data_file:input,title});
$("pdfResult").innerHTML=`<pre>${esc(JSON.stringify(r,null,2))}</pre>`;
}
async function loadPricing(){
const r=await api("GET","tools/pricing");
if(!Array.isArray(r))return;
const grid=$("pricingGrid");
if(!grid)return;
grid.innerHTML=r.map(p=>`<div class="pricing-card"><h3>${p.service}</h3><div class="price">${p.price}</div><p>${p.desc}</p><span class="demand">需求:${p.demand}</span></div>`).join("");
switchSubTab('freelance','pricing',document.querySelector('#page-freelance .sub-tab:nth-child(4)'));
}
async function loadOutput(){
const r=await api("GET","output");
if(!Array.isArray(r))return;
const list=$("outputList");
list.innerHTML=r.map(f=>`<div class="output-item"><span>${f.name}</span><span>${(f.size/1024).toFixed(1)}KB</span><a href="/download/${f.name}" class="download-btn">下载</a></div>`).join("");
}

// ===== 页面事件绑定 ===== 
const origSwitchPage=switchPage;
switchPage=function(page){
  if(page==='earnings'){window.location.href='/earnings.html';return}
  origSwitchPage(page);
  if(page==='freelance'){const activeSub=qs("#page-freelance .sub-tab.active");if(activeSub)switchSubTab("freelance",activeSub.textContent.trim().toLowerCase()==='数据采集'?'scraper':activeSub.dataset.tab||'scraper',activeSub)}
  if(page==='study')loadTasks();
  if(page==='operations'){loadOpsStatus();loadPosts();loadLeads()}
  if(page==='finance')loadFinance();
  if(page==='news')loadNews();
  if(page==='dashboard')loadDashboard();
};

// ===== 设备信息 ===== 
async function loadDeviceInfo() {
  var container = document.getElementById("deviceInfo");
  if (!container) return;
  var r = await api("GET", "device-info");
  if (!r || !r.ips || !r.ips.length) {
    container.innerHTML = '<div class="device-info"><span>本地: http://127.0.0.1:' + 5677 + '/</span></div>';
    return;
  }
  var html = r.ips.map(function(ip) {
    return '<div class="device-info-item"><i class="lci lci-wifi"></i> <a href="http://' + ip.address + ':' + r.port + '/" target="_blank">http://' + ip.address + ':' + r.port + '/</a> <span class="ip-label">(' + ip.name + ')</span></div>';
  }).join("");
  container.innerHTML = '<div class="device-info">' + html + '</div>';
}

// ===== 运营中心 - AI 功能 ===== 
function openAiContentModal(){
  $("aiTopic").value="编程接单服务";
  $("aiPrice").value="";
  $("aiContentModal").style.display="flex";
}
async function generateAiContent(){
  var topic=($("aiTopic")?.value||"").trim();
  if(!topic){alert("请输入推广主题");return}
  var price=$("aiPrice")?.value||"";
  var btn=document.querySelector("#aiContentModal .btn-primary");
  btn.disabled=true;btn.textContent="生成中...";
  var r=await api("POST","auto-ops/run",{action:"ai-content",topic:topic,price:price});
  btn.disabled=false;btn.textContent="生成";
  if(r.ok){showToast("✅ AI 写完了，已添加到待发布");closeModal();loadPosts();loadOpsStatus()}
  else showToast("❌ "+ (r.error||"生成失败"));
}
function openReplyModal(){
  $("replyQuestion").value="";
  $("replyResult").innerHTML="";
  $("replyModal").style.display="flex";
}
async function getReplySuggestions(){
  var q=($("replyQuestion")?.value||"").trim();
  if(!q){alert("请输入客户问题");return}
  $("replyResult").innerHTML="<p>正在获取建议...</p>";
  var r=await api("POST","auto-ops/run",{action:"reply-suggestion",question:q});
  if(r.ok)$("replyResult").innerHTML=r.suggestions.replace(/\\n/g,"<br>");
  else $("replyResult").innerHTML=r.error||"获取失败";
}

// ===== 快速添加工具 ===== 
function switchQaTab(tab, btn) {
  document.querySelectorAll('.qa-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.qa-panel').forEach(p => p.classList.remove('active'));
  var panel = document.getElementById('qa-' + tab);
  if (panel) panel.classList.add('active');
}
// Enter key handler for quick-add inputs
document.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') {
    var target = e.target;
    if (target.id === 'qaTaskInput') { e.preventDefault(); quickAddTask(); }
    else if (target.id === 'qaNoteInput') { e.preventDefault(); quickAddNote(); }
  }
});
async function quickAddTask() {
  var title = (document.getElementById('qaTaskInput')?.value || '').trim();
  if (!title) { alert('请输入任务标题'); return; }
  var cat = document.getElementById('qaTaskCat')?.value || '学业';
  var prio = document.getElementById('qaTaskPrio')?.value || '中';
  await api('POST', 'tasks', { title: title, description: '', deadline: '', priority: prio, category: cat });
  document.getElementById('qaTaskInput').value = '';
  loadDashboard();
  showToast('✅ 任务已添加');
}
async function quickAddNote() {
  var title = (document.getElementById('qaNoteInput')?.value || '').trim();
  if (!title) { alert('请输入笔记标题'); return; }
  await api('POST', 'notes', { title: title, content: '', tags: '' });
  document.getElementById('qaNoteInput').value = '';
  loadDashboard();
  showToast('✅ 笔记已添加');
}
async function quickAddFinance() {
  var type = document.getElementById('qaFinanceType')?.value || '收入';
  var amount = parseFloat(document.getElementById('qaFinanceAmount')?.value);
  if (!amount) { alert('请输入金额'); return; }
  var cat = document.getElementById('qaFinanceCat')?.value || '';
  await api('POST', 'finance', { type: type, amount: amount, category: cat, note: '' });
  document.getElementById('qaFinanceAmount').value = '';
  document.getElementById('qaFinanceCat').value = '';
  loadDashboard();
  showToast('✅ 记录已添加');
}
function showToast(msg) {
  var t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(function() { t.classList.remove('show'); }, 2500);
}


switchPage('dashboard');
