import { spawn } from "child_process";

export async function cmd_gcp_auth() {
  const cmd = spawn(process.env.CMD_GCP_LOGIN);
  cmd.stdout.on("data", (data) => {
    console.log(`stdout: ${data}`);
  });

  cmd.stderr.on("data", (data) => {
    console.error(`stderr: ${data}`);
  });

  cmd.on("close", (code) => {
    console.log(`child process exited with code ${code}`);
  });
}

export async function cmd_gcp_start() {
  const cmd = spawn(process.env.CMD_GCP_START);
  cmd.stdout.on("data", (data) => {
    console.log(`stdout: ${data}`);
  });

  cmd.stderr.on("data", (data) => {
    console.error(`stderr: ${data}`);
  });

  cmd.on("close", (code) => {
    console.log(`child process exited with code ${code}`);
  });
}

export async function cmd_gcp_status() {
  const cmd = spawn(process.env.CMD_GCP_STATUS);
  cmd.stdout.on("data", (data) => {
    console.log(`stdout: ${data}`);
  });

  cmd.stderr.on("data", (data) => {
    console.error(`stderr: ${data}`);
  });

  cmd.on("close", (code) => {
    console.log(`child process exited with code ${code}`);
  });
}

export async function cmd_gcp_tunnel() {
  const cmd = spawn(process.env.CMD_GCP_TUNNEL);
  cmd.stdout.on("data", (data) => {
    console.log(`stdout: ${data}`);
  });

  cmd.stderr.on("data", (data) => {
    console.error(`stderr: ${data}`);
  });

  cmd.on("close", (code) => {
    console.log(`child process exited with code ${code}`);
  });
}

export async function cmd_gcp_ps() {
  const cmd = spawn(process.env.CMD_GCP_PS);

    cmd.stdout.on("data", (data) => {
      console.log(`stdout: ${data}`);
    });
  
    cmd.stderr.on("data", (data) => {
      console.error(`stderr: ${data}`);
    });
  
    cmd.on("close", (code) => {
      console.log(`child process exited with code ${code}`);
    });
}
