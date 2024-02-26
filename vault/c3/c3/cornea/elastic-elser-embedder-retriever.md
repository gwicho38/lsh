## Epic

> https://c3energy.atlassian.net/browse/COR-9

### Overview

```txt
Description: Configure a scalable indexing architecture that supports near real-time queries across massive datasets. Leveraging distributed search indexes and embedding models, this feature enhances the system's capacity to efficiently handle large volumes of data and deliver rapid query responses to 1,000s of users

As a user, I require a scalable indexing solution that can efficiently handle large volumes of data, providing me with near real-time query performance and stability as data usage patterns evolve.

Acceptance Criteria:

- The distributed search index should effectively scale its resources based on demand using elastic compute and storage clusters.
    
- The index and embedding architectures should optimize caching, compression, and approximation techniques to ensure efficient data processing.
    

Steps involved:

- Acquire spec
    
- Read the spec to see how it can integrate w/ the platform
    
- Implement functionality
```

## Requirements 

### DONE | Customer Requirements

Customer Context: Last week in the design & analysis phase of the pilot, a crucial new requirement emerged. Our GenAI requires integration into CORNEAs Elastic Learned Sparse Encoder (ELSER) database to query unstructured data.


```txt

Section 1

1.	Ability to ask questions using natural language.
2.	Access AI-generated text answers to user questions, with references
3.	Ranked list of additional relevant search results.
4.	Interactive chat interface on the right-hand side where a user can ask follow-up questions.
5.	Ability for users to provide feedback on search results and AI-generated text responses.
6.	Shall store anonymized queries for up to 2 years so that teams can see which queries are most commonly made.
7.	Shall store search history at the user-level for up to 2 years so that prior search history can be surfaced to that user in the UI.
8.	Shall capture the following metrics on each search:
a.	Number of pages in search results accessed per search.
b.	Number of search results clicked per search.
c.	Length of session (session ends when user initiates a new search, exits search, and accesses a different part of the application, or navigates to a new browser tab)
9.	Shall have controls in the application layer to ensure that users asking unsupported questions receive standard messaging (prevent overloading Search back-end with unnecessary queries)
10.	Supported source systems: Internal file stores (Amazon S3, ADLS Azure, Azure Blob, and Google GCS)
11.	Supported file types for documents: .docx, .doc, .pdf, .txt
a.	When crawling the file repository, the following metadata shall be captured and indexed for each document (if available):

b.	There shall be a cronjob to re-crawl integrated file repositories.
i.	When re-crawling, net-new documents shall be captured and indexed.
ii.	When re-crawling, any document with a Modified Date that is different from the document’s Modified Date under the previous crawl shall be re-indexed, and the Modified Date shall be re-captured.
iii.	The cronjob frequency shall be configurable.
iv.	Default Cronjob Frequency: Daily
12.	Shall only return query responses and search results with information that users are explicitly granted access to
a.	For C3 platform data and application pages, Search shall observe access controls through existing ACL permissions in the underlying application.
b.	For documents, Search shall observe access controls when documents are grouped separately by user access group in the file repository.
13.	Shall have a configuration for all language and retrieval models used in the deployment (so that a new model can be configured without requiring a redeployment of the application)
14.	Shall support up to 7 external data sources

```

### DONE | Data Sources

| Type of Data | Description | Access Method |
| ---- | ---- | ---- |
| Military Equipment and Parametrics Engineering Database (MEPED) | Contains scientific and technical characteristics and assessments (tabular, text, and image data) of foreign weapon systems used to assess equipment capabilities and identify equipment based on electronic emissions. | USG API |
| Modernized Integrated Database (MIDB) | Contains foundational military intelligence (tabular, text, and image data) including military capabilities of adversaries and infrastructure in all domains. | USG API |
| Data Catalog | Contains USG specific data. | USG API |
| Classified Data Source A | Contains tabular- and text-based geolocational data on air-, sea-, and ground-based vehicles. | USG API |
| Classified Data Source B | Contains serialized reports of air-, sea-, and ground-based vehicle activity. | USG API |
| Classified Data Source C | Contains imagery and associated metadata. | USG API |
| Classified Data Source D | Contains serialized imagery reports. | USG API |
### DONE | Personas 

