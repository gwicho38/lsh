// TODO: https://gkev8dev.c3dev.cloud/lefv20231117/gurusearchui/static/console/Pkg
// TODO: https://gkev8dev.c3dev.cloud/lefv20231117/gurusearchui/static/console/Pkg.Store

import { ClusterStartSpec } from "@c3/types";
import { lCluster } from "../types/lCluster.js";
import { lClusterStartSpec } from "../types/lClusterStartSpec.js";
import { c3_post } from "../../services/c3/c3.js";


let clusterSpec: lClusterStartSpec  = {
    withFailOnTimeout: function (failOnTimeout: boolean): ClusterStartSpec {
        throw new Error("Function not implemented.");
    },
    maxRetries: 0,
    withMaxRetries: function (maxRetries: number): ClusterStartSpec {
        throw new Error("Function not implemented.");
    },
    initialSleepMillis: 0,
    withInitialSleepMillis: function (initialSleepMillis: number): ClusterStartSpec {
        throw new Error("Function not implemented.");
    },
    exponent: 0,
    withExponent: function (exponent: number): ClusterStartSpec {
        throw new Error("Function not implemented.");
    },
    withMaxSleepMillis: function (maxSleepMillis: number): ClusterStartSpec {
        throw new Error("Function not implemented.");
    },
    withMaxTotalMillis: function (maxTotalMillis: number): ClusterStartSpec {
        throw new Error("Function not implemented.");
    },
    withNodeCount: function (nodeCount: number): ClusterStartSpec {
        throw new Error("Function not implemented.");
    },
    name: "lenv",
    singleNode: true,
    serverVersion: "8.3.0+197"
}


export async function clearPkg(): Promise<void> {

}

export async function bootstrapPkg(spec: lClusterStartSpec = clusterSpec): Promise<void> {

}