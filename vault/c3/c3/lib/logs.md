```

JS.exec("var log = C3.logger('my.app.logger'); 
log.info('test hello!');") [root@c3server log]# grep hello -B 1 c3_server_out 2020-01-28T18:26:13.633Z level=INFO thread="Hannibal-1" logger=m.a.logger a_id="9405.10163072" a_rid="9405.10163072" test hello! log = 

C3.logger("my.app.logger"); log.info("test hello!"); [root@c3server log]# grep hello -B 1 c3_server_out 2020-01-28T18:26:13.633Z level=INFO thread="Hannibal-1" logger=m.a.logger a_id="9405.10163072" a_rid="9405.10163072" test hello!


```

[Documentation on C3 logger - C3 AI Suite - C3 AI Community](https://community.c3.ai/t/documentation-on-c3-logger/553/3)

[How to see C3.logger: logger.info() output locally - C3 AI Docker Container - C3 AI Community](https://community.c3.ai/t/how-to-see-c3-logger-logger-info-output-locally/9992/3)

## Relevant Types

- Cluster
- Server