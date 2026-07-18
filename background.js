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
})
