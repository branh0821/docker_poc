# Tailscale-Exposed Dockerized Web Service (POC)

This repository contains a proof-of-concept setup for a Dockerized Python backend service (FastAPI) exposed securely onto your Tailscale VPN (tailnet) using a sidecar pattern.

## Prerequisites

1. **Docker & Docker Compose** installed and running.
2. A **Tailscale Account** (you can sign up at [tailscale.com](https://tailscale.com)).

---

## Service Overview

The architecture consists of two containers:
1. **`tailscale`**: Connects to your Tailscale VPN, establishing a secure tunnel.
2. **`web-service`**: Runs the FastAPI app and shares the network namespace of the Tailscale container (`network_mode: service:tailscale`). This exposes its port `80` directly to the Tailnet.

---

## Getting Started

### 1. (Optional) Provide a Tailscale Auth Key
If you want automated configuration:
1. Generate an Auth Key in your [Tailscale Admin Console Settings](https://login.tailscale.com/admin/settings/keys).
2. Create a `.env` file in this directory and add:
   ```env
   TS_AUTHKEY=tskey-auth-xxxxxx
   ```
If you do not provide this, you will authenticate using an interactive link in the logs (see Step 3).

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
We mapped host port `8080` to the shared container namespace port `80`. You can verify the web server is running by hitting it locally:
```bash
curl http://localhost:8080/landing
```
*Expected Output:*
```text
Hello
```

### Tailscale Verification
1. Get the Tailscale IP address assigned to the container by running:
   ```bash
   docker compose exec tailscale tailscale ip -4
   ```
2. From **any other device** connected to your Tailscale VPN, run:
   ```bash
   curl http://<tailscale-ip>/landing
   ```
3. (If MagicDNS is enabled in your tailnet settings) you can also use the hostname directly:
   ```bash
   curl http://hello-poc/landing
   ```

*Expected Output:*
```text
Hello
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
