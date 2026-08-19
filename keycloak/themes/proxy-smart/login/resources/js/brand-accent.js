/*
 * Per-organization accent for the login page.
 *
 * A Keycloak theme serves static files, so it cannot resolve which organization is
 * launching. The proxy can: this adds a <link> to /auth/login-brand.css?client_id=...,
 * which answers with `:root{--brand-accent: <colour>}` for that client's organization, and
 * everything built on --ps-accent in styles.css retints.
 *
 * Runs synchronously from <head> (the base template emits `properties.scripts` there
 * without defer) and appends a plain stylesheet <link>, so the browser blocks paint on it
 * the same way it does for the theme's own CSS. An async fetch would repaint the accent
 * after first paint, which reads as a flash of the wrong brand.
 *
 * `client_id` is a query parameter on the authorization URL and is carried through
 * /login-actions/* too, so secondary pages (a failed password, an OTP prompt) stay themed.
 *
 * Origin: the proxy is usually on a different host from Keycloak (auth.* vs api.*), so the
 * base URL arrives on this script's own src. theme.properties carries
 * `?base=${env.PROXY_PUBLIC_URL}`, which Keycloak substitutes when it renders the tag.
 *
 * With that variable unset Keycloak emits the placeholder verbatim rather than an empty
 * string, so `base` is only used when it parses as an absolute http(s) URL; anything else
 * falls back to same-origin, which is correct when one host fronts both. Failure is silent
 * on purpose: the theme default is a working colour, and no colour is worth a broken login
 * page.
 */
(function () {
  try {
    var clientId = new URLSearchParams(window.location.search).get("client_id")
    if (!clientId) return

    var base = ""
    var self = document.currentScript
    if (self && self.src) {
      var declared = new URL(self.src).searchParams.get("base") || ""
      if (/^https?:\/\//.test(declared)) base = declared.replace(/\/$/, "")
    }

    var link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = base + "/auth/login-brand.css?client_id=" + encodeURIComponent(clientId)
    document.head.appendChild(link)
  } catch (e) {
    /* leave the theme default in place */
  }
})()
