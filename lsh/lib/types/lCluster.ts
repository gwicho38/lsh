// import { CloudCluster, Cluster } from "@c3/types";
// import { lClusterStartSpec } from "./lClusterStartSpec";


// /**
//  * Takes @interface ClusterStartSpec
//  */
// export class lCluster implements Cluster {

//     constructor(id: string, singleNode: boolean, serverVersion: string) {
//         this.id = id;
//         this.singleNode = singleNode;
//         this.serverVersion = serverVersion;
//     }

//     id: string;
//     singleNode?: boolean;
//     serverVersion: string;
//     meta?: CloudCluster.Meta;
//     C3_ENV_NAME?: string;
//     withId(id: string): Cluster {
//         throw new Error("Method not implemented.");
//     }
//     withMeta(meta: any): Cluster {
//         throw new Error("Method not implemented.");
//     }
//     withC3_ENV_NAME(C3_ENV_NAME: string): Cluster {
//         throw new Error("Method not implemented.");
//     }
//     withLOCAL_CLUSTER_ID(LOCAL_CLUSTER_ID: string): Cluster {
//         throw new Error("Method not implemented.");
//     }
//     CLI_CLUSTER_ID?: string;
//     withCLI_CLUSTER_ID(CLI_CLUSTER_ID: string): Cluster {
//         throw new Error("Method not implemented.");
//     }
//     TEST_CLUSTER_ID?: string;
//     withTEST_CLUSTER_ID(TEST_CLUSTER_ID: string): Cluster {
//         throw new Error("Method not implemented.");
//     }
//     withSingleNode(singleNode: boolean): Cluster {
//         throw new Error("Method not implemented.");
//     }

// }