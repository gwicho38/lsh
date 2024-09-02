import { CoLBERT } from "./CoLBERT";

declare namespace Genai {
  interface SourceCollection {
    fetch: () => { objs: any[] };
  }

  namespace SourceFile {
    namespace Chunker {
      namespace UniversalChunker {
        interface Config {
          inst: () => any;
        }
      }
    }
  }

  namespace UnstructuredQuery {
    namespace Engine {
      interface Config {
        inst: () => {
          modelConfigName: string;
          extractionModelConfigName: string;
          questionRewritingModelConfigName: string;
        };
      }
    }
  }

  namespace ConfigUtil {
    function queryOrchestratorPromptConfig(name: string): any;
  }

  // Declare interfaces
  interface Retriever {
    // Declare your interfaces, types, and other namespaces here...
    interface ColBERT 
  }
}

export default Genai;
