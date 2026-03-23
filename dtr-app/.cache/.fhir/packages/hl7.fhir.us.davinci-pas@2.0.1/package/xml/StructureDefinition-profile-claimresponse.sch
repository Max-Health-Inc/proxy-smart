<?xml version="1.0" encoding="UTF-8"?>
<sch:schema xmlns:sch="http://purl.oclc.org/dsdl/schematron" queryBinding="xslt2">
  <sch:ns prefix="f" uri="http://hl7.org/fhir"/>
  <sch:ns prefix="h" uri="http://www.w3.org/1999/xhtml"/>
  <!-- 
    This file contains just the constraints for the profile PASClaimResponseBase
    It includes the base constraints for the resource as well.
    Because of the way that schematrons and containment work, 
    you may need to use this schematron fragment to build a, 
    single schematron that validates contained resources (if you have any) 
  -->
  <sch:pattern>
    <sch:title>f:ClaimResponse/f:item</sch:title>
    <sch:rule context="f:ClaimResponse/f:item">
      <sch:assert test="count(f:extension[@url = 'http://hl7.org/fhir/us/davinci-pas/StructureDefinition/extension-itemPreAuthIssueDate']) &lt;= 1">extension with URL = 'http://hl7.org/fhir/us/davinci-pas/StructureDefinition/extension-itemPreAuthIssueDate': maximum cardinality of 'extension' is 1</sch:assert>
      <sch:assert test="count(f:extension[@url = 'http://hl7.org/fhir/us/davinci-pas/StructureDefinition/extension-itemPreAuthPeriod']) &lt;= 1">extension with URL = 'http://hl7.org/fhir/us/davinci-pas/StructureDefinition/extension-itemPreAuthPeriod': maximum cardinality of 'extension' is 1</sch:assert>
      <sch:assert test="count(f:extension[@url = 'http://hl7.org/fhir/us/davinci-pas/StructureDefinition/extension-authorizationNumber']) &lt;= 1">extension with URL = 'http://hl7.org/fhir/us/davinci-pas/StructureDefinition/extension-authorizationNumber': maximum cardinality of 'extension' is 1</sch:assert>
      <sch:assert test="count(f:extension[@url = 'http://hl7.org/fhir/us/davinci-pas/StructureDefinition/extension-administrationReferenceNumber']) &lt;= 1">extension with URL = 'http://hl7.org/fhir/us/davinci-pas/StructureDefinition/extension-administrationReferenceNumber': maximum cardinality of 'extension' is 1</sch:assert>
      <sch:assert test="count(f:extension[@url = 'http://hl7.org/fhir/us/davinci-pas/StructureDefinition/extension-itemRequestedServiceDate']) &lt;= 1">extension with URL = 'http://hl7.org/fhir/us/davinci-pas/StructureDefinition/extension-itemRequestedServiceDate': maximum cardinality of 'extension' is 1</sch:assert>
      <sch:assert test="count(f:extension[@url = 'http://hl7.org/fhir/us/davinci-pas/StructureDefinition/extension-itemAuthorizedDetail']) &lt;= 1">extension with URL = 'http://hl7.org/fhir/us/davinci-pas/StructureDefinition/extension-itemAuthorizedDetail': maximum cardinality of 'extension' is 1</sch:assert>
    </sch:rule>
  </sch:pattern>
  <sch:pattern>
    <sch:title>f:ClaimResponse/f:item/f:adjudication</sch:title>
    <sch:rule context="f:ClaimResponse/f:item/f:adjudication">
      <sch:assert test="count(f:extension[@url = 'http://hl7.org/fhir/us/davinci-pas/StructureDefinition/extension-reviewAction']) &lt;= 1">extension with URL = 'http://hl7.org/fhir/us/davinci-pas/StructureDefinition/extension-reviewAction': maximum cardinality of 'extension' is 1</sch:assert>
    </sch:rule>
  </sch:pattern>
  <sch:pattern>
    <sch:title>f:ClaimResponse/f:error</sch:title>
    <sch:rule context="f:ClaimResponse/f:error">
      <sch:assert test="count(f:extension[@url = 'http://hl7.org/fhir/us/davinci-pas/StructureDefinition/extension-errorFollowupAction']) &lt;= 1">extension with URL = 'http://hl7.org/fhir/us/davinci-pas/StructureDefinition/extension-errorFollowupAction': maximum cardinality of 'extension' is 1</sch:assert>
      <sch:assert test="count(f:extension[@url = 'http://hl7.org/fhir/us/davinci-pas/StructureDefinition/extension-errorElement']) &lt;= 1">extension with URL = 'http://hl7.org/fhir/us/davinci-pas/StructureDefinition/extension-errorElement': maximum cardinality of 'extension' is 1</sch:assert>
      <sch:assert test="count(f:extension[@url = 'http://hl7.org/fhir/us/davinci-pas/StructureDefinition/extension-errorPath']) &lt;= 1">extension with URL = 'http://hl7.org/fhir/us/davinci-pas/StructureDefinition/extension-errorPath': maximum cardinality of 'extension' is 1</sch:assert>
    </sch:rule>
  </sch:pattern>
</sch:schema>
