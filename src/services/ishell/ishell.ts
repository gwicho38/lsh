import axios from 'axios';
import { Command } from 'commander';

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
  function: String
}

export async function get_ishell(type: String = "Jvm", spec: Spec = {function: "currentUsage"}) {

}

export async function init_ishell(program: Command) {
  program
    .command('interactive')
    .description('lsh interactive shell')
    .action(async (type: String, action: String, spec: Spec) => {
      console.log(`Calling ${type}/${action}`);
    })
}