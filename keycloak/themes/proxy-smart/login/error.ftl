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
                <#if client?? && client.baseUrl?has_content>
                    <p><a id="backToApplication" href="${client.baseUrl}">${msg("backToApplication")}</a></p>
                <#else>
                    <#-- When the auth session cookie is expired, KC doesn't know the client.
                         Redirect to the origin root which always hits the proxy/app. -->
                    <p><a id="backToApplication" href="/">&laquo; Back to application</a></p>
                </#if>
            </#if>
        </div>
    </#if>
</@layout.registrationLayout>
