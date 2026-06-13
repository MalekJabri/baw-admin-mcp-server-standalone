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
import fs from 'fs';
import path from 'path';

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
    description: 'Install a process application from a file (.zip for Workflow Server or .twx for Workflow Center). This uploads and installs the application package. Returns a status URL to monitor the installation progress.',
    inputSchema: {
      type: 'object',
      properties: {
        install_file: {
          type: 'string',
          description: 'Path to the installation file (.zip or .twx file)'
        },
        inactive: {
          type: 'boolean',
          description: 'Deactivate the snapshot after installation (default: false, ignored in Workflow Center)',
          default: false
        },
        caseDosName: {
          type: 'string',
          description: 'Name of the case design object store (for case solutions)'
        },
        caseProjectArea: {
          type: 'string',
          description: 'Target environment or project area for case artifacts'
        },
        caseOverwrite: {
          type: 'boolean',
          description: 'Overwrite artifacts in the case store if they already exist (default: false)',
          default: false
        }
      },
      required: ['install_file']
    }
  },
  {
    name: 'get_queue_status',
    description: 'Get the status of an asynchronous operation (installation, uninstallation, etc.) using the operation ID from the status URL.',
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
    name: 'list_versions',
    description: 'List all snapshots/versions of a specific process application or toolkit. For Workflow Center, only named snapshots are returned.',
    inputSchema: {
      type: 'object',
      properties: {
        container: {
          type: 'string',
          description: 'The acronym of the process application or toolkit'
        },
        versionIds: {
          type: 'array',
          items: {
            type: 'string'
          },
          description: 'Comma-separated list of snapshot IDs to filter results (optional)'
        },
        branch: {
          type: 'string',
          description: 'Track acronym to view only snapshots belonging to that track (optional)'
        },
        offset: {
          type: 'number',
          description: 'Position of the first snapshot to return from the query result set (optional)'
        },
        size: {
          type: 'number',
          description: 'Maximum number of snapshots to return (optional)'
        }
      },
      required: ['container']
    }
  },
  {
    name: 'get_versions_count',
    description: 'Get the count of all snapshots/versions for a specific process application or toolkit.',
    inputSchema: {
      type: 'object',
      properties: {
        container: {
          type: 'string',
          description: 'The acronym of the process application or toolkit'
        },
        branch: {
          type: 'string',
          description: 'Track acronym to count only snapshots belonging to that track (optional)'
        }
      },
      required: ['container']
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
  },
  {
    name: 'export_version',
    description: 'Export a container version/snapshot as a TWX file. This downloads the process application or toolkit snapshot that can be imported into another Workflow Center server. The file will be saved to the specified output path. Only administrators or users with project read permission can perform this action.',
    inputSchema: {
      type: 'object',
      properties: {
        container: {
          type: 'string',
          description: 'The acronym of the process application or toolkit'
        },
        version: {
          type: 'string',
          description: 'The acronym of the snapshot to export'
        },
        outputPath: {
          type: 'string',
          description: 'Path where the exported TWX file should be saved (e.g., ./exports/myapp.twx)'
        },
        format: {
          type: 'string',
          enum: ['twxWithoutToolkits'],
          description: 'Export format. Use "twxWithoutToolkits" to skip exporting system toolkits that are not versioned (optional)'
        },
        useEnhancedFilenames: {
          type: 'boolean',
          description: 'Set to true to produce more meaningful file names within the exported file (default: false)',
          default: false
        }
      },
      required: ['container', 'version', 'outputPath']
    }
  },
  {
    name: 'create_version',
    description: 'Create a new snapshot of a process application or toolkit on Workflow Center. This creates a named snapshot that can be installed to workflow servers. Only administrators or users with project write permission can perform this action.',
    inputSchema: {
      type: 'object',
      properties: {
        container: {
          type: 'string',
          description: 'The acronym of the process application or toolkit'
        },
        versionName: {
          type: 'string',
          description: 'The name of the snapshot (can include A-Z, 0-9, _)'
        },
        branchAcronym: {
          type: 'string',
          description: 'The acronym of the track/branch (optional, uses default track if not specified)'
        },
        description: {
          type: 'string',
          description: 'Description of the new snapshot (optional)'
        }
      },
      required: ['container', 'versionName']
    }
  },
  {
    name: 'delete_version',
    description: 'Delete snapshots of process applications or toolkits. This is an asynchronous operation that returns a status URL to monitor progress. WARNING: This is a destructive operation. Only administrators can perform this action. On Workflow Server, delete inactive snapshots without running instances. On Workflow Center, archive named snapshots first, then delete unnamed and archived snapshots when obsolete.',
    inputSchema: {
      type: 'object',
      properties: {
        container: {
          type: 'string',
          description: 'The acronym of the process application or toolkit'
        },
        branchName: {
          type: 'string',
          description: 'Workflow Center only: The name of the track associated with the process application or toolkit'
        },
        versions: {
          type: 'array',
          items: {
            type: 'string'
          },
          description: 'Required for Workflow Server. Optional for Workflow Center. Comma-separated list of snapshot acronyms to delete. If specified on Workflow Center, no other filters can be used.'
        },
        force: {
          type: 'boolean',
          description: 'Workflow Server only: Set to true to delete the last and default snapshot of a process application (removes the entire app)',
          default: false
        },
        keptNumber: {
          type: 'number',
          description: 'Workflow Center only: Number of most recent unnamed snapshots to keep (tip not counted). Cannot be used with created_before/created_after.'
        },
        createdBefore: {
          type: 'string',
          description: 'Workflow Center only: Delete unnamed snapshots created before this time (ISO 8601 format: yyyy-MM-ddTHH:mm:ss.sssZ)'
        },
        createdAfter: {
          type: 'string',
          description: 'Workflow Center only: Delete unnamed snapshots created after this time (ISO 8601 format: yyyy-MM-ddTHH:mm:ss.sssZ)'
        },
        createdBeforeVersion: {
          type: 'string',
          description: 'Workflow Center only: Acronym of a named snapshot. Delete unnamed snapshots created before this snapshot.'
        },
        deleteArchived: {
          type: 'boolean',
          description: 'Workflow Center only: Set to true to delete archived snapshots and unnamed snapshots matching filter criteria',
          default: false
        },
        caseDosName: {
          type: 'string',
          description: 'Workflow Server only: Case design object store name if not using default "dos" (when removing last snapshot)'
        },
        continueOnError: {
          type: 'boolean',
          description: 'Workflow Server only: Continue processing remaining versions even if an error occurs. Must be used with versions parameter.',
          default: false
        }
      },
      required: ['container']
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

        const { install_file, inactive, caseDosName, caseProjectArea, caseOverwrite } = args as {
          install_file: string;
          inactive?: boolean;
          caseDosName?: string;
          caseProjectArea?: string;
          caseOverwrite?: boolean;
        };

        const installRequest: InstallRequest = {
          install_file,
          inactive,
          caseDosName,
          caseProjectArea,
          caseOverwrite
        };

        const result = await bawClient!.installContainer(installRequest);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: 'Installation request submitted. File uploaded and installation started.',
                statusUrl: result.status_url,
                key: result.key,
                operationId: result.status_url ? result.status_url.split('/').pop() : undefined
              }, null, 2)
            }
          ]
        };
      }

      case 'get_queue_status': {
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

      case 'list_versions': {
        await ensureAuthenticated();

        const { container, versionIds, branch, offset, size } = args as {
          container: string;
          versionIds?: string[];
          branch?: string;
          offset?: number;
          size?: number;
        };

        const result = await bawClient!.listVersions(container, {
          versionIds,
          branch,
          offset,
          size
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                versionCount: result.versions.length,
                versions: result.versions
              }, null, 2)
            }
          ]
        };
      }

      case 'get_versions_count': {
        await ensureAuthenticated();

        const { container, branch } = args as {
          container: string;
          branch?: string;
        };

        const result = await bawClient!.getVersionsCount(container, branch);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                count: result.count,
                container,
                branch: branch || 'all'
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

      case 'export_version': {
        await ensureAuthenticated();

        const { container, version, outputPath, format, useEnhancedFilenames } = args as {
          container: string;
          version: string;
          outputPath: string;
          format?: 'twxWithoutToolkits';
          useEnhancedFilenames?: boolean;
        };

        // Export the version
        const buffer = await bawClient!.exportVersion(container, version, {
          format,
          useEnhancedFilenames
        });

        // Ensure output directory exists
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        // Write the file
        fs.writeFileSync(outputPath, buffer);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: 'Version exported successfully',
                outputPath,
                fileSize: buffer.length,
                container,
                version
              }, null, 2)
            }
          ]
        };
      }

      case 'create_version': {
        await ensureAuthenticated();

        const { container, versionName, branchAcronym, description } = args as {
          container: string;
          versionName: string;
          branchAcronym?: string;
          description?: string;
        };

        const result = await bawClient!.createVersion(container, versionName, {
          branchAcronym,
          description
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: 'Snapshot created successfully',
                version: result
              }, null, 2)
            }
          ]
        };
      }

      case 'delete_version': {
        await ensureAuthenticated();

        const {
          container,
          branchName,
          versions,
          force,
          keptNumber,
          createdBefore,
          createdAfter,
          createdBeforeVersion,
          deleteArchived,
          caseDosName,
          continueOnError
        } = args as {
          container: string;
          branchName?: string;
          versions?: string[];
          force?: boolean;
          keptNumber?: number;
          createdBefore?: string;
          createdAfter?: string;
          createdBeforeVersion?: string;
          deleteArchived?: boolean;
          caseDosName?: string;
          continueOnError?: boolean;
        };

        const result = await bawClient!.deleteVersions(container, {
          branchName,
          versions,
          force,
          keptNumber,
          createdBefore,
          createdAfter,
          createdBeforeVersion,
          deleteArchived,
          caseDosName,
          continueOnError
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: 'Delete request submitted. This is an asynchronous operation. Check system log for progress.',
                statusUrl: result.status_url,
                key: result.key,
                operationId: result.status_url ? result.status_url.split('/').pop() : undefined
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
