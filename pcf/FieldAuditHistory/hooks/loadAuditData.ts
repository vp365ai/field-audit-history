// loadAuditData.ts — Shared audit data loader for hooks

import { DataverseService } from "../services/DataverseService";
import { IAuditEntry } from "../models/IAuditEntry";

export interface EntityContext {
    entityId: string;
    entityTypeName: string;
}

export type AuditLoadTarget =
    | { type: "record" }
    | { type: "field"; fieldLogicalName: string };

export interface AuditLoadResult {
    entries: IAuditEntry[];
    totalCount: number;
    moreRecords: boolean;
}

/**
 * Loads audit data for a record or a single field.
 * Filters entries by visibleOperations.
 * This is a pure async function — no React state management.
 */
export async function loadAuditData(
    service: DataverseService,
    entityContext: EntityContext,
    target: AuditLoadTarget,
    page: number,
    pageSize: number,
    visibleOperations: number[],
): Promise<AuditLoadResult> {
    const entitySetName = await service.getEntitySetName(
        entityContext.entityTypeName
    );

    const response =
        target.type === "field"
            ? await service.getFieldAuditHistory(
                  entitySetName,
                  entityContext.entityId,
                  target.fieldLogicalName,
                  page,
                  pageSize
              )
            : await service.getRecordAuditHistory(
                  entitySetName,
                  entityContext.entityId,
                  page,
                  pageSize
              );

    const entries = response.entries.filter((e) =>
        visibleOperations.includes(e.operation)
    );

    return {
        entries,
        totalCount: response.totalRecordCount,
        moreRecords: response.moreRecords,
    };
}
