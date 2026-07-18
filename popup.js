var $ = function(id) { return document.getElementById(id) }

async function init() {
  var host = ""
  try {
    var tabs = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tabs[0]?.url) { try { host = new URL(tabs[0].url).hostname } catch {} }
  } catch {}

  var config
  try { config = await chrome.runtime.sendMessage({ action: "getConfig" }) }
  catch { config = { trustedDomains: [] } }

  var trusted = host && config.trustedDomains.some(function(d) {
    if (d.startsWith("*.")) { var base = d.slice(2); return host === base || host.endsWith("." + base) }
    return host === d || host.endsWith("." + d)
  })

  var dot = $("status-dot"), txt = $("status-text")
  if (trusted) {
    dot.className = "status-dot active"; txt.className = "status-text active"; txt.textContent = "active"
  } else {
    dot.className = "status-dot"; txt.className = "status-text"; txt.textContent = "inactive"
  }

  $("domain-count").textContent = config.trustedDomains.length + " trusted"
}

init()