> done

| User |  | Responsibilities |
| ---- | ---- | ---- |
| Report Author | Generate detailed intelligence reports by efficiently analyzing data related to environment, context, patterns, and strategic planning for military operations. | Gaining access to needed data can be a long, arduous process; mining insights can also require a lot of time upfront to review document content and structure; historical context is quite useful but often ignored because the user does not know what is available or doesn’t have time to send follow-up requests for those data. |
| All Source Analyst | Collect, correlate, and synthesize intelligence from diverse sources to create comprehensive reports for informed decision-making in military operations. | Navigating through vast volumes of data. Extracting timely insights from diverse sources. Integrating various data types and formats for a comprehensive analysis |
| Admin User | Monitor usage, add/revoke access to users, monitor query response times, see user history, create credentials, setup connectors, and more | Navigating where to find relevant information and make updates, easily find relevant metrics within an application, easily review user feedback, tracking usage at different time intervals, tracking search histories and user actions. |

> done

### DONE | Concurrency 

```txt

Target number of users = 30 users

Within 2 seconds of a request hitting the capability the generation latency is 10 seconds

Total number of users leveraging specific features 

List of Features:  

1.     **Primary Search** – 30 users 

2.     **Results Page** – 30 users

```

### DONE | KPI 

|  |  |  |
| ---- | ---- | ---- |
| **_User Story_** | **_KPI_** | **_Validation Strategy_** |
| _Search for content within unstructured data._ | ·       _% thumbs up/down_<br><br>·       _% queries receiving feedback_<br><br>·       _User comment_<br><br>·       _Top results clicked._<br><br>·       _Transfers to chat_ | ·       _Track query and response_<br><br>·       _Categorize query type._<br><br>·       _Determine if in/out of scope of corpus of data._<br><br>·       _Review model feedback (comments and thumbs up/down) weekly_<br><br>·       _Track clicks_<br><br>·       _Track follow-ups in chat_ |
| ·       _% thumbs up/down_<br><br>·       _% queries receiving feedback_<br><br>·       _User comment_<br><br>·       _Number of questions in chat_<br><br>·       _Time in chat?_ | ·       _Track query and response_<br><br>·       _Categorize query type._<br><br>·       _Determine if in/out of scope of corpus of data._<br><br>·       _Review model feedback (comments and thumbs up/down) weekly_ |  |
| ·       _Click-throughs to the application (conversion rate)_<br><br>·       _Uptick in application page views_ | ·       _Track query and response_<br><br>·       _Categorize query type_<br><br>·       _Determine if in/out of scope of corpus of data_<br><br>·       _Track clicks to application pages_<br><br>·       _Track application page views_ |  |
| _Tracking usage_ | ·       _Queries/user_<br><br>·       _Daily active users_<br><br>·       _Return users_<br><br>·       _Time spent on the app_<br><br>·       _Number of follow-ups in chat_ | ·       _Extract user logs weekly_<br><br>·       _Monitor usage across all roles_ |
| ·       _Survey responses_ | ·       _Send surveys monthly_ |  |

### DONE | Header Navigation

|  |  |
| ---- | ---- |
| **Component** | **Requirements** |
| Search Icon | - When a user selects the Search icon in the left-hand application panel, they shall be redirected to their last Search Results from their current application session, including their last accessed tab (e.g. AI Results, or Documents).<br><br>- If the user has not yet generated a search in their application session, they shall land on the Searchbar Homepage. |
| Settings Icon | - When an admin selects the Settings icon in the left-hand application panel, they shall see a self-service source configuration flow. |

### DONE | Searchbar Homepage

