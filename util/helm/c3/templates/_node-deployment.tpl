{{/* A sub-template that serves as base template for all deployments */}}
{{- define "c3.node-deployment" }}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Args.Name }}
  labels:
    {{ .Args.CloudTags | nindent 4 }}
    {{- if index .Values "c3" "serviceAccount" "labels" }}
    {{- if index .Values "c3" "serviceAccount" "labels" "azure.workload.identity/use" }}
    azure.workload.identity/use: true
    {{- end }}
    {{- end }}
  annotations:
    {{- if index .Values "c3" "serviceAccount" "labels" }}
    {{- if index .Values "c3" "serviceAccount" "labels" "azure.workload.identity/use" }}
    azure.workload.identity/use: c3
    azure.workload.identity/inject-proxy-sidecar: false
    {{- end }}
    {{- end }}
spec:
  replicas: {{ .Args.Replicas }}
  selector:
    matchLabels:
      {{ .Args.LabelSelector | nindent 6 }}
  template:
    metadata:
      labels:
        {{ .Args.PodCloudTags | nindent 8 }}
    spec:
      serviceAccountName: c3
      enableServiceLinks: false
      securityContext:
          # Set user/group/fsgroup to random if unspecified
          runAsUser: {{ template "c3.toUid" .Values.c3.security.podSecurityContext.runAsUser }}
          runAsGroup: {{ template "c3.toGid" .Values.c3.security.podSecurityContext.runAsGroup }}
          fsGroup: {{ template "c3.toFsGroupid" .Values.c3.security.podSecurityContext.fsGroup }}
          {{- if .Values.c3.security.podSecurityContext.supplementalGroups }}
          supplementalGroups:
          {{- range .Values.c3.security.podSecurityContext.supplementalGroups }}
            - {{ . }}
          {{- end }}
          {{- end }}
      containers:
        - name: c3-server
          ports:
          - name: metrics
            containerPort: {{ .Values.c3.metrics.jmxMetricsPort }}
          securityContext:
            readOnlyRootFilesystem: {{ .Values.c3.security.containerSecurityContext.readOnlyRootFilesystem }}
          image: '{{ .Values.c3.image.registry }}/{{ .Values.c3.image.repository }}:{{ .Values.c3.image.tag }}'
          lifecycle:
            preStop:
                exec:
                  command:
                    - /bin/sh
                    - /pre-scripts/pre-stop.sh
          # use the default container's ENTRYPOINT
          args: {{ .Args.CommandArgList }}
          livenessProbe:
            httpGet:
              path: /{{ .Values.c3.cluster.environment.name }}/c3/health
              port: 8888
            failureThreshold: 6
            timeoutSeconds: 30
            periodSeconds: 30
          startupProbe:
            httpGet:
              path: /{{ .Values.c3.cluster.environment.name }}/c3/health
              port: 8888
            failureThreshold: 10
            timeoutSeconds: 30
            periodSeconds: 30
          # TODO PLAT-28894: We need to force to Never to instruct the kubelet to use the local cached image
          imagePullPolicy: '{{ .Values.c3.image.pullPolicy }}'
          env:
            # TODO PLAT-28831
            - name: POD_IP
              valueFrom:
                fieldRef:
                  fieldPath: status.podIP
            - name: POD_TEMPLATE_HASH
              valueFrom:
                fieldRef:
                  fieldPath: metadata.labels['pod-template-hash']
            - name: POD_CLOUD_ID
              value: '{{ .Args.PodCloudId }}'
            - name: VERBOSE_ENTRYPOINT
              value: '{{ .Args.VerboseEntrypoint }}'
            - name: JVM_DEBUG_PORT
              value: '{{ .Args.JvmDebugPort }}'
            {{- if .Values.c3.metrics.enabled }}
            - name: JMX_METRICS_PORT
              value: '{{ .Args.JmxMetricsPort }}'
            {{- end }}
            - name: JVM_DEBUG
              value: '{{ .Args.JvmDebug }}'
            - name: JVM_SUSPEND
              value: '{{ .Args.JvmSuspend }}'
            - name: JVM_MAX_MEM_FRACTION
              value: '{{ .Args.JvmMaxMemFraction }}'
            - name: C3_AUTH_ENABLED
              value: '{{ .Args.AuthEnabled }}'
            {{- if .Args.LiveMetadata }}
            - name: LIVE_METADATA
              value: 'true'
            {{- end }}
            {{- if .Values.c3.ldPreload }}
            - name: LD_PRELOAD
              value: '{{ .Values.c3.ldPreload }}'
            {{- end }}
            - name: HELM_CHART_VERSION
              value: '{{ .Chart.Version }}'
            - name: DOWNWARD_API_MOUNTPATH
              value: '{{ .Values.c3.downwardApi.mountPath }}'
            - name: K8S_CERT_PATH
              value: '{{ .Values.c3.security.certPath }}'
            - name: K8S_TOKEN_PATH
              value: '{{ .Values.c3.security.tokenPath }}'
            - name: STOREPASS
              value: '{{ .Values.c3.security.storePass }}'
            {{- if .Values.c3.javaOpts }}
            - name: JAVA_OPTS
              value: '{{ .Values.c3.javaOpts }}'
            {{ end }}
          envFrom:
            - configMapRef:
                name: c3
            - configMapRef:
                name: pre-stop
          resources:
            requests:
              memory: {{ .Args.RequestsMemory }}
              cpu: {{ .Args.RequestsCpu }}
            limits:
              memory: {{ .Args.LimitsMemory }}
              cpu: {{ .Args.LimitsCpu }}
          volumeMounts:
            - name: 'c3-config'
              mountPath: '{{ .Values.c3.configFramework.config.mountPath }}'
              {{- if and .Values.c3.configFramework.config.nfs.enabled .Values.c3.configFramework.config.nfs.storageClassName }}
              subPath: '{{ .Values.c3.configFramework.config.nfs.subPath }}'
              {{- end }}
              # reuse the same volume for NFS CSI and if the claim names are the same
            - name: 'c3-{{ if and .Values.c3.configFramework.config.nfs.enabled .Values.c3.configFramework.config.nfs.storageClassName (eq .Values.c3.configFramework.vault.nfs.persistentVolumeClaimName .Values.c3.configFramework.config.nfs.persistentVolumeClaimName) }}config{{ else }}vault{{ end }}'
              mountPath: '{{ .Values.c3.configFramework.vault.mountPath }}'
              {{- if and .Values.c3.configFramework.vault.nfs.enabled .Values.c3.configFramework.vault.nfs.storageClassName }}
              subPath: '{{ .Values.c3.configFramework.vault.nfs.subPath }}'
              {{- end }}
            {{- .Values.c3.sharedFileSystems.volumeMounts | toYaml | nindent 12 }}
            - name: {{ .Values.c3.ephemeralStorage.volumeName }}
              mountPath: {{ .Values.c3.ephemeralStorage.vertxCacheDir.mountPath }}
              subPath: {{ .Values.c3.ephemeralStorage.vertxCacheDir.subPath }}
              # temporary solution to get the deployment working in OpenShift. Proper solution will be provided with PLAT-30918
              # TODO PLAT-30918
            - name: {{ .Values.c3.ephemeralStorage.volumeName }}
              mountPath: {{ .Values.c3.ephemeralStorage.vertxUploadsDir.mountPath }}
              subPath: {{ .Values.c3.ephemeralStorage.vertxUploadsDir.subPath }}
            - name: {{ .Values.c3.ephemeralStorage.volumeName }}
              mountPath: /metadata
              subPath: metadata
            - name: 'downward-api'
              mountPath: {{ .Values.c3.downwardApi.mountPath }}
            - name: {{ .Values.c3.log.volumeName }}
              mountPath: {{ .Values.c3.log.mountPath }}
            - name: 'boot-config'
              mountPath: {{ .Values.c3.configFramework.bootConfig.path }}
            - name: 'pre-scripts'
              mountPath: /pre-scripts
        - name: c3-server-log
          image: '{{ .Values.c3.log.image.registry }}/{{ .Values.c3.log.image.repository }}:{{ .Values.c3.log.image.tag}}'
          command: ["/bin/sh", "-c"]
          args:
            - while [ ! -f "{{ .Values.c3.log.mountPath }}/c3-server.log" ];
              do sleep 1;
              done;
              tail -n+1 -F "{{ .Values.c3.log.mountPath }}/c3-server.log";
          volumeMounts:
          - name: {{ .Values.c3.log.volumeName }}
            mountPath: {{ .Values.c3.log.mountPath }}
      volumes:
        #
        # 'c3-config', 'c3-vault', and 'sharedFileSystems' volume configurations will be transferred to leader, task, and data nodes
        #
        {{- if .Values.c3.configFramework.config.local }}
        - name: 'c3-config'
          hostPath:
            path: '{{ .Values.c3.configFramework.config.local }}'
            type: DirectoryOrCreate
        {{- end }}
        {{- if and .Values.c3.configFramework.config.nfs.enabled .Values.c3.configFramework.config.nfs.server }}
        - name: 'c3-config'
          nfs:
            server: '{{ .Values.c3.configFramework.config.nfs.server }}'
            path: '{{ .Values.c3.configFramework.config.nfs.path }}'
        {{- end }}
        {{- if and .Values.c3.configFramework.config.nfs.enabled .Values.c3.configFramework.config.nfs.storageClassName }}
        - name: 'c3-config'
          persistentVolumeClaim:
            claimName: '{{ .Values.c3.configFramework.config.nfs.persistentVolumeClaimName }}'
        {{- end }}
        {{- if not (or .Values.c3.configFramework.config.local .Values.c3.configFramework.config.nfs.enabled) }}
        # TODO: PLAT-52830 Make volume mounts c3-config, c3-vault, environment-shared optional on k8sdeploy.json
        - name: 'c3-config'
          emptyDir: {}
        {{- end }}
        {{- if .Values.c3.configFramework.vault.local }}
        - name: 'c3-vault'
          hostPath:
            path: '{{ .Values.c3.configFramework.vault.local }}'
            type: DirectoryOrCreate
        {{- end }}
        {{- if and .Values.c3.configFramework.vault.nfs.enabled .Values.c3.configFramework.vault.nfs.server }}
        - name: 'c3-vault'
          nfs:
            server: '{{ .Values.c3.configFramework.vault.nfs.server }}'
            path: '{{ .Values.c3.configFramework.vault.nfs.path }}'
        {{- end }}
        {{- if and .Values.c3.configFramework.vault.nfs.enabled .Values.c3.configFramework.vault.nfs.storageClassName (ne .Values.c3.configFramework.vault.nfs.persistentVolumeClaimName .Values.c3.configFramework.config.nfs.persistentVolumeClaimName) }}
        # Declare a different vault volume only if the claim name is different - there cannot be two claim-based
        # volumes with the same persistent volume claim name
        - name: 'c3-vault'
          persistentVolumeClaim:
            claimName: '{{ .Values.c3.configFramework.vault.nfs.persistentVolumeClaimName }}'
        {{- end }}
        {{- if not (or .Values.c3.configFramework.vault.local .Values.c3.configFramework.vault.nfs.enabled) }}
        # TODO: PLAT-52830 Make volume mounts c3-config, c3-vault, environment-shared optional on k8sdeploy.json
        - name: 'c3-vault'
          emptyDir: {}
        {{- end }}
        {{- .Values.c3.sharedFileSystems.volumes | toYaml | nindent 8 }}
        - name: boot-config
          configMap:
              name: boot-config-c3-server
        - name: {{ .Values.c3.ephemeralStorage.volumeName }}
          emptyDir: {}
        - name: {{ .Values.c3.log.volumeName }}
          emptyDir: {}
        - name: pre-scripts
          configMap:
            defaultMode: 493
            name: pre-stop
        - name: downward-api
          downwardAPI:
            items:
              - path: "metadata/name"
                fieldRef:
                  fieldPath: metadata.name
              - path: "metadata/namespace"
                fieldRef:
                  fieldPath: metadata.namespace
              - path: "limits/memory"
                resourceFieldRef:
                  containerName: "c3-server"
                  resource: limits.memory
                  divisor: 1Gi
              - path: "limits/cpu"
                resourceFieldRef:
                  containerName: "c3-server"
                  resource: limits.cpu
      terminationGracePeriodSeconds: 30
{{- end }}
