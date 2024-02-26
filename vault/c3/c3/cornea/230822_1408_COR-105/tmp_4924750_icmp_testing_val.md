---
id: tmp_4924750_icmp_testing_val
created_date: 22/08/2023
updated_date: 22/08/2023
type: term
---

# #08-2023 - tmp_4924750_icmp_testing_val

- **🏷️Tags** :  #08-2023  

## TO SCOPE THIS TICKET:

[] create a descriptive title

[] complete TBDs below

[] assign epic to this ticket

[] create relevant linking relations

[] delete this section

## DELETE ME AND ABOVE!

## 📋 Story




I need the following information for our engineers to configure the CLZ
interface to enable your access

1) CN of the system that will be connecting to the CLZ

		> CN Info: 
		
		*.c3dev.cloud 

2) Public Cert

![[230822_1356_c3dev_cloud_cert.png]]

### Background 

%%20230822_1119. {@Kevin} describes high side provisioning%% 

```text

**From:** Kevin Eveker <[kevin.eveker@c3.ai](mailto:kevin.eveker@c3.ai "mailto:kevin.eveker@c3.ai")>   
**Sent:** Tuesday, August 8, 2023 12:13 PM  
**To:** Littlejohn, Travis <[littltr@amazon.com](mailto:littltr@amazon.com "mailto:littltr@amazon.com")>; ... 
**Subject:** RE: [EXTERNAL] c3.ai ICMP testing and validation

Travis,

Basic steps below:

1. We will spin up an instance with this new image.
2. We will run terraform scripts to establish infrastructure for our V8 product.
3. We will install helm charts to stand up our V8 product.
4. We will login to V8 admin console and perform additional validation checks.

We can tear down the infrastructure after testing is complete or keep it running if that makes more sense for future testing.

When this works in our environment, these steps take 2-3 hours at most. 

I expect that we may run into some blockers that we will have to figure out how to work through.

Kevin

**From:** Kevin Eveker <[kevin.eveker@c3.ai](mailto:kevin.eveker@c3.ai "mailto:kevin.eveker@c3.ai")>   
**Sent:** Tuesday, August 8, 2023 12:13 PM  
**To:** Littlejohn, Travis <[littltr@amazon.com]
**Subject:** RE: [EXTERNAL] c3.ai ICMP testing and validation

Kevin, 

Thank you for the quick reply. This is great information. Last piece of the puzzle, do you have a list of instances (type/size/quantity) that you will need to spin up to execute the testing?

V/r,

**From:** Michael Scheriger <[Michael.Scheriger@c3.ai](mailto:Michael.Scheriger@c3.ai "mailto:Michael.Scheriger@c3.ai")>  
**Date:** Wednesday, August 9, 2023 at 9:51 AM  
**To:** Kevin Eveker <[kevin.eveker@c3.ai](mailto:kevin.eveker@c3.ai "mailto:kevin.eveker@c3.ai")>, Littlejohn, Travis 
**Subject:** Re: c3.ai ICMP testing and validation

Hi all,

For testing we used up to 3 m6i.2xlarge EC2 nodes and a single db.t3.micro RDS instance. However, as Kevin mentioned the sizes of the EC2 nodes and RDS instance for testing/production will be determined on the data volume and compute requirements of the application.

Best,

Michael
```



## 🗺 Route

## 🖥 UI

## 🔨 Acceptance Criteria

- Test ticketed and added to backlog.
- Application provisions with changes.
- Application bundles with changes.
* No existing test fails.
 
## 📚 Resources

- [[20230822_FW-c3.ai_icmp_testing_and_validation.pdf]] 