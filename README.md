# Tailscale-Exposed Dockerized Web Service (POC)

This repository contains a proof-of-concept setup for a Dockerized Python backend service (FastAPI) that exposes a secure, read-only browser view into a local filedrive, allowing users to view and download their files. The application is securely exposed onto your Tailscale VPN (tailnet) using a sidecar pattern.

The filedrive paths, Tailscale configurations, and SSL certs are fully user-configurable.

## Features

- **Read-Only Filedrive**: Browse directories, view images, and check file details safely without the risk of accidental modification.
- **File Downloads**: Directly download any file in the browser view.
- **Secure Access**: Network-isolated through Tailscale, making it accessible only to authorized devices on your tailnet.
- **User Configurable**: Mount any local folders (such as photo directories) and configure Tailscale authentication or SSL certs using a simple `.env` file.

## Prerequisites

1. **Docker & Docker Compose** installed and running.
2. A **Tailscale Account** (you can sign up at [tailscale.com](https://tailscale.com)).

---

## Service Overview

The architecture consists of two containers:
1. **`tailscale`**: Connects to your Tailscale VPN, establishing a secure tunnel.
2. **`web-service`**: Runs the FastAPI app and shares the network namespace of the Tailscale container (`network_mode: service:tailscale`). This exposes its HTTPS port `443` directly to the Tailnet.

---

## Getting Started

### 1. Configure the Environment
Create or edit the `.env` file in the root directory. You can configure:
- **`TS_AUTHKEY`**: Your Tailscale Auth Key (optional, for automated login).
- **`SSL_CERT_PATH`** and **`SSL_KEY_PATH`**: Paths to your SSL certificates inside the container.
- **Directory Paths**: Custom local directories to expose (e.g., `PHOTOS_PATH`), which are mapped into the container as read-only volumes in `docker-compose.yml`.

Example `.env`:
```env
TS_AUTHKEY=tskey-auth-xxxxxx
EXAMPLE_PHOTOS_PATH=/path/to/local/photos
SSL_CERT_PATH=/certs/tailscale.crt
SSL_KEY_PATH=/certs/tailscale.key
```

### 2. Start the Containers
Build and launch the services in the background:
```bash
docker compose up --build -d
```

### 3. Authenticate with Tailscale (Interactive Login)
If you did not provide `TS_AUTHKEY`, inspect the logs to find your login link:
```bash
docker compose logs tailscale
```
Look for a line similar to:
> `To authenticate, visit: https://login.tailscale.com/a/xxxxxxxxxxxx`

Copy and paste the URL into your browser, sign in, and authorize the device. The connection state will be stored locally in `./tailscale-state` so you don't have to authenticate again.

---

## Verification

### Local Host Verification
Host port `8443` is mapped to the shared container namespace port `443`. You can verify the web server is running locally:
```bash
curl -k https://localhost:8443/
```
*Expected Output:*
(HTML response of the file browser dashboard)

### Tailscale Verification
1. Get the Tailscale IP address assigned to the container by running:
   ```bash
   docker compose exec tailscale tailscale ip -4
   ```
2. From **any other device** connected to your Tailscale VPN, navigate to:
   ```text
   https://<tailscale-ip>/
   ```
3. (If MagicDNS is enabled in your tailnet settings) you can also use the hostname directly:
   ```text
   https://hello-poc/
   ```

---

## Troubleshooting

- **Check logs:** If the container fails to join the network, view the logs:
  ```bash
  docker compose logs tailscale
  ```
- **Permission errors:** On some systems, kernel routing requires mapping `/dev/net/tun` or adding capabilities. The current configuration includes standard `net_admin` capabilities.
- **Tear down:** To stop the services:
  ```bash
  docker compose down
  ```
- **Clear Tailscale state:** To reset and re-authenticate:
  ```bash
  docker compose down -v && rm -rf ./tailscale-state
  ```
