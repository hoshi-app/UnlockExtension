const TRUSTED_DOMAINS = ["*.hoshi.tv", "localhost"]

const ID_CORS = 1, ID_ORIGIN = 1000, ID_REFERER = 2000, ID_HEADERS = 3000

const DEFAULT = {
  corsDomains: [],
  originOverrides: {},
  refererOverrides: {},
  customHeaders: []
}

const ALL_RESOURCES = [
  "main_frame", "sub_frame", "stylesheet", "script", "image", "font",
  "object", "xmlhttprequest", "ping", "csp_report", "media", "websocket",
  "webtransport", "webbundle", "other"
]

function cleanDomain(d) { return d.replace(/^https?:\/\//, "").split("/")[0] }
function buildCondition(domain) { return { urlFilter: "||" + cleanDomain(domain) + "/", resourceTypes: ALL_RESOURCES } }

function matchTrusted(host, domains) {
  return domains.some(function(d) {
    if (d.startsWith("*.")) { var base = d.slice(2); return host === base || host.endsWith("." + base) }
    return host === d || host.endsWith("." + d)
  })
}

function buildRules(config) {
  var rules = [], id = ID_CORS

  config.corsDomains.forEach(function(d) {
    if (!d.trim()) return
    rules.push({ id: id++, priority: 1, action: { type: "modifyHeaders", responseHeaders: [
      { header: "access-control-allow-origin", operation: "set", value: "*" },
      { header: "access-control-allow-methods", operation: "set", value: "GET, POST, PUT, DELETE, PATCH, OPTIONS" },
      { header: "access-control-allow-headers", operation: "set", value: "*" },
      { header: "access-control-expose-headers", operation: "set", value: "*" }
    ]}, condition: buildCondition(d) })
  })

  id = ID_ORIGIN
  Object.entries(config.originOverrides).forEach(function(e) {
    if (!e[0].trim() || !e[1].trim()) return
    rules.push({ id: id++, priority: 1, action: { type: "modifyHeaders", requestHeaders: [{ header: "origin", operation: "set", value: e[1] }] }, condition: buildCondition(e[0]) })
  })

  id = ID_REFERER
  Object.entries(config.refererOverrides).forEach(function(e) {
    if (!e[0].trim() || !e[1].trim()) return
    rules.push({ id: id++, priority: 1, action: { type: "modifyHeaders", requestHeaders: [{ header: "referer", operation: "set", value: e[1] }] }, condition: buildCondition(e[0]) })
  })

  id = ID_HEADERS
  config.customHeaders.forEach(function(h) {
    if (!h.name.trim() || !h.value.trim()) return
    rules.push({ id: id++, priority: 1, action: { type: "modifyHeaders", requestHeaders: [{ header: h.name.toLowerCase(), operation: "set", value: h.value }] }, condition: { urlFilter: h.urlFilter || "*", resourceTypes: ALL_RESOURCES } })
  })

  return rules
}

async function syncRules(config) {
  var old = await chrome.declarativeNetRequest.getDynamicRules()
  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: old.map(function(r) { return r.id }), addRules: buildRules(config) })
}

async function getConfig() {
  var data = await chrome.storage.sync.get(DEFAULT)
  var config = Object.assign({}, DEFAULT, data)
  config.trustedDomains = TRUSTED_DOMAINS
  return config
}

chrome.runtime.onInstalled.addListener(async function() { await syncRules(await getConfig()) })
getConfig().then(syncRules)

chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
  if (msg.action === "getConfig") { getConfig().then(sendResponse); return true }

  if (msg.action === "saveConfig") {
    (async function() { await chrome.storage.sync.set(msg.config); await syncRules(msg.config); sendResponse({ ok: true }) })()
    return true
  }

  if (msg.action === "trustedAction") {
    (async function() {
      var config = await getConfig()
      var origin
      try { origin = new URL(sender.url).hostname } catch {}
      if (!origin || !matchTrusted(origin, TRUSTED_DOMAINS)) {
        sendResponse({ ok: false, error: "untrusted origin" }); return
      }

      var m = Object.assign({}, config)
      switch (msg.sub) {
        case "addCorsDomain":
          if (!m.corsDomains.includes(msg.data.domain)) m.corsDomains.push(msg.data.domain); break
        case "removeCorsDomain":
          m.corsDomains = m.corsDomains.filter(function(d) { return d !== msg.data.domain }); break
        case "setOriginOverride":
          m.originOverrides[msg.data.domain] = msg.data.origin; break
        case "removeOriginOverride":
          delete m.originOverrides[msg.data.domain]; break
        case "setRefererOverride":
          m.refererOverrides[msg.data.domain] = msg.data.referer; break
        case "removeRefererOverride":
          delete m.refererOverrides[msg.data.domain]; break
        case "addHeader":
          m.customHeaders.push({ name: msg.data.name, value: msg.data.value, urlFilter: msg.data.urlFilter || "*" }); break
        case "removeHeader":
          m.customHeaders = m.customHeaders.filter(function(_, i) { return i !== msg.data.index }); break
        default:
          sendResponse({ ok: false, error: "unknown action" }); return
      }

      await chrome.storage.sync.set(m)
      await syncRules(m)
      sendResponse({ ok: true })
    })()
    return true
  }
})
