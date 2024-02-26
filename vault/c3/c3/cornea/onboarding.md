## GovBox

https://c3gov.box.com/s/vyobxn0pomhjehjg3q9mmzgrk5ko3bse

## Confluence

[https://c3energy.atlassian.net/wiki/spaces/GENAI/pages/8323957478/CORNEA+GURU](https://c3energy.atlassian.net/wiki/spaces/GENAI/pages/8323957478/CORNEA+GURU "https://c3energy.atlassian.net/wiki/spaces/genai/pages/8323957478/cornea+guru")

## JIRA

https://c3energy.atlassian.net/jira/dashboards/19793

## ENVS


## Lucid Diagram

https://lucid.app/lucidchart/8fe5b753-df87-479d-951e-27cf60655dae/edit?invitationId=inv_c982cdea-7f6f-4f5a-828b-66e8d113c61e&page=0_0

[c3apps@c3.ai](mailto:c3apps@c3.ai "mailto:c3apps@c3.ai")  
C3IoTC3IoT

## PowerPoint Background

[[GURU_PPT_OVERVIEW]]

## OneDrive

[CORNEA_XLAB_GURU](https://c3e-my.sharepoint.com/personal/sharedfolders_c3iot_com/_layouts/15/onedrive.aspx?id=%2Fpersonal%2Fsharedfolders_c3iot_com%2FDocuments%2FFederal%20Business%20Unit%2F02%20-%20Accounts%2F03%20-%20Intel%2F02%20-%20CORNEA%2FCORNEA%20-%20Xcelerator%20Lab%2F02%20-%20Pilot%20%26%20Prototype%2FCORNEA%20-%20XLAB%20-%20GURU&ga=1) 


## SOW

|   |   |
|---|---|
|System​|Link​|
|Pilot OneDrive​|[CORNEA - GURU](https://c3e-my.sharepoint.com/:f:/g/personal/sharedfolders_c3iot_com/EiIKsYjrOzxDhCaDbX3VcsIBJKz7Thht9NqU0m-dQTVosQ?e=cgTyHF)​|
|SOW​|[Pilot Proposal - GURU v3.docx](https://c3e-my.sharepoint.com/:w:/g/personal/sharedfolders_c3iot_com/EZ3Y2G3FJM1HqpEWYfr_siQBXnz7KohBfknoBVjbYpGHYg?e=83IBZK)​|
|Jira​|Pending​|
|Teams​|https://teams.microsoft.com/l/team/19%3aHZs0AzxCivTSO_4_RDBxacymm6zHy3ifWBavCF0iQaY1%40thread.tacv2/conversations?groupId=cf070362-0691-4450-9d93-cab424ae2670&tenantId=53ad779a-93e7-485c-ba20-ac8290d7252b​|
|Pilot GovBox​|(CUI – US Citizen Only)​<br><br>https://c3gov.box.com/s/zi1omiz0rpd8vje6jepn3w0pxo4t761j​|
|CORNEA Security Manual​|(CUI – US Citizen Only) https://c3gov.box.com/s/9qsuroy1gm31cyct6jopeak1o3bao7yc​|
|ICMP Publishing Guide​|(CUI – US Citizen Only)​<br><br>https://c3gov.box.com/s/oi55hjd7qkuc8q8hfyracjbvk2hbi36g​|
|C2S Services List​|(CUI – US Citizen Only)​<br><br>https://c3gov.box.com/s/46v8jq43e9egatanyp76jflxadx8upki​|
|C2S User Guide​|(CUI – US Citizen Only)​<br><br>https://c3gov.box.com/s/p5kbn910os9uq553zos0z90uvakup4m0​|

## DEPENDENCIES

https://c3e-my.sharepoint.com/:x:/r/personal/sharedfolders_c3iot_com/_layouts/15/Doc.aspx?sourcedoc=%7BB76D35B8-15AD-42B3-B83A-421B608853CD%7D&file=(U)%20Gen%20AI%20Libraries%20SWAP%20List.xlsx&action=default&mobileredirect=true


| library        | package(s)             | runtime(s)                                                                            | version    | package manager | Direct Dependency | Effort Removing | Notes                                | Potential Vulnerabilities                         | SWAP Status          | SWAP Comment                                                                       |
|----------------|------------------------|---------------------------------------------------------------------------------------|------------|-----------------|-------------------|-----------------|--------------------------------------|---------------------------------------------------|----------------------|------------------------------------------------------------------------------------|
| accelerate     | genaibase              | py-genai_huggingface                                                                  | 0.19.0     | conda           | No                | -               | Needed for HuggingFace hosted models |                                                   | Alt version Approved | 0.18.0 approved.  Would need to require addition of 0.19.0 or downgrade C3 package |
| fuse.js        | genaisearch            | js-webpack_c3                                                                         | 6.6.2      | npm             |                   |                 |                                      |                                                   | Alt version Approved | 6.4.1 and several other 3.X versions approved.                                     |
| ipywidgets     | genaibase, genaisearch | py-dspsearchcpu, py-colbertfaisscpu                                                   | 7.6.5      | pip             |                   |                 |                                      | https://security.snyk.io/vuln?search=ipywidgets   | Alt version Approved | 7.7.1, 7.6.3 and several lower verions approved.                                   |
| nbconvert      | genaibase              | py-chunker                                                                            | 7.4.0      | conda           |                   |                 |                                      | https://security.snyk.io/vuln?search=nbconvert    | Alt version Approved | 6.5.1, 5.5.0, and several lower versions approved                                  |
| pdf2image      | genaibase              | py-chunker                                                                            | 1.16.3     | conda           |                   |                 |                                      |                                                   | Alt version Approved | 1.16.0, 1.13.1 approved                                                            |
| pycryptodome   | genaibase              | py-chunker                                                                            | 3.18.0     | conda           | No                |                 | Needed for special pdf encodings     | https://security.snyk.io/vuln?search=pycryptodome | Alt version Approved | 3.17.0, 3.10.0 approved                                                            |
| react-markdown | genaisearch            | js-webpack_c3                                                                         | 7          | npm             |                   |                 |                                      |                                                   | Alt version Approved | Lots of approved verisons.  Mostly 8.0.X, some 7.X                                 |
| remark-gfm     | genaisearch            | js-webpack_c3                                                                         | 3.0.1      | npm             |                   |                 |                                      |                                                   | Alt version Approved | 3.0.0 approved                                                                     |
| torch          | genaibase, genaisearch | py-dspsearchcpu, py-colbertfaisscpu, py-searchcpu, py-searchgpu                       | 1.13.1     | pip             | No                | -               |                                      | https://security.snyk.io/vuln?search=torch        | Alt version Approved | 7.0, 1.3.0 approved                                                                |
| transformers   | genaibase, genaisearch | py-dspsearchcpu, py-colbertfaisscpu, py-searchcpu, py-searchgpu, py-genai_huggingface | 4.29.2, na | pip, conda      | Yes               | HIGH            |                                      | https://security.snyk.io/vuln?search=transformers | Alt version Approved | 4.11.3, 4.8.2, 4.2.2, 3.0.2 approved                                               |
dev: https://gkev8dev.c3dev.cloud/

apps: https://gkev8c3apps.c3-e.com

release1 -> https://gkev8dev.c3dev.cloud/manik/gurusearch/static/console/index.html

release2 -> https://gkev8dev.c3dev.cloud/mscharf/gurusearch/static/console/index.html

platform -> https://plat.c3ci.cloud/83/studio/home

**coe** --> https://gkev8c3apps.c3-e.com/blitztest/c3/static/console/index.html

### endpoints

#### studio

**note the backslash after studio**
> ${url}/studio/home/
#### static console

> ${url}/static/console/index.html