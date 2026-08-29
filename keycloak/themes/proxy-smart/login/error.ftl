<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=false; section>
    <#if section = "header">
        ${kcSanitize(msg("errorTitle"))?no_esc}
    <#elseif section = "form">
        <div id="kc-error-message">
            <p class="instruction">${kcSanitize(message.summary)?no_esc}</p>
            <#if traceId??>
                <p class="instruction" id="traceId">${msg("traceIdSupportMessage", traceId)}</p>
            </#if>
            <#if skipLink??>
            <#else>
                <#-- The fallback used to be href="/". On this host that is Keycloak's own root,
                     which the load balancer serves 403 for — it only exposes /realms/* — so the
                     one link on the error page was a dead end. PROXY_PUBLIC_URL is the app
                     origin, reaching a static theme the same way brand-accent.js gets it. With
                     it unset Keycloak emits the placeholder verbatim, so require an absolute
                     http(s) URL and render no link at all rather than another dead one. -->
                <#assign appHome = properties.backToApplicationUrl!"">
                <#if client?? && client.baseUrl?has_content>
                    <p><a id="backToApplication" href="${client.baseUrl}">${msg("backToApplication")}</a></p>
                <#elseif appHome?starts_with("http")>
                    <p><a id="backToApplication" href="${appHome}">${msg("backToApplication")}</a></p>
                </#if>
            </#if>
        </div>
    </#if>
</@layout.registrationLayout>
