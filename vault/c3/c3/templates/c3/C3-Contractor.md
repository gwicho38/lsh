---
created_date: <% tp.file.creation_date('DD/MM/YYYY') %>
id: <% tp.file.title.split(" ")[0] %>
updated_date: <% tp.file.creation_date('DD/MM/YYYY') %>
type: project
tags:
  - rizzo
---

# #<% tp.file.creation_date('MM-YYYY') %> - <% tp.file.title.split(" ")[0] %>

# C3 Contractor

## Information

- Name:
- Company: 
- Email Company:
- Email C3:
- Phone:
- VM Info:

## Account Initialization

- [ ] Engagement Term [link](https://todoist.com/showTask?id=7400338969) #todoist %%[todoist_id:: 7400338969]%%
	- [ ] Start: [link](https://todoist.com/showTask?id=7400338982) #todoist %%[todoist_id:: 7400338982]%%
	- [ ] End: [link](https://todoist.com/showTask?id=7400338993) #todoist %%[todoist_id:: 7400338993]%%
- [ ] C3 Sponsor [link](https://todoist.com/showTask?id=7400339002) #todoist %%[todoist_id:: 7400339002]%%
- [ ] SOW [link](https://todoist.com/showTask?id=7400339019) #todoist %%[todoist_id:: 7400339019]%%
- [ ] [HR Request Made] [[c3/contractors/readme#Initial HR Information Request [link](https://todoist.com/showTask?id=7400339025) #todoist %%[todoist_id:: 7400339025]%%

	2022-12-14-11:39

	@lefv

	 Please inform HR. Per compliance policy, all New user account creations; whether it be employee/contractor/intern, must originate and end with HR and then be passed to IT via an "Employee Status change" ticket. 

## Account Access[^1]

- [ ] Office 365 [[c3/contractors/readme#Office 365]] [link](https://todoist.com/showTask?id=7400339030) #todoist %%[todoist_id:: 7400339030]%%
- [ ] OpenAir [[c3/lib/tickets/OPEN-AIR]] [link](https://todoist.com/showTask?id=7400339039) #todoist %%[todoist_id:: 7400339039]%%
	  Note: Project needs to be assigned by DM.
- [ ] Okta [[c3/contractors/readme#Okta]] [link](https://todoist.com/showTask?id=7400339050) #todoist %%[todoist_id:: 7400339050]%%
- [ ] GovBox [[c3/contractors/readme#GovBox Access]] [link](https://todoist.com/showTask?id=7400339058) #todoist %%[todoist_id:: 7400339058]%%
- [ ] VPN [[c3/contractors/readme#VPN Access]] [link](https://todoist.com/showTask?id=7400339069) #todoist %%[todoist_id:: 7400339069]%%
- [ ] VM [[c3/contractors/readme#VM Access]] [link](https://todoist.com/showTask?id=7400339076) #todoist %%[todoist_id:: 7400339076]%%
- [ ] Github [[c3/contractors/readme#Github]] [link](https://todoist.com/showTask?id=7400339083) #todoist %%[todoist_id:: 7400339083]%%
- [ ] Figma [[c3/lib/tickets/figma]] [link](https://todoist.com/showTask?id=7400339091) #todoist %%[todoist_id:: 7400339091]%%
- [ ] MyApps Access [link](https://todoist.com/showTask?id=7400339097) #todoist %%[todoist_id:: 7400339097]%%
- [ ] Jira Project (e.g., MDA) ask team lead [link](https://todoist.com/showTask?id=7400339103) #todoist %%[todoist_id:: 7400339103]%%
- [ ] UI Demo -- [link](https://todoist.com/showTask?id=7400339114) #todoist %%[todoist_id:: 7400339114]%%
- [ ] Jira and Confluence for Services Group (IT Ticket) [link](https://todoist.com/showTask?id=7400339123) #todoist %%[todoist_id:: 7400339123]%%
- [] (if applicable) MapBox API Access Token ([Account | Mapbox](https://account.mapbox.com/))

## Teams Channels and Meetings

- [ ] Invite to Federal Office Hours (AM/PM) [link](https://todoist.com/showTask?id=7400339138) #todoist %%[todoist_id:: 7400339138]%%
- [ ] Invite to Teams Help Channel [link](https://todoist.com/showTask?id=7400339159) #todoist %%[todoist_id:: 7400339159]%%
- [ ] Invite to All MDA Dev [link](https://todoist.com/showTask?id=7400339171) #todoist %%[todoist_id:: 7400339171]%%
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

## DEBUg 

```html

After much Googling and trial and error I finally managed to get connected to the C3.ai Virtual Machine with the Raytheon PCs. I emailing these instructions for reference, and I have a feeling this will be helpful for future Raytheon developers if we start to get restricted to only being able to use the Raytheon PCs. Please pin/flag this email in case we need to use it but for now I think everyone on the Raytheon side has or is getting a MacBook for local development so I say continue to use that. I really wanted to ensure this was possible so that we have a path forward in case the MacBook option goes away. My next step forward is to get “openVPN” officially approved for our use on the Raytheon side through the Raytheon FOSS (Free and Open Source Software) system.

 

Step #1: Install and setup openVPN with the C3.ai VPN.

Open Microsoft Edge (file downloading is blocked with Chrome) and download the 64-bit installer https://openvpn.net/community-downloads/
Utilize the ERPM tool to get an admin password: https://erpm.app.ray.com/PWCWeb/login
Login -%3E Passwords -> Self Recovery
                                                               i.      

Click on the three dots next to your system and click “Show Password”. This might be different -> you may have to click “Check out” or something along those lines. For the reason you can just state “OpenVPN”
                                                               i.      

Copy the password to your clipboard
                                                               i.      

Run the OpenVPN executable
On the Non-approved change prompt paste in the password and use the username of “.\COEUser”

Run through the installation steps that are attached to this email “VPNInstructions-Windows.pdf”
 

Step #2: Configure Remote Desktop to Support Connecting to the C3 VM

I found there is a specific Remote Desktop setting that needs to be changed on the Raytheon PC’s to support being able to connect to the C3 VM, else all you will get is a “Logon Attempt Failed” error when trying to connect.

https://polarclouds.co.uk/fixing-remote-desktop-annoyances/

Make sure viewing hidden files/folders is enabled on the PC
Navigate to your “Documents” folder and find a hidden file named “Default.rdp”
Edit this file with a text editor and add the following line to the end and save the file:
enablecredsspsupport:i:0
This will disable having to prompt for credentials before attempting to connect to the remote computer which allows you to bypass some default authentication behavior that would otherwise result in the logon attempt failed.
 

Step #3: Connect to the C3 VPN and VM

Disconnect from the Raytheon VPN if you are already connected
Connect to the C3 VPN

Use your C3 okta credentials for this
Open Remote Desktop
Click “Show Options”
Under “Connection Settings” click “Open” and open the “Default.rdp” file that you edited in Step #2
Enter the IP address for the VM you got assigned
In "Computer" use the IP address you are provided (for me it is 20.125.88.204)
In "User name" use AzureAD\{email} (backslash included) (for me AzureAD\Luke.Josten-c@c3.ai)
Click "Connect"
Check “don’t ask again” and click “Yes”

Once connect click “Sign-in options” and ensure “Local or domain account” is selected

Make sure to type out “AzureAD\{email}” (with backslash) for the username and then for the password use you C3.ai outlook password.
Connect and you should be able to access C3 resources on the VM (Outlook, Teams, etc.)
Let me know if these instructions work out or if anyone encounters issues if they decide to use them.

Thanks all!

Luke J Josten

Software Engineer II

Upcoming PTO: Nov 23>)

```


>> see also [pdf-instructions](file:///)

## Log

| Date                | Note                                                                                  |
|:------------------- |:------------------------------------------------------------------------------------- |
| 2022-12-13-02-31-20 | Ernest Galang stated that HR new hire ticket should specify many of the initial items |
| 2320230717_04:03:12 | Added {@luke-josten} debug steps and debug section.                                                                                       |
|                     |                                                                                       |
|                     |                                                                                       |

### Contacts

- [Kyle Altimore](mailto:kyle.altimore@c3.ai)
- [Ernest Galang](ernest.galang@c3.ai)

### Examples

- For example tickets go here [[c3/lib/tickets/readme]]

[^1]: Note: these tickets should all be included at initial onboarding.
