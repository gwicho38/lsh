{{/* https://metallb.universe.tf/apis/#metallb.io/v1beta1.IPAddressPool */}}
{{- if .Values.metallb.crd_enabled -}}
---
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: default
  namespace: metallb-system
spec:
  addresses:
  - {{ .Values.loadBalancerNetwork }}.10-{{ .Values.loadBalancerNetwork }}.99
---
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: test
  namespace: metallb-system
spec:
  autoAssign: false
  addresses:
  - {{ .Values.loadBalancerNetwork }}.100-{{ .Values.loadBalancerNetwork }}.149
---
{{- end -}}
