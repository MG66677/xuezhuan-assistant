/* ===== 副业引擎 - 前端脚本 ===== */
function $(id) { return document.getElementById(id); }
function qs(s) { return document.querySelector(s); }
function qsa(s) { return document.querySelectorAll(s); }
function esc(s) { const d = document.createElement("div"); d.textContent = s || ""; return d.innerHTML; }

let uploadedFile = null;

// ===== 工具页切换 =====
function switchTool(name) {
    qsa(".tool-page").forEach(p => p.classList.remove("active"));
    qsa(".tool-nav-item").forEach(n => n.classList.remove("active"));
    const page = $("page-" + name);
    const nav = $("nav-" + name);
    if (page) page.classList.add("active");
    if (nav) nav.classList.add("active");
    if (name === "output") loadOutputs();
    if (name === "pricing") loadPricing();
}

// ===== API =====
async function api(method, path, body) {
    const opts = { method, headers: {} };
    if (body) {
        opts.headers["Content-Type"] = "application/json";
        opts.body = JSON.stringify(body);
    }
    const r = await fetch("/api/" + path, opts);
    return r.json();
}

// ===== 文件上传 =====
async function uploadFile(file, name) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async e => {
            const base64 = e.target.result.split(",")[1];
            const r = await fetch(`/api/upload?name=${encodeURIComponent(name)}`, {
                method: "POST",
                headers: { "Content-Type": "application/octet-stream" },
                body: Uint8Array.from(atob(base64), c => c.charCodeAt(0))
            });
            const d = await r.json();
            resolve(d);
        };
        reader.readAsDataURL(file);
    });
}

// ===== 数据采集 =====
async function runScraper() {
    const url = $("scraperUrl")?.value.trim();
    if (!url) { alert("请输入目标网址"); return; }
    const selector = $("scraperSelector")?.value.trim() || "body";
    const format = $("scraperFormat")?.value || "json";
    
    const resultDiv = $("scraperResult");
    resultDiv.innerHTML = '<div class="loading"><div class="spinner"></div> 正在采集数据...</div>';
    
    try {
        const d = await api("POST", "tools/scraper", { url, selector, format });
        if (d.success) {
            let preview = "";
            if (d.data && d.data.length) {
                preview = '<table><tr>' + 
                    Object.keys(d.data[0]).map(k => `<th>${esc(k)}</th>`).join("") + '</tr>' +
                    d.data.slice(0, 10).map(row => '<tr>' + 
                        Object.values(row).map(v => `<td>${esc(String(v).slice(0, 50))}</td>`).join("") + '</tr>'
                    ).join("") + '</table>' +
                    (d.data.length > 10 ? `<p style="margin-top:8px;color:var(--text-muted);font-size:13px;">... 还有 ${d.data.length - 10} 条</p>` : "");
            }
            resultDiv.innerHTML = `
                <div class="result-box">
                    <div class="result-header">
                        <span>✅ 采集完成 · 共 ${d.count} 条数据</span>
                        ${d.file ? `<a href="/download/${encodeURIComponent(d.file.split(/[/\\\\]/).pop())}" class="btn btn-sm btn-primary" download>📥 下载</a>` : ""}
                    </div>
                    <div class="result-body">${preview || `<pre>${esc(JSON.stringify(d.data, null, 2))}</pre>`}</div>
                </div>`;
        } else {
            resultDiv.innerHTML = `<div class="result-box"><div class="result-header" style="color:#ef4444;">❌ 采集失败</div><div class="result-body">${esc(d.error || "未知错误")}</div></div>`;
        }
    } catch(e) {
        resultDiv.innerHTML = `<div class="result-box"><div class="result-header" style="color:#ef4444;">❌ 出错</div><div class="result-body">${esc(e.message)}</div></div>`;
    }
}

// ===== Excel处理 =====
async function uploadExcel() {
    const file = $("excelFile")?.files?.[0];
    if (!file) return;
    try {
        const d = await uploadFile(file, file.name);
        $("excelFilePath").innerHTML = `已上传: ${esc(d.name)}`;
        $("excelFilePath").style.display = "block";
        uploadedFile = d.file;
        $("excelRunBtn").disabled = false;
    } catch(e) {
        alert("上传失败: " + e.message);
    }
}

async function runExcel() {
    if (!uploadedFile) { alert("请先上传文件"); return; }
    const cmd = $("excelCommand")?.value || "clean";
    const resultDiv = $("excelResult");
    resultDiv.innerHTML = '<div class="loading"><div class="spinner"></div> 正在处理数据...</div>';

    try {
        const outName = `${cmd}_${Date.now()}.xlsx`;
        const d = await api("POST", "tools/excel", { command: cmd, input: uploadedFile, output: outName });
        if (d.success) {
            let extraInfo = "";
            if (d.stats) {
                extraInfo = Object.entries(d.stats).map(([k, v]) => `<div class="stat-box"><div class="stat-value">${v}</div><div class="stat-label">${k}</div></div>`).join("");
                extraInfo = `<div class="stats-row">${extraInfo}</div>`;
            }
            resultDiv.innerHTML = `
                <div class="result-box">
                    <div class="result-header">
                        <span>✅ 处理完成</span>
                        ${d.file ? `<a href="/download/${encodeURIComponent(d.file.split(/[/\\\\]/).pop())}" class="btn btn-sm btn-primary" download>📥 下载结果</a>` : ""}
                    </div>
                    <div class="result-body">${extraInfo}</div>
                </div>`;
        } else {
            resultDiv.innerHTML = `<div class="result-box"><div class="result-header" style="color:#ef4444;">❌ 处理失败</div><div class="result-body">${esc(d.error || "未知错误")}</div></div>`;
        }
    } catch(e) {
        resultDiv.innerHTML = `<div class="result-box"><div class="result-header" style="color:#ef4444;">❌ 出错</div><div class="result-body">${esc(e.message)}</div></div>`;
    }
}

