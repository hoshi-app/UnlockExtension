var $ = function(id) { return document.getElementById(id) }
var L = navigator.language.startsWith("ru") ? "ru" : "en"

var I = {
  en: {
    dev: "dev",
    tabs: { cors: "CORS", origin: "O/R", headers: "HDR", legal: "Legal" },
    cors: { hint: "Add Access-Control-Allow-* response headers to bypass CORS (covers HLS/DASH .ts, .m3u8, .mpd)", placeholder: "e.g. cdn.example.com", add: "Add", empty: "No domains" },
    origin: { hint: "Override Origin and Referer per domain", domain: "Domain", originPlaceholder: "Origin", refererPlaceholder: "Referer", add: "Add", empty: "No overrides", originLabel: "O:", refererLabel: "R:" },
    headers: { hint: "Inject custom headers into outgoing requests", name: "Name", value: "Value", filter: "URL (*)", add: "Add", empty: "No headers", filterLabel: "filter:" },
    legal: { title: "Legal Disclaimer", p1: "Development and internal testing utility for controlled, non-production environments.", p2: "Must not be used to circumvent access controls, bypass security policies, or violate terms of service.", p3: "Provided \"as is,\" without warranty of any kind." },
    status: { loading: "Loading...", ready: "Ready", saved: "Saved", err: "No connection", active: "active", inactive: "inactive" }
  },
  ru: {
    dev: "dev",
    tabs: { cors: "CORS", origin: "O/R", headers: "HDR", legal: "Право" },
    cors: { hint: "Добавляет Access-Control-Allow-* в ответы (HLS/DASH .ts, .m3u8, .mpd)", placeholder: "напр. cdn.example.com", add: "Добавить", empty: "Нет доменов" },
    origin: { hint: "Подмена Origin и Referer для запросов к домену", domain: "Домен", originPlaceholder: "Origin", refererPlaceholder: "Referer", add: "Добавить", empty: "Нет подмен", originLabel: "O:", refererLabel: "R:" },
    headers: { hint: "Добавление кастомных заголовков в запросы", name: "Имя", value: "Значение", filter: "URL (*)", add: "Добавить", empty: "Нет заголовков", filterLabel: "фильтр:" },
    legal: { title: "Юридическая информация", p1: "Утилита для разработки и внутреннего тестирования в контролируемых средах.", p2: "Запрещено использовать для обхода средств контроля доступа, нарушения политик безопасности или условий использования.", p3: "Предоставляется \u00ab\u043a\u0430\u043a \u0435\u0441\u0442\u044c\u00bb, без каких-либо гарантий." },
    status: { loading: "Загрузка...", ready: "Готово", saved: "Сохранено", err: "Нет связи", active: "активен", inactive: "неактивен" }
  }
}

function t(k) { var v = I[L], ks = k.split("."); for (var i = 0; i < ks.length; i++) { if (!v) return k; v = v[ks[i]]; } return v || k }
function esc(s) { var d = document.createElement("div"); d.textContent = s; return d.innerHTML }

var config = { corsDomains: [], originOverrides: {}, refererOverrides: {}, customHeaders: [], trustedDomains: [] }

function applyI18n() {
  document.querySelectorAll("[data-i18n]").forEach(function(el) { el.textContent = t(el.dataset.i18n) })
  document.querySelectorAll("[data-i18n-placeholder]").forEach(function(el) { el.placeholder = t(el.dataset.i18nPlaceholder) })
}

async function load() {
  try { config = await chrome.runtime.sendMessage({ action: "getConfig" }); setStatus(t("status.ready")) }
  catch (e) { setStatus(t("status.err")); console.error(e); return }
  renderAll(); checkDomain()
}

async function save() {
  try { var r = await chrome.runtime.sendMessage({ action: "saveConfig", config: config }); if (!r.ok) throw new Error(r.error); setStatus(t("status.saved")) }
  catch (e) { setStatus(e.message || "Err") }
}

function setStatus(txt) { $("save-status").textContent = txt }

async function checkDomain() {
  var host = ""
  try { var tabs = await chrome.tabs.query({ active: true, currentWindow: true }); if (tabs[0]?.url) { try { host = new URL(tabs[0].url).hostname } catch {} } } catch {}
  var tr = host && config.trustedDomains.some(function(d) { if (d.startsWith("*.")) { var b = d.slice(2); return host === b || host.endsWith("." + b) } return host === d || host.endsWith("." + d) })
  var dot = $("status-dot"), txt = $("status-text")
  if (tr) { dot.className = "status-dot active"; txt.className = "status-text active"; txt.textContent = t("status.active") }
  else { dot.className = "status-dot"; txt.className = "status-text"; txt.textContent = t("status.inactive") }
  $("domain-count").textContent = config.trustedDomains.length + " trusted"
}

// Dev panel toggle

