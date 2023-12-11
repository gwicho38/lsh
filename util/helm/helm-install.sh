NAMESPACE=v8
# IMAGE_TAG=0.6.0-SNAPSHOT
helm upgrade --install --create-namespace -n $NAMESPACE c3 ./c3 --values ./c3-helm.yaml
# --set c3.image.tag=$IMAGE_TAG
# --set c3.configFramework.config.local=/Users/$USER/tmp/c3-hostpath/cf/config \
# --set c3.configFramewo
