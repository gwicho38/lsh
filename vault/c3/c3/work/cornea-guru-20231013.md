## Testing 

20231113
11:27:37

Question 1: 

> ![[Pasted image 20231113112752.png]]

Question 2:



Question 3:

![[Pasted image 20231113113030.png]]

Question 4:

![[Pasted image 20231113112957.png]]

Question 5: 

![[Pasted image 20231113112924.png]]

## Logs

https://gkev8dev.c3dev.cloud/opensearch/app/discover#/context/2ab746c0-2b01-11ee-b049-f1550e27d7d2/U2GWyYsBMJGhPhZnIrHg?_g=(filters:!())&_a=(columns:!(message),filters:!(('$state':(store:appState),meta:(alias:'Namespace%20%7C%20gkev8dev',disabled:!t,index:'2ab746c0-2b01-11ee-b049-f1550e27d7d2',key:kubernetes.namespace,negate:!f,params:(query:gkev8dev),type:phrase),query:(match_phrase:(kubernetes.namespace:gkev8dev))),('$state':(store:appState),meta:(alias:'Application%20%7C%20gkev8dev-lefv202310092005-c3',disabled:!t,index:'2ab746c0-2b01-11ee-b049-f1550e27d7d2',key:application,negate:!f,params:(query:gkev8dev-lefv202310092005-c3),type:phrase),query:(match_phrase:(application:gkev8dev-lefv202310092005-c3))),('$state':(store:appState),meta:(alias:'Time%20Range',disabled:!t,index:'2ab746c0-2b01-11ee-b049-f1550e27d7d2',key:'@timestamp',negate:!f,params:(gte:'2023-11-13T11:48:40.199-05:00',lt:'2023-11-13T11:49:00.199-05:00'),type:range),range:('@timestamp':(gte:'2023-11-13T11:48:40.199-05:00',lt:'2023-11-13T11:49:00.199-05:00'))),('$state':(store:appState),meta:(alias:'Filter%20by%20Action',disabled:!t,index:'2ab746c0-2b01-11ee-b049-f1550e27d7d2',key:message,negate:!f,params:(query:createInitialGenAiResult),type:phrase),query:(match_phrase:(message:createInitialGenAiResult)))),predecessorCount:20,sort:!('@timestamp',desc),successorCount:20)


## Link

[[home/lefv-vault/c3/guru/GURU_README|GURU_README]]