$("dev-link").addEventListener("click", function(e) { e.preventDefault(); $("dev-panel").style.display = "block"; document.body.style.width = "400px" })
$("btn-close").addEventListener("click", function() { $("dev-panel").style.display = "none"; document.body.style.width = "220px" })

// Tabs

document.querySelectorAll(".tab").forEach(function(b) {
  b.addEventListener("click", function() {
    document.querySelectorAll(".tab").forEach(function(x) { x.classList.remove("active") })
    document.querySelectorAll(".tab-content").forEach(function(x) { x.classList.remove("active") })
    b.classList.add("active"); $("tab-" + b.dataset.tab).classList.add("active")
  })
})

// CORS

function renderCors() {
  var list = $("cors-list")
  if (!config.corsDomains.length) { list.innerHTML = '<div class="empty">' + t("cors.empty") + '</div>'; return }
  list.innerHTML = config.corsDomains.map(function(d, i) { return '<div class="item"><span class="item-text" title="' + esc(d) + '">' + esc(d) + '</span><button class="btn-remove" data-action="removeCors" data-index="' + i + '">&times;</button></div>' }).join("")
}

$("cors-input").addEventListener("keydown", function(e) { if (e.key === "Enter") $("cors-add").click() })
$("cors-add").addEventListener("click", function() { var v = $("cors-input").value.trim(); if (!v || config.corsDomains.includes(v)) return; config.corsDomains.push(v); $("cors-input").value = ""; save().then(renderCors) })
$("cors-list").addEventListener("click", function(e) { if (!e.target.classList.contains("btn-remove")) return; config.corsDomains.splice(parseInt(e.target.dataset.index), 1); save().then(renderCors) })

// Origin / Referer

function renderOrigin() {
  var list = $("origin-list"), keys = Object.keys(config.originOverrides).concat(Object.keys(config.refererOverrides)), doms = new Set(keys)
  if (!doms.size) { list.innerHTML = '<div class="empty">' + t("origin.empty") + '</div>'; return }
  list.innerHTML = Array.from(doms).map(function(d) {
    var h = '<div class="item" style="flex-wrap:wrap"><span class="item-text" style="flex-basis:100%;font-weight:500;margin-bottom:1px" title="' + esc(d) + '">' + esc(d) + '</span>'
    if (config.originOverrides[d]) h += '<span class="item-meta">' + t("origin.originLabel") + ' ' + esc(config.originOverrides[d]) + '</span>'
    if (config.refererOverrides[d]) h += '<span class="item-meta">' + t("origin.refererLabel") + ' ' + esc(config.refererOverrides[d]) + '</span>'
    h += '<button class="btn-remove" data-action="removeOverride" data-domain="' + esc(d) + '">&times;</button></div>'
    return h
  }).join("")
}

$("or-add").addEventListener("click", function() { var d = $("or-domain").value.trim(), o = $("or-origin").value.trim(), r = $("or-referer").value.trim(); if (!d || (!o && !r)) return; if (o) config.originOverrides[d] = o; if (r) config.refererOverrides[d] = r; $("or-domain").value = $("or-origin").value = $("or-referer").value = ""; save().then(renderOrigin) })
$("origin-list").addEventListener("click", function(e) { if (!e.target.classList.contains("btn-remove")) return; var d = e.target.dataset.domain; delete config.originOverrides[d]; delete config.refererOverrides[d]; save().then(renderOrigin) })

// Headers

function renderHeaders() {
  var list = $("headers-list")
  if (!config.customHeaders.length) { list.innerHTML = '<div class="empty">' + t("headers.empty") + '</div>'; return }
  list.innerHTML = config.customHeaders.map(function(h, i) { return '<div class="item" style="flex-wrap:wrap"><span class="item-text" style="flex-basis:100%;font-weight:500;margin-bottom:1px">' + esc(h.name) + ': ' + esc(h.value) + '</span><span class="item-meta">' + t("headers.filterLabel") + ' ' + esc(h.urlFilter || "*") + '</span><button class="btn-remove" data-action="removeHeader" data-index="' + i + '">&times;</button></div>' }).join("")
}

$("hdr-add").addEventListener("click", function() { var n = $("hdr-name").value.trim(), v = $("hdr-value").value.trim(), f = $("hdr-filter").value.trim(); if (!n || !v) return; config.customHeaders.push({ name: n, value: v, urlFilter: f || "*" }); $("hdr-name").value = $("hdr-value").value = $("hdr-filter").value = ""; save().then(renderHeaders) })
$("headers-list").addEventListener("click", function(e) { if (!e.target.classList.contains("btn-remove")) return; config.customHeaders.splice(parseInt(e.target.dataset.index), 1); save().then(renderHeaders) })

function renderAll() { renderCors(); renderOrigin(); renderHeaders() }

applyI18n(); load()
