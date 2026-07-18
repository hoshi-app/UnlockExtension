const $ = id => document.getElementById(id)

const LANG = navigator.language.startsWith("ru") ? "ru" : "en"

const I18N = {
  en: {
    tabs: { cors: "CORS", origin: "Origin/Ref", headers: "Headers", trusted: "Trusted", legal: "Legal" },
    cors: {
      hint: "Response headers added to bypass CORS (covers HLS/DASH .ts, .m3u8, .mpd)",
      placeholder: "e.g. cdn.example.com",
      add: "Add",
      empty: "No domains. Add one above."
    },
    origin: {
      hint: "Override Origin and Referer request headers per domain",
      domain: "Domain",
      originPlaceholder: "Origin (e.g. https://example.com)",
      refererPlaceholder: "Referer (e.g. https://example.com)",
      add: "Add",
      empty: "No overrides. Add one above.",
      originLabel: "Origin:",
      refererLabel: "Referer:"
    },
    headers: {
      hint: "Inject custom headers into outgoing requests",
      name: "Header name",
      value: "Header value",
      filter: "URL filter (default: *)",
      add: "Add",
      empty: "No custom headers. Add one above.",
      filterLabel: "filter:"
    },
    trusted: {
      warning: "Do not add untrusted or unknown websites. Sites in this list can modify extension settings directly.",
      hint: "Sites allowed to modify config via postMessage API",
      placeholder: "e.g. localhost, myapp.com",
      add: "Add",
      empty: "No trusted sites.",
      detection: "Detection block",
      detectionHint: "Invisible DOM element, sites can detect extension",
      verified: "Developer trusts this domain"
    },
    legal: {
      title: "Legal Disclaimer",
      p1: "UnlockExtension is a development and internal testing utility designed solely for use in controlled, non-production environments. It is intended exclusively for software developers and quality assurance professionals who require the ability to inspect, modify, and debug HTTP request and response headers during the development lifecycle.",
      p2: "This extension must not be used to circumvent access controls, bypass security policies, or violate the terms of service of any website, service, or platform. Any such use is strictly prohibited and is the sole responsibility of the user. The authors and contributors of this software assume no liability for any misuse, damages, or legal consequences arising from its use.",
      p3: "By installing and using UnlockExtension, you acknowledge that you are doing so at your own risk and that you are solely responsible for ensuring compliance with all applicable laws, regulations, and contractual obligations. This software is provided \"as is,\" without warranty of any kind, express or implied."
    },
    status: { loading: "Loading...", ready: "Ready", saved: "Saved", error: "Cannot connect to background" }
  },
  ru: {
    tabs: { cors: "CORS", origin: "Origin/Ref", headers: "Заголовки", trusted: "Доверенные", legal: "Право" },
    cors: {
      hint: "Заголовки ответа для обхода CORS (покрывает HLS/DASH: .ts, .m3u8, .mpd)",
      placeholder: "напр. cdn.example.com",
      add: "Добавить",
      empty: "Нет доменов. Добавьте выше."
    },
    origin: {
      hint: "Подмена заголовков Origin и Referer для запросов к домену",
      domain: "Домен",
      originPlaceholder: "Origin (напр. https://example.com)",
      refererPlaceholder: "Referer (напр. https://example.com)",
      add: "Добавить",
      empty: "Нет подмен. Добавьте выше.",
      originLabel: "Origin:",
      refererLabel: "Referer:"
    },
    headers: {
      hint: "Добавление кастомных заголовков в исходящие запросы",
      name: "Заголовок",
      value: "Значение",
      filter: "URL фильтр (по умолч.: *)",
      add: "Добавить",
      empty: "Нет заголовков. Добавьте выше.",
      filterLabel: "фильтр:"
    },
    trusted: {
      warning: "Не добавляйте незнакомые или непроверенные сайты. Сайты из этого списка могут напрямую изменять настройки расширения.",
      hint: "Сайты, которым разрешено изменять конфигурацию через postMessage API",
      placeholder: "напр. localhost, myapp.com",
      add: "Добавить",
      empty: "Нет доверенных сайтов.",
      detection: "Блок детекции",
      detectionHint: "Невидимый DOM-элемент, сайты могут обнаружить расширение",
      verified: "Разработчик доверяет этому домену"
    },
    legal: {
      title: "Юридическая информация",
      p1: "UnlockExtension \u2014 это утилита для разработки и внутреннего тестирования, предназначенная исключительно для использования в контролируемых, непродуктовых средах. Она предназначена только для разработчиков программного обеспечения и специалистов по обеспечению качества, которым требуется возможность проверять, изменять и отлаживать HTTP-заголовки запросов и ответов в процессе разработки.",
      p2: "Данное расширение не должно использоваться для обхода средств контроля доступа, нарушения политик безопасности или условий использования какого-либо веб-сайта, сервиса или платформы. Любое такое использование строго запрещено и является исключительной ответственностью пользователя. Авторы и разработчики данного программного обеспечения не несут ответственности за любое неправомерное использование, ущерб или правовые последствия, возникающие в результате его использования.",
      p3: "Устанавливая и используя UnlockExtension, вы подтверждаете, что делаете это на свой страх и риск и что вы несёте полную ответственность за соблюдение всех применимых законов, нормативных актов и договорных обязательств. Данное программное обеспечение предоставляется \u00ab\u043a\u0430\u043a \u0435\u0441\u0442\u044c\u00bb, без каких-либо гарантий, явных или подразумеваемых."
    },
    status: { loading: "Загрузка...", ready: "Готово", saved: "Сохранено", error: "Нет связи с фоном" }
  }
}

