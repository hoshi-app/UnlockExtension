const ID_CORS = 1
const ID_ORIGIN = 1000
const ID_REFERER = 2000
const ID_HEADERS = 3000

const pendingRequests = new Map()

const DEFAULT = {
  corsDomains: [],
  originOverrides: {},
  refererOverrides: {},
  customHeaders: [],
  trustedSites: [],
  detectionEnabled: true
}

const ALL_RESOURCES = [
  "main_frame", "sub_frame", "stylesheet", "script", "image", "font",
  "object", "xmlhttprequest", "ping", "csp_report", "media", "websocket",
  "webtransport", "webbundle", "other"
]

function cleanDomain(d) {
  return d.replace(/^https?:\/\//, "").split("/")[0]
}

// ponytail: exact domain match via urlFilter; regexFilter if wildcards needed later
function buildCondition(domain) {
  return { urlFilter: `||${cleanDomain(domain)}/`, resourceTypes: ALL_RESOURCES }
}

// ponytail: shared trusted-site matcher — supports *.domain wildcard
function matchesTrusted(host, sites) {
  return sites.some(s => {
    if (!s.enabled) return false
    const d = s.domain
    if (d.startsWith("*.")) {
      const base = d.slice(2)
      return host === base || host.endsWith("." + base)
    }
    return host === d || host.endsWith("." + d)
  })
}

function buildRules(config) {
  const rules = []
  let id = ID_CORS

  for (const domain of config.corsDomains) {
    if (!domain.trim()) continue
    rules.push({
      id: id++,
      priority: 1,
      action: {
        type: "modifyHeaders",
        responseHeaders: [
          { header: "access-control-allow-origin", operation: "set", value: "*" },
          { header: "access-control-allow-methods", operation: "set", value: "GET, POST, PUT, DELETE, PATCH, OPTIONS" },
          { header: "access-control-allow-headers", operation: "set", value: "*" },
          { header: "access-control-expose-headers", operation: "set", value: "*" }
        ]
      },
      condition: buildCondition(domain)
    })
  }

  id = ID_ORIGIN
  for (const [domain, origin] of Object.entries(config.originOverrides)) {
    if (!domain.trim() || !origin.trim()) continue
    rules.push({
      id: id++,
      priority: 1,
      action: {
        type: "modifyHeaders",
        requestHeaders: [{ header: "origin", operation: "set", value: origin }]
      },
      condition: buildCondition(domain)
    })
  }

  id = ID_REFERER
  for (const [domain, referer] of Object.entries(config.refererOverrides)) {
    if (!domain.trim() || !referer.trim()) continue
    rules.push({
      id: id++,
      priority: 1,
      action: {
        type: "modifyHeaders",
        requestHeaders: [{ header: "referer", operation: "set", value: referer }]
      },
      condition: buildCondition(domain)
    })
  }

  id = ID_HEADERS
  for (const h of config.customHeaders) {
    if (!h.name.trim() || !h.value.trim()) continue
    rules.push({
      id: id++,
      priority: 1,
      action: {
        type: "modifyHeaders",
        requestHeaders: [{ header: h.name.toLowerCase(), operation: "set", value: h.value }]
      },
      condition: {
        urlFilter: h.urlFilter || "*",
        resourceTypes: ALL_RESOURCES
      }
    })
  }

  return rules
}

async function syncRules(config) {
  const old = await chrome.declarativeNetRequest.getDynamicRules()
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: old.map(r => r.id),
    addRules: buildRules(config)
  })
}

async function getConfig() {
  const data = await chrome.storage.sync.get(DEFAULT)
  const config = { ...DEFAULT, ...data }
  // ponytail: migrate old trustedSites string[] to {domain,enabled}[]
  if (config.trustedSites.length > 0 && typeof config.trustedSites[0] === "string") {
    config.trustedSites = config.trustedSites.map(d => ({ domain: d, enabled: true }))
    chrome.storage.sync.set({ trustedSites: config.trustedSites })
  }
  return config
}

chrome.runtime.onInstalled.addListener(async () => {
  await syncRules(await getConfig())
})

