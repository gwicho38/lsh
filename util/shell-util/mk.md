colima start -p c3  

mk start -p c3kube

minikube -p c3kube addons enable metrics-server

 eval $(minikube -p c3kube docker-env)     