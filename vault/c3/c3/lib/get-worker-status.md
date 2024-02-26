---
id: get-worker-status
created_date: 29/12/2022
updated_date: 29/12/2022
type: note
---

# get-worker-status

## 📝 Notes

29/12/2022:12:60

> [!info] Get Node Concurrency Status
> 
> create a bookmark of any webpage
> 	
> edit the bookmark from step 1 and replace the URL with the code below
> 	
> navigate to /static/console and click the bookmark while on the page to run the script
> 
> javascript:void function()%7Bfunction a(a,b)%7Bconst c%3D"master"%3D%3D%3Da%3F"m-":"w-",d%3Dnew RegExp("("%2Bc%2B")%5C%5Cd%7B1,3%7D","g"),e%3Db.nodeId.match(d)%5B0%5D%3Blet h%3Btry%7Bif("RUNNING"%3D%3D%3Db.state)%7Bconsole.log(b.id,a),c3Tunnel("http://"%2Bb.id%2B":8080")%3Bconst c%3DJvm.memory().pools%3Blet d,f%3Bc.each(function(a)%7B-1<a.name.indexOf(" Old ")%3Ff%3Da.name:void 0%7D),f%3F(d%3DJvm.memory().pools%5Bf%5D.percentage,h%3D%7BnodeId:e,nodeType:a,hostState:b.state,memoryUtilization:d%7D):h%3D%7BnodeId:e,nodeType:a,hostState:"It appears that the JVM on this node is not configured to support Old Gen memory."%7D,c3Tunnel()%7Delse h%3D%7BnodeId:e,nodeType:a,hostState:b.state%7D%7Dcatch(b)%7Bh%3D%7BnodeId:e,nodeType:a,hostState:b%7D%7D"master"%3D%3D%3Da%3Ff.push(h):g.push(h)%7Dfunction b(a)%7Bvar b%3DMath.ceil%3Bif("RUNNING"%3D%3D%3Da.hostState)%7Bconst c%3Db(a.memoryUtilization),d%3D22,e%3D95<%3Dc%3F"%5CuD83D%5CuDD34":85>c%3F"%5CuD83D%5CuDFE2":"%5CuD83D%5CuDFE1",f%3Dc*d/100%3Bj%2B%3D"%5Cn"%2Be,j%2B%3Da.nodeId.startsWith("m-")%3F4>a.nodeId.length%3F" ":" ":" ",j%2B%3Da.nodeId%2B": ",j%2B%3D10>a.memoryUtilization%3F" ":100%3D%3D%3Da.memoryUtilization%3F"":" ",j%2B%3Da.memoryUtilization.toFixed(2)%2B"%25 "%2B"%5Cu2588".repeat(Math.floor(f.toFixed(2)))%2B"%5Cu2591".repeat(b((d-f).toFixed(2)))%7Delse j%2B%3D"%5Cn%5CuD83D%5CuDD34 "%2Ba.nodeId%2B": "%2Ba.hostState%7Dfunction c()%7Breturn f.some(a%3D>"master"%3D%3D%3Da.nodeType)%26%26(j%2B%3D"%5CnMaster nodes:%5Cn"),f.forEach(function(a)%7Bb(a)%7D),g.some(a%3D>"worker"%3D%3D%3Da.nodeType)%26%26(j%2B%3D"%5Cn%5CnWorker nodes:%5Cn"),g.forEach(function(a)%7Bb(a)%7D),j%2B%3D"%5Cn%5Cn",j%7Dconsole.log("%25c%5CnCalculating, please wait…%5Cn","color: %23fdd835")%3Bconst d%3DCluster.masters().sort((c,a)%3D>c.nodeId>a.nodeId%3F1:-1),e%3DCluster.workers().sort((c,a)%3D>c.nodeId>a.nodeId%3F1:-1),f%3D%5B%5D,g%3D%5B%5D,h%3D" Cluster memory utilization for "%2BCluster.getId(),i%3D"-".repeat(h.length%2B1)%2B"%5Cn"%2Bh%2B"%5Cn"%2B"-".repeat(h.length%2B1)%2B"%5Cn"%3Blet j%3Di%3Bd.each(function(b)%7Ba("master",b)%7D),e.each(function(b)%7Ba("worker",b)%7D),c3Tunnel(),console.log(c())%7D()%3B
> 	
> monitor network calls
> 	
> view results! (will take a minute to log results but they can also be viewed in the network calls)
> 
>



## 🔗 Links

## **🏷️Tags**

- 
