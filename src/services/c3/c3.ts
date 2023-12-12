import axios from 'axios';
import { Command } from 'commander';
import { makePOSTRequest } from '../api/api.js';
import type { AsyncThinTypeSystem as AsyncThinTypeSystemV7 } from "c3-thin";
import type { AsyncThinTypeSystem as AsyncThinTypeSystemV8 } from "@c3/remote";

interface Spec {
  data?: [any]
}

export async function init_c3(program: Command) {
  program
    .command('c3 <type> [method] [spec]')
    .description('c3 api interface')
    .action(async (type: String, action: String, spec: Spec) => {
      switch (type) {
        case 'test':
          test_c3();
          break;
      }
    })
}

export async function test_c3() {
  c3_post();
}

export async function c3_post(typeName: String = "UiBundler", method: String = "latestStatus", dataSpec: Spec = {}) {
  const result = await makePOSTRequest(typeName, method, dataSpec, () => {console.log("success")});
  console.log(result);
} 