| Component | Requirements | Content |
| ---- | ---- | ---- |
| Classification Banner | Display the highest level of classification of the content displayed to the user. For unclassified demonstration purposes display as green banner with text of “UNCLASSIFIED” | N/A |
| C3 Generative AI Banner |  | N/A |
| Search-bar | • | Search-bar shall load in an empty state with user cursor automatically in the Search Bar (e.g. user should be able to immediately start typing their query after navigating to this page). |
| • | If user clicks into search bar, up to five suggested search queries shall display. Suggested search queries shall include: queries relevant to their most recent prior searches, and their prior search queries (in that order). |  |
| • | Once the user starts typing their query, the suggested search queries shall refresh after a 0.5 second debouncing time. The suggested search queries shall contain an exact match in the start of string for the user’s query. |  |
| • | If the suggested search query includes words that were not explicitly provided by the user, those words shall be bolded. |  |
| • | If the user clicks on a suggested search query, that query shall be populated into the Search-bar. |  |
| • | If the user uses the up and down arrows to navigate suggested search queries, the query currently in focus for the user shall be populated into the Search-bar. |  |
| • | When the user presses enter, the search shall be executed, redirecting the user to the Search Results - AI results tab. |  |
|  | Ghost text: Search Icon |  |
| Ghost text (initial): Search |  |  |
| Ghost text (after user input): <content of user query> |  |  |

### DONE | Search Results Header

| Component | Requirements | Content |
| ---- | ---- | ---- |
| Global Search-bar | • | Search-bar shall load containing the user’s query. |
| • | If user clicks into search bar, up to five suggested search queries shall display. Suggested search queries shall include: queries relevant to their most recent prior searches, and their prior search queries (in that order). |  |
| • | Once the user starts typing their query, the suggested search queries shall refresh after a 0.5 second debouncing time. The suggested search queries shall contain an exact match in the start of string for the user’s query. |  |
| • | If the suggested search query includes words that were not explicitly provided by the user, those words shall be bolded. |  |
| • | If the user clicks on a suggested search query, that query shall be populated into the Search-bar. |  |
| • | If the user uses the up and down arrows to navigate suggested search queries, the query currently in focus for the user shall be populated into the Search-bar. |  |
| • | When the user presses enter, the search shall be executed, refreshing the tab they are currently on (e.g. AI Results tab, Documents tab) with updated results. |  |
| • | When a user has generated a search and navigates to a new tab after receiving their initial search results, their search query shall be stored on the UI, and the query shall run on the new tab. |  |
|  | Ghost text: Search Icon |  |
| Ghost text (initial): Search |  |  |
| Ghost text (after user input): <content of user query> |  |  |
### DONE | AI Result
| Component | Requirements | Content |
| ---- | ---- | ---- |
| Filter Panel | • | ¬Filters shall be configurable, so that an integrating application can customize filters if desired. |
| • | Default filters shall be: |  |
| o | Modified Date - Start |  |
| o | Modified Date - End |  |
| o | File Type |  |
| • | Additional filters shall be: |  |
| o | Created Date - Start |  |
| o | Created Date - End |  |
| o | Author | Header: Filter |
| Filter 1: Modified Date - Start |  |  |
| Filter 2: Modified Date - End |  |  |
| Filter 3: File Type |  |  |
| Search Results Grid | • | Search results shall be default sorted by relevance score, which shall be based on embedding similarity. |
| • | The hyperlinked artifact shall render as a maximum of one line upon page load, trailing off in an ellipses if the artifact is longer than one line. |  |
| • | When a user selects a hyperlinked artifact from a search result, a new tab shall open with the relevant artifact, redirecting the user to the new tab. |  |
| • | When a user selects the ‘thumbs up’ feedback mechanism, the user thumbs-up shall be stored with the C3 response as metadata, noting that the response was relevant. |  |
| • | When a user selects the ‘thumbs down’ feedback mechanism, the user thumbs-down shall be stored with the C3 response as metadata, noting that the response was not relevant. |  |
| • | Default columns shall be: |  |
| o | Document Name |  |
| o | Modified By |  |
| o | Modified Date |  |
| o | File Type |  |
| • | Additional columns shall be: |  |
| o | Created Date |  |
| o | Source |  |
| • | The description of the search result shall be a pre-chunked passage that renders as a maximum of two lines upon page load, trailing off in an ellipses if the pre-chunked passage is longer than two lines. |  |
| • | If no search results are returned, the grid should load in an empty state. The grid shall display the following message: |  |
| o | Header: No Relevant Results |  |
| o | Body: There is not enough information to answer your question. Please try searching something else. |  |
| • | A maximum of 1000 search results shall be supported. |  |
| • | The Search Results grid shall display up to ten rows upon default. |  |
|  | Header: <count of total results> results |  |
| Column 1: Document Name |  |  |
| o | Row Header: <Document Name> |  |
| o | Sub-content: <first two lines of pre-chunked passage parsed from artifact> |  |
| Column 2: Modified By |  |  |
| o | <Document Author, if exists in Document Metadata> |  |
| Column 3: Modified Date |  |  |
| o | <Date Artifact was Last Updated> |  |
| o | For an externally published artifact, this most likely will be the created date (unless the publisher also has appended a ‘last modified’ or ‘last updated’ date). |  |
| o | For an internal artifact, this will correspond to the date the artifact was last updated. |  |
| Column 4: File Type |  |  |
| o | Capitalized file extension |  |
| o | Example: DOCX |  |
| o | Example: CSV |  |
| o | Example: PDF |  |
| Chat Side-panel | • | Chat side-panel behavior shall be identical to that of the AI Results tab. |


