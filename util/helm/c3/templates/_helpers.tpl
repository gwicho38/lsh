{{/* vim: set filetype=mustache: */}}

{{/*
Verify the UID/GID type (must be empty or an int) and generate a random value if the passed argument is empty
*/}}
{{- define "c3.generateId" -}}
    {{- if kindIs "float64" . -}}
        {{- if . -}}
            {{- . -}}
        {{- else -}}
            0
        {{- end -}}
    {{- else if empty . -}}
        {{- randNumeric 5 -}}
    {{- else -}}
        {{- fail (printf "invalid UID or GID or fsgroupID: %s" .) -}}
    {{- end -}}
{{- end -}}

{{/*
Verify the UID type (must be empty or an int) and generate a random value if the passed argument is empty
*/}}
{{- define "c3.toUid" -}}
{{- template "c3.generateId" . -}}
{{- end -}}

{{/*
Verify the GID type (must be empty or an int) and generate a random value if the passed argument is empty
*/}}
{{- define "c3.toGid" -}}
{{- template "c3.generateId" . -}}
{{- end -}}

{{/*
Verify the fsgroupID type (must be empty or an int) and generate a random value if the passed argument is empty
*/}}
{{- define "c3.toFsGroupid" -}}
{{- template "c3.generateId" . -}}
{{- end -}}

{{/*
Construct name of deployment by role ( provided as an argument)
*/}}
{{- define "c3.deployment.name" -}}
{{- printf "%s-%s-c3-k8sdeploy-%s-001" .Values.c3.cluster.name .Values.c3.cluster.environment.name .role -}}
{{- end -}}

{{/*
Construct label selectors for C3 deployments.
*/}}
{{- define "c3.bootstrapApp.labelSelectors" -}}
c3__app_id-0: 0{{ .Values.c3.cluster.name }}-{{ .Values.c3.cluster.environment.name }}-c30
c3__role-0: 0{{ .role }}0
{{- end -}}

{{/*
Construct label selectors for C3 leader service.
*/}}
{{- define "c3.bootstrapApp.leaderSvcLabelSelectors" -}}
c3__app_id-0: 0{{ .Values.c3.cluster.name }}-{{ .Values.c3.cluster.environment.name }}-c30
c3__leader-0: "010"
{{- end -}}

{{/*
Construct cloud tags.
Must be updated and kept in sync with CloudTagKey.c3typ and _.json.
*/}}
{{- define "c3.bootstrapApp.cloudTags" -}}
c3__id-0: 0{{ .Values.c3.cluster.name }}-{{ .Values.c3.cluster.environment.name }}-c3-{{ .func }}-{{ .role }}-{{ .seq }}0
c3__cluster-0: 0{{ .Values.c3.cluster.name }}0
c3__env-0: 0{{ .Values.c3.cluster.environment.name }}0
c3__env_id-0: 0{{ .Values.c3.cluster.name }}-{{ .Values.c3.cluster.environment.name }}0
c3__app-0: 0c30
c3__app_id-0: 0{{ .Values.c3.cluster.name }}-{{ .Values.c3.cluster.environment.name }}-c30
c3__func-0: 0{{ .func }}0
c3__role-0: 0{{ .role }}0
c3__seq-0: "0{{ .seq }}0"
{{- end -}}

{{/*
Construct cloud tags.
Must be updated and kept in sync with CloudTagKey.c3typ and _.json.
*/}}
{{- define "c3.bootstrapApp.podCloudTags" -}}
{{ template "c3.bootstrapApp.cloudTags" . }}
c3__leader-0: "0{{ if eq .role "appleader" }}1{{ else }}0{{ end }}0"
applicationGroup: {{ .Values.c3.applicationGroup }}
{{- end -}}

{{- define "c3.bootstrapApp.cloudId" -}}
{{ .Values.c3.cluster.name }}-{{ .Values.c3.cluster.environment.name }}-c3-{{ .func }}-{{ .role }}-{{ .seq }}
{{- end -}}
