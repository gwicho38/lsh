import axios from 'axios';
import { Command, program } from 'commander';
import { makePOSTRequest } from '../api/api.js';
// for additional inspiration - check CloudClusterUtil type
// export async function get_c3() {
//   const config = {
//     method: 'get',
//     url: 'https://gkev8dev.c3dev.cloud/lefv202310092005/gurusearch/api/8/Jvm/currentUsage',
//     headers: {
//       'authority': 'gkev8dev.c3dev.cloud',
//       'accept': 'application/json',
//       'accept-language': 'en-US,en;q=0.9',
//       'cache-control': 'no-cache',
//       'content-type': 'application/json',
//       // Assuming 'cookie' is sensitive, ensure it's secure and not exposed.
//       'cookie': 'c3app=gurusearch; c3AppUrlPrefix=lefv202310092005/gurusearch; c3env=lefv202310092005; [your-auth-token]',
//       'origin': 'https://gkev8dev.c3dev.cloud',
//       'pragma': 'no-cache',
//       'referer': 'https://gkev8dev.c3dev.cloud/lefv202310092005/gurusearch/static/console/index.html',
//       'sec-ch-ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
//       'sec-ch-ua-mobile': '?0',
//       'sec-ch-ua-platform': '"macOS"',
//       'sec-fetch-dest': 'empty',
//       'sec-fetch-mode': 'cors',
//       'sec-fetch-site': 'same-origin',
//       'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
//       'x-c3-action-engine': 'js-client-browser'
//     },
//     data: JSON.stringify(["Jvm"]),
//     // If response is compressed, Axios should handle it automatically
//   };

//   axios(config)
//     .then(function(response) {
//       console.log(JSON.stringify(response.data));
//     })
//     .catch(function(error) {
//       console.error(error);
//     });
// }

interface Spec {
  data: [any]
}

export async function get_c3(type: String = "Jvm", spec: Spec) {

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

export async function c3_post(typeName: String = "Pkg", method: String = "inst", dataSpec: Spec = ({data: ["Pkg"]})) {
  const result = await makePOSTRequest(typeName, method, dataSpec, () => {console.log("success")});
  console.log(result);
} 