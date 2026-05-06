# IBM BAW Operations MCP Server - Usage Examples

This document provides practical examples of using the BAW Operations MCP Server.

## Example 1: Basic Login and Container Installation

### Step 1: Login to BAW

```json
{
  "tool": "baw_login",
  "arguments": {
    "baseUrl": "https://baw-server.example.com:9443",
    "username": "admin",
    "password": "your-password",
    "rejectUnauthorized": false
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully logged in to BAW",
  "csrfToken": "abc123...",
  "baseUrl": "https://baw-server.example.com:9443"
}
```

### Step 2: List Available Containers

```json
{
  "tool": "baw_list_containers",
  "arguments": {
    "size": 10
  }
}
```

**Response:**
```json
{
  "success": true,
  "containerCount": 3,
  "containers": [
    {
      "container_id": "2064.xxx",
      "container_name": "Hiring Sample",
      "container_acronym": "HSS",
      "container_type": "process_application",
      "is_archived": false
    }
  ]
}
```

### Step 3: Install Container

```json
{
  "tool": "baw_install_container",
  "arguments": {
    "container": "HSS",
    "version": "2.0.1",
    "server": "ProcessServer01",
    "skipGovernance": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Installation request submitted",
  "statusUrl": "https://baw-server.example.com:9443/bas/ops/system/queue/abc123",
  "key": "xyz789",
  "operationId": "abc123"
}
```

### Step 4: Monitor Installation Status

```json
{
  "tool": "baw_get_install_status",
  "arguments": {
    "operationId": "abc123",
    "key": "xyz789"
  }
}
```

**Response (Running):**
```json
{
  "success": true,
  "status": "running",
  "progress": 45
}
```

**Response (Success):**
```json
{
  "success": true,
  "status": "success",
  "progress": 100,
  "result": {
    "message": "Installation completed successfully"
  }
}
```

### Step 5: Get Detailed Installation Messages

```json
{
  "tool": "baw_get_install_messages",
  "arguments": {
    "container": "HSS",
    "version": "2.0.1",
    "server": "ProcessServer01"
  }
}
```

**Response:**
```json
{
  "success": true,
  "messageCount": 15,
  "messages": [
    {
      "message_id": "1",
      "message_name": "Installing snapshot",
      "type": "STEP",
      "state": "COMPLETED_SUCCESSFULLY",
      "message": "Snapshot installation started"
    },
    {
      "message_id": "2",
      "message_name": "Validating dependencies",
      "type": "STEP",
      "state": "COMPLETED_SUCCESSFULLY",
      "message": "All dependencies validated"
    }
  ]
}
```

## Example 2: Version Management

### Check Version Information

```json
{
  "tool": "baw_get_version_info",
  "arguments": {
    "container": "HSS",
    "version": "2.0.1"
  }
}
```

**Response:**
```json
{
  "success": true,
  "version": {
    "container_id": "2064.xxx",
    "container_name": "Hiring Sample",
    "container_acronym": "HSS",
    "snapshot_name": "Version 2.0.1",
    "snapshot_id": "2064.yyy",
    "snapshot_acronym": "2.0.1",
    "is_active": true,
    "is_default": true,
    "is_installed": true,
    "is_archived": false,
    "state": "active",
    "possible_actions": ["deactivate", "archive"]
  }
}
```

### Activate a Version

```json
{
  "tool": "baw_activate_version",
  "arguments": {
    "container": "HSS",
    "version": "2.0.1"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Version activated successfully",
  "version": {
    "snapshot_acronym": "2.0.1",
    "is_active": true,
    "state": "active"
  }
}
```

### Deactivate a Version

```json
{
  "tool": "baw_deactivate_version",
  "arguments": {
    "container": "HSS",
    "version": "2.0.0",
    "force": false,
    "suspendInstances": false
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Version deactivated successfully",
  "version": {
    "snapshot_acronym": "2.0.0",
    "is_active": false,
    "state": "inactive"
  }
}
```

## Example 3: Error Handling

### Authentication Error

```json
{
  "tool": "baw_install_container",
  "arguments": {
    "container": "HSS",
    "version": "2.0.1",
    "server": "ProcessServer01"
  }
}
```

**Response:**
```json
{
  "success": false,
  "error": "Not authenticated. Please call baw_login first."
}
```