// ===== PDF报告 =====
async function uploadPdf() {
    const file = $("pdfFile")?.files?.[0];
    if (!file) return;
    try {
        const d = await uploadFile(file, file.name);
        uploadedFile = d.file;
        $("pdfRunBtn").disabled = false;
    } catch(e) {
        alert("上传失败: " + e.message);
    }
}

async function runPdf() {
    if (!uploadedFile) { alert("请先上传数据文件"); return; }
    const title = $("pdfTitle")?.value?.trim() || "数据分析报告";
    const resultDiv = $("pdfResult");
    resultDiv.innerHTML = '<div class="loading"><div class="spinner"></div> 正在生成报告...</div>';

    try {
        const outName = `report_${Date.now()}.pdf`;
        const d = await api("POST", "tools/pdf", { data_file: uploadedFile, output: outName, title });
        if (d.success) {
            resultDiv.innerHTML = `
                <div class="result-box">
                    <div class="result-header">
                        <span>✅ 报告生成成功</span>
                        <a href="/download/${encodeURIComponent(outName)}" class="btn btn-sm btn-primary" download>📥 下载PDF</a>
                    </div>
                    <div class="result-body">
                        <p>报告已保存，可以直接下载发给客户。</p>
                    </div>
                </div>`;
        } else {
            resultDiv.innerHTML = `<div class="result-box"><div class="result-header" style="color:#ef4444;">❌ 生成失败</div><div class="result-body">${esc(d.error || "未知错误")}</div></div>`;
        }
    } catch(e) {
        resultDiv.innerHTML = `<div class="result-box"><div class="result-header" style="color:#ef4444;">❌ 出错</div><div class="result-body">${esc(e.message)}</div></div>`;
    }
}

// ===== 产出列表 =====
async function loadOutputs() {
    try {
        const files = await api("GET", "output");
        const list = $("outputList");
        if (!files.length) {
            list.innerHTML = `<div class="result-box"><div class="result-body"><div class="empty-state" style="padding:20px;text-align:center;color:var(--text-muted);"><i class="lci lci-inbox" style="font-size:32px;display:block;margin-bottom:8px;"></i><p>还没有产出文件</p></div></div></div>`;
            return;
        }
        list.innerHTML = `
            <div class="result-box">
                <div class="result-header"><span>📁 共 ${files.length} 个文件</span><span style="font-size:12px;color:var(--text-muted);">点击下载</span></div>
                <div class="result-body">
                    <table>
                        <tr><th>文件名</th><th>大小</th><th>生成时间</th><th></th></tr>
                        ${files.map(f => `
                            <tr>
                                <td>${esc(f.name)}</td>
                                <td>${formatSize(f.size)}</td>
                                <td>${new Date(f.time).toLocaleString("zh-CN")}</td>
                                <td><a href="/download/${encodeURIComponent(f.name)}" class="btn btn-sm btn-primary" download>下载</a></td>
                            </tr>
                        `).join("")}
                    </table>
                </div>
            </div>`;
    } catch(e) {
        $("outputList").innerHTML = `<div class="result-box"><div class="result-header" style="color:#ef4444;">加载失败</div></div>`;
    }
}

function formatSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + " KB";
    return (bytes/1024/1024).toFixed(1) + " MB";
}

// ===== 报价 =====
async function loadPricing() {
    try {
        const data = await api("GET", "pricing");
        $("pricingTable").innerHTML = `
            <div class="pricing-row header"><span>服务</span><span>价格</span><span>说明</span><span>需求</span></div>
            ${data.map(p => `
                <div class="pricing-row">
                    <span><strong>${esc(p.service)}</strong></span>
                    <span>${esc(p.price)}</span>
                    <span>${esc(p.desc)}</span>
                    <span>${p.demand}</span>
                </div>
            `).join("")}`;
    } catch(e) {}
}

// ===== Enter键发送 =====
document.addEventListener("keydown", e => {
    if (e.key === "Enter" && e.ctrlKey) {
        const active = qs(".tool-page.active");
        if (active && active.id === "page-scraper") runScraper();
    }
});

// 初始化时显示首页
window.onload = function() {
    // If the URL hash is set, switch to that tool
    const hash = location.hash.slice(1);
    if (hash && $("page-" + hash)) switchTool(hash);
};
