import { exec } from "child_process";

export async function cmd_gcp_auth() {
  exec("gcloud auth login", (err, stdout, stderr) => {
    if (err) {
      console.error(err);
      return;
    }

    console.log(stdout);
  });
}
