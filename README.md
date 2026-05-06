# IBM Business Automation Workflow Operations MCP Server

A Model Context Protocol (MCP) server that provides tools for managing IBM Business Automation Workflow (BAW) operations, including login, container installation, and monitoring.

## Features

This MCP server provides the following capabilities:

- **Authentication**: Login to BAW and obtain CSRF tokens
- **Container Installation**: Install process application snapshots to workflow servers
- **Installation Monitoring**: Track installation progress and retrieve detailed messages
- **Version Management**: Activate/deactivate container versions
- **Container Listing**: Browse available process applications and toolkits

## Installation

### Option 1: Direct from GitHub (Recommended)

No installation needed! Use `npx` to run directly from GitHub:

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

### Option 2: Local Installation

```bash
git clone https://github.com/MalekJabri/baw-admin-mcp-server-standalone.git
cd baw-admin-mcp-server-standalone
npm install
npm run build
```

## Configuration

Add this server to your MCP settings file (e.g., `claude_desktop_config.json`):

### Using npx (from GitHub)

**Option A: With Environment Variables (Recommended)**

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

The server will automatically login using these credentials on startup.

**Option B: Manual Login**

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

Then use the `baw_login` tool to authenticate manually.

### Using local installation

```json
{
  "mcpServers": {
    "baw-admin": {
      "command": "node",
      "args": ["/path/to/baw-admin-mcp-server-standalone/dist/index.js"]
    }
  }
}
```

## Environment Variables

The server supports automatic authentication using environment variables:

- `BAW_BASE_URL` or `baseUrl`: Full URL including path to BAW operations API (e.g., `https://server:9443/bas/ops` or `https://server:9443/ops` depending on your deployment)
- `BAW_USERNAME` or `username`: Username for authentication
- `BAW_PASSWORD` or `password`: Password for authentication
- `BAW_REJECT_UNAUTHORIZED` or `rejectUnauthorized`: SSL certificate validation (default: "true")

When these variables are provided, the server automatically logs in on startup. If auto-login fails, you can still use the `baw_login` tool manually.

## Available Tools

### 1. baw_login

Login to IBM Business Automation Workflow and obtain a CSRF token for subsequent operations.

**Note:** If you configured environment variables, the server is already authenticated and you don't need to call this tool.

**Parameters:**
- `baseUrl` (required): Full URL including path to BAW operations API (e.g., `https://baw-server.example.com:9443/bas/ops` or `https://baw-server.example.com:9443/ops`)
- `username` (required): Username for authentication
- `password` (required): Password for authentication
- `refreshGroups` (optional): Whether to refresh group membership information (default: false)
- `rejectUnauthorized` (optional): Whether to reject unauthorized SSL certificates (default: true)

**Example:**
```json
{
  "baseUrl": "https://baw-server.example.com:9443/bas/ops",
  "username": "admin",
  "password": "password",
  "rejectUnauthorized": false
}
```

### 2. baw_install_container

Install a process application snapshot to a workflow server.

**Parameters:**
- `container` (required): The acronym of the process application
- `version` (required): The acronym of the snapshot to install
- `server` (required): The name of the Workflow Server instance
- `skipGovernance` (optional): Skip human approvals in the installation process (default: false)
- `caseProjectArea` (optional): Project area name for case artifacts

**Example:**
```json
{
  "container": "HSS",
  "version": "2.0.1",
  "server": "ProcessServer01",
  "skipGovernance": true
}
```

**Returns:**
- `statusUrl`: URL to monitor the installation progress
- `operationId`: ID to use with `baw_get_install_status`
- `key`: Authorization key for status queries

### 3. baw_get_install_status

Get the status of an asynchronous installation operation.

**Parameters:**
- `operationId` (required): The operation ID from the installation status URL
- `key` (optional): Authorization key from the installation response

**Example:**
```json
{
  "operationId": "abc123def456",
  "key": "xyz789"
}
```

**Returns:**
- `status`: Current status (`running`, `success`, or `failed`)
- `progress`: Progress percentage (if available)
- `result`: Result data (if completed)
- `error`: Error message (if failed)

### 4. baw_get_install_messages

Get detailed installation messages for a container version.

**Parameters:**
- `container` (required): The acronym of the process application
- `version` (required): The acronym of the snapshot
- `server` (optional): The name of the Workflow Server (required for Workflow Center)

**Example:**
```json
{
  "container": "HSS",
  "version": "2.0.1",
  "server": "ProcessServer01"
}
```

