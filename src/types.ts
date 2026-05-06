/**
 * Types for IBM Business Automation Workflow Operations MCP Server
 */

export interface BAWConfig {
  baseUrl: string;
  username: string;
  password: string;
  rejectUnauthorized?: boolean;
}

export interface CSRFToken {
  csrf_token: string;
}

export interface LoginRequest {
  refresh_groups?: boolean;
}

export interface QueuedOperationStatus {
  status: 'running' | 'success' | 'failed';
  result?: any;
  error?: string;
  progress?: number;
}

export interface InstallRequest {
  container: string;
  version: string;
  server: string;
  skip_governance?: boolean;
  case_project_area?: string;
  migration_instructions?: MigrationInstruction[];
}

export interface MigrationInstruction {
  source_snapshot_id: string;
  target_snapshot_id: string;
}

export interface RequestAcceptedResult {
  status_url: string;
  key?: string;
}

export interface InstallMessage {
  message_id: string;
  message_name: string;
  parent_message_id?: string;
  start_time?: string;
  end_time?: string;
  type: 'PC_PRE_INSTALL_STEP' | 'PC_POST_INSTALL_STEP' | 'STEP' | 'INFORMATIONAL_MESSAGE' | 'WARNING_MESSAGE' | 'ERROR_MESSAGE' | 'RECOVERY_MESSAGE';
  state: 'RUNNING' | 'COMPLETED_SUCCESSFULLY' | 'COMPLETED_IN_ERROR' | 'NONE';
  server_name?: string;
  thread_id?: string;
  message?: string;
}

export interface InstallMessagesResult {
  install_messages: InstallMessage[];
}

export interface Version {
  container_id: string;
  container_name: string;
  container_acronym: string;
  branch_id?: string;
  branch_name?: string;
  branch_acronym?: string;
  tip?: boolean;
  snapshot_name: string;
  snapshot_id: string;
  snapshot_acronym: string;
  is_active: boolean;
  is_default: boolean;
  is_installed: boolean;
  is_archived: boolean;
  has_suspended_all_instances: boolean;
  snapshot_deployed_on?: string;
  is_installed_on_process_server: boolean;
  error?: string;
  state: string;
  possible_actions: string[];
  case_display_name?: string;
}

export interface Container {
  container_id: string;
  container_name: string;
  container_acronym: string;
  container_type: string;
  is_archived: boolean;
  default_version?: string;
}

export interface BAWException {
  error_number?: string;
  error_message: string;
  error_message_label?: string;
  error_data?: any;
}

// Made with Bob
