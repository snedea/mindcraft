# Running Andy in Docker

This guide explains how to run Andy as a persistent Docker container that runs 24/7 without needing to keep a console open.

## Why Docker?

- ✅ **24/7 Operation** - Andy runs continuously in the background
- ✅ **No Console Required** - Close your SSH session, Andy keeps running
- ✅ **Auto-restart** - If Andy crashes, Docker automatically restarts him
- ✅ **Easy Management** - Simple docker commands to start/stop/view logs
- ✅ **Consistent with Homelab** - Follows the same pattern as your other services

## Quick Start

### 1. Initial Setup (First Time Only)

```bash
cd /home/chuck/homelab/mindcraft

# Copy environment template
cp example.env .env

# (Optional) Edit .env if you need to change ports
nano .env
```

### 2. Start Andy

```bash
# Build and start Andy in the background
docker compose up -d --build

# View logs to confirm Andy is running
docker compose logs -f mindcraft
```

That's it! Andy is now running in the background. You can close your SSH session and he'll keep going.

### 3. Access the Web UI

The web interface runs on port 8080 on your server:

**Option A: SSH Tunnel (from your local machine)**
```bash
ssh -L 8080:localhost:8080 chuck@srv853630
```
Then open: http://localhost:8080

**Option B: Direct Access (if you have firewall access)**
```bash
# Open firewall port (one time only)
sudo ufw allow 8080/tcp

# Then access from browser:
http://YOUR_SERVER_IP:8080
```

**Option C: Reverse Proxy via Caddy**
Add to your Caddy config to access via admin.minepad.cc/andy

## Daily Operations

### View Andy's Logs
```bash
docker compose logs -f mindcraft
```
Press Ctrl+C to exit (Andy keeps running)

### Stop Andy
```bash
docker compose down
```

### Restart Andy
```bash
docker compose restart mindcraft
```

### Start Andy (if stopped)
```bash
docker compose up -d
```

### Update Andy After Code Changes
```bash
docker compose down
docker compose up -d --build
```

### Check if Andy is Running
```bash
docker compose ps
```

## Editing Andy's Configuration

You can edit Andy's profile without rebuilding the Docker image:

```bash
# Edit Andy's profile
nano andy.json

# Restart to apply changes (rebuilding not needed!)
docker compose restart mindcraft
```

Same for general settings:
```bash
nano settings.js
docker compose restart mindcraft
```

## Accessing from admin.minepad.cc

To control Andy from your admin interface, you have several options:

### Option 1: Add Reverse Proxy to Caddy

Edit your Caddy configuration:
```
admin.minepad.cc {
    # Your existing admin panel config...

    # Add Andy's web UI
    handle_path /andy/* {
        reverse_proxy localhost:8080
    }
}
```

Then access: https://admin.minepad.cc/andy

### Option 2: Add Direct Link

Just add a link in your admin panel that opens in a new tab:
- SSH tunnel users: http://localhost:8080
- Direct access users: http://YOUR_SERVER_IP:8080

### Option 3: Embed in iFrame

Add an iframe to your admin panel:
```html
<iframe src="http://localhost:8080" width="100%" height="800px"></iframe>
```

## Troubleshooting

### Andy Won't Start
```bash
# Check logs for errors
docker compose logs mindcraft

# Common issues:
# - Minecraft server not running → Start Minecraft server first
# - Port 8080 in use → Change MINDSERVER_PORT in .env
# - Missing API key → Check andy.json has valid API key
```

### Can't Access Web UI
```bash
# Verify Andy is running
docker compose ps

# Check if port 8080 is listening
docker exec mindcraft-andy netstat -tlnp | grep 8080

# If using direct access, check firewall
sudo ufw status | grep 8080
```

### Andy Can't Connect to Minecraft
```bash
# Check Minecraft server is running
netstat -tlnp | grep 25565

# Verify host/port in .env
cat .env | grep MINECRAFT

# Check Andy's connection logs
docker compose logs mindcraft | grep -i "connect\|login\|spawn"
```

### Andy Keeps Crashing
```bash
# View recent crash logs
docker compose logs --tail=100 mindcraft

# Check resource usage
docker stats mindcraft-andy

# Look for error patterns
docker compose logs mindcraft | grep -i "error\|exception\|crash"
```

