// helpers.ts — Test factories and mock utilities
import { IAuditEntry, IFieldChange } from "../models/IAuditEntry";
import { IAuditConfig, DEFAULT_CONFIG, IFilterState } from "../models/IConfig";
import { DataverseService } from "../services/DataverseService";

export function createMockService(): jest.Mocked<DataverseService> {
    return {
        loadConfig: jest.fn().mockResolvedValue(DEFAULT_CONFIG),
        getAuditEnabledAttributes: jest.fn().mockResolvedValue(["emailaddress1"]),
        getEntitySetName: jest.fn().mockResolvedValue("contacts"),
        getFieldAuditHistory: jest.fn(),
        getRecordAuditHistory: jest.fn(),
        getAttributeDisplayNames: jest.fn().mockReturnValue({}),
        restoreFieldValue: jest.fn().mockResolvedValue(undefined),
        getOrgAuditEnabled: jest.fn().mockResolvedValue(true),
        getEntityAuditEnabled: jest.fn().mockResolvedValue(true),
    } as unknown as jest.Mocked<DataverseService>;
}

export function createMockWebAPI(): ComponentFramework.WebApi {
    return {
        retrieveMultipleRecords: jest.fn().mockResolvedValue({ entities: [] }),
        retrieveRecord: jest.fn().mockResolvedValue({}),
        updateRecord: jest.fn().mockResolvedValue({ id: "record-001" }),
        createRecord: jest.fn().mockResolvedValue({ id: "record-001" }),
        deleteRecord: jest.fn().mockResolvedValue({ id: "record-001" }),
    } as unknown as ComponentFramework.WebApi;
}

let auditIdCounter = 0;

export function resetAuditIdCounter(): void {
    auditIdCounter = 0;
}

export function createFieldChange(overrides: Partial<IFieldChange> = {}): IFieldChange {
    return {
        fieldName: "emailaddress1",
        displayName: "emailaddress1",
        oldValue: "old@test.com",
        newValue: "new@test.com",
        rawOldValue: "old@test.com",
        rawNewValue: "new@test.com",
        fieldType: "standard",
        ...overrides,
    };
}

export function createLookupFieldChange(overrides: Partial<IFieldChange> = {}): IFieldChange {
    return {
        fieldName: "_primarycontactid_value",
        displayName: "primarycontactid",
        oldValue: "John Smith",
        newValue: "Jane Doe",
        rawOldValue: "aaa-bbb-ccc-111",
        rawNewValue: "ddd-eee-fff-222",
        lookupTarget: "contact",
        fieldType: "lookup",
        ...overrides,
    };
}

export function createAuditEntry(overrides: Partial<IAuditEntry> = {}): IAuditEntry {
    auditIdCounter++;
    return {
        auditId: `audit-${auditIdCounter}`,
        operation: 2,
        operationLabel: "Updated",
        changedOn: new Date("2026-03-10T15:30:00Z"),
        changedById: "user-001",
        changedByName: "John Smith",
        changedFields: [createFieldChange()],
        ...overrides,
    };
}

export function createAuditEntries(count: number): IAuditEntry[] {
    return Array.from({ length: count }, (_, i) =>
        createAuditEntry({
            auditId: `audit-batch-${i}`,
            changedOn: new Date(Date.now() - i * 3600000), // 1 hour apart
            changedByName: i % 2 === 0 ? "John Smith" : "Jane Doe",
            operation: i === 0 ? 1 : 2,
            operationLabel: i === 0 ? "Created" : "Updated",
            changedFields: [
                createFieldChange({
                    oldValue: `value-${i + 1}`,
                    newValue: `value-${i}`,
                }),
            ],
        })
    );
}

export function createConfig(overrides: Partial<IAuditConfig> = {}): IAuditConfig {
    return {
        ...DEFAULT_CONFIG,
        ...overrides,
    };
}

export function createEmptyFilterState(): IFilterState {
    return {
        selectedFields: [],
        selectedUsers: [],
        selectedOperations: [],
        showClearedOnly: false,
        dateFrom: null,
        dateTo: null,
    };
}

export function createMockContext() {
    return {
        parameters: {
            boundField: {
                raw: "test",
                attributes: { LogicalName: "vp365_audithost" },
            },
            configWebResourceName: { raw: null as string | null },
            pageSize: { raw: 25 },
        },
        webAPI: {
            retrieveMultipleRecords: jest.fn().mockResolvedValue({ entities: [] }),
        },
        page: {
            entityId: "record-001",
            entityTypeName: "contact",
        },
    };
}

export function mockFetchResponse(data: unknown, ok = true, status = 200): void {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok,
        status,
        statusText: ok ? "OK" : "Error",
        json: () => Promise.resolve(data),
    });
}

export function mockEntitySetNameResponse(entitySetName = "contacts"): void {
    mockFetchResponse({ EntitySetName: entitySetName });
}

export function mockAuditResponse(
    entries: IAuditEntry[] = [],
    totalCount = 0,
    moreRecords = false
): void {
    // Convert IAuditEntry[] back to raw API shape
    const details = entries.map((entry) => ({
        AuditRecord: {
            auditid: entry.auditId,
            operation: entry.operation,
            createdon: entry.changedOn.toISOString(),
            _userid_value: entry.changedById,
            "_userid_value@OData.Community.Display.V1.FormattedValue": entry.changedByName,
        },
        OldValue: Object.fromEntries(
            entry.changedFields.map((f) => [f.fieldName, f.oldValue])
        ),
        NewValue: Object.fromEntries(
            entry.changedFields.map((f) => [f.fieldName, f.newValue])
        ),
    }));

    mockFetchResponse({
        AuditDetailCollection: {
            MoreRecords: moreRecords,
            TotalRecordCount: totalCount || entries.length,
            AuditDetails: details,
        },
    });
}

/** Map of known field logical names → display names for test data */
const TEST_DISPLAY_NAMES: Record<string, string> = {
    emailaddress1: "Email",
    telephone1: "Business Phone",
    jobtitle: "Job Title",
    contoso_primaryrole: "Primary Role",
    contoso_hourlyrate: "Hourly Rate",
};

export function mockOrgAuditResponse(enabled: boolean): void {
    mockFetchResponse({ value: [{ isauditenabled: enabled }] });
}

export function mockEntityAuditSettingResponse(enabled: boolean): void {
    mockFetchResponse({ IsAuditEnabled: { Value: enabled } });
}

export function mockAuditEnabledAttributesResponse(fields: string[]): void {
    mockFetchResponse({
        value: fields.map((f) => ({
            LogicalName: f,
            IsAuditEnabled: { Value: true },
            DisplayName: {
                UserLocalizedLabel: {
                    Label: TEST_DISPLAY_NAMES[f] ?? f,
                },
            },
        })),
    });
}
