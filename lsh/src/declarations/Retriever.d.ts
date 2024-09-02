import { ICoLBERT as ColBERT } from "./CoLBERT";

export interface IRetriever {
  transformQueryToEmbedding: (query: string) => any;
  retrieveMostSimilar: (queryEmbedding: any, topK?: number) => any;
  ColBERT: ColBERT;
}
