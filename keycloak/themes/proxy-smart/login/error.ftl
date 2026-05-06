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
                </#if>
                <#-- Use loginRestartFlowUrl to start a fresh session instead of resuming the broken one.
                     Fall back to the realm root URL if loginRestartFlowUrl is unavailable. -->
                <#if url.loginRestartFlowUrl??>
                    <p><a id="backToLogin" href="${url.loginRestartFlowUrl}">&laquo; Back to login</a></p>
                <#else>
                    <p><a id="backToLogin" href="/auth/realms/${realm.name}/account">&laquo; Back to login</a></p>
                </#if>
            </#if>
        </div>
    </#if>
</@layout.registrationLayout>
