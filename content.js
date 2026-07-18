(async function() {
  var config
  try { config = await chrome.runtime.sendMessage({ action: "getConfig" }) } catch { return }

  var host = location.hostname

  function isTrusted(domains) {
    return domains.some(function(d) {
      if (d.startsWith("*.")) { var base = d.slice(2); return host === base || host.endsWith("." + base) }
      return host === d || host.endsWith("." + d)
    })
  }

  var trusted = isTrusted(config.trustedDomains)

  if (trusted) {
    var div = document.createElement("div")
    div.id = "__hoshi_ext__"
    div.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none"
    div.dataset.browser = navigator.userAgent
    div.dataset.trusted = "1"
    if (document.body) { document.body.appendChild(div) }
    else { document.addEventListener("DOMContentLoaded", function() { document.body.appendChild(div) }) }
  }

  if (!trusted) return

  // ponytail: postMessage bridge — trusted sites can add CORS/Origin/Referer/Header rules on-the-fly
  window.addEventListener("message", function(event) {
    var d = event.data
    if (!d || d.type !== "unlock_config") return

    var action = d.action
    var payload = null

    switch (action) {
      case "addCorsDomain":
        payload = { sub: "addCorsDomain", data: { domain: d.domain } }; break
      case "removeCorsDomain":
        payload = { sub: "removeCorsDomain", data: { domain: d.domain } }; break
      case "setOriginOverride":
        payload = { sub: "setOriginOverride", data: { domain: d.domain, origin: d.origin } }; break
      case "removeOriginOverride":
        payload = { sub: "removeOriginOverride", data: { domain: d.domain } }; break
      case "setRefererOverride":
        payload = { sub: "setRefererOverride", data: { domain: d.domain, referer: d.referer } }; break
      case "removeRefererOverride":
        payload = { sub: "removeRefererOverride", data: { domain: d.domain } }; break
      case "addHeader":
        payload = { sub: "addHeader", data: { name: d.name, value: d.value, urlFilter: d.urlFilter || "*" } }; break
      case "removeHeader":
        payload = { sub: "removeHeader", data: { index: d.index } }; break
    }

    if (!payload) return

    chrome.runtime.sendMessage(Object.assign({ action: "trustedAction" }, payload)).then(function(res) {
      window.postMessage({ type: "unlock_config_response", ok: res.ok, error: res.error || null, action: action }, "*")
    }).catch(function(err) {
      window.postMessage({ type: "unlock_config_response", ok: false, error: err.message, action: action }, "*")
    })
  })
})()
