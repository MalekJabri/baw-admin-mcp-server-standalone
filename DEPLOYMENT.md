# Deployment Guide for BAW Admin MCP Server

This guide explains how to deploy and use the BAW Admin MCP Server from GitHub.

## Prerequisites

- Node.js 18+ installed
- npm or npx available
- Git (for local development)

## Deployment to GitHub

### 1. Initialize Git Repository

```bash
git init
git add .
git commit -m "Initial commit: BAW Admin MCP Server"
```

### 2. Create GitHub Repository

1. Go to https://github.com/new
2. Create a new repository named `baw-admin-mcp-server-standalone`
3. Do NOT initialize with README, .gitignore, or license (we already have these)

### 3. Push to GitHub

```bash
git remote add origin https://github.com/MalekJabri/baw-admin-mcp-server-standalone.git
git branch -M main
git push -u origin main
```

## Using the MCP Server

### Method 1: Direct from GitHub with npx (Recommended)

This method requires no local installation. The server is downloaded and run automatically.

**Configuration for Claude Desktop:**

Edit your `claude_desktop_config.json`:

**With Auto-Login (Recommended):**
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
        "BAW_BASE_URL": "https://your-baw-server.com:9443",
        "BAW_USERNAME": "your_username",
        "BAW_PASSWORD": "your_password",
        "BAW_REJECT_UNAUTHORIZED": "false"
      }
    }
  }
}
```

**Without Auto-Login (Manual):**
```json
{
  "mcpServers": {
    "baw-admin": {
      "command": "npx",
      "args": [
        "-y",
        "github:MalekJabri/baw-admin-mcp-server-standalone",
        "baw-admin-mcp-server"
      ]
    }
  }
}
```

Then use the `baw_login` tool to authenticate.

### Method 2: Local Installation

Clone and build locally:

```bash
git clone https://github.com/MalekJabri/baw-admin-mcp-server-standalone.git
cd baw-admin-mcp-server-standalone
npm install
npm run build
```

**Configuration:**

```json
{
  "mcpServers": {
    "baw-admin": {
      "command": "node",
      "args": ["/absolute/path/to/baw-admin-mcp-server-standalone/dist/index.js"]
    }
  }
}
```

## Updating the Server

### For npx users (Method 1)

The server is automatically updated each time it runs. To force a fresh download:

```bash
npx --yes github:MalekJabri/baw-admin-mcp-server-standalone baw-admin-mcp-server
```

### For local installation (Method 2)

```bash
cd baw-admin-mcp-server-standalone
git pull
npm install
npm run build
```

## Verifying Installation

After configuring your MCP client, restart it and verify the server is loaded:

1. The server should appear in your MCP client's server list
2. You should see 8 available tools:
   - baw_login
   - baw_install_container
   - baw_get_install_status
   - baw_get_install_messages
   - baw_get_version_info
   - baw_list_containers
   - baw_activate_version
   - baw_deactivate_version

## Troubleshooting

### Server Not Starting

**Check Node.js version:**
```bash
node --version  # Should be 18 or higher
```

**Check npx is available:**
```bash
npx --version
```

**Check the logs:**
- Claude Desktop: Check `~/Library/Logs/Claude/mcp*.log` (macOS) or equivalent
- Other clients: Check their respective log locations

### Connection Issues

1. Verify the GitHub repository is accessible
2. Check your internet connection
3. Try running manually:
   ```bash
   npx -y github:MalekJabri/baw-admin-mcp-server-standalone baw-admin-mcp-server
   ```

### Build Issues (Local Installation)

```bash
# Clean and rebuild
rm -rf node_modules dist
npm install
npm run build
```

## Configuration File Locations

### Claude Desktop

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

### Other MCP Clients

Refer to your specific MCP client's documentation for configuration file location.

## Security Considerations

### Using npx from GitHub

- The code is downloaded from GitHub each time (or cached by npm)
- Ensure you trust the repository source
- Review the code before first use
- Consider using a specific commit hash for production:
  ```json
  {
    "command": "npx",
    "args": [
      "-y",
      "github:MalekJabri/baw-admin-mcp-server-standalone#commit-hash",
      "baw-admin-mcp-server"
    ]
  }
  ```

### Credentials

- Never commit BAW credentials to the repository
- When using environment variables, ensure your MCP client config file is secure
- Credentials are only passed at runtime (via env vars or tool calls)
- The server does not persist credentials beyond the session
- Consider using a secrets manager for production deployments

## Development Workflow

### Making Changes

1. Clone the repository
2. Make your changes
3. Test locally:
   ```bash
   npm run build
   node dist/index.js
   ```
4. Commit and push:
   ```bash
   git add .
   git commit -m "Description of changes"
   git push
   ```

### Testing with npx

After pushing changes, test with npx:

```bash
npx --yes github:MalekJabri/baw-admin-mcp-server-standalone baw-admin-mcp-server
```

## Release Management

### Creating a Release

1. Update version in `package.json`
2. Commit the version change
3. Create a git tag:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
4. Create a GitHub release from the tag

### Using a Specific Version

Users can specify a version in their configuration:

```json
{
  "command": "npx",
  "args": [
    "-y",
    "github:MalekJabri/baw-admin-mcp-server-standalone#v1.0.0",
    "baw-admin-mcp-server"
  ]
}
```

## Support

For issues:
1. Check the [README.md](README.md) for usage instructions
2. Review [EXAMPLES.md](EXAMPLES.md) for common patterns
3. Open an issue on GitHub: https://github.com/MalekJabri/baw-admin-mcp-server-standalone/issues