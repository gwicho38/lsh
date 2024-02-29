---
tags: c3-server, docker, SNE
status: WIP
---

# README | Intel v8 SNE 

This Docker image is built on the `locked-registry.c3.ai/c3:8.3.2-rc_1715` base image, designed for a C3 AI application environment. The Dockerfile outlines the installation and configuration required for the C3 AI application, including environment variables, package installations, and user setup.

## Base Image

- **Base Image:** `locked-registry.c3.ai/c3:8.3.2-rc_1715`

- RHL 8 vs. 9? Currently we're using the recommended underlying container base image with guidance from @c3-platform. 
  RHL 8 should be the base image unless instructed otherwise.

## Environment Variables

- **C3_USER** and **C3_PASSWORD** are set for C3 application access.
- **C3_DIR**, **C3_APPS_ROOT**, **DB_DIR**, and **LOG_DIR** are specified for application directories.
- **LANG**, **LANGUAGE**, and **LC_ALL** are set for locale configuration.
- **USER_HOME** and **C3_SERVER_JAR_HOME** define home directories for the C3 user and server JAR files.

## System Setup

The Dockerfile includes commands for installing essential tools and packages required for the C3 AI application and its development environment:

- **YUM Packages:** Includes `sudo`, `python3`, `pip`, `git`, `git-lfs`, `wget`, `vim`, `libgfortran`, `procps`, `java-17-amazon-corretto-devel`, and `nodejs`.
- **Amazon Corretto 17** is installed as the Java development kit.
- **Node.js** is installed from NodeSource for JavaScript runtime.

## User Setup

- A C3 user is configured with `sudo` privileges without a password.
- SSH keys and configuration are copied and set up for secure communication.
- The **C3 user** takes over after initial root configuration.

## Development Tools

_optional_

- **Homebrew** is installed as a package manager to extend the software availability.
- **Ranger**, a console file manager, is installed via Homebrew for file management.

## Application Setup

- The environment is prepared for the C3 server, including setting the server root and specifying Gradle as the build tool.
- Verbose output is enabled for debugging and logs.

## Entry Point

⭐
`ENTRYPOINT ["/usr/lib/jvm/java-17-amazon-corretto/bin/java", "-jar", "/usr/local/lib/c3/java/v8-server-8.3.2-rc+1715.jar`
⭐

Note: There was a mistake in the entrypoint command of the SNE startup file (uneeded options were causing a heap overflow). 
      Setting a manual entrypoint circumvents this behavior.


## Building Image

An example build command to save this image locally provided below. It will be mapped to the `docker-compose.yml` example.

  `# assumes $(pwd) == $(realpath(Dockerfile))`
  `docker build -t 8_32_1715:latest $(pwd)`

## How to Use This Image

To use this Docker image, ensure you have Docker installed and running on your system. You can pull this image from the specified locked registry by configuring Docker to use the registry credentials. Once pulled, you can run the Docker container with appropriate volume mounts and network settings to suit your deployment or development needs.

Ensure to replace sensitive values and configure SSH keys as needed for your specific environment.

