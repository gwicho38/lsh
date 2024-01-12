# Docker stack for local monitoring
Start the monitoring stack
```
$ docker-compose up
```

Visit Grafana at http://localhost:3000/  (username/password is `admin`/`admin`)
To load the Node runtime dashboard, visit grafane and then click on the create option on top left and them import the nodes_runtime_grafana.json

Visit Prometheus at http://localhost:9090/

Visit AlertManager at http://localhost:9093/

Stop the monitoring stack
```
$ docker-compose down -v
```

