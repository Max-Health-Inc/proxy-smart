<?xml version="1.0" encoding="UTF-8"?>
<sch:schema xmlns:sch="http://purl.oclc.org/dsdl/schematron" queryBinding="xslt2">
  <sch:ns prefix="f" uri="http://hl7.org/fhir"/>
  <sch:ns prefix="h" uri="http://www.w3.org/1999/xhtml"/>
  <!-- 
    This file contains just the constraints for the profile PASClaimBase
    It includes the base constraints for the resource as well.
    Because of the way that schematrons and containment work, 
    you may need to use this schematron fragment to build a, 
    single schematron that validates contained resources (if you have any) 
  -->
  <sch:pattern>
    <sch:title>f:Claim</sch:title>
    <sch:rule context="f:Claim">
      <sch:assert test="count(f:extension[@url = 'http://hl7.org/fhir/us/davinci-pas/StructureDefinition/extension-levelOfServiceCode']) &lt;= 1">extension with URL = 'http://hl7.org/fhir/us/davinci-pas/StructureDefinition/extension-levelOfServiceCode': maximum cardinality of 'extension' is 1</sch:assert>
      <sch:assert test="count(f:extension[@url = 'http://hl7.org/fhir/us/davinci-pas/StructureDefinition/extension-homeHealthCareInformation']) &lt;= 1">extension with URL = 'http://hl7.org/fhir/us/davinci-pas/StructureDefinition/extension-homeHealthCareInformation': maximum cardinality of 'extension' is 1</sch:assert>
      <sch:assert test="count(f:extension[@url = 'http://hl7.org/fhir/5.0/StructureDefinition/extension-Claim.encounter']) &lt;= 1">extension with URL = 'http://hl7.org/fhir/5.0/StructureDefinition/extension-Claim.encounter': maximum cardinality of 'extension' is 1</sch:assert>
      <sch:assert test="count(f:identifier) &gt;= 1">identifier: minimum cardinality of 'identifier' is 1</sch:assert>
    </sch:rule>
  </sch:pattern>
  <sch:pattern>
    <sch:title>f:Claim/f:extension</sch:title>
    <sch:rule context="f:Claim/f:extension">
      <sch:assert test="count(f:id) &lt;= 1">id: maximum cardinality of 'id' is 1</sch:assert>
      <sch:assert test="count(f:url) &gt;= 1">url: minimum cardinality of 'url' is 1</sch:assert>
      <sch:assert test="count(f:url) &lt;= 1">url: maximum cardinality of 'url' is 1</sch:assert>
      <sch:assert test="count(f:value[x]) &gt;= 1">value[x]: minimum cardinality of 'value[x]' is 1</sch:assert>
      <sch:assert test="count(f:value[x]) &lt;= 1">value[x]: maximum cardinality of 'value[x]' is 1</sch:assert>
    </sch:rule>
  </sch:pattern>
  <sch:pattern>
    <sch:title>f:Claim/f:careTeam</sch:title>
    <sch:rule context="f:Claim/f:careTeam">
      <sch:assert test="count(f:extension[@url = 'http://hl7.org/fhir/us/davinci-pas/StructureDefinition/extension-careTeamClaimScope']) &lt;= 1">extension with URL = 'http://hl7.org/fhir/us/davinci-pas/StructureDefinition/extension-careTeamClaimScope': maximum cardinality of 'extension' is 1</sch:assert>
      <sch:assert test="count(f:extension[@url = 'http://hl7.org/fhir/us/davinci-pas/StructureDefinition/extension-careTeamClaimScope']) &lt;= 1">extension with URL = 'http://hl7.org/fhir/us/davinci-pas/StructureDefinition/extension-careTeamClaimScope': maximum cardinality of 'extension' is 1</sch:assert>
      <sch:assert test="count(f:extension[@url = 'http://hl7.org/fhir/us/davinci-pas/StructureDefinition/extension-careTeamClaimScope']) &lt;= 1">extension with URL = 'http://hl7.org/fhir/us/davinci-pas/StructureDefinition/extension-careTeamClaimScope': maximum cardinality of 'extension' is 1</sch:assert>
    </sch:rule>
  </sch:pattern>
  <sch:pattern>
    <sch:title>f:Claim/f:supportingInfo</sch:title>
    <sch:rule context="f:Claim/f:supportingInfo">
      <sch:assert test="count(f:value[x]) &lt;= 0">value[x]: maximum cardinality of 'value[x]' is 0</sch:assert>
      <sch:assert test="count(f:value[x]) &lt;= 0">value[x]: maximum cardinality of 'value[x]' is 0</sch:assert>
      <sch:assert test="count(f:value[x]) &lt;= 0">value[x]: maximum cardinality of 'value[x]' is 0</sch:assert>
      <sch:assert test="count(f:timing[x]) &lt;= 0">timing[x]: maximum cardinality of 'timing[x]' is 0</sch:assert>
      <sch:assert test="count(f:value[x]) &gt;= 1">value[x]: minimum cardinality of 'value[x]' is 1</sch:assert>
      <sch:assert test="count(f:timing[x]) &lt;= 0">timing[x]: maximum cardinality of 'timing[x]' is 0</sch:assert>
      <sch:assert test="count(f:value[x]) &gt;= 1">value[x]: minimum cardinality of 'value[x]' is 1</sch:assert>
    </sch:rule>
  </sch:pattern>
  <sch:pattern>
    <sch:title>f:Claim/f:diagnosis</sch:title>
    <sch:rule context="f:Claim/f:diagnosis">
      <sch:assert test="count(f:extension[@url = 'http://hl7.org/fhir/us/davinci-pas/StructureDefinition/extension-diagnosisRecordedDate']) &lt;= 1">extension with URL = 'http://hl7.org/fhir/us/davinci-pas/StructureDefinition/extension-diagnosisRecordedDate': maximum cardinality of 'extension' is 1</sch:assert>
    </sch:rule>
  </sch:pattern>
  <sch:pattern>
    <sch:title>f:Claim/f:item</sch:title>
    <sch:rule context="f:Claim/f:item">
      <sch:assert test="count(f:extension[@url = 'http://hl7.org/fhir/us/davinci-pas/StructureDefinition/extension-authorizationNumber']) &lt;= 1">extension with URL = 'http://hl7.org/fhir/us/davinci-pas/StructureDefinition/extension-authorizationNumber': maximum cardinality of 'extension' is 1</sch:assert>
      <sch:assert test="count(f:extension[@url = 'http://hl7.org/fhir/us/davinci-pas/StructureDefinition/extension-administrationReferenceNumber']) &lt;= 1">extension with URL = 'http://hl7.org/fhir/us/davinci-pas/StructureDefinition/extension-administrationReferenceNumber': maximum cardinality of 'extension' is 1</sch:assert>
      <sch:assert test="count(f:extension[@url = 'http://hl7.org/fhir/us/davinci-pas/StructureDefinition/extension-serviceItemRequestType']) &lt;= 1">extension with URL = 'http://hl7.org/fhir/us/davinci-pas/StructureDefinition/extension-serviceItemRequestType': maximum cardinality of 'extension' is 1</sch:assert>
      <sch:assert test="count(f:extension[@url = 'http://hl7.org/fhir/us/davinci-pas/StructureDefinition/extension-certificationType']) &lt;= 1">extension with URL = 'http://hl7.org/fhir/us/davinci-pas/StructureDefinition/extension-certificationType': maximum cardinality of 'extension' is 1</sch:assert>
      <sch:assert test="count(f:extension[@url = 'http://hl7.org/fhir/us/davinci-pas/StructureDefinition/extension-productOrServiceCodeEnd']) &lt;= 1">extension with URL = 'http://hl7.org/fhir/us/davinci-pas/StructureDefinition/extension-productOrServiceCodeEnd': maximum cardinality of 'extension' is 1</sch:assert>
      <sch:assert test="count(f:extension[@url = 'http://hl7.org/fhir/us/davinci-pas/StructureDefinition/extension-epsdtIndicator']) &lt;= 1">extension with URL = 'http://hl7.org/fhir/us/davinci-pas/StructureDefinition/extension-epsdtIndicator': maximum cardinality of 'extension' is 1</sch:assert>
      <sch:assert test="count(f:extension[@url = 'http://hl7.org/fhir/us/davinci-pas/StructureDefinition/extension-nursingHomeResidentialStatus']) &lt;= 1">extension with URL = 'http://hl7.org/fhir/us/davinci-pas/StructureDefinition/extension-nursingHomeResidentialStatus': maximum cardinality of 'extension' is 1</sch:assert>
      <sch:assert test="count(f:extension[@url = 'http://hl7.org/fhir/us/davinci-pas/StructureDefinition/extension-nursingHomeLevelOfCare']) &lt;= 1">extension with URL = 'http://hl7.org/fhir/us/davinci-pas/StructureDefinition/extension-nursingHomeLevelOfCare': maximum cardinality of 'extension' is 1</sch:assert>
      <sch:assert test="count(f:extension[@url = 'http://hl7.org/fhir/us/davinci-pas/StructureDefinition/extension-revenueUnitRateLimit']) &lt;= 1">extension with URL = 'http://hl7.org/fhir/us/davinci-pas/StructureDefinition/extension-revenueUnitRateLimit': maximum cardinality of 'extension' is 1</sch:assert>
      <sch:assert test="count(f:extension[@url = 'http://hl7.org/fhir/us/davinci-pas/StructureDefinition/extension-requestedService']) &lt;= 1">extension with URL = 'http://hl7.org/fhir/us/davinci-pas/StructureDefinition/extension-requestedService': maximum cardinality of 'extension' is 1</sch:assert>
      <sch:assert test="count(f:category) &gt;= 1">category: minimum cardinality of 'category' is 1</sch:assert>
    </sch:rule>
  </sch:pattern>
  <sch:pattern>
    <sch:title>f:Claim/f:item/f:extension</sch:title>
    <sch:rule context="f:Claim/f:item/f:extension">
      <sch:assert test="count(f:id) &lt;= 1">id: maximum cardinality of 'id' is 1</sch:assert>
      <sch:assert test="count(f:url) &gt;= 1">url: minimum cardinality of 'url' is 1</sch:assert>
      <sch:assert test="count(f:url) &lt;= 1">url: maximum cardinality of 'url' is 1</sch:assert>
      <sch:assert test="count(f:value[x]) &lt;= 1">value[x]: maximum cardinality of 'value[x]' is 1</sch:assert>
    </sch:rule>
  </sch:pattern>
</sch:schema>
