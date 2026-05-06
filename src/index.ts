#!/usr/bin/env node

/**
 * IBM Business Automation Workflow Operations MCP Server
 * 
 * Provides tools for:
 * - Login and authentication
 * - Container installation
 * - Installation monitoring
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool
} from '@modelcontextprotocol/sdk/types.js';
import { BAWClient } from './baw-client.js';
import type { BAWConfig, InstallRequest } from './types.js';

// Global BAW client instance
let bawClient: BAWClient | null = null;

// Auto-login if environment variables are provided
async function initializeClient(): Promise<void> {
  const baseUrl = process.env.BAW_BASE_URL || process.env.baseUrl;
  const username = process.env.BAW_USERNAME || process.env.username;
  const password = process.env.BAW_PASSWORD || process.env.password;
  const rejectUnauthorized = process.env.BAW_REJECT_UNAUTHORIZED || process.env.rejectUnauthorized;

  if (baseUrl && username && password) {
    try {
      const config: BAWConfig = {
        baseUrl,
        username,
        password,
        rejectUnauthorized: rejectUnauthorized === 'false' ? false : true
      };

      bawClient = new BAWClient(config);
      await bawClient.login(false);
      console.error('Auto-login successful using environment variables');
    } catch (error) {
      console.error('Auto-login failed:', error instanceof Error ? error.message : String(error));
      console.error('You can still use login tool to authenticate manually');
      bawClient = null;
    }
  }
}

// Ensure client is initialized, using env vars if available
async function ensureAuthenticated(): Promise<void> {
  if (!bawClient) {
    // Try to initialize from environment variables
    const baseUrl = process.env.BAW_BASE_URL || process.env.baseUrl;
    const username = process.env.BAW_USERNAME || process.env.username;
    const password = process.env.BAW_PASSWORD || process.env.password;
    const rejectUnauthorized = process.env.BAW_REJECT_UNAUTHORIZED || process.env.rejectUnauthorized;

    if (baseUrl && username && password) {
      const config: BAWConfig = {
        baseUrl,
        username,
        password,
        rejectUnauthorized: rejectUnauthorized === 'false' ? false : true
      };

      bawClient = new BAWClient(config);
      await bawClient.login(false);
    } else {
      throw new Error('Not authenticated. Please call login tool first or set environment variables (BAW_BASE_URL, BAW_USERNAME, BAW_PASSWORD).');
    }
  }
}

// Tool definitions
const TOOLS: Tool[] = [
  {
    name: 'login',
    description: 'Login to IBM Business Automation Workflow and obtain CSRF token for subsequent operations. If environment variables are set, those will be used as defaults.',
    inputSchema: {
      type: 'object',
      properties: {
        baseUrl: {
          type: 'string',
          description: 'Base URL of the BAW server (e.g., https://baw-server.example.com:9443/bas/ops). Uses BAW_BASE_URL env var if not provided.'
        },
        username: {
          type: 'string',
          description: 'Username for authentication. Uses BAW_USERNAME env var if not provided.'
        },
        password: {
          type: 'string',
          description: 'Password for authentication. Uses BAW_PASSWORD env var if not provided.'
        },
        refreshGroups: {
          type: 'boolean',
          description: 'Whether to refresh group membership information (default: false)',
          default: false
        },
        rejectUnauthorized: {
          type: 'boolean',
          description: 'Whether to reject unauthorized SSL certificates (default: true). Uses BAW_REJECT_UNAUTHORIZED env var if not provided.',
          default: true
        }
      }
    }
  },
  {
    name: 'install_container',
    description: 'Install a process application snapshot to a workflow server. Returns a status URL to monitor the installation progress.',
    inputSchema: {
      type: 'object',
      properties: {
        container: {
          type: 'string',
          description: 'The acronym of the process application'
        },
        version: {
          type: 'string',
          description: 'The acronym of the snapshot to install'
        },
        server: {
          type: 'string',
          description: 'The name of the Workflow Server instance'
        },
        skipGovernance: {
          type: 'boolean',
          description: 'Skip human approvals in the installation process (default: false)',
          default: false
        },
        caseProjectArea: {
          type: 'string',
          description: 'Project area name for case artifacts (if applicable)'
        }
      },
      required: ['container', 'version', 'server']
    }
  },
  {
    name: 'get_install_status',
    description: 'Get the status of an asynchronous installation operation using the operation ID from the status URL.',
    inputSchema: {
      type: 'object',
      properties: {
        operationId: {
          type: 'string',
          description: 'The operation ID from the installation status URL'
        },
        key: {
          type: 'string',
          description: 'Authorization key from the installation response (optional for administrators)'
        }
      },
      required: ['operationId']
    }
  },
  {
    name: 'get_install_messages',
    description: 'Get detailed installation messages for a container version to monitor installation progress and identify issues.',
    inputSchema: {
      type: 'object',
      properties: {
        container: {
          type: 'string',
          description: 'The acronym of the process application'
        },
        version: {
          type: 'string',
          description: 'The acronym of the snapshot'
        },
        server: {
          type: 'string',
          description: 'The name of the Workflow Server (optional, required for Workflow Center)'
        }
      },
      required: ['container', 'version']
    }
  },
  {
    name: 'get_version_info',
    description: 'Get detailed information about a specific container version/snapshot including its state, deployment status, and available actions.',
    inputSchema: {
      type: 'object',
      properties: {
        container: {
          type: 'string',
          description: 'The acronym of the process application or toolkit'
        },
        version: {
          type: 'string',
          description: 'The acronym of the snapshot'
        }
      },
      required: ['container', 'version']
    }
  },
  {
    name: 'list_containers',
    description: 'List all process applications and toolkits available in the BAW system.',
    inputSchema: {
      type: 'object',
      properties: {
        offset: {
          type: 'number',
          description: 'Offset for pagination (optional)'
        },
        size: {
          type: 'number',
          description: 'Maximum number of containers to return (optional)'
        }
      }
    }
  },
  {
    name: 'activate_version',
    description: 'Activate a container version/snapshot to make it available for use.',
    inputSchema: {
      type: 'object',
      properties: {
        container: {
          type: 'string',
          description: 'The acronym of the process application or toolkit'
        },
        version: {
          type: 'string',
          description: 'The acronym of the snapshot to activate'
        }
      },
      required: ['container', 'version']
    }
  },
  {
    name: 'deactivate_version',
    description: 'Deactivate a container version/snapshot to prevent new instances from starting.',
    inputSchema: {
      type: 'object',
      properties: {
        container: {
          type: 'string',
          description: 'The acronym of the process application or toolkit'
        },
        version: {
          type: 'string',
          description: 'The acronym of the snapshot to deactivate'
        },
        force: {
          type: 'boolean',
          description: 'Force deactivation even if it is the default snapshot (default: false)',
          default: false
        },
        suspendInstances: {
          type: 'boolean',
          description: 'Suspend all running instances instead of letting them complete (default: false)',
          default: false
        }
      },
      required: ['container', 'version']
    }
  }
];

// Create MCP server
const server = new Server(
  {
    name: 'baw-ops-mcp-server',
    version: '1.0.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'login': {
        const { baseUrl, username, password, refreshGroups, rejectUnauthorized } = args as {
          baseUrl?: string;
          username?: string;
          password?: string;
          refreshGroups?: boolean;
          rejectUnauthorized?: boolean;
        };

        // Use environment variables as fallback
        const finalBaseUrl = baseUrl || process.env.BAW_BASE_URL || process.env.baseUrl;
        const finalUsername = username || process.env.BAW_USERNAME || process.env.username;
        const finalPassword = password || process.env.BAW_PASSWORD || process.env.password;
        const finalRejectUnauthorized = rejectUnauthorized ??
          (process.env.BAW_REJECT_UNAUTHORIZED === 'false' || process.env.rejectUnauthorized === 'false' ? false : true);

        if (!finalBaseUrl || !finalUsername || !finalPassword) {
          throw new Error('Missing required credentials. Provide baseUrl, username, and password either as parameters or environment variables.');
        }

        const config: BAWConfig = {
          baseUrl: finalBaseUrl,
          username: finalUsername,
          password: finalPassword,
          rejectUnauthorized: finalRejectUnauthorized
        };

        bawClient = new BAWClient(config);
        const csrfToken = await bawClient.login(refreshGroups ?? false);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: 'Successfully logged in to BAW',
                csrfToken,
                baseUrl: finalBaseUrl
              }, null, 2)
            }
          ]
        };
      }

      case 'install_container': {
        await ensureAuthenticated();

        const { container, version, server, skipGovernance, caseProjectArea } = args as {
          container: string;
          version: string;
          server: string;
          skipGovernance?: boolean;
          caseProjectArea?: string;
        };

        const installRequest: InstallRequest = {
          container,
          version,
          server,
          skip_governance: skipGovernance,
          case_project_area: caseProjectArea
        };

        const result = await bawClient!.installContainer(installRequest);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: 'Installation request submitted',
                statusUrl: result.status_url,
                key: result.key,
                operationId: result.status_url.split('/').pop()
              }, null, 2)
            }
          ]
        };
      }

      case 'get_install_status': {
        await ensureAuthenticated();

        const { operationId, key } = args as {
          operationId: string;
          key?: string;
        };

        const status = await bawClient!.getQueueStatus(operationId, key);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                status: status.status,
                progress: status.progress,
                result: status.result,
                error: status.error
              }, null, 2)
            }
          ]
        };
      }

      case 'get_install_messages': {
        await ensureAuthenticated();

        const { container, version, server } = args as {
          container: string;
          version: string;
          server?: string;
        };

        const messages = await bawClient!.getInstallMessages(container, version, server);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                messageCount: messages.install_messages.length,
                messages: messages.install_messages
              }, null, 2)
            }
          ]
        };
      }

      case 'get_version_info': {
        await ensureAuthenticated();

        const { container, version } = args as {
          container: string;
          version: string;
        };

        const versionInfo = await bawClient!.getVersion(container, version);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                version: versionInfo
              }, null, 2)
            }
          ]
        };
      }

      case 'list_containers': {
        await ensureAuthenticated();

        const { offset, size } = args as {
          offset?: number;
          size?: number;
        };

        const result = await bawClient!.listContainers(offset, size);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                containerCount: result.containers.length,
                containers: result.containers
              }, null, 2)
            }
          ]
        };
      }

      case 'activate_version': {
        await ensureAuthenticated();

        const { container, version } = args as {
          container: string;
          version: string;
        };

        const result = await bawClient!.activateVersion(container, version);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: 'Version activated successfully',
                version: result
              }, null, 2)
            }
          ]
        };
      }

      case 'deactivate_version': {
        await ensureAuthenticated();

        const { container, version, force, suspendInstances } = args as {
          container: string;
          version: string;
          force?: boolean;
          suspendInstances?: boolean;
        };

        const result = await bawClient!.deactivateVersion(container, version, force, suspendInstances);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: 'Version deactivated successfully',
                version: result
              }, null, 2)
            }
          ]
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error)
          }, null, 2)
        }
      ],
      isError: true
    };
  }
});

// Start the server
async function main() {
  // Initialize client with environment variables if provided
  await initializeClient();
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('BAW Operations MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

// Made with Bob
