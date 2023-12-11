{{/* vim: set filetype=mustache: */}}

{{/*
Compute the conventional C3 Cluster name. This partial should be inlined every time the cluster name is needed.
*/}}
{{- define "c3cli.clusterEndpoint" -}}
{{- printf "http://%s.%s:8080" .Values.c3cli.c3Server.serviceName .Release.Namespace -}}
{{- end -}}
