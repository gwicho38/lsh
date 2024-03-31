import axios from 'axios';
import { Command } from 'commander';
import { makePOSTRequest } from '../api/api.js';
import { CliClient } from './CliClient.js';
import { generateC3SessionToken } from '../api/auth.js';
import type { AsyncThinTypeSystem as AsyncThinTypeSystemV7 } from "c3-thin";
import { URL } from "url";
import https from "https";
import http from "http";
import c3_thin from 'c3-thin';
import { getC3, setC3 } from '../../store/c3.store.js';
import * as repl from 'repl';
import { c3 } from '../../store/c3.store.js';

interface Spec {
  data?: [any]
}

let c3_client: any = {};

export async function init_c3_cmd(program: Command) {
  program
    .command('c3 <cmd> [...options]')
    .description('c3 api interface')
    .action(async (type: String, action: String, spec: Spec) => {
      switch (type) {
        case 'inst':
          inst_c3();
          repl.start({
            prompt: '> ',
            useGlobal: true
          });
          break;
        case 'auth':
          c3_auth()
          break;
        default:
          break;
          // process.exit();
      }
    })
}

export function c3_auth() {
  const result = generateC3SessionToken();
  console.log(result);
  return result;
}

export async function test_c3() {
  c3_post();
}

export async function inst_c3() {
  const TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzUxMiJ9.eyJhcHAiOiJsb2NhbC1kZXYtYzMiLCJmaXJzdG5hbWUiOiJCQV9GaXJzdCIsImlzcyI6ImMzLmFpIiwiZ3JvdXBzIjpbIkMzLkNsdXN0ZXJBZG1pbiIsIkMzLkVudkFkbWluIl0sImxhc3RuYW1lIjoiQkFfTGFzdCIsInNpZCI6MSwiYXVkIjoiYzMuYWkiLCJpZHAiOiJUZXN0SWRwIiwiYzNncm91cHMiOlsiQzMuQ2x1c3RlckFkbWluIiwiQzMuRW52QWRtaW4iXSwiaWRwZ3JvdXBzIjoie30iLCJzc2lkeCI6IiIsIm5hbWUiOiJCQSIsImFjdGlvbmlkIjoiOTEwOC44MzIyNDUyMCIsImlkIjoiQkEiLCJleHAiOjE3MTE2ODE4NjMwMDAsImVtYWlsIjoiYmFAYzMuYWkifQ.ft91HEP-k7Bdj3WS84WzB3x7UpUxcN0xw_YO-A68oMpXQAKEFgB7WCxZVsNH0Nn9vYEHyIX9MkUytRz0PtDwZbdDuDN3xbGIZmYLQ1QxijJ-9G6-pAnnQ3lc-rGH4BHBvQbWWN2hoOjJSKTehd2E64NSYkVDNqcEVxNId6mnCx5iVa9hDZsPDViGwanx_zy2pCtGrqWHSDZdcIKJujokRrRqgw7jlEZL3EOC8cO1Y3vkSOOTPiCVJkqXX1WGFgPuE2uER6cPcbZd5MsS5XEjoNHYLUTsSajXTkXvtXelbrt3W4W-XkUijRtPDBSOj7xgnEQBZhStSzTNAFYVn8w7Dw";
  c3_client = new CliClient("http://localhost:8888/dev/c3", TOKEN, "dev","c3");
  setC3(c3_client);
}

export async function c3_post(typeName: String = "UiBundler", method: String = "latestStatus", dataSpec: Spec = {}) {
  const result = await makePOSTRequest(typeName, method, dataSpec, () => {console.log("success")});
  console.log(result);
} 

export async function c3_get_type_system() {

}