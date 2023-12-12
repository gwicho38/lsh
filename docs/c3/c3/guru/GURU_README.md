---
tag: c3
sticker: emoji//1f4d3
type: readme
---
# GURU REAME

## BACKGROUND

Spec:

https://c3e-my.sharepoint.com/:w:/g/personal/sharedfolders_c3iot_com/EenQ0nOC-N9NsoGSbx2FA7cBxcz3Iz4Mx8i4FFypg_6rqg?e=JdEf6w

2023-09-05 12:46: https://sway.office.com/VKEeLyjFep8rlp2F?ref=Link

2023-09-05 12:46: [raw_pdf](~/raw/20230905_CORNEA GURU Enterprise Search Product Specification.pdf)  

Use case: 

	Data Sources many. 

	Find x in N Data Source. 

	Summarize x once found.

App definition -- GURU:

Generative Unified Retrieval Utility (GURU)

Data Source Info:

	
Summary Information:

	> environmental
	> equipment
	> pattern context
	
Interface:

	> NLP queries are made against N Data Sources.

	![[Pasted image 20230824150744.png]]

> Narrative Presentation of User UI Flow: 

  ```text

    (1) [user -> query to orchestration agent]
    
    (2) [app feedback]
      
          (a) summarization agent --> qa-style model presents summary input

          (b) vizualization agent --> app presents virtualization option list

    (3) [conditional tool selection occurs] 

        --> this will bifurcate sequence flow between:

          (a) api query agent

          (b) elastic query agent

    (4)(a) [api query agent selected]

          pool: 

            - Track Source T API Agent 

            - Track Source F API Agent 

            - Geo DB G API Agent 

            - API Data Catalog

    (4)(b) [elastic query agent selected]

          Date Types: 

            - MI 

            - ME 

            - wikipedia-like

            - data catalog 

          Elastic Data States:

            - Live Data:

              RSS 

              api

              Files 


            - DB Replication

              Reference Data 


            - EFS 

              Mission data

              imagery + metadata (FS) --> data catalog & sample data
  

  ```
  
  


> Request Flow:

```moobi

[user] -> [query1]

[query1] -> [geospatial dbs]

[geospatial dbs] -> [area context]

[area context] -> [query2]

[query2] -> [equipment DBs]

[equipment DBs] -> [capability context]

[area context] && [capability context] --> [query3]

[query3] -> [imagery DBs] -> [image context]

[area context] && [capability context] && [image context] -> [report]

```

DBs:

> geospatial dbs (aka environmental)

	   > DS1, DS2, DS3
	   
> equipment dbs:

	> DS 4, DS5

> area context (aka pattern)

	> DS6, DS7
	
---

![[Pasted image 20230824153144.png]]

![[Pasted image 20230824153252.png]]



---


> Question Families:

|   |   |   |
|---|---|---|
  
|Topic Family|Description|Queries|
|Situational Awareness|Details of force dispositions in time and space|How many military aircraft are aloft in Country A’s airspace currently?|
|How many vessels were tied up yesterday at Country B’s largest naval base?”|
|Collection|Information about recent collection and current coverage|What was most recently collected over Country A?|
|How much imagery is blocked by cloud cover over Country B?|
|Enterprise Knowledge / Order of Battle|Insights from serialized reporting|Summarize the past 2 months of activity of Country A’s 92nd Motor Rifle Division.|
|What is the strength of chemical units normally stationed at the Country A-Country B DMZ?|
|Pattern of Life|Identification of trends across time and space|How many maritime patrol sorties fly near Country A’s exclusivity zone on an average day?|
|How full were berths at Country B’s largest port this month compared to last month?|
|Capabilities|Details from foundational military intelligence|What is the range of Country A’s most advanced SAM system|
|Rank aircraft carriers by how many airborne targets they can simultaneously track.|



Justification:

	> Less time spent searching databases for contextual information increases report throughput and quality, enabling faster delivery of mission-critical information to the warfighter and policymakers.

{@ti57447tpm57p}_230824_02:57:47 


### Personas

![[Pasted image 20230824150925.png]]

![[c3/guru/Untitled Diagram.svg]]

### BUSINESS JUSTIFICATION

> source: remington barrent @ 12:41 PM EST over teams.

**Aggregation Problem**

Question: _What types of aircraft can use the PL-8 missile?_

Outcome: _The PL-8 missile is compatible with the Chengdu J-7 and the J-8A aircraft._

Desired Outcome: _The PL-8 missile is compatible with the Xian XH-7, Chengdu J-7, J-8, J-10, and J-20, and Shenyang J-11 and J-16 aircraft._

