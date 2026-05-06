/**
 * IBM Business Automation Workflow REST API Client
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import type {
  BAWConfig,
  CSRFToken,
  LoginRequest,
  QueuedOperationStatus,
  InstallRequest,
  RequestAcceptedResult,
  InstallMessagesResult,
  Version,
  Container,
  BAWException
} from './types.js';

export class BAWClient {
  private axiosInstance: AxiosInstance;
  private csrfToken: string | null = null;
  private config: BAWConfig;

  constructor(config: BAWConfig) {
    this.config = config;
    
    const axiosConfig: any = {
      baseURL: `${config.baseUrl}/bas/ops`,
      auth: {
        username: config.username,
        password: config.password
      },
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    // Handle SSL certificate validation
    if (config.rejectUnauthorized === false) {
      axiosConfig.httpsAgent = new HttpsProxyAgent({
        rejectUnauthorized: false
      } as any);
    }

    this.axiosInstance = axios.create(axiosConfig);

    // Add response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      response => response,
      error => this.handleError(error)
    );
  }

  private handleError(error: AxiosError): never {
    if (error.response) {
      const bawError = error.response.data as BAWException;
      throw new Error(
        `BAW API Error (${error.response.status}): ${bawError.error_message || error.message}`
      );
    } else if (error.request) {
      throw new Error(`No response from BAW server: ${error.message}`);
    } else {
      throw new Error(`Request error: ${error.message}`);
    }
  }

  /**
   * Login and obtain CSRF token
   */
  async login(refreshGroups: boolean = false): Promise<string> {
    try {
      const loginRequest: LoginRequest = {
        refresh_groups: refreshGroups
      };

      const response = await this.axiosInstance.post<CSRFToken>(
        '/system/login',
        loginRequest
      );

      this.csrfToken = response.data.csrf_token;
      
      // Add CSRF token to all future requests
      this.axiosInstance.defaults.headers.common['BPMCSRFToken'] = this.csrfToken;

      return this.csrfToken;
    } catch (error) {
      throw new Error(`Login failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get the current CSRF token
   */
  getCSRFToken(): string | null {
    return this.csrfToken;
  }

  /**
   * Check if client is authenticated
   */
  isAuthenticated(): boolean {
    return this.csrfToken !== null;
  }

  /**
   * Get status of an asynchronous operation
   */
  async getQueueStatus(operationId: string, key?: string): Promise<QueuedOperationStatus> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated. Please login first.');
    }

    const params = key ? { key } : {};
    const response = await this.axiosInstance.get<QueuedOperationStatus>(
      `/system/queue/${operationId}`,
      { params }
    );

    return response.data;
  }

  /**
   * Install a process application snapshot to a workflow server
   */
  async installContainer(request: InstallRequest): Promise<RequestAcceptedResult> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated. Please login first.');
    }

    const { container, version, server, skip_governance, case_project_area, migration_instructions } = request;

    const params: any = { server };
    if (skip_governance !== undefined) {
      params.skip_governance = skip_governance;
    }
    if (case_project_area) {
      params.case_project_area = case_project_area;
    }

    const body = migration_instructions ? { migration_instructions } : {};

    const response = await this.axiosInstance.post<RequestAcceptedResult>(
      `/std/bpm/containers/${container}/versions/${version}/install`,
      body,
      { params }
    );

    return response.data;
  }

  /**
   * Get installation messages for a container version
   */
  async getInstallMessages(
    container: string,
    version: string,
    server?: string
  ): Promise<InstallMessagesResult> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated. Please login first.');
    }

    const params = server ? { server } : {};
    const response = await this.axiosInstance.get<InstallMessagesResult>(
      `/std/bpm/containers/${container}/versions/${version}/install_messages`,
      { params }
    );

    return response.data;
  }

  /**
   * Get information about a specific container version
   */
  async getVersion(container: string, version: string): Promise<Version> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated. Please login first.');
    }

    const response = await this.axiosInstance.get<Version>(
      `/std/bpm/containers/${container}/versions/${version}`
    );

    return response.data;
  }

  /**
   * Get information about a container
   */
  async getContainer(container: string): Promise<Container> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated. Please login first.');
    }

    const response = await this.axiosInstance.get<Container>(
      `/std/bpm/containers/${container}`
    );

    return response.data;
  }

  /**
   * List all containers
   */
  async listContainers(offset?: number, size?: number): Promise<{ containers: Container[] }> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated. Please login first.');
    }

    const params: any = {};
    if (offset !== undefined) params.offset = offset;
    if (size !== undefined) params.size = size;

    const response = await this.axiosInstance.get<{ containers: Container[] }>(
      '/std/bpm/containers',
      { params }
    );

    return response.data;
  }

  /**
   * Activate a container version
   */
  async activateVersion(container: string, version: string): Promise<Version> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated. Please login first.');
    }

    const response = await this.axiosInstance.post<Version>(
      `/std/bpm/containers/${container}/versions/${version}/activate`
    );

    return response.data;
  }

  /**
   * Deactivate a container version
   */
  async deactivateVersion(
    container: string,
    version: string,
    force?: boolean,
    suspendInstances?: boolean
  ): Promise<Version> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated. Please login first.');
    }

    const params: any = {};
    if (force !== undefined) params.force = force;
    if (suspendInstances !== undefined) params.suspend_bpd_instances = suspendInstances;

    const response = await this.axiosInstance.post<Version>(
      `/std/bpm/containers/${container}/versions/${version}/deactivate`,
      {},
      { params }
    );

    return response.data;
  }
}

// Made with Bob
