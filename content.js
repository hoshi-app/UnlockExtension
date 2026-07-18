(async () => {
  let config
  try {
    config = await chrome.runtime.sendMessage({ action: "getConfig" })
  } catch {
    return
  }

  const host = location.hostname

  // ponytail: supports *.domain wildcard
  function isTrusted(sites) {
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

  // ponytail: single div, hidden off-viewport
  function toggleBlock(show) {
    const el = document.getElementById("__unlock_ext__")
    if (show && !el) {
      const div = document.createElement("div")
      div.id = "__unlock_ext__"
      div.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none"
      div.dataset.browser = navigator.userAgent
      div.dataset.trusted = isTrusted(config.trustedSites) ? "1" : "0"
      document.body.appendChild(div)
    } else if (!show && el) {
      el.remove()
    }
  }

  if (document.body) {
    toggleBlock(config.detectionEnabled)
  } else {
    document.addEventListener("DOMContentLoaded", () => toggleBlock(config.detectionEnabled))
  }

  chrome.storage.onChanged.addListener(changes => {
    if (changes.detectionEnabled) {
      toggleBlock(changes.detectionEnabled.newValue)
    }
    if (changes.trustedSites) {
      const el = document.getElementById("__unlock_ext__")
      if (el) {
        el.dataset.trusted = isTrusted(changes.trustedSites.newValue) ? "1" : "0"
      }
    }
  })

  // ponytail: listen for async confirm results from background
  chrome.runtime.onMessage.addListener(msg => {
    if (msg.type === "unlock_trusted_result") {
      if (msg.ok) {
        const el = document.getElementById("__unlock_ext__")
        if (el) el.dataset.trusted = "1"
      }
      window.postMessage({
        type: "unlock_config_response",
        ok: msg.ok,
        error: msg.error || null,
        action: "requestTrustedSite"
      }, "*")
    }
  })

  // ponytail: always bridge postMessage; background validates origin
  window.addEventListener("message", event => {
    const d = event.data
    if (!d || d.type !== "unlock_config") return

    const { action, domain, origin, referer, name, value, urlFilter, index } = d

    if (action === "requestTrustedSite") {
      chrome.runtime.sendMessage({ action: "requestTrustedSite" })
        .then(res => {
          if (res.ok && !res.pending) {
            const el = document.getElementById("__unlock_ext__")
            if (el) el.dataset.trusted = "1"
          }
          window.postMessage({
            type: "unlock_config_response",
            ok: res.ok || false,
            pending: res.pending || false,
            already: res.already || false,
            error: res.error || null,
            action
          }, "*")
        })
        .catch(err => {
          window.postMessage({
            type: "unlock_config_response",
            ok: false,
            error: err.message,
            action
          }, "*")
        })
      return
    }

    const subMap = {
      addCorsDomain:        { sub: "addCorsDomain",        data: { domain } },
      removeCorsDomain:     { sub: "removeCorsDomain",     data: { domain } },
      setOriginOverride:    { sub: "setOriginOverride",    data: { domain, origin } },
      removeOriginOverride: { sub: "removeOriginOverride", data: { domain } },
      setRefererOverride:   { sub: "setRefererOverride",   data: { domain, referer } },
      removeRefererOverride:{ sub: "removeRefererOverride",data: { domain } },
      addHeader:            { sub: "addHeader",            data: { name, value, urlFilter: urlFilter || "*" } },
      removeHeader:         { sub: "removeHeader",         data: { index } }
    }

    const payload = subMap[action]
    if (!payload) return

    chrome.runtime.sendMessage({ action: "trustedAction", ...payload })
      .then(res => {
        window.postMessage({
          type: "unlock_config_response",
          ok: res.ok,
          error: res.error || null,
          action
        }, "*")
      })
      .catch(err => {
        window.postMessage({
          type: "unlock_config_response",
          ok: false,
          error: err.message,
          action
        }, "*")
      })
  })
})()
