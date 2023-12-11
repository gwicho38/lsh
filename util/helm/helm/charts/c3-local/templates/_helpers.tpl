{{/* vim: set filetype=mustache: */}}

{{/*
Compute PostgreSQL service name.
*/}}
{{- define "c3LocalDeps.postgresqlServiceName" -}}
{{- printf "%s-postgresql" .Release.Name -}}
{{- end -}}

{{/*
Compute Cassandra service name.
*/}}
{{- define "c3LocalDeps.cassandraServiceName" -}}
{{- printf "%s-cassandra" .Release.Name -}}
{{- end -}}

{{/*
Compute Vault service name.
*/}}
{{- define "c3LocalDeps.vaultServiceName" -}}
{{- printf "%s-vault" .Release.Name -}}
{{- end -}}