Description: GURU should find every mention of the PL-8 in relevant aircraft documents and then summarize across all mentions rather than plucking “_Chengdu J-7 and the J-8A aircraft”_ passage verbatim from a single document.

**Named Entity Resolution**

Question: _What types of aircraft can use the PL-8 missile?_

Outcome: _The PL-8 missile is compatible with the Chengdu J-7 and the J-8A aircraft._

Desired Outcome: _The PL-8 missile is compatible with the Xian XH-7, Chengdu J-7, J-8, J-10, and J-20, and Shenyang J-11 and J-16 aircraft._

Description: GURU should correctly discern between many similarly named entities (e.g., J-8, J-8A, J-8IE, J-8 ACT, J-8B, J-8B Block 2, J-8 Peace Pearl, J-8C, J-8D, J-8F, J-8H, JZ-8F, J-8 II ACT) and their very different characteristics.

**Source Recency**

Question: _How many runways are at Longtien?_

High-scoring retrieval: _… Date: 11 November 1962 … Logtien has one operational runway._

Desired high-scoring retrieval: _… Date: 23 August 2023 … Logtien has two operational runways._

Description: GURU should (a) sort sources by dates and (b) extract and display dates in the answer to provide users with an understanding of the recency. If possible, GURU should consider extracted or metadata dates in its scoring algorithm.

**Agent Logic/Explainability**

Question: _What is the distance between the southernmost point in Spain and the northernmost point of Morocco?_

Outcome: _The distance between the southernmost point in Spain and the northernmost point of Morocco is 934 kilometers._

Desired Outcome: _The distance between the southernmost point in Spain (39.33, -4.84) and the northernmost point of Morocco (31.17, -7.34) is 934 kilometers._

Description: GURU should either (a) provide agent logic in answer (above) or (b) provide all agent steps in some way. The goal is to provide users with details to help fact check answer and determine whether LLM has interpreted question correctly.


## REQUIREMENTS

### PILOT FEATURES

> elastic integration
> 
>> Seamlessly integrate elastic vector database to store and manage context embeddings, enabling efficient storage, retrieval, and manipulation of high-dimensional data. 
>> 
>> This integration enhances the system's ability to handle vast amounts of contextual information for precise response generation.
> 
> georectification 
> 
>> Georectify track files and imagery metadata to align spatial information with real-world coordinates, enabling location-specific user queries that return accurate polygon boundaries. By leveraging reverse geocoding and boundary extraction, this feature enables the system's ability to provide geospatial context for user queries
>> 
> geospatial payloads
> 
>> Enhance the system's response generation capabilities by incorporating geospatial payloads, enabling the inclusion of location-specific information and polygon boundaries in generated responses. 
>> 
>> Note: this would have been implemented in release 2.2

> air-gapped v8 deployment
>> Ensuring the functionality to develop on the C3 AI Platform v8 and deploying the GenAI application from an air gapped environment

*for more info see* ==> [[GURU_PILOT_FEATURES_2023-08-25_10.50.52.png]]

### DS PROPOSAL

![[Pasted image 20230825111222.png]]

---

![[Screenshot 2023-08-25 at 11.13.48.png]]

---

![[Screenshot 2023-08-25 at 11.14.22.png]]

---
![[Screenshot 2023-08-25 at 11.15.37.png]]

---

![[Pasted image 20230825111631.png]] 

---
![[Pasted image 20230825111710.png]]


### ACCEPTANCE CRITERIA

```text

1.LM – What is the performance of various LLMs on various tasks?

2.Evaluation Harness – How does GURU respond to classes of tasks over time?

3.Query routing – To what extent does GURU search the correct data source based on the query context?

4.Search/retrieval – To what extent does GURU search/retrieval framework surface relevant sources?

5.Answer – To what extent does GURU correctly answer questions and cite back to sources?

6.Human Performance – How does GURU ‘feel’?

7.Responsible AI – How does GURU meet standards for bias, MLDevOps, etc.?

```

## ARCHITECTURE

![[Pasted image 20230825111923.png]]

![[Pasted image 20230825112011.png]]

![[Pasted image 20230824153717.png]]

![[Pasted image 20230825112043.png]]

![[Pasted image 20230825112123.png]]

```

BERT, which stands for **Bidirectional Encoder Representations from Transformers**, is based on Transformers, a deep learning model in which every output element is connected to every input element, and the weightings between them are dynamically calculated based upon their connection.

```

![[Pasted image 20230825112344.png]]

