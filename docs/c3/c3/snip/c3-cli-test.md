## Docs

![[Pasted image 20221219155708.png]]

[cli tester docs](https://developer.c3.ai/docs/7.34.0/guide/guide-c3aisuite-basic/cli-tester)

```bash

# Run all tests in a tag
c3 tester -t <tenant>:<tag>

# Run deployed tests at the specified deployed metadata path
c3 tester -t <tenant>:<tag> -P <metadata path>

# Run deployed tests at the specified local filesystem path
c3 tester -t <tenant>:<tag> -F <filesystem path>

# --test-runner-type
export command = "c3 tester -t mdaPTS:dev -F `pwd`"

  

export command = c3 tester -t mdaUserManagement:dev -u BA:BA -R JasmineTestRunner -P /mda/mdaUserManagement/test/jasmine/test_ThreatEngineersGroup.js -c mdaUserManagement

```

## MDA Tester 

```
// Console test

var c3Context = 

```