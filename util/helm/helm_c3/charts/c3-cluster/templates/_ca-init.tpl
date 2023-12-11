{{/*
   Internal CA init-container
  */}}
{{- define "c3Cluster.ca-init-initcontainer" -}}
        - name: ca-init
          image: {{ index .Values "internal-ca" "internalCa" "image" "registry" }}/{{ index .Values "internal-ca" "internalCa" "image" "repo" }}:{{ index .Values "internal-ca" "internalCa" "image" "tag" }}
          imagePullPolicy: {{ index .Values "internal-ca" "internalCa" "image" "pullPolicy" }}
          env:
            - name: NAMESPACE
              valueFrom:
                fieldRef:
                  fieldPath: metadata.namespace
            - name: POD_NAME
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
            - name: POD_IP
              valueFrom:
                fieldRef:
                  fieldPath: status.podIP
            - name: TRUSTSTORE_PASS
              valueFrom:
                secretKeyRef:
                  name: truststore
                  key: password
            - name: KEYSTORE_PASS
              valueFrom:
                secretKeyRef:
                  name: ca-keystore
                  key: password
            - name: SERVERCERT_PASS
              valueFrom:
                secretKeyRef:
                  name: cert-keystore
                  key: password
            {{- if index .Values "internal-ca" "internalCa" "caService" "enabled" }}
            - name: CA_USERNAME
              valueFrom:
                secretKeyRef:
                  name: ca-user
                  key: username
            - name: CA_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: ca-user
                  key: password
            {{- end }}
          args:
            {{- if index .Values "internal-ca" "internalCa" "caService" "enabled" }}
            - "-role=csr-client"
            - '-server={{ index .Values "internal-ca" "internalCa" "caService" "endpoint" }}'
            - '-username={{ index .Values "internal-ca" "internalCa" "caService" "username" }}'
            - '-password={{ index .Values "internal-ca" "internalCa" "caService" "password" }}'
              {{- else }}
            - "-role=gen-cert"
            - "-key-pass=$(KEYSTORE_PASS)"
              {{- end }}
              {{- if index .Values "internal-ca" "internalCa" "pem" "genCertDirectly" }}
            - "-from-pem=true"
            - '-temp-ca-dir={{ index .Values "internal-ca" "internalCa" "pem" "tempCaDir" }}'
            - '-crt-file-name={{ index .Values "internal-ca" "internalCa" "pem" "crtName" }}'
            - '-key-file-name={{ index .Values "internal-ca" "internalCa" "pem" "keyName" }}'
              {{- end }}
            - '-ca-dir={{ index .Values "internal-ca" "internalCa" "dirs" "caStore" }}'
            - '-cert-dir={{ index .Values "internal-ca" "internalCa" "dirs" "certStore" }}'
            - '-trust-dir={{ index .Values "internal-ca" "internalCa" "dirs" "trustStore" }}'
            - '-pfx-truststore-name={{ index .Values "internal-ca" "internalCa" "pfx" "trustStoreName" }}'
            - '-jks-truststore-name={{ index .Values "internal-ca" "internalCa" "jks" "trustStoreName" }}'
            - "-trust-pass=$(TRUSTSTORE_PASS)"
            - '-pfx-keystore-name={{ index .Values "internal-ca" "internalCa" "pfx" "keyStoreName" }}'
            - '-jks-keystore-name={{ index .Values "internal-ca" "internalCa" "jks" "keyStoreName" }}'
            - "-cert-pass=$(SERVERCERT_PASS)"
            - "-jks"
            - "-namespace=$(NAMESPACE)"
            - "-pod-ip=$(POD_IP)"
          resources:
            requests:
              memory: "50Mi"
              cpu: "100m"
            limits:
              memory: "50Mi"
              cpu: "100m"
          volumeMounts:
            {{- if or (not (index .Values "internal-ca" "internalCa" "caService" "enabled")) (index .Values "internal-ca" "internalCa" "pem" "genCertDirectly") }}
            - name: ca-keystore
              mountPath: {{ index .Values "internal-ca" "internalCa" "dirs" "caStore" }}
            {{- end }}
            {{- if index .Values "internal-ca" "internalCa" "pem" "genCertDirectly" }}
            - name: tempca-keystore
              mountPath: {{ index .Values "internal-ca" "internalCa" "pem" "tempCaDir" }}
            {{- end }}
            - name: truststore
              mountPath: {{ index .Values "internal-ca" "internalCa" "dirs" "trustStore" }}
            - name: tls-certs
              mountPath: {{ index .Values "internal-ca" "internalCa" "dirs" "certStore" }}
{{- end -}}

{{/*
   Internal CA init-container
  */}}
{{- define "c3Cluster.ca-init-volumes" -}}
        {{- if or (not (index .Values "internal-ca" "internalCa" "caService" "enabled")) (index .Values "internal-ca" "internalCa" "pem" "genCertDirectly") }}
        - name: ca-keystore
          secret:
            secretName: {{ index .Values "internal-ca" "internalCa" "k8sSecrets" "keyStoreName" }}
        {{- end }}
        {{- if index .Values "internal-ca" "internalCa" "pem" "genCertDirectly" }}
        - name: truststore
          emptyDir: {}
        - name: tempca-keystore
          emptyDir: {}
        {{- else }}
        - name: truststore
          secret:
            secretName: {{ index .Values "internal-ca" "internalCa" "k8sSecrets" "trustStoreName" }}
        {{- end }}
        - name: cert-keystore
          secret:
            secretName: {{ index .Values "internal-ca" "internalCa" "k8sSecrets" "certPasswordName" }}
{{- end -}}