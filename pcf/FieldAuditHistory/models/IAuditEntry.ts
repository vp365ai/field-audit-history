// IAuditEntry.ts — Audit entry and field change interfaces

export interface IFieldChange {
    fieldName: string;
    displayName: string;
    oldValue: string | null;
    newValue: string | null;
    /** Raw API value before the change (GUID, integer, ISO date, etc.) */
    rawOldValue?: unknown;
    /** Raw API value after the change */
    rawNewValue?: unknown;
    /** Target entity logical name for lookup fields (e.g., "systemuser") */
    lookupTarget?: string;
    /** Field type: "lookup" for navigation properties, "standard" for everything else */
    fieldType?: "lookup" | "standard";
}

export interface IAuditEntry {
    auditId: string;
    operation: number;
    operationLabel: string;
    changedOn: Date;
    changedById: string;
    changedByName: string;
    changedFields: IFieldChange[];
}

export interface IAuditResponse {
    entries: IAuditEntry[];
    moreRecords: boolean;
    pagingCookie: string | null;
    totalRecordCount: number;
}
