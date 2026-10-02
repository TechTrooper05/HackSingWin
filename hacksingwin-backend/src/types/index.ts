export type LanguageId = 54 | 71 | 62; // 54 = C++, 71 = Python 3, 62 = Java 13
export type SubmissionStatus = 'AC' | 'WA' | 'TLE' | 'MLE' | 'CE' | 'RTE' | 'PENDING' | 'QUEUED';
export type TelemetryEventType = 'TAB_SWITCH' | 'LARGE_PASTE' | 'RECONNECT';
export type WorkspaceState = 'ACTIVE' | 'LOCKED';
export type UserRole = 'PARTICIPANT' | 'ADMIN';

export interface CodeUpdatePayload {
  teamId: string;
  problemId: string;
  code: string;
  genId: number;
}

export interface SwitchCompletePayload {
  teamId: string;
  activeEditorId: string;
  authoritativeCode: string;
  genId: number;
}

export interface VerdictPayload {
  submissionId: string;
  status: SubmissionStatus;
  timeMs: number | null;
  memoryKb: number | null;
  score: number;
  testCasesPassed: number;
  totalTestCases: number;
  compilerOutput?: string;
}

export interface TelemetryPayload {
  teamId: string;
  userId: string;
  eventType: TelemetryEventType;
  metadata?: Record<string, unknown>;
}

export interface AuthPayload {
  userId: string;
  teamId?: string | null;
  role: UserRole;
}
