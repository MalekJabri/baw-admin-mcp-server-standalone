/**
 * IBM Business Automation Workflow REST API Client
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import https from 'https';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import type {
  BAWConfig,
  CSRFToken,
  LoginRequest,
  QueuedOperationStatus,
  InstallRequest,
  SnapshotInstallRequest,
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
    // Validate required configuration
    if (!config.baseUrl) {
      throw new Error('baseUrl is required in BAW configuration');
    }
    if (!config.username) {
      throw new Error('username is required in BAW configuration');
    }
    if (!config.password) {
      throw new Error('password is required in BAW configuration');
    }

    // Ensure baseUrl is a string
    const baseUrl = String(config.baseUrl).trim();
    if (!baseUrl) {
      throw new Error('baseUrl cannot be empty');
    }

    this.config = {
      ...config,
      baseUrl
    };
    
    // Use baseUrl as-is - it should include the full path (e.g., https://server:9443/bas/ops)
    const axiosConfig: any = {
      baseURL: baseUrl,
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
      axiosConfig.httpsAgent = new https.Agent({
        rejectUnauthorized: false
      });
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
   * Install a process application from a file (.zip or .twx)
   */
  async installContainer(request: InstallRequest): Promise<RequestAcceptedResult> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated. Please login first.');
    }

    const { install_file, inactive, caseDosName, caseProjectArea, caseOverwrite } = request;

    // Normalize path for cross-platform compatibility (handles Windows backslashes)
    const normalizedPath = path.normalize(install_file);

    // Check if file exists
    if (!fs.existsSync(normalizedPath)) {
      throw new Error(`Installation file not found: ${normalizedPath}`);
    }

    // Create form data
    const formData = new FormData();
    formData.append('install_file', fs.createReadStream(normalizedPath));

    // Build query parameters
    const params: any = {};
    if (inactive !== undefined) params.inactive = inactive;
    if (caseDosName) params.caseDosName = caseDosName;
    if (caseProjectArea) params.caseProjectArea = caseProjectArea;
    if (caseOverwrite !== undefined) params.caseOverwrite = caseOverwrite;

    const response = await this.axiosInstance.post<RequestAcceptedResult>(
      `/std/bpm/containers/install`,
      formData,
      {
        params,
        headers: {
          ...formData.getHeaders(),
          'BPMCSRFToken': this.csrfToken
        }
      }
    );

    return response.data;
  }

  /**
   * Install a process application snapshot to a workflow server (from Workflow Center)
   */
  async installSnapshot(request: SnapshotInstallRequest): Promise<RequestAcceptedResult> {
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
   * List all versions/snapshots of a container
   */
  async listVersions(
    container: string,
    options?: {
      versionIds?: string[];
      branch?: string;
      offset?: number;
      size?: number;
    }
  ): Promise<{ versions: Version[] }> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated. Please login first.');
    }

    const params: any = {};
    if (options?.versionIds && options.versionIds.length > 0) {
      params.version_ids = options.versionIds.join(',');
    }
    if (options?.branch) params.branch = options.branch;
    if (options?.offset !== undefined) params.offset = options.offset;
    if (options?.size !== undefined) params.size = options.size;

    const response = await this.axiosInstance.get<{ versions: Version[] }>(
      `/std/bpm/containers/${container}/versions`,
      { params }
    );

    return response.data;
  }

  /**
   * Export a container version as a TWX file
   */
  async exportVersion(
    container: string,
    version: string,
    options?: {
      format?: 'twxWithoutToolkits';
      useEnhancedFilenames?: boolean;
    }
  ): Promise<Buffer> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated. Please login first.');
    }

    const params: any = {};
    if (options?.format) params.format = options.format;
    if (options?.useEnhancedFilenames !== undefined) {
      params.use_enhanced_filenames = options.useEnhancedFilenames;
    }

    const response = await this.axiosInstance.get(
      `/std/bpm/containers/${container}/versions/${version}/export`,
      {
        params,
        responseType: 'arraybuffer',
        headers: {
          'Accept': 'application/octet-stream',
          'BPMCSRFToken': this.csrfToken
        }
      }
    );

    return Buffer.from(response.data);
  }

  /**
   * Create a new snapshot of a process application or toolkit
   */
  async createVersion(
    container: string,
    versionName: string,
    options?: {
      branchAcronym?: string;
      description?: string;
    }
  ): Promise<Version> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated. Please login first.');
    }

    const body: any = {
      version_name: versionName
    };

    if (options?.branchAcronym) {
      body.branch_acronym = options.branchAcronym;
    }
    if (options?.description) {
      body.description = options.description;
    }

    const response = await this.axiosInstance.post<Version>(
      `/std/bpm/containers/${container}/versions`,
      body
    );

    return response.data;
  }

  /**
   * Get count of versions/snapshots for a container
   */
  async getVersionsCount(container: string, branch?: string): Promise<{ count: number }> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated. Please login first.');
    }

    const params: any = {};
    if (branch) params.branch = branch;

    const response = await this.axiosInstance.get<{ count: number }>(
      `/std/bpm/containers/${container}/versions/count`,
      { params }
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

  /**
   * Delete snapshots of process applications or toolkits
   * This operation is asynchronous and returns a status URL to monitor progress
   */
  async deleteVersions(
    container: string,
    options?: {
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
    }
  ): Promise<RequestAcceptedResult> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated. Please login first.');
    }

    const params: any = {};
    if (options?.branchName) params.branch_name = options.branchName;
    if (options?.versions && options.versions.length > 0) {
      params.versions = options.versions.join(',');
    }
    if (options?.force !== undefined) params.force = options.force;
    if (options?.keptNumber !== undefined) params.kept_number = options.keptNumber;
    if (options?.createdBefore) params.created_before = options.createdBefore;
    if (options?.createdAfter) params.created_after = options.createdAfter;
    if (options?.createdBeforeVersion) params.created_before_version = options.createdBeforeVersion;
    if (options?.deleteArchived !== undefined) params.delete_archived = options.deleteArchived;
    if (options?.caseDosName) params.caseDosName = options.caseDosName;
    if (options?.continueOnError !== undefined) params.continueOnError = options.continueOnError;

    const response = await this.axiosInstance.delete<RequestAcceptedResult>(
      `/std/bpm/containers/${container}/versions`,
      { params }
    );

    return response.data;
  }
}

// Made with Bob