![[Pasted image 20230825112438.png]]

### Lucid Diagram

https://lucid.app/lucidchart/8fe5b753-df87-479d-951e-27cf60655dae/edit?invitationId=inv_c982cdea-7f6f-4f5a-828b-66e8d113c61e&page=0_0

---

### LLM Sequence Flow

```text

;; ingestion
[data] -> [pipeline] 

[pipeline] -> [object_model]

[object_model] || [orechestration] -> [embedding_model]

[object_model] -> [data_engine]

[object_model] <-> [orchestration]

[embedding_model] -> [persistence_vectordb] || [persistence_distributed_file_system]

[data_engine] -> [persistence]

[orechestration] -> [agents]

[agents] === [unstructured data gent] || [c3_type_system_agent (structured)] || [c3 type system agent (time-series)] || [visualization agent] 

[orchestration] <-> [re-ranking model] || [task-specific-fine-tuned-llm]

[orchestration] <-> [application] 

```

### VECTORS

![[Pasted image 20230824162724.png]]

> Vector Write 

```text 

[raw] -> [embedding model]

[embedding model] -> [output embdedded vector [0, 0.1 ...]] -> [indexing]

[metadata] -> [indexing]

[indexing] -> [DB]

```

> Vector Read

```text

[query] -> [translation] -> [metadata index]

[embedding mode] -> [vector index]

[vector index] && [metadata index] -> [Appropximate Nearest Neighbor]

[ANN] -> [vector]

```


>> LATENT SPACE 
>
https://www.baeldung.com/cs/dl-latent-space#:~:text=In%20the%20latent%20space%2C%20images,animal%20classification%20model%20may%20seem.


### ORCHESTRATION AGENT

![[Pasted image 20230824164155.png]]

![[Pasted image 20230824164500.png]]

![[Pasted image 20230824164557.png]]

### GEORECTIFICATION

```
Georectifying --- **The digital alignment of a satellite or aerial image with a map of the same area**. In georectification, a number of corresponding control points, such as street intersections, are marked on both the image and the map. These locations become reference points in the subsequent processing of the image.


```

### VECTOR vs RASTER

![[Pasted image 20230824165214.png]]

> Vector data represents geographic data symbolized as points, lines, or polygons. Raster data represents geographic data as a matrix of cells that each contains an attribute value. While the area of different polygon shapes in a data set can differ, each cell in a raster data set is the same cell. The size of the area in the real world that each cell represents is known as the spatial resolution.


### RASTER

