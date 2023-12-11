{{/* https://metallb.universe.tf/configuration/#layer-2-configuration */}}
{{- if .Values.metallb.crd_enabled -}}
---
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: test
  namespace: metallb-system
{{- end -}}
