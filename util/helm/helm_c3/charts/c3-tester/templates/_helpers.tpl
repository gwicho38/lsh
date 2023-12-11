{{/* vim: set filetype=mustache: */}}

{{/*
Compute the conventional C3 Cluster name. This partial should be inlined every time the cluster name is needed.
Note that some of the variables prefixed by .Values.c3Tester (service.web.name for example) are projected from the
c3Cluster value space.
*/}}
{{- define "c3Tester.clusterMasterHost" -}}
{{- printf "%s.%s" .Values.c3Tester.service.web.name .Release.Namespace -}}
{{- end -}}

{{- define "c3Tester.clusterHealthCheckEndpoint" -}}
{{- printf "http://%s:8080/health/1" (include "c3Tester.clusterMasterHost" .) -}}
{{- end -}}

{{- define "c3Tester.image" -}}
{{- printf "%s/%s:%s" .Values.c3Tester.image.registry .Values.c3Tester.image.repository .Values.c3Tester.image.tag -}}
{{- end -}}