[** MAIN SOURCE **](https://www.gislounge.com/geodatabases-explored-vector-and-raster-data/) 


```
### Cell-based surface GIS data

Raster data (also known as grid data) represents the fourth type of feature: surfaces.  

Surface raster data is a type of raster data that represents continuous phenomena or variables that are related to the surface of the Earth. Surface raster data is typically used to model and analyze physical or environmental variables across a landscape such as elevation, slope, aspect, temperature, or precipitation.

Surface raster data is commonly represented by a grid of pixel values that correspond to the values of the variable being measured at each point on the surface.

For example, a surface raster dataset that represents elevation might have a pixel value at each grid location that corresponds to the elevation of that location.

As mentioned previously, raster data is cell-based containing coordinate information and values for each cell. Cell values can contain information such as the elevation of that cell, the slope, rainfall, or any other surface value that is spread across the geographic region.
```

> Integer vs floating point values in raster data


```
In raster data, floating point refers to a data type that allows for the representation of real numbers with fractional values. Unlike integer data types, which only allow for whole numbers, floating point data can represent values that fall between integer values, such as 3.14 or 5.5.

Floating point raster data is often used in applications that require high precision, such as scientific or engineering simulations, where small variations in values can have a significant impact on the results. It can also be useful in GIS analysis applications that require more precise calculations, such as slope or terrain analysis.

It is important to note that floating point data requires more storage space and processing power than integer data, and it can be more prone to rounding errors and other numerical issues.

The number of cells in a raster data set is dependent upon the geographic extent of the layer and the resolution of the cells.
```

#### DISCRETE vs CONTINUOUS RASTER

> Discrete

```md

Discrete data values are distinct, separate values that are often categorical or nominal in nature, such as land cover types or land use categories.

Discrete data is typically represented by integer values in raster data, with each unique value representing a different category or class.

```

> Continuous 

```md

Continuous data values, on the other hand, are numeric and represent measurements that can take on any value within a range.

Examples of continuous data in raster GIS include elevation or temperature data. Continuous data is typically represented by floating point values in raster data, with each pixel value representing a continuous measurement of the variable being measured.

```

#### Types of Raster Data

> thematic data, spectral data, and pictures (imagery)

>> thematic --> This example of a thematic raster dataset is called a Digital Elevation Model (DEM). Each cell presents a 30m pixel size with an elevation value assigned to that cell.
>
> spectral --> ?
>
> images --> ?


### SEARCH RETRIEVAL FRAMEWORK

[demonstrate-search-predict](https://medium.com/@claude.feldges/document-understanding-with-the-dsp-framework-using-stanford-state-of-the-art-search-engine-d35ea73d4ed8)

*see also* --> [[Screenshot 2023-08-25 at 11.09.39.png]] 

[retrieve-extract-answer]([[![[Pasted image 20230825111105.png]]]]) 

*see also* --> [[Screenshot 2023-08-25 at 11.07.28.png]] 


## ENVIRONMENTS

lefv: https://gkev8dev.c3dev.cloud/mscharf/gurusearch/static/console/index.html

release1 -> https://gkev8dev.c3dev.cloud/manik/gurusearch/static/console/index.html

release2 -> https://gkev8dev.c3dev.cloud/mscharf/gurusearch/static/console/index.html

platform -> https://plat.c3ci.cloud/83/studio/home

## OPPS

%%dev vs prod (high side) environment%%
### GCP vs AWS

- v8 dev cluster        -> gcp
- v8 c2e airgap         -> aws
- customer highside -> aws 



### HARDWARE PROFILE

![[Pasted image 20230824163825.png]]

### DEPENDENCIES

{@ti6145tam6p}_230918_11:06:45

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

### HW COST ESTIMATE

https://c3e-my.sharepoint.com/:x:/r/personal/sharedfolders_c3iot_com/_layouts/15/Doc.aspx?sourcedoc=%7B13D786F2-9B7F-43B1-89C7-F5A651153431%7D&file=(U)%20GURU%20Estimate%20V2.xlsx&action=default&mobileredirect=true



### HIGH SIDE DEPLOYMENT

#### Context

> Supported Specs

[Aaron Brown: On another side note, AWS solution architects were telling me today w...](https://teams.microsoft.com/l/message/19:92d464fcf14d4d55abdb36f7e21f1dbe@thread.v2/1695261653321?context=%7B%22contextType%22%3A%22chat%22%7D)

sent on September 20, 2023 22:00
AWS solution architects were telling me today we should be able to take myltuple AWS p4 instances with Nvidia a100s 40GB and virtualize to support larger models like falcon 40B or 180B that require more resources.

AWS was saying they can virtualize multiple P4 instances and pool them together to provide us more compute to service these larger parameters models

My understanding is that as of now, we can only shard a model across the GPUs on one single node

Sharding across multiple nodes is a potential capability down the line

> Model Capabilities

The Falcon 40B will run great on one of the `p4d.24xlarge` nodes, potentially even two models on one of them.

Falcon 180B might need p4de to run, and it has licensing complications

[10/9 17:06] Armen Hagopian

Aaron Brown What exactly is the ask we still have? I thought they confirmed the instance availability on the call today

We confirmed the instance though not the hardware profile which from what I understand Adam Gurary recommends we verify

[Adam Gurary: Aaron Brown We do not currently have a development or QA instance. Fo...](https://teams.microsoft.com/l/message/19:92d464fcf14d4d55abdb36f7e21f1dbe@thread.v2/1696900314602?context=%7B%22contextType%22%3A%22chat%22%7D)

sent on October 9, 2023 21:11

[Aaron Brown: For now the latter since we need to do first do a functions check. We...](https://teams.microsoft.com/l/message/19:92d464fcf14d4d55abdb36f7e21f1dbe@thread.v2/1696902905156?context=%7B%22contextType%22%3A%22chat%22%7D)

sent on October 9, 2023 21:55

[Aaron Brown: Luis Fernandez de la Vara / Matthew Scharf / Armen Hagopian - please ...](https://teams.microsoft.com/l/message/19:92d464fcf14d4d55abdb36f7e21f1dbe@thread.v2/1697138998774?context=%7B%22contextType%22%3A%22chat%22%7D)

sent on October 12, 2023 15:29

The administration tutorial above takes you through serving a falcon 40B model on large hardware. For simply testing the completion API on the Plat cluster, you'll need to use the model `facebook/opt-125m` instead of `tiiuae/falcon-40b` and use this hardware profile instead:

hwProfile  = c3.HardwareProfile.upsertProfile({  
  "name": '1xt4_30cpu_115mem',  
  "cpu": 30,  
  "memoryMb": 115000,  
  "gpu": 1,  
  "gpuVendor": "nvidia",  
  "gpuKind": "nvidia-t4"  
})

all other instructions from the administration tutorial should hold.

[[c3/ticket/plat-75382#Grant permission to create multi-node env in Plat Studio for team testing LLM serving feature]]   

[Aaron Brown: John Abelt / Adam Gurary - Can you please send me the platform ticket...](https://teams.microsoft.com/l/message/19:92d464fcf14d4d55abdb36f7e21f1dbe@thread.v2/1697755185097?context=%7B%22contextType%22%3A%22chat%22%7D)

sent on October 19, 2023 18:39

Package with the MlPipes used are here: [https://github.com/c3-e/c3server/tree/release/platform/repo/server/modelInferencePipes](https://github.com/c3-e/c3server/tree/release/platform/repo/server/modelInferencePipes "https://github.com/c3-e/c3server/tree/release/platform/repo/server/modelinferencepipes")

Model inference service: [https://github.com/c3-e/c3server/tree/release/platform/modelInferenceServiceBase/src/main/c3/modelInferenceServiceBase](https://github.com/c3-e/c3server/tree/release/platform/modelInferenceServiceBase/src/main/c3/modelInferenceServiceBase "https://github.com/c3-e/c3server/tree/release/platform/modelinferenceservicebase/src/main/c3/modelinferenceservicebase")

[Yesterday 16:52] John Abelt

Adam Gurary - do the user guides change at all with the addition of continuous batching? Is that already covered?

[Yesterday 16:53] Adam Gurary

We’ll have to add a small section to cover enabling/disabling continuous batching, but I believe it’s enabled by default

20231110
02:54:52

[Ben Dohmeier: Adam, John, and Matthew, I have a couple questions about starting th...](https://teams.microsoft.com/l/message/19:92d464fcf14d4d55abdb36f7e21f1dbe@thread.v2/1699645639383?context=%7B%22contextType%22%3A%22chat%22%7D)

sent on November 10, 2023 14:47

- Are there any restrictions with deploying LLM Service in the c3 environment?
- What commands can we use to verify that the modelInferenceService and modelInference(Client) are actually connected, without registering a VllmPipe? this would be after setting the config in the client app

## RELEASE


current branch --> 5cda7dab5e937da905b53866e7082c2aec2ba2c0

## VALIDATION & TESTING

![[Pasted image 20230825112821.png]]

![[Pasted image 20230825112926.png]]

### T&E CORPUS

[te&e](https://c3e-my.sharepoint.com/:x:/r/personal/sharedfolders_c3iot_com/_layouts/15/Doc.aspx?sourcedoc=%7B20D7FFD4-9B5A-400F-A817-15DD14CEC662%7D&file=(U)%20GURU%20T%26E%20Corpus.xlsx&action=default&mobileredirect=true) 

## LINKS


### %%base application repo%%

[[c3generativeAi_repo]] 


---

### %%basic application release page%%

https://c3energy.atlassian.net/wiki/spaces/GENAI/pages/8345616868/2.2+Release

---

### %%environment setup%%

[[c3_gen_ai_env_setup]]

---

### %%c3 gen ai environment%%

[[c3_gen_ai_env]] 

---

[[cornea_jira]]

---

### %%C3 Generative AI JIRA Backlog%%

[[c3_gen_ai_jira_page]]

---

### %%C3 Generative AI Confluence Page%%

[[c3_gen_ai_confluence_page]]

---

### %%PowerPoint Background%%

[[GURU_PPT_OVERVIEW]]

### %%OneDrive%%

[CORNEA_XLAB_GURU](https://c3e-my.sharepoint.com/personal/sharedfolders_c3iot_com/_layouts/15/onedrive.aspx?id=%2Fpersonal%2Fsharedfolders_c3iot_com%2FDocuments%2FFederal%20Business%20Unit%2F02%20-%20Accounts%2F03%20-%20Intel%2F02%20-%20CORNEA%2FCORNEA%20-%20Xcelerator%20Lab%2F02%20-%20Pilot%20%26%20Prototype%2FCORNEA%20-%20XLAB%20-%20GURU&ga=1) 


### %%SOW%%

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


--- 

## SCHEDULE

[guru_schedule](../raw/guru_schedule)  

## CODE REFERENCE

[[cmd_c3_gurusearch.py]]  

[[snip/lpy/ipynb/cornea]] 