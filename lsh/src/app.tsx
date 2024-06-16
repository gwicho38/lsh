import { Command } from "commander";
import { init_lib } from "./services/lib/lib.js";
import { init_ishell } from "./services/shell/shell.js";
import { init_c3 } from "./services/c3/c3.js";
import { init_gcloud } from "./services/gcloud/gcloud.js";
import { init_search } from "./services/search/search.js";

const program = new Command();

program
  .version("0.0.0")
  .description("lsh | extensible cli client.")
  .name("lsh");
// .addHelpText('after', "<> required\n[] optional");

await init_ishell(program);
await init_lib(program);
await init_c3(program);
await init_gcloud(program);
await init_search(program);

program.parse(process.argv);