import { IRetriever as Retriever } from "./Retriever";
import { ISourceCollection as SourceCollection } from "./SourceCollection";
import { ISourceFile as SourceFile } from "./SourceFile";
import { IChunker as Chunker } from "./Chunker";

export declare namespace Genai {
  // type aliases
  export const SourceCollection: SourceCollection;
  export const Retriever: Retriever;
  export const SourceFile: SourceFile;
}
