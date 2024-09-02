import Retriever from "../declarations/Retriever";

class MyRetriever implements Retriever<string> {
  transformQueryToEmbedding(query: string): string {
    // Implement your logic to transform a query to an embedding
    return "";
  }

  retrieveMostSimilar(queryEmbedding: string, topK?: number): string[] {
    // Implement your logic to retrieve the most similar items
    return [];
  }
}

export default MyRetriever;
