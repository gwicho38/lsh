// import axios from 'axios';
// const C3 = require('@c3/remote');
import * as C3 from '@c3/remote';
// const spec = { tier: 'FULL', interactive: true };
// process.chdir("$CWD");


export async function get_c3() {
  const options = {
    method: 'POST',
    url: 'https://stoplight.io/mocks/zapier/public-api/181772442/authentications',
    headers: { 'Content-Type': 'application/vnd.api+json', Accept: 'application/vnd.api+json' },
    data: '{\n  "data": {\n    "title": "SuperExampleCRM (example@zapier.com)",\n    "app": "868f9d3c-2ea0-4f19-a32d-a61b276ab8de",\n    "authentication_fields": {}\n  }\n}'
  };
  try {
    const { data } = await axios.request(options);
    console.log(data);

  } catch (error) {
    console.error(error);
  }
}