### DONE | Additional Base App Capabilities

```txt

Integration of up to eight (8) additional GURU data layers accessible through RESTful APIs
Retrieval of highest correct classification markings from documents
Improving the retrieval process with filtering and ability to add metadata information to context statements :
Recency – enable filtering of retrieved passages and addition of dates in the contextual statement. 
Credibility – enable filtering of retrieved passages and addition of sourcing information in the contextual statement. 

```

### Done | Portion Marking

Retrieve overall document classification which represents the highest correct classification levels

```txt

Portion marking is important because documents have a congressionally mandated classification dates

If you’re trying to share documents to partner nations or internally you can only distribute based on classification 

Different levels of intelligence goes to report writing process 
Portion marking enables greater distribution

```

![[elastic-elser-embedder-retriever_IMG_1_acdf5b35.png]]
## ELSER Design

**Document CRUD**

| • | Language & Retrieval Models Used                                                                                                                                                                 |
|---|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| o | Applications will need to configure language & retrieval models used in their deployment. This shall allow them to swap out underlying models without having to redeploy the Search application. |

| AI/ML Goal | AI/ML Models |
| ---- | ---- |
| Capture relevant information from documents and other sources. | Retrieval Models: These algorithms or frameworks are part of the product’s information retrieval system that ranks and retrieves relevant information in response to user queries. The models aim to determine the relevance of data in the larger corpus and provides a ranked list of results. There are various retrieval models that can be configured to function within the C3 Generative AI for Enterprise Search product. |
| Examples: ColBERT and ELSER |  |
| Support understanding of user’s context and intent, as well as generate responses that summarize results. | LLMs: These transformer-based language models are considered examples of Generative AI models. These models support better understanding of questions that are asked, so that they can be decomposed and answered in precise language from context. The Enterprise Search product can leverage LLMs for different purposes and within different frameworks across the toolchain in order to properly answer a wide variety of questions. |
| Examples: FLAN-T5, MPT, Falcon |  |

#### DONE | Limitations

**Limitations & Bias**

The following factors may degrade system performance and bias results:

**Inappropriate Material**

If there is data ingested that is harmful in nature or deemed inappropriate, the system may reveal that information within search results or summary responses. Human feedback mechanisms are built into the application to allow users to alert administrators if any content returned is harmful or inappropriate so that such material can be removed from the corpus of data.

Related DoD Responsible AI Tenants: RAI Governance, Responsible AI Ecosystem

**Inaccurate Information**

The system is designed to return information that resides within the enterprise corpus of data. It is up to the user to vet the information returned, as the models cannot determine whether the information returned is factual or constitutes disinformation. The application offers full traceability to the sources of information, allowing users to determine whether sources are credible or accurate. Administrators will have the ability to remove documents within the corpus or identify the location of data at its source, to take corrective action, if needed.

