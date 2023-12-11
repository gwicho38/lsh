images="${DOCKER_REGISTRY}/alpine:3.11.5
${DOCKER_REGISTRY}/bitnami/zookeeper:3.5.6
${DOCKER_REGISTRY}/busybox:1.28
${DOCKER_REGISTRY}/selenium/standalone-chrome-debug:3.141.59-20200525
${DOCKER_REGISTRY}/c3-server-build:3.0.0
${DOCKER_REGISTRY}/cassandra:3.11.9.2
${DOCKER_REGISTRY}/postgres:9.6.20.1
${DOCKER_REGISTRY}/node:dubnium
${DOCKER_REGISTRY}/selenium/standalone-firefox-debug:3.141.59-20200525
k8s.gcr.io/defaultbackend-amd64:1.5
quay.io/kubernetes-ingress-controller/nginx-ingress-controller:0.26.2"

for i in $images; do
  docker pull "$i"
done

helm install c3kube --debug --repo https://ci-artifacts.c3.ai/v1/helm --version=4.19.0 \
--set 'c3Cluster.image.tag=8.3.2' \
--set 'c3Cluster.image.repository=c3server-gov/noplugins/k8s' \
--set 'c3-persistence.cassandra.backupCronJob.coordinator.image.registry=ci-artifacts.c3.ai' \
--set 'c3-persistence.postgresql.image.registry=docker.io/library/' \
--set 'c3-persistence.cassandra.backupCronJob.coordinator.image.registry=hub.docker.com/_/cassandra' \
--set 'c3Cluster.image.registry=locked-registry.c3.ai' \
--set 'c3Cluster.resources.limits.memory=8Gi' \
--values https://ci-artifacts.c3.ai/v1/artifacts/file-repo/files/test-local.yml \
c3-cluster


 helm dependency build 

 copied lsh/util/helm/c3-cluster