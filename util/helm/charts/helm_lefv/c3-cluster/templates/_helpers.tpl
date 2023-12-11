{{/* vim: set filetype=mustache: */}}

{{/*
Compute the conventional C3 Cluster name. This partial should be inlined every time the cluster name is needed.
*/}}
{{- define "c3Cluster.clusterName" -}}
{{- printf "%s-%s" .Values.c3Cluster.env .Values.c3Cluster.pod -}}
{{- end -}}

{{/*
Scheme to access canonical and vanity URLs
*/}}
{{- define "c3Cluster.ingressScheme" -}}
{{- ternary "https" "http" .Values.c3Cluster.ingress.tls.enabled -}}
{{- end -}}

{{/*
 Scheme to access the internal URL of a pod
*/}}
{{- define "c3Cluster.podScheme" -}}
{{- ternary "https" "http" .Values.c3Cluster.tls.enabled -}}
{{- end -}}

{{/*
Canonical URL
*/}}
{{- define "c3Cluster.canonicalUrl" -}}
{{- printf "%s://c3.%s.%s" (include "c3Cluster.ingressScheme" .) (include "c3Cluster.clusterName" .) .Values.c3Cluster.domain -}}
{{- end -}}

{{/*
Compute PostgreSQL service name.
*/}}
{{- define "c3Cluster.postgresqlServiceName" -}}
{{- printf "%s-postgresql-headless.%s" .Release.Name .Release.Namespace -}}
{{- end -}}

{{/*
Compute Cassandra service name.
*/}}
{{- define "c3Cluster.cassandraServiceName" -}}
{{- printf "%s-cassandra-headless.%s" .Release.Name .Release.Namespace -}}
{{- end -}}

{{/*
Compute Zookeeper service name.
*/}}
{{- define "c3Cluster.zookeeperServiceName" -}}
{{- printf "%s-zookeeper.%s" .Release.Name .Release.Namespace -}}
{{- end -}}

{{/*
Compute Zookeeper headless service name prefix.
*/}}
{{- define "c3Cluster.zookeeperHeadlessServiceNamePrefix" -}}
{{- printf "%s-zookeeper-" .Release.Name -}}
{{- end -}}

{{/*
Compute Zookeeper headless service name postfix.
*/}}
{{- define "c3Cluster.zookeeperHeadlessServiceNamePostfix" -}}
{{- printf ".%s-zookeeper-headless.%s" .Release.Name .Release.Namespace -}}
{{- end -}}

{{/*
Verify the UID/GID type (must be empty or an int) and generate a random value if the passed argument is empty
*/}}
{{- define "c3Cluster.toUidOrGid" -}}
    {{- if kindIs "float64" . -}}
        {{- if . -}}
            {{- . -}}
        {{- else -}}
            0
        {{- end -}}
    {{- else if empty . -}}
        {{- randNumeric 5 -}}
    {{- else -}}
        {{- fail (printf "invalid UID or GID: %s" .) -}}
    {{- end -}}
{{- end -}}

{{/*
Verify the UID type (must be empty or an int) and generate a random value if the passed argument is empty
*/}}
{{- define "c3Cluster.toUid" -}}
{{- template "c3Cluster.toUidOrGid" . -}}
{{- end -}}

{{/*
Verify the GID type (must be empty or an int) and generate a random value if the passed argument is empty
*/}}
{{- define "c3Cluster.toGid" -}}
{{- template "c3Cluster.toUidOrGid" . -}}
{{- end -}}

{{/*
Determine storage name for npm, tmp, c3Log, serverConf etc. based on ephemeralStorage or persistentStorage
*/}}
{{- define "c3Cluster.fileSystemStorageName" -}}
{{- ternary .Values.c3Cluster.ephemeralStorage.volumeName .Values.c3Cluster.persistentStorage.persistentVolumeClaimName (or .Values.c3Cluster.ephemeralStorage.enabled (not .Values.c3Cluster.persistentStorage.storageClass)) -}}
{{- end -}}
