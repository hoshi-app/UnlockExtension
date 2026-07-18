const LANG = navigator.language.startsWith("ru") ? "ru" : "en"

const I18N = {
  en: {
    alertTitle: "Dangerous Action",
    alertText: "Granting trusted access allows this website to modify CORS bypass rules, header overrides, and custom headers. The trusted sites list cannot be changed via this API. Only proceed if you fully trust and control this website.",
    timer: "Accept available in {n}s",
    reject: "Reject",
    accept: "Accept",
    verified: "Verified by extension developers"
  },
  ru: {
    alertTitle: "Опасное действие",
    alertText: "Предоставление доверенного доступа позволит этому сайту изменять правила обхода CORS, подмену заголовков и кастомные заголовки. Список доверенных сайтов не может быть изменён через этот API. Продолжайте, только если вы полностью доверяете этому сайту и контролируете его.",
    timer: "Принять можно через {n}с",
    reject: "Отклонить",
    accept: "Принять",
    verified: "Подтверждено разработчиками расширения"
  }
}

function t(path) {
  const keys = path.split(".")
  let val = I18N[LANG]
  for (const k of keys) { if (!val) return path; val = val[k] }
  return val || path
}

document.querySelectorAll("[data-i18n]").forEach(el => {
  el.textContent = t(el.dataset.i18n)
})

const params = new URLSearchParams(location.search)
const requestId = params.get("requestId")
const domain = params.get("domain")

document.getElementById("domain").textContent = domain || "unknown"

// ponytail: green badge for *.hoshi.tv domains, danger warning stays
const d = (domain || "").replace(/^\*\./, "")
if (d === "hoshi.tv" || d.endsWith(".hoshi.tv")) {
  const v = document.getElementById("verified")
  v.textContent = t("verified")
  v.style.display = "inline-block"
}

const btnAccept = document.getElementById("accept")
const btnReject = document.getElementById("reject")
const timerEl = document.getElementById("timer")
let accepted = false

function answer(acceptedVal) {
  if (accepted) return
  accepted = true
  chrome.runtime.sendMessage({ action: "confirmResult", requestId, accepted: acceptedVal })
    .then(() => window.close())
    .catch(() => window.close())
}

btnReject.addEventListener("click", () => answer(false))

let sec = 5
btnAccept.textContent = `${t("accept")} (${sec})`
timerEl.textContent = t("timer").replace("{n}", sec)

const countdown = setInterval(() => {
  sec--
  if (sec <= 0) {
    clearInterval(countdown)
    btnAccept.textContent = t("accept")
    btnAccept.classList.add("ready")
    timerEl.textContent = ""
    btnAccept.addEventListener("click", () => answer(true))
  } else {
    btnAccept.textContent = `${t("accept")} (${sec})`
    timerEl.textContent = t("timer").replace("{n}", sec)
  }
}, 1000)

// ponytail: reject on window close
window.addEventListener("beforeunload", () => {
  if (!accepted) answer(false)
})
