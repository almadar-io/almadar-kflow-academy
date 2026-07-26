// Migration contract shared between kflow client and server (Almadar_Migrations.md §4.6).
// The system concept is "migration"; user-facing copy says "Import" (§12.5).
import type { FieldValue } from '@almadar/core';

export type {
  ImportSource,
  ImportSourceKind,
  ImportUnit,
  StagedRelationship,
  SkippedElement,
  CommitResult,
  CommitFailure,
  UnitValidationError,
  UnitValidationErrorCode,
  MigrationTarget,
  MigrationTargetEntity,
  MigrationTargetRelation,
  DeterministicMapping,
  MigrationStepEvent,
} from '@almadar-io/migration';

import type {
  StagedRelationship,
  SkippedElement,
  CommitResult,
  UnitValidationErrorCode,
} from '@almadar-io/migration';

export interface ImportDocumentInput {
  ref: string;
  raw: string;
}

export interface MigrationPreviewRequest {
  adapterId: 'markdown' | 'paste';
  documents: ImportDocumentInput[];
  sourceRef?: string;
  graphId?: string;
}

// Wire DTOs — the migration handlers serialize absent optionals as null.
export interface ImportPreviewUnitDTO {
  ref: string;
  targetEntity: string;
  fields: Record<string, FieldValue>;
  parentRef: string | null;
  provenance: { source: string; span: string | null };
}

export interface ImportValidationErrorDTO {
  ref: string;
  code: UnitValidationErrorCode;
  field: string | null;
  message: string;
}

export interface ImportPreviewDTO {
  units: ImportPreviewUnitDTO[];
  relationships: StagedRelationship[];
  skipped: SkippedElement[];
  validationErrors: ImportValidationErrorDTO[];
}

export interface MigrationPreviewResponse {
  preview: ImportPreviewDTO;
}

export interface MigrationImportRequest extends MigrationPreviewRequest {
  jobId?: string;
}

export interface MigrationImportResponse {
  preview: ImportPreviewDTO;
  commit: CommitResult | null;
  graphId: string;
}

export interface AgentImportDocumentInput {
  id?: string;
  title?: string;
  content: string;
}

export interface MigrationAgentRequest {
  documents: AgentImportDocumentInput[];
  instruction?: string;
  graphId?: string;
  jobId?: string;
}

export interface MigrationAgentResponse {
  completed: boolean;
  reason: string;
  commit: CommitResult | null;
  graphId: string;
}

export interface MigrationApprovalRequest {
  approvalId: string;
  approved: boolean;
}

export interface MigrationApprovalResponse {
  resolved: boolean;
}
