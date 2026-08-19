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
 * Origin: same-origin by default, which is the deployment where Caddy fronts Keycloak and
 * the proxy on one host. When they are on separate origins, pass the proxy's base URL in
 * theme.properties — `scripts=js/brand-accent.js?base=https://api.example.com` — and it is
 * read back off this script's own src below. Failure is silent on purpose: the theme
 * default is a working colour, and no colour is worth a broken login page.
 */
(function () {
  try {
    var clientId = new URLSearchParams(window.location.search).get("client_id")
    if (!clientId) return

    var base = ""
    var self = document.currentScript
    if (self && self.src) base = new URL(self.src).searchParams.get("base") || ""

    var link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = base + "/auth/login-brand.css?client_id=" + encodeURIComponent(clientId)
    document.head.appendChild(link)
  } catch (e) {
    /* leave the theme default in place */
  }
})()
