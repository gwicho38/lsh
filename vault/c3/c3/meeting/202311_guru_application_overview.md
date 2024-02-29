---
id: 202311_guru_application_overview
created_date: 03/11/2023
updated_date: 03/11/2023
type: meeting
---

# 🚀  202311_guru_application_overview -> 

---
## 📢 - Project information


# 📅 - Agenda

- Application Overview
- Deliverables
- Dependencies
- Work to Date
- Work Pending
- Blockers
# 📝 - Notes

### Tracking Work

```ad-info
title: CONFLUENCE

https://c3energy.atlassian.net/wiki/spaces/GENAI/pages/8323957478/CORNEA+GURU

https://c3energy.atlassian.net/wiki/spaces/GENAI/pages/8450704280/GURU+Sprint+4+Weekly+Goals+Objectives#Week-15

``` 

	
```ad-info 
title: JIRA

https://c3energy.atlassian.net/jira/software/projects/COR/boards/1259

https://c3energy.atlassian.net/jira/dashboards/19793 
```
 

### Environments

|   |   |   |   |
|---|---|---|---|
|[https://gkev8genai.c3-e.com/](https://gkev8genai.c3-e.com/ "https://gkev8genai.c3-e.com/")|**GCP**|GenAI Product Cluster for use by DS team|
|[https://gkev8dev.c3dev.cloud/](https://gkev8dev.c3dev.cloud/ "https://gkev8dev.c3dev.cloud/")|**GCP**|GCP Env - primary Dev instance|
|[https://plat.c3ci.cloud/](https://plat.c3ci.cloud/ "https://plat.c3ci.cloud/")|**GCP**|Another GCP Dev instance|
|[https://gkev8c3apps.c3-e.com/](https://gkev8c3apps.c3-e.com/)|**GCP**|C3-Apps Environment|


GCP = low side

S3 = high side

### Architecture

#### Data Sources

![[Pasted image 20231103120547.png]]

#### Ingestion

![[Pasted image 20231103120515.png]]





#### Retrieval Model

```ad-info
title: High Level Overview

**Embedder/Retriever** – a deep learning model that is used to convert text contents into a vector representation, allowing for efficient retrieval based on semantic similarity. When text contents are transformed through an embedder, we refer to the output as the _**embeddings**_. When we are retrieving from the embeddings space, the input is also embedded.​

- _**ColBERT**_ – the default embedder used in our GenAI product​

During Development, we will be using our default **ColBERT** embedder and **FAISS** as the library for in-memory similarity search, but this will be switched when we move this to the client environment. We will use **Elasticsearch** and **ELSER** as the embedder/retriever in the client environment.

The proposed solution will use the client’s **Elasticsearch** document store and **ELSER** retrieval model to implement the embedding and vector store. This approach will replace the default ColBERT/FAISS embedder/search model that GenAI uses.

```


https://c3energy.atlassian.net/wiki/spaces/GENAI

![[Pasted image 20231103120754.png]]



#### Agent Architecture

![[Pasted image 20231103121251.png]]

### Terms

- **Unstructured Data** - text data that are stored in documents on a blob store, such as a .pdf, .docx, .pptx, .html, etc.​
    
- **Structured Data** - tabular data that are persisted in a relational database, key value store, or external database and are modeled and accessed with entity types.​
    
- **Large Language Model (LLM)** - a deep learning model specialized in text generation, usually characterized by a significant number of parameters (typically in the 5-50 billion range) and the large corpuses of text used to train them.​
    
- **Vector Store** - a type of database that is specifically optimized for storing vectors and retrieving them using a similarity heuristic, such as an approximate nearest neighbors (ANN) algorithm​
    
- _**FAISS**_ – the default vector store used in our product​
    
- **Agent** - a software component that uses an LLM to communicate in natural language to accomplish a prescribed set of tasks; these objectives can be accomplished by using the tools that have been provided to the agent, or any other agents that this agent is allowed to communicate with​
    
- **Tool** - a specific function that an agent has access to while attempting to accomplish a given task; e.g. vector store similarity search, query to a SQL database, request to an external API, etc.​
    
- **Orchestration** – the process of choosing which tool is most effective to perform a task, given the semantic understanding of a prompt.



### Dependencies

|**  <br>Component**|**Target Version**|**Date**|**LINK**|
|---|---|---|---|
||GenAI|2.3.||[Link to github](https://github.com/c3-e/c3generativeAi/tree/release "https://github.com/c3-e/c3generativeAi/tree/release")|
||C3 Server|8.3.1+242. The new C3 AI LLM Service capability for open source LLMs is only available from this version onwards.|||

### Access Control

The current list of Roles supported in the C3 AI Platform are:

- **ClusterAdmin**
    
- **EnvAdmin**
    
- **AppAdmin**
    
- **UserAdmin**
    
- **Developer**
    
The descriptions of the `StudioAdmin` and `StudioUser` roles below are enforced using Role permissions.

- **StudioAdmin**: The `StudioAdmin` role can:
    
    - Create an unlimited number of single node environments (SNEs) or shared environments.
        
    - Remove or terminate environments in which they are assigned an `admin`.
        
- **StudioUser**: The `StudioUser` role can:
    
    - Create a maximum of _one_ SNE. This role does not grant permissions to create a shared environment.

**Note**: A [User](https://developer.c3.ai/docs/8.3/type/User "https://developer.c3.ai/docs/8.3/type/User") cannot create or provision [Role](https://developer.c3.ai/docs/8.3/type/Role "https://developer.c3.ai/docs/8.3/type/Role")s with higher security level than their own.

### Repo Structure

```
.
├── guruSearch
│   ├── config
│   ├── gen
│   ├── metadata
│   ├── resources
│   ├── src
│   └── test
└── guruSearchUI
    ├── gen
    ├── metadata
    ├── src
    └── ui

```


### Deliverables


# 💠 - Action items

[[20231103]] 