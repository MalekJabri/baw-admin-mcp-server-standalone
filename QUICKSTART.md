# Quick Start Guide

Get started with the BAW Admin MCP Server in 5 minutes!

## Step 1: Configure Your MCP Client

Add this configuration to your MCP client's config file:
**For Bob (IBM)** MCP configuration:


```json
{
  "mcpServers": {
    "baw-admin": {
      "command": "npx",
      "args": [
        "-y",
        "github:MalekJabri/baw-admin-mcp-server-standalone",
        "baw-admin-mcp-server"
      ],
      "env": {
        "BAW_BASE_URL": "https://your-baw-server.com:9443/bas/ops",
        "BAW_USERNAME": "your_username",
        "BAW_PASSWORD": "your_password",
        "BAW_REJECT_UNAUTHORIZED": "false"
      }
    }
  }
}
```

**Note:** With environment variables configured, the server automatically logs in on startup. You can skip Step 4 below!

**Config file location:**
- Check your Bob (IBM) MCP client documentation for the configuration file location

## Step 2: Restart Your MCP Client
Restart Bob (or your MCP client) to load the server.


## Step 3: Verify Installation

In your MCP client, you should now see 8 BAW tools available:
- baw_login
- baw_install_container
- baw_get_install_status
- baw_get_install_messages
- baw_get_version_info
- baw_list_containers
- baw_activate_version
- baw_deactivate_version

## Step 4: Login to BAW (Optional)

**If you configured environment variables in Step 1, skip this step - you're already authenticated!**

Otherwise, use the `baw_login` tool with your BAW credentials:

```json
{
  "baseUrl": "https://your-baw-server.com:9443/bas/ops",
  "username": "your-username",
  "password": "your-password",
  "rejectUnauthorized": false
}
```

**Note:** Set `rejectUnauthorized: true` in production with valid SSL certificates.

## Step 5: Try Your First Operation

List available containers:

```json
{
  "size": 10
}
```

## Common Use Cases

### Install a Container

1. **Login** (see Step 4)

2. **Install:**
```json
{
  "container": "HSS",
  "version": "2.0.1",
  "server": "ProcessServer01",
  "skipGovernance": true
}
```

3. **Monitor status** (use operationId from install response):
```json
{
  "operationId": "abc123"
}
```

4. **Check detailed messages:**
```json
{
  "container": "HSS",
  "version": "2.0.1",
  "server": "ProcessServer01"
}
```

### Activate a Version

```json
{
  "container": "HSS",
  "version": "2.0.1"
}
```

## Need Help?

- **Full Documentation:** See [README.md](README.md)
- **Examples:** See [EXAMPLES.md](EXAMPLES.md)
- **Deployment:** See [DEPLOYMENT.md](DEPLOYMENT.md)
- **Issues:** https://github.com/MalekJabri/baw-admin-mcp-server-standalone/issues

## Troubleshooting

### Server not loading?
1. Check Node.js is installed: `node --version` (need 18+)
2. Check npx is available: `npx --version`
3. Restart your MCP client
4. Check client logs for errors

### Authentication failing?
1. Verify BAW server URL is correct
2. Check username/password
3. For SSL issues, set `rejectUnauthorized: false`

### Installation stuck?
1. Use `baw_get_install_status` to check progress
2. Use `baw_get_install_messages` for detailed logs
3. Check BAW server logs

## What's Next?

- Explore all 8 tools in the [README.md](README.md)
- Learn advanced workflows in [EXAMPLES.md](EXAMPLES.md)
- Set up for production in [DEPLOYMENT.md](DEPLOYMENT.md)