function t(path) {
  const keys = path.split(".")
  let val = I18N[LANG]
  for (const k of keys) {
    if (!val) return path
    val = val[k]
  }
  return val || path
}

function applyI18n() {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    el.textContent = t(el.dataset.i18n)
  })
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder)
  })
}

// --- Config ---

let config = {
  corsDomains: [],
  originOverrides: {},
  refererOverrides: {},
  customHeaders: [],
  trustedSites: [],
  detectionEnabled: true
}

function esc(s) {
  const d = document.createElement("div")
  d.textContent = s
  return d.innerHTML
}

async function load() {
  try {
    config = await chrome.runtime.sendMessage({ action: "getConfig" })
    setStatus("ok", t("status.ready"))
  } catch (e) {
    setStatus("err", t("status.error"))
    console.error(e)
  }
  renderAll()
}

async function save() {
  try {
    const res = await chrome.runtime.sendMessage({ action: "saveConfig", config })
    if (!res.ok) throw new Error(res.error)
    setStatus("ok", t("status.saved"))
  } catch (e) {
    setStatus("err", e.message || "Save failed")
  }
}

function setStatus(type, text) {
  const dot = $("status").querySelector(".status-dot")
  const txt = $("status-text")
  dot.className = "status-dot" + (type === "err" ? " error" : "")
  txt.textContent = text
}

// --- Tabs ---

document.querySelectorAll(".tab").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"))
    document.querySelectorAll(".tab-content").forEach(s => s.classList.remove("active"))
    btn.classList.add("active")
    $(`tab-${btn.dataset.tab}`).classList.add("active")
  })
})

// --- CORS ---

function renderCors() {
  const list = $("cors-list")
  if (!config.corsDomains.length) {
    list.innerHTML = `<div class="empty">${t("cors.empty")}</div>`
    return
  }
  list.innerHTML = config.corsDomains.map((d, i) => `
    <div class="item">
      <span class="item-text" title="${esc(d)}">${esc(d)}</span>
      <button class="btn-remove" data-action="removeCors" data-index="${i}">&times;</button>
    </div>
  `).join("")
}

$("cors-input").addEventListener("keydown", e => { if (e.key === "Enter") $("cors-add").click() })

$("cors-add").addEventListener("click", () => {
  const v = $("cors-input").value.trim()
  if (!v) return
  if (config.corsDomains.includes(v)) return
  config.corsDomains.push(v)
  $("cors-input").value = ""
  save().then(renderCors)
})

$("cors-list").addEventListener("click", e => {
  if (!e.target.classList.contains("btn-remove")) return
  config.corsDomains.splice(parseInt(e.target.dataset.index), 1)
  save().then(renderCors)
})

// --- Origin / Referer ---

function renderOrigin() {
  const list = $("origin-list")
  const domains = new Set([
    ...Object.keys(config.originOverrides),
    ...Object.keys(config.refererOverrides)
  ])
  if (!domains.size) {
    list.innerHTML = `<div class="empty">${t("origin.empty")}</div>`
    return
  }
  list.innerHTML = [...domains].map(d => `
    <div class="item" style="flex-wrap:wrap">
      <span class="item-text" style="flex-basis:100%;font-weight:500;margin-bottom:2px" title="${esc(d)}">${esc(d)}</span>
      ${config.originOverrides[d] ? `<span class="item-meta">${t("origin.originLabel")} ${esc(config.originOverrides[d])}</span>` : ""}
      ${config.refererOverrides[d] ? `<span class="item-meta">${t("origin.refererLabel")} ${esc(config.refererOverrides[d])}</span>` : ""}
      <button class="btn-remove" data-action="removeOverride" data-domain="${esc(d)}">&times;</button>
    </div>
  `).join("")
}