// ponytail: re-sync on worker restart — covers config changes while worker was asleep
getConfig().then(syncRules)

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "getConfig") {
    getConfig().then(sendResponse)
    return true
  }

  if (msg.action === "saveConfig") {
    (async () => {
      await chrome.storage.sync.set(msg.config)
      await syncRules(msg.config)
      sendResponse({ ok: true })
    })()
    return true
  }

  if (msg.action === "trustedAction") {
    (async () => {
      const config = await getConfig()
      const origin = new URL(sender.url).hostname
      if (!matchesTrusted(origin, config.trustedSites)) {
        sendResponse({ ok: false, error: "untrusted origin" })
        return
      }

      let modified = { ...config }
      switch (msg.sub) {
        case "addCorsDomain":
          if (!modified.corsDomains.includes(msg.data.domain))
            modified.corsDomains.push(msg.data.domain)
          break
        case "removeCorsDomain":
          modified.corsDomains = modified.corsDomains.filter(d => d !== msg.data.domain)
          break
        case "setOriginOverride":
          modified.originOverrides[msg.data.domain] = msg.data.origin
          break
        case "removeOriginOverride":
          delete modified.originOverrides[msg.data.domain]
          break
        case "setRefererOverride":
          modified.refererOverrides[msg.data.domain] = msg.data.referer
          break
        case "removeRefererOverride":
          delete modified.refererOverrides[msg.data.domain]
          break
        case "addHeader":
          modified.customHeaders.push({
            name: msg.data.name,
            value: msg.data.value,
            urlFilter: msg.data.urlFilter || "*"
          })
          break
        case "removeHeader":
          modified.customHeaders = modified.customHeaders.filter((_, i) => i !== msg.data.index)
          break
        default:
          sendResponse({ ok: false, error: "unknown action" })
          return
      }

      await chrome.storage.sync.set(modified)
      await syncRules(modified)
      sendResponse({ ok: true })
    })()
    return true
  }

  if (msg.action === "requestTrustedSite") {
    (async () => {
      const config = await getConfig()
      if (!config.detectionEnabled) {
        sendResponse({ ok: false, error: "detection disabled" })
        return
      }
      let domain
      try { domain = new URL(sender.url).hostname } catch { /* file:// etc. */ }
      if (!domain) {
        sendResponse({ ok: false, error: "cannot determine domain (file:// not supported)" })
        return
      }
      if (config.trustedSites.some(s => s.domain === domain)) {
        sendResponse({ ok: true, already: true })
        return
      }

      const requestId = crypto.randomUUID()
      pendingRequests.set(requestId, { tabId: sender.tab.id, domain })

      const popupW = 420
      const popupH = 360

      try {
        const win = await chrome.windows.getLastFocused()
        const left = Math.round((win.left || 0) + ((win.width || 800) - popupW) / 2)
        const top = Math.round((win.top || 0) + ((win.height || 600) - popupH) / 2)
        chrome.windows.create({
          type: "popup",
          url: `confirm.html?requestId=${requestId}&domain=${encodeURIComponent(domain)}`,
          width: popupW,
          height: popupH,
          left: Math.max(0, left),
          top: Math.max(0, top),
          focused: true
        })
      } catch {
        chrome.windows.create({
          type: "popup",
          url: `confirm.html?requestId=${requestId}&domain=${encodeURIComponent(domain)}`,
          width: popupW,
          height: popupH,
          focused: true
        })
      }

      sendResponse({ ok: false, pending: true, requestId })
    })()
    return true
  }

  if (msg.action === "confirmResult") {
    (async () => {
      const pending = pendingRequests.get(msg.requestId)
      if (!pending) {
        sendResponse({ ok: false, error: "request expired" })
        return
      }
      pendingRequests.delete(msg.requestId)

      if (!msg.accepted) {
        chrome.tabs.sendMessage(pending.tabId, {
          type: "unlock_trusted_result",
          ok: false,
          error: "user rejected"
        }).catch(() => { /* tab may be closed */ })
        sendResponse({ ok: true })
        return
      }

      const config = await getConfig()
      config.trustedSites.push({ domain: pending.domain, enabled: true })
      await chrome.storage.sync.set(config)
      await syncRules(config)

      chrome.tabs.sendMessage(pending.tabId, {
        type: "unlock_trusted_result",
        ok: true,
        domain: pending.domain
      }).catch(() => {})

      sendResponse({ ok: true })
    })()
    return true
  }
})
