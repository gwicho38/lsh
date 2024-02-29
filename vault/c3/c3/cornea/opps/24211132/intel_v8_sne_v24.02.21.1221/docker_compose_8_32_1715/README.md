---
tags: c3-server, docker-compose, SNE
status: WIP
---

# README | Intel v8 SNE 

 Services

### C3 Server

- **Image:** `8_32_1715:latest` - The Docker image for the C3 server.
- **Hostname:** `c3server_8_32_1715` - The hostname assigned to the container.
- **Container Name:** `c3server_8_32_1715` - A unique name for the container.
- **Volumes:** Maps local directories to the container for persistent data storage and access to configuration files.
  - `$HOME/tmp/:/host/tmp` - Maps a temporary directory from the host.
  - `./home/:/host/home` - Maps a home directory for application-specific files.
- **Ports:**
  - `8888:8888` - Exposes port 8888 on the host to port 8888 on the container. 
  - `9999:9000` - Maps port 9999 on the host to port 9000 on the container.
- **Restart Policy:** `always` - Ensures the container restarts automatically if it stops unexpectedly.

### Cassandra and PostgreSQL (Commented Out)

These sections are commented out but provide a template for integrating Cassandra and PostgreSQL into the environment.

They should not be necessary for the container/SNE to function normally. 

🐛  If this is not the case please contact [c3-luis-fernandez-de-la-vara](https://github.com/c3-luis-fernandez-de-la-vara)  

## Usage

1. **Prerequisites:** Ensure Docker and Docker Compose are installed on your system.
2. **Starting Services:** Use `docker-compose up -d` to start the C3 server. The `-d` flag runs the containers in the background.
3. **Accessing the C3 Server:** Connect to the C3 server through `localhost:8888/c3/c3/static/console/index.html`.
4. **Stopping Services:** Use `docker-compose down` to stop and remove the containers.

## Customization

- Adjust volume mappings as necessary to match your directory structure and storage requirements.
- Uncomment and configure the Cassandra and PostgreSQL services according to your application's data storage needs.
- Modify port mappings to avoid conflicts with other services on your host system.

## Note

This configuration is a starting point. Evaluate and adjust memory limits, environment variables, and other settings based on your specific requirements and best practices for security and performance.