Related DoD Responsible AI Tenants: RAI Governance, Responsible AI Ecosystem, Warfighter Trust, Responsible AI Ecosystem, AI Workforce

**Bias in LLMs**

LLMs are trained a wide array of datasets that can lead to inherent biases that can reinforce stereotypes across different demographics or sub-populations. The C3 framework for QA counteracts these biases and ensures responses are grounded in retrieved texts and nothing else. Beyond that, C3 tracks metrics on bias, toxicity, and fairness to monitor for these behaviors. If systematic issues become apparent, C3 implements RL-based fine-tuning approaches to restrict that.

Related DoD Responsible AI Tenants: RAI Governance, Responsible AI Ecosystem, Warfighter Trust, Responsible AI Ecosystem


### Diagram

#### If Embedding, Retrieval, and Store in ELSER

![[elastic-elser-embedder-retriever_IMG_2_acdf5b35.png]]

```txt

sequenceDiagram
    participant User as User
    participant GenerateEmbedding as Generate Query Embedding
    participant ELSER as Elasticsearch ELSER
    participant SearchDocuments as Search Documents by Embedding

	Note over Client: Embedding Process in Client Application
    User->>+GenerateEmbedding: Query (text)
    GenerateEmbedding->>+ELSER: Generate embedding using ELSER
    ELSER->>-GenerateEmbedding: Query embedding
    GenerateEmbedding->>+SearchDocuments: Query embedding
    SearchDocuments->>+ELSER: Search with embedding using ELSER
    ELSER->>-SearchDocuments: SearchResponse<Document[]>
    SearchDocuments->>-User: Documents (search results)


```


#### If Retrieval and Store in ELSER (current approach)

![[elastic-elser-embedder-retriever_IMG_3_acdf5b35.png]]

> mermaid definition 

```txt

sequenceDiagram
    participant Client as Client Application
    participant ES as Elastic ELSER Service
    Note over Client,ES: Embedding done by Client

    Client->>+Client: Input Text Query
    Client->>+Client: Generate Query Embedding
    Note right of Client: Embedding Process in Client Application
    Client->>+ES: Search Documents by Embedding
    ES->>-Client: Return Search Response
    Note over Client: Process and Display Results


```
### Elser Interface

```ts

// Define basic types for clarity
type Document = {
    id: string;
    text: string;
    embedding: number[]; // Assuming embeddings are arrays of floats
};
type Query = string;
type SearchResponse<T> = {
    documents: T[];
    total: number;
    timeTaken: number; // Time taken for the search in milliseconds
};

// Function to index a document with an embedding in Elasticsearch ELSER
function indexDocument(document: Document): Promise<void> {
    // Implementation interacts with Elasticsearch ELSER's REST API to index the document
}

// Function to generate a search query embedding using Elasticsearch ELSER
function generateQueryEmbedding(query: Query): Promise<number[]> {
    // Implementation utilizes an external machine learning model, with ELSER for embeddings
}

// Function to search documents in Elasticsearch ELSER based on an embedding
function searchDocumentsByEmbedding(embedding: number[], topK: number = 10): Promise<SearchResponse<Document>> {
    // Utilizes Elasticsearch ELSER's vector search capabilities for document retrieval
}

// Example usage demonstrating the use of Elasticsearch ELSER for document retrieval
async function performSearch(query: Query) {
    const queryEmbedding = await generateQueryEmbedding(query);
    const searchResponse = await searchDocumentsByEmbedding(queryEmbedding);
    return searchResponse.documents;
}



```

## References

> https://c3energy.atlassian.net/wiki/spaces/GENAI/pages/8548843624/Elastic+ELSER+Connector

(U) CORNEA GURU Expansion Internal Kickoff

https://c3energy.atlassian.net/wiki/spaces/ENG/pages/8412397615/Vector+Store+Design+Document

https://c3energy.atlassian.net/wiki/spaces/ENG/pages/8404535713/Vector+Store+Research#Pros%2FCons-of-various-vector-DBs