### Invalid Credentials

```json
{
  "tool": "baw_login",
  "arguments": {
    "baseUrl": "https://baw-server.example.com:9443",
    "username": "admin",
    "password": "wrong-password"
  }
}
```

**Response:**
```json
{
  "success": false,
  "error": "BAW API Error (401): Authentication failed"
}
```

### Resource Not Found

```json
{
  "tool": "baw_get_version_info",
  "arguments": {
    "container": "INVALID",
    "version": "1.0.0"
  }
}
```

**Response:**
```json
{
  "success": false,
  "error": "BAW API Error (404): The requested resource does not exist."
}
```

## Example 4: Installation with Case Project Area

For process applications that include case artifacts:

```json
{
  "tool": "baw_install_container",
  "arguments": {
    "container": "CLAIMS",
    "version": "3.0.0",
    "server": "ProcessServer01",
    "skipGovernance": true,
    "caseProjectArea": "ClaimsProjectArea"
  }
}
```

## Example 5: Polling Installation Status

Here's a typical polling pattern to monitor installation:

1. **Start Installation**
```json
{
  "tool": "baw_install_container",
  "arguments": {
    "container": "HSS",
    "version": "2.0.1",
    "server": "ProcessServer01"
  }
}
```

2. **Poll Status Every 10 Seconds**
```json
{
  "tool": "baw_get_install_status",
  "arguments": {
    "operationId": "abc123",
    "key": "xyz789"
  }
}
```

3. **When Status is "running"**: Continue polling
4. **When Status is "success"**: Installation complete
5. **When Status is "failed"**: Check installation messages for errors

```json
{
  "tool": "baw_get_install_messages",
  "arguments": {
    "container": "HSS",
    "version": "2.0.1",
    "server": "ProcessServer01"
  }
}
```

## Example 6: Batch Operations

### List All Containers and Their Versions

1. **Get All Containers**
```json
{
  "tool": "baw_list_containers",
  "arguments": {}
}
```

2. **For Each Container, Get Version Info**
```json
{
  "tool": "baw_get_version_info",
  "arguments": {
    "container": "HSS",
    "version": "2.0.1"
  }
}
```

## Example 7: Production Deployment Workflow

### Complete Production Deployment

1. **Login with Production Credentials**
```json
{
  "tool": "baw_login",
  "arguments": {
    "baseUrl": "https://baw-prod.example.com:9443",
    "username": "prod-admin",
    "password": "secure-password",
    "rejectUnauthorized": true
  }
}
```

2. **Verify Container Exists**
```json
{
  "tool": "baw_list_containers",
  "arguments": {
    "size": 100
  }
}
```

3. **Install to Production Server**
```json
{
  "tool": "baw_install_container",
  "arguments": {
    "container": "HSS",
    "version": "2.0.1",
    "server": "ProductionServer",
    "skipGovernance": false
  }
}
```

4. **Monitor Installation**
```json
{
  "tool": "baw_get_install_status",
  "arguments": {
    "operationId": "prod-install-123"
  }
}
```

5. **Verify Installation Success**
```json
{
  "tool": "baw_get_version_info",
  "arguments": {
    "container": "HSS",
    "version": "2.0.1"
  }
}
```

6. **Activate New Version**
```json
{
  "tool": "baw_activate_version",
  "arguments": {
    "container": "HSS",
    "version": "2.0.1"
  }
}
```

7. **Deactivate Old Version**
```json
{
  "tool": "baw_deactivate_version",
  "arguments": {
    "container": "HSS",
    "version": "2.0.0",
    "force": false,
    "suspendInstances": false
  }
}
```

## Tips and Best Practices

1. **Always Login First**: All operations require authentication via `baw_login`

2. **Monitor Long-Running Operations**: Use `baw_get_install_status` to poll installation progress

3. **Check Installation Messages**: Use `baw_get_install_messages` for detailed troubleshooting

4. **Handle SSL Certificates**: 
   - Development: `rejectUnauthorized: false`
   - Production: `rejectUnauthorized: true` (with valid certificates)

5. **Governance Process**: 
   - Set `skipGovernance: false` for production deployments
   - Set `skipGovernance: true` for development/testing

6. **Error Recovery**: Always check the error message and installation logs when operations fail

7. **Version Management**: Verify version state before activation/deactivation operations