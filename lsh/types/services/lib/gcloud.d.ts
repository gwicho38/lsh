/**
 * gcloud workstations start \
  --project=remote-ws-88 \
  --cluster=cluster-cirrus-ws \
  --config=config-cirrus-ws \
  --region=us-west1 \
  apps-luis-fernandez-de-la-vara
Starting workstation: [apps-luis-fernandez-de-la-vara]
Waiting for operation [projects/remote-ws-88/locations/us-west1/operations/operati
on-1713394821232-61652d1adf7ef-892433ff-4479a5c2] to complete...done.
Started workstation [apps-luis-fernandez-de-la-vara].
 */
export declare function cmd_gcp_auth(): Promise<void>;
export declare function cmd_gcp_start(): Promise<void>;
export declare function cmd_gcp_status(): Promise<void>;
export declare function cmd_gcp_tunnel(): Promise<void>;
export declare function cmd_gcp_ps(): Promise<void>;
