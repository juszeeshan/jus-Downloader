(() => {
  "use strict";
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const state = { page: "home", activePlatform: "instagram", media: [], history: [], settings: {theme:"dark",prefix:"JusDownloader",previews:true,dm:true,gasUrl:""} };
  const STORAGE = "jus-downloader-v3";
  const PLATFORMS = [
    {id:"instagram",name:"Instagram",icon:"◎",domains:["instagram.com"],desc:"Posts, Reels and your own exported media.",limit:"Official API access is limited; this build does not scrape Instagram pages."},
    {id:"tiktok",name:"TikTok",icon:"♪",domains:["tiktok.com"],desc:"Videos and media you own or are permitted to save.",limit:"Use TikTok-authorized features or media you have permission to download."},
    {id:"youtube",name:"YouTube",icon:"▶",domains:["youtube.com","youtu.be"],desc:"Your own uploads and videos available through authorized download options.",limit:"Do not bypass YouTube download controls or DRM."},
    {id:"facebook",name:"Facebook",icon:"f",domains:["facebook.com","fb.watch"],desc:"Your own photos, videos and exported account media.",limit:"Private content and restricted media are not fetched."},
    {id:"x",name:"X",icon:"𝕏",domains:["x.com","twitter.com"],desc:"Posts and media you own or are authorized to save.",limit:"No scraping, protected content bypass or account automation."},
    {id:"pinterest",name:"Pinterest",icon:"P",domains:["pinterest.com","pin.it"],desc:"Your own Pins and media with permission to save.",limit:"Respect creator rights and Pinterest access restrictions."},
    {id:"snapchat",name:"Snapchat",icon:"👻",domains:["snapchat.com"],desc:"Your own Memories exports and files saved to your device.",limit:"No Snapchat login scraping or capture of disappearing/view-once Snaps."},
    {id:"telegram",name:"Telegram",icon:"➤",domains:["t.me","telegram.me","telegram.org"],desc:"Files you receive or export and are allowed to keep.",limit:"Import exported files manually; no private chat scraping or account session access."},
    {id:"whatsapp",name:"WhatsApp",icon:"◉",domains:["whatsapp.com","wa.me"],desc:"Your own chat exports and media saved from WhatsApp.",limit:"Import media manually; no message interception or end-to-end encryption bypass."},
    {id:"threads",name:"Threads",icon:"＠",domains:["threads.net","threads.com"],desc:"Your own Threads media and authorized files.",limit:"No private-profile scraping or unsupported API downloads."}
  ];
  let toastTimer;

  function toast(message) {
    const el = $("#toast"); el.textContent = message; el.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("show"), 2800);
  }
  function persist() {
    try {
      const safeMedia = state.media.map(({id,name,type,size,source,platform,createdAt}) => ({id,name,type,size,source,platform,createdAt}));
      localStorage.setItem(STORAGE, JSON.stringify({history:state.history,settings:state.settings,media:safeMedia}));
    } catch (_) { /* Browser storage may be unavailable or full; current session still works. */ }
  }
  function restore() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE) || "{}");
      state.history = Array.isArray(saved.history) ? saved.history : [];
      state.settings = {...state.settings,...(saved.settings || {})};
      // File bytes are intentionally not persisted; browser object URLs are session-only.
    } catch (_) {}
  }
  function applyTheme(theme) {
    const actual = theme === "system" ? (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark") : theme;
    document.documentElement.dataset.theme = actual;
    $("#theme-select").value = theme;
  }
  function navigate(page) {
    if (!$("#page-" + page)) return;
    state.page = page;
    $$(".page").forEach(p => p.classList.toggle("active", p.id === "page-" + page));
    $$(".nav-link,.bottom-nav button").forEach(b => b.classList.toggle("active", b.dataset.page === page));
    $("#breadcrumb").innerHTML = `Workspace <span>/</span> ${page[0].toUpperCase()+page.slice(1)}`;
    if (page === "downloads") renderHistory();
    if (page === "platforms") renderPlatforms();
    if (page === "platform-workspace") renderPlatformWorkspace();
    if (["reels","posts","carousels"].includes(page)) renderCollection(page);
    window.scrollTo({top:0,behavior:"smooth"});
  }
  function detectPlatform(value) {
    try {
      const u = new URL(value);
      const host = u.hostname.toLowerCase().replace(/^www\./, "");
      return PLATFORMS.find(p => p.domains.some(d => host === d || host.endsWith("." + d))) || null;
    } catch (_) { return null; }
  }
  function platformCard(p) {
    return `<button class="platform-card" data-platform="${p.id}"><span class="platform-logo logo-${p.id}">${p.icon}</span><span class="platform-card-copy"><b>${p.name}</b><small>${p.desc}</small></span><span class="platform-arrow">↗</span></button>`;
  }
  function renderPlatforms() {
    const html = PLATFORMS.map(platformCard).join("");
    const home = $("#home-platform-grid"), all = $("#platform-grid");
    if (home) home.innerHTML = PLATFORMS.slice(0,6).map(platformCard).join("");
    if (all) all.innerHTML = html;
  }
  function openPlatform(id, initialUrl="") {
    const p = PLATFORMS.find(x => x.id === id); if (!p) return;
    state.activePlatform = id;
    $("#platform-title").textContent = p.name;
    $("#platform-eyebrow").textContent = `${p.name.toUpperCase()} WORKSPACE`;
    $("#platform-description").textContent = p.desc;
    $("#platform-url").value = initialUrl;
    $("#platform-result").classList.toggle("hidden", !initialUrl);
    if (initialUrl) $("#platform-result").textContent = `${p.name} link recognized. Link recognition does not retrieve media. Use the platform's official download/export feature or import a file you own or are authorized to save.`;
    $("#platform-link-hint").textContent = p.limit;
    navigate("platform-workspace");
  }
  async function processPlatformUrl() {
    const input = $("#platform-url").value.trim(), result = $("#platform-result");
    result.classList.remove("hidden");
    if (!input) { result.textContent = "Paste a link first."; return; }
    const detected = detectPlatform(input);
    if (!detected) { result.textContent = "This link does not match one of the ten supported platform domains. Check the URL and try again."; return; }
    if (detected.id !== state.activePlatform) {
      result.textContent = `This is a ${detected.name} link, not a ${PLATFORMS.find(p=>p.id===state.activePlatform).name} link. Open the ${detected.name} workspace to continue.`;
      return;
    }
    result.textContent = `${detected.name} link recognized. Link recognition does not retrieve media. Use the platform's official download/export feature or import a file you own or are authorized to save.`;
    logActivity("platform_link_checked", {platform:detected.id,url:input});
  }
  async function processUrl() {
    const input = $("#url-input").value.trim(), result = $("#url-result");
    result.classList.remove("hidden");
    const detected = detectPlatform(input);
    if (!detected) { result.textContent = "This link is not from one of the ten supported platforms. Choose a platform workspace and paste its link."; return; }
    result.textContent = `${detected.name} link recognized. No media is fetched automatically. Open its workspace to import authorized media or use its official download/export options.`;
    logActivity("link_checked", {platform:detected.id,url:input});
    openPlatform(detected.id,input);
  }
  async function pasteUrl() {
    try { $("#url-input").value = await navigator.clipboard.readText(); toast("Link pasted"); }
    catch (_) { $("#url-input").focus(); toast("Clipboard access unavailable. Paste the link manually."); }
  }
  function addFiles(fileList, source="local-import", platform=state.activePlatform) {
    const files = [...fileList].filter(f => /^(image|video)\//.test(f.type));
    if (!files.length) { toast("Choose image or video files."); return; }
    files.forEach(file => {
      const item = {id:crypto.randomUUID(),name:file.name,type:file.type,size:file.size,source,platform,createdAt:Date.now(),file,url:URL.createObjectURL(file)};
      state.media.unshift(item);
      state.history.unshift({id:item.id,name:item.name,type:item.type,size:item.size,at:Date.now(),status:"Imported locally",platform});
    });
    persist(); updateCount(); renderCurrent(); toast(`${files.length} file${files.length===1?"":"s"} imported`);
    logActivity("media_imported",{count:files.length,source});
  }
  function updateCount() { $("#download-count").textContent = String(state.history.length); }
  function fmtSize(bytes) { if (!bytes) return "Unknown size"; const u=["B","KB","MB","GB"]; let n=bytes,i=0; while(n>=1024&&i<u.length-1){n/=1024;i++;} return `${n.toFixed(i?1:0)} ${u[i]}`; }
  function escapeHtml(s) { return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
  function mediaMarkup(item) {
    const preview = state.settings.previews;
    const thumb = preview ? (item.type.startsWith("image/") ? `<img src="${item.url}" alt="">` : `<video src="${item.url}" muted playsinline></video>`) : `<span>${item.type.startsWith("video/")?"▶":"▧"}</span>`;
    return `<article class="media-card"><div class="media-thumb">${thumb}</div><div class="media-meta"><b title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</b><small>${fmtSize(item.size)} · ${item.type.startsWith("video/")?"Video":"Image"}</small><div class="media-actions"><button data-preview="${item.id}">Preview</button><button data-save="${item.id}">Save</button></div></div></article>`;
  }
  function renderCollection(page) {
    const target = $("#grid-"+page);
    let items = state.media;
    if(page==="reels") items=items.filter(x=>x.type.startsWith("video/"));
    if(page==="posts") items=items.filter(x=>x.type.startsWith("image/") || x.type.startsWith("video/"));
    if(page==="carousels") items=items.filter(x=>x.source==="dm-export" || x.source==="local-import");
    target.innerHTML = items.length ? items.map(mediaMarkup).join("") : `<div class="empty-state">Nothing here yet.<br><br>Import media files you own to see them in this collection.</div>`;
  }
  function renderCurrent() { if(["reels","posts","carousels"].includes(state.page)) renderCollection(state.page); if(state.page==="platform-workspace") renderPlatformWorkspace(); }
  function renderPlatformWorkspace() { const target=$("#grid-platform"); if(!target) return; const items=state.media.filter(x=>x.platform===state.activePlatform); target.innerHTML=items.length?items.map(mediaMarkup).join(""):`<div class="empty-state">No ${PLATFORMS.find(p=>p.id===state.activePlatform)?.name||"platform"} media imported yet.<br><br>Choose files above to add your own media.</div>`; }
  function renderHistory() {
    $("#history-total").textContent = `${state.history.length} item${state.history.length===1?"":"s"}`;
    $("#history-list").innerHTML = state.history.length ? state.history.map(h=>`<div class="history-item"><div class="history-thumb">${h.type?.startsWith("image/")?"▧":"▶"}</div><div class="history-detail"><b>${escapeHtml(h.name)}</b><small>${new Date(h.at).toLocaleString()} · ${escapeHtml(h.status)}${h.platform?" · "+escapeHtml(h.platform):""}</small></div><small>${fmtSize(h.size)}</small></div>`).join("") : `<div class="empty-state">Your activity will appear here.</div>`;
  }
  function preview(id) {
    const item=state.media.find(x=>x.id===id); if(!item) return;
    $("#preview-content").innerHTML = `${item.type.startsWith("image/")?`<img src="${item.url}" alt="${escapeHtml(item.name)}">`:`<video src="${item.url}" controls autoplay playsinline></video>`}<p style="font-size:12px;text-align:center">${escapeHtml(item.name)}</p>`;
    $("#preview-dialog").showModal();
  }
  function saveFile(id) {
    const item=state.media.find(x=>x.id===id); if(!item?.file) {toast("Original file is no longer available in this browser session. Import it again.");return;}
    const a=document.createElement("a"), prefix=(state.settings.prefix||"JusDownloader").replace(/[^a-z0-9_-]/gi,"").slice(0,32)||"JusDownloader";
    const ext=item.name.includes(".")?item.name.split(".").pop():"bin";
    a.href=item.url; a.download=`${prefix}_${Date.now()}.${ext}`; document.body.appendChild(a); a.click(); a.remove();
    state.history.unshift({id:crypto.randomUUID(),name:a.download,type:item.type,size:item.size,at:Date.now(),status:"Saved to device"});
    persist(); updateCount(); renderHistory(); renderPlatforms(); toast("Download started"); logActivity("file_saved",{name:a.download,size:item.size});
  }
  async function logActivity(event,payload) {
    const endpoint=state.settings.gasUrl;
    if(!endpoint) return;
    try {
      await fetch(endpoint,{method:"POST",mode:"no-cors",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({event,payload,at:new Date().toISOString(),app:"Jus Downloader"})});
    } catch (_) { /* Logging is optional and must never block local features. */ }
  }
  function saveSettings() {
    state.settings={theme:$("#theme-select").value,prefix:$("#filename-prefix").value.trim()||"JusDownloader",previews:$("#preview-toggle").checked,dm:$("#dm-toggle").checked,gasUrl:$("#gas-url").value.trim()};
    $("#page-dm").style.display=state.settings.dm?"":"none";
    applyTheme(state.settings.theme); persist(); renderCurrent(); toast("Preferences saved");
  }
  function clearHistory() { state.history=[]; persist(); updateCount(); renderHistory(); renderPlatforms(); toast("History cleared"); }
  async function clearCache() {
    if (!("caches" in window)) { toast("Cache storage is unavailable in this browser."); return; }
    // GitHub Pages projects share the github.io origin. Only clear caches owned by this app.
    const owned = ["jus-downloader-", "instavault-shell-v2"];
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => owned.some(prefix => key.startsWith(prefix))).map(key => caches.delete(key)));
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      const appPath = new URL("./", location.href).pathname;
      await Promise.all(registrations.filter(reg => reg.scope.startsWith(location.origin + appPath)).map(reg => reg.unregister()));
    }
    toast("Jus Downloader cache cleared. Reload to refresh.");
  }
  function bindEvents() {
    $$(".nav-link,.bottom-nav button").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.page)));
    $$("[data-go]").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.go)));
    $("#process-url").addEventListener("click",processUrl);
    $("#platform-check").addEventListener("click",processPlatformUrl);
    $("#platform-url").addEventListener("keydown",e=>{if(e.key==="Enter")processPlatformUrl();});
    $("#platform-paste").addEventListener("click",async()=>{try{$("#platform-url").value=await navigator.clipboard.readText();toast("Link pasted");}catch(_){$("#platform-url").focus();toast("Paste the link manually.");}});
    $("#platform-import").addEventListener("change",e=>{addFiles(e.target.files,"platform-import",state.activePlatform);e.target.value="";});
    document.addEventListener("click",e=>{const card=e.target.closest("[data-platform]");if(card)openPlatform(card.dataset.platform);}); $("#url-input").addEventListener("keydown",e=>{if(e.key==="Enter")processUrl();});
    $("#paste-btn").addEventListener("click",pasteUrl);
    $("#file-import").addEventListener("change",e=>{addFiles(e.target.files);e.target.value="";});
    $("#dm-import").addEventListener("change",e=>{addFiles(e.target.files,"dm-export");e.target.value="";});
    document.addEventListener("click",e=>{const p=e.target.closest("[data-preview]"),s=e.target.closest("[data-save]");if(p)preview(p.dataset.preview);if(s)saveFile(s.dataset.save);});
    $("#dialog-close").addEventListener("click",()=>$("#preview-dialog").close());
    $("#preview-dialog").addEventListener("click",e=>{if(e.target===$("#preview-dialog"))$("#preview-dialog").close();});
    $("#theme-toggle").addEventListener("click",()=>{const next=document.documentElement.dataset.theme==="dark"?"light":"dark";state.settings.theme=next;applyTheme(next);$("#theme-select").value=next;persist();});
    $("#save-settings").addEventListener("click",saveSettings); $("#clear-history").addEventListener("click",clearHistory); $("#clear-cache").addEventListener("click",clearCache);
    $("#connect-info").addEventListener("click",()=>toast("Meta developer app + secure OAuth backend configuration is required."));
    $("#dm-toggle").addEventListener("change",e=>{$("#page-dm").style.display=e.target.checked?"":"none";});
  }
  function init() {
    restore(); bindEvents(); applyTheme(state.settings.theme);
    $("#filename-prefix").value=state.settings.prefix; $("#preview-toggle").checked=state.settings.previews; $("#dm-toggle").checked=state.settings.dm; $("#gas-url").value=state.settings.gasUrl;
    $("#page-dm").style.display=state.settings.dm?"":"none";
    updateCount(); renderHistory(); renderPlatforms();
    if("serviceWorker" in navigator && location.protocol!=="file:") navigator.serviceWorker.register("./service-worker.js").catch(()=>{});
  }
  document.addEventListener("DOMContentLoaded",init);
})();