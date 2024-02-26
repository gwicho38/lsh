---
created_date: 17/07/2023
id: william-lee
updated_date: 17/07/2023
type: project
---

#  - william-lee

# C3 Contractor

## Information

- Name: [[william-lee]] 
- Email: william.lee-c@c3.ai
- Phone: 410-446-2884
- VM Info:

## Account Initialization

- [ ] Engagement Term [link](https://todoist.com/showTask?id=7400330365) #todoist %%[todoist_id:: 7400330365]%%
	- [ ] Start: [link](https://todoist.com/showTask?id=7400330382) #todoist %%[todoist_id:: 7400330382]%%
	- [ ] End: [link](https://todoist.com/showTask?id=7400330408) #todoist %%[todoist_id:: 7400330408]%%
- [ ] C3 Sponsor [link](https://todoist.com/showTask?id=7400330426) #todoist %%[todoist_id:: 7400330426]%%
- [ ] SOW [link](https://todoist.com/showTask?id=7400330433) #todoist %%[todoist_id:: 7400330433]%%
- [ ] [HR Request Made] [[c3/contractors/readme#Initial HR Information Request [link](https://todoist.com/showTask?id=7400330444) #todoist %%[todoist_id:: 7400330444]%%

	2022-12-14-11:39

	@lefv

	 Please inform HR. Per compliance policy, all New user account creations; whether it be employee/contractor/intern, must originate and end with HR and then be passed to IT via an "Employee Status change" ticket. 

## Account Access[^1]

- [ ] Office 365 [[c3/contractors/readme#Office 365]] [link](https://todoist.com/showTask?id=7400330449) #todoist %%[todoist_id:: 7400330449]%%
- [ ] OpenAir [[c3/lib/tickets/OPEN-AIR]] [link](https://todoist.com/showTask?id=7400330464) #todoist %%[todoist_id:: 7400330464]%%
	  Note: Project needs to be assigned by DM.
- [ ] Okta [[c3/contractors/readme#Okta]] [link](https://todoist.com/showTask?id=7400330479) #todoist %%[todoist_id:: 7400330479]%%
- [ ] GovBox [[c3/contractors/readme#GovBox Access]] [link](https://todoist.com/showTask?id=7400330490) #todoist %%[todoist_id:: 7400330490]%%
- [ ] VPN [[c3/contractors/readme#VPN Access]] [link](https://todoist.com/showTask?id=7400330497) #todoist %%[todoist_id:: 7400330497]%%
- [ ] VM [[c3/contractors/readme#VM Access]] [link](https://todoist.com/showTask?id=7400330511) #todoist %%[todoist_id:: 7400330511]%%
- [ ] Github [[c3/contractors/readme#Github]] [link](https://todoist.com/showTask?id=7400330521) #todoist %%[todoist_id:: 7400330521]%%
- [ ] Figma [[c3/lib/tickets/figma]] [link](https://todoist.com/showTask?id=7400330526) #todoist %%[todoist_id:: 7400330526]%%
- [ ] MyApps Access [link](https://todoist.com/showTask?id=7400330530) #todoist %%[todoist_id:: 7400330530]%%
- [ ] Jira Project (e.g., MDA) ask team lead [link](https://todoist.com/showTask?id=7400330543) #todoist %%[todoist_id:: 7400330543]%%
- [ ] UI Demo -- [link](https://todoist.com/showTask?id=7400330558) #todoist %%[todoist_id:: 7400330558]%%
- [ ] Jira and Confluence for Services Group (IT Ticket) [link](https://todoist.com/showTask?id=7400330570) #todoist %%[todoist_id:: 7400330570]%%
- [] (if applicable) MapBox API Access Token ([Account | Mapbox](https://account.mapbox.com/))

## Teams Channels and Meetings

- [ ] Invite to Federal Office Hours (AM/PM) [link](https://todoist.com/showTask?id=7400330575) #todoist %%[todoist_id:: 7400330575]%%
- [ ] Invite to Teams Help Channel [link](https://todoist.com/showTask?id=7400330585) #todoist %%[todoist_id:: 7400330585]%%
- [ ] Invite to All MDA Dev [link](https://todoist.com/showTask?id=7400330593) #todoist %%[todoist_id:: 7400330593]%%
- [] [WFH/PTO/HOL](https://teams.microsoft.com/l/channel/19%3Aeb84cd356b334a839277be23c01160d0%40thread.tacv2/tab%3A%3A56aa2f9a-a303-43b9-bbfc-61fa87bd729a?groupId=9de28af1-2fe1-406b-ae90-6aec0df8337e&tenantId=53ad779a-93e7-485c-ba20-ac8290d7252b&allowXTenantAccess=false "https://teams.microsoft.com/l/channel/19%3Aeb84cd356b334a839277be23c01160d0%40thread.tacv2/tab%3A%3A56aa2f9a-a303-43b9-bbfc-61fa87bd729a?groupId=9de28af1-2fe1-406b-ae90-6aec0df8337e&tenantId=53ad779a-93e7-485c-ba20-ac8290d7252b&allowXTenantAccess=false")
	Note: Any time you are out let the MDA team know in the MDA All Dev Chat and update excel sheet.

	![[Pasted image 20221205120928.png]]

## Dev Environment

Follow instructions for dev environment setup here [[c3/contractors/readme#PRE-MINIKUBE]].

Install Jupyter environment:

Note: when you perform these steps, probably best to copy the entire `load_data` folder and run the steps from elsewhere in your environment

```
# Load Data

## Pre-Steps

1. Install anaconda: https://docs.anaconda.com/anaconda/install/mac-os/ (make sure to allow anaconda access to the command line)

2. Install MDA.yaml from the command line with: `conda env create -f MDA.yaml`

3. Activate conda: `conda activate MDA`

4. Download data from https://c3gov.app.box.com/file/1020943961887

## Run

Example: `python3 load_data.py -irPath pts_data/IR_Data/ -kinPath pts_data/Kin_Data/ -n 20`

usage: load_data.py [-h] [-c3url C3URL] [-tenant TENANT] [-tag TAG]

[-kinPath KINPATH] [-irPath IRPATH] [-n [N]] [-hz [HZ]]

[-wipeData WIPEDATA]

optional arguments:

-h, --help show this help message and exit

-c3url C3URL url of server default: http://localhost:8888

-tenant TENANT c3 tenant default: mdaPTS

-tag TAG c3 tag default: dev

-kinPath KINPATH path to kinematic bmrd files

-irPath IRPATH path to infrared mva files

-n [N] how many files to upload (negative -> all of them) default: -1

-hz [HZ] the frequency at which to resample default: 1

-wipeData WIPEDATA bool: whether or not to wipe existing data
```

After data loaded call the following from `localhost:8080/static/console`:

`IRModel.generateModelArtifacts()`

## Set MapBox Token

In 'static console' call:

`UiSdlMapbox.inst().setAccessToken('{token-string}')` with your mapbox API token swapped with {token-string}.

## Log

| Date                | Note                                                                                  |
|:------------------- |:------------------------------------------------------------------------------------- |
| 2022-12-13-02-31-20 | Ernest Galang stated that HR new hire ticket should specify many of the initial items |
|                     |                                                                                       |
|                     |                                                                                       |

### Contacts

- [Kyle Altimore](mailto:kyle.altimore@c3.ai)
- [Ernest Galang](ernest.galang@c3.ai)

### Examples

- For example tickets go here [[c3/lib/tickets/readme]]

[^1]: Note: these tickets should all be included at initial onboarding.
