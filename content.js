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

  if (!isTrusted(config.trustedDomains)) return

  function inject() {
    if (!document.body) { document.addEventListener("DOMContentLoaded", inject); return }
    var div = document.createElement("div")
    div.id = "__hoshi_ext__"
    div.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none"
    div.dataset.browser = navigator.userAgent
    div.dataset.trusted = "1"
    document.body.appendChild(div)
  }

  inject()
})()
