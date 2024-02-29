import axios from 'axios';
import { Command } from 'commander';
import { makePOSTRequest } from '../api/api.js';
import { CliClient } from './CliClient.js';
import type { AsyncThinTypeSystem as AsyncThinTypeSystemV7 } from "c3-thin";
// import type { AsyncThinTypeSystem as AsyncThinTypeSystemV8 } from "@c3/remote";

interface Spec {
  data?: [any]
}

let c3_client: any = {};

export async function init_c3(program: Command) {
  program
    .command('c3 <cmd> [...options]')
    .description('c3 api interface')
    .action(async (type: String, action: String, spec: Spec) => {
      switch (type) {
        case 'test':
          test_c3();
          break;
        case 'inst':
          inst_c3()
          break;
        default:
          process.exit();
      }
    })
}

export async function test_c3() {
  c3_post();
}

export async function inst_c3() {
  c3_client = new CliClient("url", "authToken", "tenant", "tag");
}

export async function c3_post(typeName: String = "UiBundler", method: String = "latestStatus", dataSpec: Spec = {}) {
  const result = await makePOSTRequest(typeName, method, dataSpec, () => {console.log("success")});
  console.log(result);
} 