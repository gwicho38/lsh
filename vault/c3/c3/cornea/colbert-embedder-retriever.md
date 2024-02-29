# colbert-embedder-retriever 
## DIAGRAM

![Create a simplified diagram illustrating the process of pre-computing document embeddings in the ColBERT model for information retrieval. The diagram should include the following minimal steps with limited graphics: 1. Document Collection: A large corpus of documents as the starting point. 2. Tokenization: Documents are tokenized into words or subwords using a tokenizer. 3. Transformer Model: Use a transformer-based neural network to generate embeddings for each token. 4. Contextual Embeddings: Emphasize that embeddings are contextually influenced by surrounding tokens. 5. Pre-computed Embeddings: Store these embeddings in an efficient format, ready for retrieval. 6. FAISS Library: Utilizes FAISS for fast similarity search, enabling quick retrieval at query time. The diagram should clearly depict these steps in a sequential flow, using minimal graphics for a clean and straightforward presentation.](https://files.oaiusercontent.com/file-NzPYlwblvY3tskhfnJAfFnqW?se=2024-02-23T16%3A33%3A34Z&sp=r&sv=2021-08-06&sr=b&rscc=max-age%3D31536000%2C%20immutable&rscd=attachment%3B%20filename%3D91bb56dd-ad0a-4ee9-900c-9171f3bb1d28.webp&sig=WjPx1iL0K8vC4JjKkVJYT5%2BQGddifzFJakHvy4JTubI%3D)

## Interface

```ts

// Define basic types for clarity
type Token = string;
type Document = string;
type Embedding = Float32Array; // Assume embeddings are represented as float arrays
type Query = string;
type DocumentID = string;
type Score = number;

// 1. Tokenization
// This function takes a document or query and returns an array of tokens.
function tokenize(text: Document | Query): Token[] {
    // Implementation would use a pre-trained BERT tokenizer
}

// 2. Generate Embeddings
// This function takes an array of tokens and returns an array of embeddings.
// Each token is transformed into an embedding using a transformer model.
function generateEmbeddings(tokens: Token[]): Embedding[] {
    // Implementation depends on a transformer model like BERT
}

// 3. Calculate Maximum Similarity Scores
// This function takes the query and document embeddings and calculates the MaxSim score.
// It returns the maximum similarity score for each query token against document tokens.
function calculateMaxSim(queryEmbeddings: Embedding[], documentEmbeddings: Embedding[]): Score {
    // Implementation of MaxSim calculation
}

// 4. Pre-compute Document Embeddings (For Efficiency)
// This function takes a collection of documents, generates, and stores their embeddings.
// It is assumed to run as a preprocessing step, not at query time.
function preComputeDocumentEmbeddings(documents: Document[]): void {
    // Implementation would generate and index embeddings using FAISS for fast retrieval
}

// 5. Retrieve Documents
// This function takes a query and returns a list of document IDs ordered by relevance.
// It leverages pre-computed embeddings and the FAISS library for efficient retrieval.
function retrieveDocuments(query: Query, topK: number = 10): DocumentID[] {
    // Implementation involves searching the FAISS index with the query embeddings
}

// Example usage:
const documents: Document[] = ["Document 1 text", "Document 2 text", ...];
preComputeDocumentEmbeddings(documents);

const query: Query = "Example search query";
const topDocuments: DocumentID[] = retrieveDocuments(query);


```

## ELASTIC ELSER



Changes in Retrieval pipeline that may change or guidance?

dense retriever.

dense retriever. 

Genai.Retriever.ColBert

	> release/develop

Retriever and Embeder

Decoupled

Embedding model and the Retriver that you'd like to use. 

metadata --> pre-filtering
	
	> retriever needs to have the same interace to allow queries on retriever
	
	dense retriever 

		post filtering tags used for enforcing ACL

		filter on files with x extension

		one Retriever options still exposes 

	> pre filtering -- to the extent
	
need to support cross-clustere search

> tagging only supported at the SourceFile --> 

does the index creation

anything beyond 

---
Branches:

> Dense

> ML

> lefv

---

The code changes are part of two major improvements, specifically addressing GENAI-1400 and GENAI-1295, which revolve around enhancing the asynchronous handling of query processes and the updating mechanism of interim statuses within the GenerativeAiResult entity. 

Here’s a distilled explanation focused on the rationale and impact of these changes: 

1. **Asynchronous Action for Query Processing (GENAI-1400):** 

	The modifications signify a shift towards an asynchronous processing model for handling queries. This is evident from the addition of the `submitQuery` function in `ChatBot.js`, which utilizes `AsyncAction.submit` for managing query execution. This approach enhances the system's efficiency by allowing queries to process without blocking the execution thread, improving response times and system throughput. - The introduction of a new status, `COMPLETED`, within `GenerativeAiResultInterimStatusEnum.c3typ`, aligns with this asynchronous model by providing a clear terminal state for the query processing workflow, thus improving the clarity and manageability of query status tracking. 
	
1. **Streamlined Status Updates (GENAI-1295):** - The code changes consolidate status updating mechanisms. Previously, interim statuses were managed with separate fields for `status` and `step` in the `GenerativeAiResultInterimStatus` entity. Now, there's a direct emphasis on simplifying this to a singular `status` field, which represents the current interim status clearly and reduces complexity. - A significant code refactor involves the removal of the `status` field from `GenerativeAiResult` and the update mechanism in `GenerativeAiResult.js`, which previously required both a `step` and a `loading` parameter. The new `updateStatus` function simplifies updates to require only a status parameter. This change not only eliminates redundancy but also enhances the code's readability and maintainability. - The updates within the `QueryEngine.py` and corresponding test suites reflect these enhancements by adopting the streamlined status update mechanism, thus ensuring consistency and reliability in status tracking across the system. Overall, these changes represent a substantial improvement in the system's ability to efficiently process queries and manage their interim statuses in a more streamlined and coherent manner. The shift towards asynchronous actions for query handling is particularly notable for its potential to significantly boost the system’s performance and responsiveness. Additionally, the simplification of status updates contributes to better code maintainability and a clearer understanding of the query processing workflow.