{{/* vim: set filetype=mustache: */}}

{{/*
Compute PostgreSQL service name.
*/}}
{{- define "c3Builder.postgresqlServiceName" -}}
{{- printf "%s-postgresql" .Release.Name -}}
{{- end -}}

{{/*
Compute Cassandra service name.
*/}}
{{- define "c3Builder.cassandraServiceName" -}}
{{- printf "%s-cassandra" .Release.Name -}}
{{- end -}}

{{/*
Compute Selenium Chrome service name.
*/}}
{{- define "c3Builder.seleniumChromeServiceName" -}}
{{- printf "%s-selenium-chrome" .Release.Name -}}
{{- end -}}

{{/*
Compute Selenium Firefox service name.
*/}}
{{- define "c3Builder.seleniumFirefoxServiceName" -}}
{{- printf "%s-selenium-firefox" .Release.Name -}}
{{- end -}}
