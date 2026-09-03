<#import "template.ftl" as layout>
<@layout.registrationLayout; section>
    <#if section = "header">
        ${msg("pageExpiredTitle")}
    <#elseif section = "form">
        <#--
            The base template renders both actions as the word "Click here", so the
            two links are indistinguishable at a glance even though they do very
            different things — one resumes the login in progress, the other throws it
            away and starts over. Label each link with its own verb instead, and put
            continuing first because that is what someone who just hit the back button
            actually wants.

            doContinue and restartLoginTooltip are existing Keycloak message keys, so
            both labels stay translated in every locale the realm offers. A theme
            messages file would only have covered English.
        -->
        <p id="instruction-continue" class="instruction">
            ${msg("pageExpiredMsg2")}:
            <a id="loginContinueLink" href="${url.loginAction}">${msg("doContinue")}</a>
        </p>
        <p id="instruction-restart" class="instruction">
            ${msg("pageExpiredMsg1")}:
            <a id="loginRestartLink" href="${url.loginRestartFlowUrl}">${msg("restartLoginTooltip")}</a>
        </p>
    </#if>
</@layout.registrationLayout>