## Architecture

Simple single-container setup:

- **mindcraft-andy** - The bot container
  - Uses host networking to connect to local Minecraft server
  - Runs Andy using `npm start`
  - Auto-restarts on crashes
  - Persists data in volumes
  - Exposes web UI on port 8080

## Data Persistence

These directories are persisted across restarts:

- `./bots/` - Bot memory and saved state
- `./logs/` - Log files

Your data survives:
- Container restarts
- Server reboots
- Docker updates
- Code rebuilds

## Automatic Updates

Andy is configured to work with Watchtower (your auto-update service):

```bash
# Watchtower will automatically update Andy's container daily at 4 AM
# No action needed - it's already enabled!
```

To disable auto-updates for Andy:
```yaml
# Edit docker-compose.yaml and change:
labels:
  - "com.centurylinklabs.watchtower.enable=false"
```

## Running Multiple Bots

To run Andy plus other bots, edit `settings.js`:

```javascript
"profiles": [
    "./andy.json",
    "./profiles/gatherer.json",
    "./profiles/builder.json",
],
```

Then restart:
```bash
docker compose restart mindcraft
```

All bots will run in the same container and be visible in the web UI.

## Security Notes

- ✅ Web UI runs on localhost by default (not exposed to internet)
- ✅ Only accessible via SSH tunnel, reverse proxy, or firewall rule
- ⚠️ `allow_insecure_coding: true` allows Andy to execute code (by design)
- ⚠️ If you expose port 8080 publicly, add authentication!

## Backup Andy's Memory

```bash
# Backup Andy's saved state
tar -czf andy-backup-$(date +%Y%m%d).tar.gz bots/ logs/

# Restore from backup
tar -xzf andy-backup-YYYYMMDD.tar.gz
docker compose restart mindcraft
```

## Resource Management

Check Andy's resource usage:
```bash
# Real-time stats
docker stats mindcraft-andy

# Set memory/CPU limits (edit docker-compose.yaml)
services:
  mindcraft:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
```

## Advanced: Custom Entrypoint

To run custom commands on startup, create `entrypoint.sh`:

```bash
#!/bin/bash
echo "Starting Andy at $(date)"
npm start
```

Then update docker-compose.yaml:
```yaml
command: /bin/bash /mindcraft/entrypoint.sh
volumes:
  - ./entrypoint.sh:/mindcraft/entrypoint.sh:ro
```

## Need Help?

Check the logs first:
```bash
docker compose logs -f mindcraft
```

Common commands cheat sheet:
```bash
docker compose up -d          # Start in background
docker compose down           # Stop
docker compose restart        # Restart
docker compose logs -f        # Follow logs
docker compose ps             # Check status
docker compose build --no-cache  # Force rebuild
docker exec -it mindcraft-andy /bin/bash  # Shell into container
```

## Comparison: Console vs Docker

| Task | Console | Docker |
|------|---------|--------|
| Start Andy | `npm start` | `docker compose up -d` |
| Keep running after disconnect | ❌ Need tmux/screen | ✅ Automatic |
| Auto-restart on crash | ❌ Manual | ✅ Automatic |
| View logs | Terminal | `docker compose logs -f` |
| Access remotely | ❌ SSH required | ✅ Web UI + SSH tunnel |
| Edit config | Edit & restart | Edit & `docker compose restart` |
| Survives server reboot | ❌ | ✅ (if configured) |

## Auto-start on Server Boot

To make Andy start automatically when the server reboots:

```bash
# Install docker-compose systemd service
sudo curl -L https://raw.githubusercontent.com/docker/compose/main/contrib/systemd/docker-compose%40.service -o /etc/systemd/system/docker-compose@.service

# Enable auto-start for mindcraft
sudo systemctl enable docker-compose@mindcraft

# Check status
sudo systemctl status docker-compose@mindcraft
```

Or simpler - just set restart policy (already configured):
```yaml
restart: unless-stopped
```

This means Docker will automatically start Andy when:
- Server reboots
- Docker daemon restarts
- Container crashes