$("or-add").addEventListener("click", () => {
  const domain = $("or-domain").value.trim()
  const origin = $("or-origin").value.trim()
  const referer = $("or-referer").value.trim()
  if (!domain) return
  if (!origin && !referer) return
  if (origin) config.originOverrides[domain] = origin
  if (referer) config.refererOverrides[domain] = referer
  $("or-domain").value = ""
  $("or-origin").value = ""
  $("or-referer").value = ""
  save().then(renderOrigin)
})

$("origin-list").addEventListener("click", e => {
  if (!e.target.classList.contains("btn-remove")) return
  const d = e.target.dataset.domain
  delete config.originOverrides[d]
  delete config.refererOverrides[d]
  save().then(renderOrigin)
})

// --- Headers ---

function renderHeaders() {
  const list = $("headers-list")
  if (!config.customHeaders.length) {
    list.innerHTML = `<div class="empty">${t("headers.empty")}</div>`
    return
  }
  list.innerHTML = config.customHeaders.map((h, i) => `
    <div class="item" style="flex-wrap:wrap">
      <span class="item-text" style="flex-basis:100%;font-weight:500;margin-bottom:2px">${esc(h.name)}: ${esc(h.value)}</span>
      <span class="item-meta">${t("headers.filterLabel")} ${esc(h.urlFilter || "*")}</span>
      <button class="btn-remove" data-action="removeHeader" data-index="${i}">&times;</button>
    </div>
  `).join("")
}

$("hdr-add").addEventListener("click", () => {
  const name = $("hdr-name").value.trim()
  const value = $("hdr-value").value.trim()
  const filter = $("hdr-filter").value.trim()
  if (!name || !value) return
  config.customHeaders.push({ name, value, urlFilter: filter || "*" })
  $("hdr-name").value = ""
  $("hdr-value").value = ""
  $("hdr-filter").value = ""
  save().then(renderHeaders)
})

$("headers-list").addEventListener("click", e => {
  if (!e.target.classList.contains("btn-remove")) return
  config.customHeaders.splice(parseInt(e.target.dataset.index), 1)
  save().then(renderHeaders)
})

// --- Trusted ---

function isHoshiTv(domain) {
  const d = domain.startsWith("*.") ? domain.slice(2) : domain
  return d === "hoshi.tv" || d.endsWith(".hoshi.tv")
}

function renderTrusted() {
  const list = $("trusted-list")
  if (!config.trustedSites.length) {
    list.innerHTML = `<div class="empty">${t("trusted.empty")}</div>`
    return
  }
  list.innerHTML = config.trustedSites.map((s, i) => {
    const verified = isHoshiTv(s.domain)
    return `
    <div class="item">
      <span class="item-text" title="${esc(s.domain)}">${esc(s.domain)}</span>
      ${verified ? `<span class="verified-badge" title="${t("trusted.verified")}"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></span>` : ""}
      <label class="toggle-switch toggle-sm">
        <input type="checkbox" data-action="toggleTrusted" data-index="${i}" ${s.enabled ? "checked" : ""}>
        <span class="toggle-track"></span>
      </label>
      <button class="btn-remove" data-action="removeTrusted" data-index="${i}">&times;</button>
    </div>`
  }).join("")
}

$("detection-toggle").addEventListener("change", () => {
  config.detectionEnabled = $("detection-toggle").checked
  save()
})

$("trust-input").addEventListener("keydown", e => { if (e.key === "Enter") $("trust-add").click() })

$("trust-add").addEventListener("click", () => {
  const v = $("trust-input").value.trim()
  if (!v) return
  if (config.trustedSites.some(s => s.domain === v)) return
  config.trustedSites.push({ domain: v, enabled: true })
  $("trust-input").value = ""
  save().then(renderTrusted)
})

$("trusted-list").addEventListener("click", e => {
  if (!e.target.classList.contains("btn-remove")) return
  config.trustedSites.splice(parseInt(e.target.dataset.index), 1)
  save().then(renderTrusted)
})

$("trusted-list").addEventListener("change", e => {
  if (e.target.dataset.action !== "toggleTrusted") return
  const i = parseInt(e.target.dataset.index)
  config.trustedSites[i].enabled = e.target.checked
  save()
})

// --- Render all ---

function renderAll() {
  $("detection-toggle").checked = config.detectionEnabled
  renderCors()
  renderOrigin()
  renderHeaders()
  renderTrusted()
}

// --- Init ---

applyI18n()
load()
