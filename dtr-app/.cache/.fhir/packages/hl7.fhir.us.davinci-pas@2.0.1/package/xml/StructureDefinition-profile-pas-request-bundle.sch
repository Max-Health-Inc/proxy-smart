<?xml version="1.0" encoding="UTF-8"?>
<sch:schema xmlns:sch="http://purl.oclc.org/dsdl/schematron" queryBinding="xslt2">
  <sch:ns prefix="f" uri="http://hl7.org/fhir"/>
  <sch:ns prefix="h" uri="http://www.w3.org/1999/xhtml"/>
  <!-- 
    This file contains just the constraints for the profile Bundle
    It includes the base constraints for the resource as well.
    Because of the way that schematrons and containment work, 
    you may need to use this schematron fragment to build a, 
    single schematron that validates contained resources (if you have any) 
  -->
  <sch:pattern>
    <sch:title>f:Bundle</sch:title>
    <sch:rule context="f:Bundle">
      <sch:assert test="count(f:identifier) &gt;= 1">identifier: minimum cardinality of 'identifier' is 1</sch:assert>
      <sch:assert test="count(f:timestamp) &gt;= 1">timestamp: minimum cardinality of 'timestamp' is 1</sch:assert>
    </sch:rule>
  </sch:pattern>
  <sch:pattern>
    <sch:title>f:Bundle/f:entry</sch:title>
    <sch:rule context="f:Bundle/f:entry">
      <sch:assert test="count(f:fullUrl) &gt;= 1">fullUrl: minimum cardinality of 'fullUrl' is 1</sch:assert>
      <sch:assert test="count(f:resource) &gt;= 1">resource: minimum cardinality of 'resource' is 1</sch:assert>
      <sch:assert test="count(f:search) &lt;= 0">search: maximum cardinality of 'search' is 0</sch:assert>
      <sch:assert test="count(f:request) &lt;= 0">request: maximum cardinality of 'request' is 0</sch:assert>
      <sch:assert test="count(f:response) &lt;= 0">response: maximum cardinality of 'response' is 0</sch:assert>
    </sch:rule>
  </sch:pattern>
</sch:schema>