**Returns:**
- Array of installation messages with details about each step
- Message types: `STEP`, `INFORMATIONAL_MESSAGE`, `WARNING_MESSAGE`, `ERROR_MESSAGE`
- Message states: `RUNNING`, `COMPLETED_SUCCESSFULLY`, `COMPLETED_IN_ERROR`

### 5. baw_get_version_info

Get detailed information about a specific container version/snapshot.

**Parameters:**
- `container` (required): The acronym of the process application or toolkit
- `version` (required): The acronym of the snapshot

**Example:**
```json
{
  "container": "HSS",
  "version": "2.0.1"
}
```

**Returns:**
- Version details including state, deployment status, and available actions
- Properties: `is_active`, `is_default`, `is_installed`, `state`, `possible_actions`

### 6. baw_list_containers

List all process applications and toolkits available in the BAW system.

**Parameters:**
- `offset` (optional): Offset for pagination
- `size` (optional): Maximum number of containers to return

**Example:**
```json
{
  "offset": 0,
  "size": 50
}
```

**Returns:**
- Array of containers with their details
- Properties: `container_id`, `container_name`, `container_acronym`, `container_type`

### 7. baw_activate_version

Activate a container version/snapshot to make it available for use.

**Parameters:**
- `container` (required): The acronym of the process application or toolkit
- `version` (required): The acronym of the snapshot to activate

**Example:**
```json
{
  "container": "HSS",
  "version": "2.0.1"
}
```

### 8. baw_deactivate_version

Deactivate a container version/snapshot to prevent new instances from starting.

**Parameters:**
- `container` (required): The acronym of the process application or toolkit
- `version` (required): The acronym of the snapshot to deactivate
- `force` (optional): Force deactivation even if it is the default snapshot (default: false)
- `suspendInstances` (optional): Suspend all running instances (default: false)

**Example:**
```json
{
  "container": "HSS",
  "version": "2.0.0",
  "force": true,
  "suspendInstances": false
}
```

## Usage Workflow

### Typical Installation Workflow

1. **Login to BAW**
   ```
   Use baw_login with your credentials
   ```

2. **List Available Containers** (optional)
   ```
   Use baw_list_containers to see available process applications
   ```

3. **Install Container**
   ```
   Use baw_install_container to start the installation
   Save the operationId from the response
   ```

4. **Monitor Installation**
   ```
   Use baw_get_install_status with the operationId to check progress
   Use baw_get_install_messages for detailed installation logs
   ```

5. **Verify Installation**
   ```
   Use baw_get_version_info to check the version state
   ```

6. **Activate Version** (if needed)
   ```
   Use baw_activate_version to make the version active
   ```

## Error Handling

All tools return a consistent response format:

**Success Response:**
```json
{
  "success": true,
  "message": "Operation completed",
  "data": { ... }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message details"
}
```

Common errors:
- `Not authenticated`: Call `baw_login` first
- `BAW API Error (401)`: Invalid credentials
- `BAW API Error (403)`: Insufficient permissions
- `BAW API Error (404)`: Resource not found
- `No response from BAW server`: Connection issues

## Security Considerations

- **Credentials**: Never hardcode credentials. Use secure credential management.
- **SSL Certificates**: Set `rejectUnauthorized: true` in production environments.
- **CSRF Token**: The token is automatically managed after login.
- **Session Management**: The client maintains authentication state during the session.

## API Reference

This MCP server is based on the IBM Business Automation Workflow Operations REST API v8.6.2.21021.

Key API endpoints used:
- `POST /bas/ops/system/login` - Authentication
- `POST /bas/ops/std/bpm/containers/{container}/versions/{version}/install` - Installation
- `GET /bas/ops/system/queue/{id}` - Status monitoring
- `GET /bas/ops/std/bpm/containers/{container}/versions/{version}/install_messages` - Installation logs

## Development

### Build
```bash
npm run build
```

### Watch Mode
```bash
npm run watch
```

### Run Locally
```bash
npm run dev
```

## Troubleshooting

### Connection Issues
- Verify the BAW server URL is correct and accessible
- Check network connectivity and firewall rules
- For self-signed certificates, set `rejectUnauthorized: false`

### Authentication Failures
- Verify username and password are correct
- Check user has appropriate permissions in BAW
- Ensure the user account is not locked

### Installation Failures
- Check installation messages using `baw_get_install_messages`
- Verify the container and version acronyms are correct
- Ensure the target server is online and accessible
- Check for dependency issues or conflicts

## License

MIT

## Contributing

Contributions are welcome! Please ensure all tests pass and follow the existing code style.

## Support

For issues related to:
- **MCP Server**: Open an issue in this repository
- **IBM BAW**: Consult IBM Business Automation Workflow documentation
- **MCP Protocol**: See the Model Context Protocol documentation