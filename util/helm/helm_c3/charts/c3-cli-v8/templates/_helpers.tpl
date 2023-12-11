{{/* vim: set filetype=mustache: */}}

{{- define "c3cli.clusterEndpoint" -}}
{{- printf "http://%s.%s:8888" .Values.c3cli.c3.leaderServiceName .Release.Namespace -}}
{{- end -}}
