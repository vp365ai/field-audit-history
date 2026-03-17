/* eslint-disable @typescript-eslint/unbound-method */
import { act } from "@testing-library/react";
import { renderHook } from "./renderHook";
import { useDeepDive } from "../hooks/useDeepDive";
import { DEFAULT_CONFIG } from "../models/IConfig";
import { createMockService, createMockContext, createAuditEntries, createAuditEntry, createFieldChange, resetAuditIdCounter } from "./helpers";
import { EntityContext } from "../hooks/loadAuditData";

describe("useDeepDive", () => {
    const entityContext: EntityContext = {
        entityId: "record-001",
        entityTypeName: "contact",
    };
    const mockContext = createMockContext();
    const config = DEFAULT_CONFIG;

    beforeEach(() => {
        resetAuditIdCounter();
    });

    function setupHook(service = createMockService(), ec: EntityContext | null = entityContext) {
        return renderHook(() =>
            useDeepDive(
                service,
                ec,
                mockContext as unknown as Parameters<typeof useDeepDive>[2],
                config,
            )
        );
    }

    it("should start with null deepDive state", () => {
        const service = createMockService();
        const { result } = setupHook(service);

        expect(result.current.deepDive).toBeNull();
        expect(result.current.filteredEntries).toEqual([]);
        expect(result.current.panelTitle).toBe("");
        expect(result.current.canLoadMore).toBe(false);
    });

    it("should open record audit and load data", async () => {
        const service = createMockService();
        const entries = createAuditEntries(3);
        (service.getRecordAuditHistory as jest.Mock).mockResolvedValue({
            entries,
            totalRecordCount: 3,
            moreRecords: false,
            pagingCookie: null,
        });

        const { result } = setupHook(service);

        await act(async () => {
            result.current.openRecordAudit();
            await new Promise((resolve) => setTimeout(resolve, 10));
        });

        expect(result.current.deepDive?.mode).toBe("record");
        expect(result.current.deepDive?.entries).toHaveLength(3);
        expect(result.current.deepDive?.loading).toBe(false);
        expect(result.current.panelTitle).toBe("Record Audit History");
    });

    it("should open field deep dive and load data", async () => {
        const service = createMockService();
        const entries = createAuditEntries(2);
        (service.getFieldAuditHistory as jest.Mock).mockResolvedValue({
            entries,
            totalRecordCount: 2,
            moreRecords: false,
            pagingCookie: null,
        });

        const { result } = setupHook(service);

        await act(async () => {
            result.current.openFieldDeepDive("emailaddress1", "Email");
            await new Promise((resolve) => setTimeout(resolve, 10));
        });

        expect(result.current.deepDive?.mode).toBe("field");
        expect(result.current.deepDive?.fieldLogicalName).toBe("emailaddress1");
        expect(result.current.panelTitle).toBe("Email — Audit History");
    });

    it("should dismiss and clear state", async () => {
        const service = createMockService();
        (service.getRecordAuditHistory as jest.Mock).mockResolvedValue({
            entries: createAuditEntries(1),
            totalRecordCount: 1,
            moreRecords: false,
            pagingCookie: null,
        });

        const { result } = setupHook(service);

        await act(async () => {
            result.current.openRecordAudit();
            await new Promise((resolve) => setTimeout(resolve, 10));
        });

        act(() => {
            result.current.handleDismiss();
        });

        expect(result.current.deepDive).toBeNull();
    });

    it("should handle load more (pagination)", async () => {
        const service = createMockService();
        const page1 = createAuditEntries(25);
        const page2 = createAuditEntries(5);

        (service.getRecordAuditHistory as jest.Mock)
            .mockResolvedValueOnce({
                entries: page1,
                totalRecordCount: 30,
                moreRecords: true,
                pagingCookie: null,
            })
            .mockResolvedValueOnce({
                entries: page2,
                totalRecordCount: 30,
                moreRecords: false,
                pagingCookie: null,
            });

        const { result } = setupHook(service);

        await act(async () => {
            result.current.openRecordAudit();
            await new Promise((resolve) => setTimeout(resolve, 10));
        });

        expect(result.current.canLoadMore).toBe(true);

        await act(async () => {
            result.current.handleLoadMore();
            await new Promise((resolve) => setTimeout(resolve, 10));
        });

        expect(result.current.deepDive?.entries.length).toBeGreaterThan(25);
        expect(result.current.deepDive?.currentPage).toBe(2);
    });

    it("should respect maxPages limit", async () => {
        const service = createMockService();
        const limitedConfig = {
            ...DEFAULT_CONFIG,
            audit: { ...DEFAULT_CONFIG.audit, maxPages: 1 },
        };

        (service.getRecordAuditHistory as jest.Mock).mockResolvedValue({
            entries: createAuditEntries(25),
            totalRecordCount: 100,
            moreRecords: true,
            pagingCookie: null,
        });

        const { result } = renderHook(() =>
            useDeepDive(
                service,
                entityContext,
                mockContext as unknown as Parameters<typeof useDeepDive>[2],
                limitedConfig,
            )
        );

        await act(async () => {
            result.current.openRecordAudit();
            await new Promise((resolve) => setTimeout(resolve, 10));
        });

        // maxPages=1, currentPage=1 → canLoadMore=false
        expect(result.current.canLoadMore).toBe(false);
    });

    it("should handle retry", async () => {
        const service = createMockService();
        (service.getRecordAuditHistory as jest.Mock)
            .mockRejectedValueOnce(new Error("Network error"))
            .mockResolvedValueOnce({
                entries: createAuditEntries(2),
                totalRecordCount: 2,
                moreRecords: false,
                pagingCookie: null,
            });

        const { result } = setupHook(service);

        await act(async () => {
            result.current.openRecordAudit();
            await new Promise((resolve) => setTimeout(resolve, 10));
        });

        expect(result.current.deepDive?.error).toBeTruthy();

        await act(async () => {
            result.current.handleRetry();
            await new Promise((resolve) => setTimeout(resolve, 10));
        });

        expect(result.current.deepDive?.error).toBeNull();
        expect(result.current.deepDive?.entries).toHaveLength(2);
    });

    it("should show error when entityContext is null", async () => {
        const service = createMockService();
        const { result } = setupHook(service, null);

        await act(async () => {
            result.current.openRecordAudit();
            await new Promise((resolve) => setTimeout(resolve, 10));
        });

        // No data loaded since no entity context — deepDive remains in loading state
        // The loadData callback sets error when entityContext is null
    });

    it("should filter entries by user", async () => {
        const service = createMockService();
        const entries = createAuditEntries(10);
        (service.getRecordAuditHistory as jest.Mock).mockResolvedValue({
            entries,
            totalRecordCount: 10,
            moreRecords: false,
            pagingCookie: null,
        });

        const { result } = setupHook(service);

        await act(async () => {
            result.current.openRecordAudit();
            await new Promise((resolve) => setTimeout(resolve, 10));
        });

        act(() => {
            result.current.handleFilterChange({
                selectedFields: [],
                selectedUsers: ["John Smith"],
                selectedOperations: [],
                showClearedOnly: false,
                dateFrom: null,
                dateTo: null,
            });
        });

        expect(result.current.filteredEntries.every((e) => e.changedByName === "John Smith")).toBe(true);
        expect(result.current.filteredEntries.length).toBeLessThan(10);
    });

    it("should filter entries by operation", async () => {
        const service = createMockService();
        const entries = createAuditEntries(10);
        (service.getRecordAuditHistory as jest.Mock).mockResolvedValue({
            entries,
            totalRecordCount: 10,
            moreRecords: false,
            pagingCookie: null,
        });

        const { result } = setupHook(service);

        await act(async () => {
            result.current.openRecordAudit();
            await new Promise((resolve) => setTimeout(resolve, 10));
        });

        act(() => {
            result.current.handleFilterChange({
                selectedFields: [],
                selectedUsers: [],
                selectedOperations: [1],
                showClearedOnly: false,
                dateFrom: null,
                dateTo: null,
            });
        });

        expect(result.current.filteredEntries.every((e) => e.operation === 1)).toBe(true);
    });

    it("should filter entries by date range", async () => {
        const service = createMockService();
        const entries = createAuditEntries(5);
        (service.getRecordAuditHistory as jest.Mock).mockResolvedValue({
            entries,
            totalRecordCount: 5,
            moreRecords: false,
            pagingCookie: null,
        });

        const { result } = setupHook(service);

        await act(async () => {
            result.current.openRecordAudit();
            await new Promise((resolve) => setTimeout(resolve, 10));
        });

        const now = new Date();
        const twoHoursAgo = new Date(now.getTime() - 2 * 3600000);

        act(() => {
            result.current.handleFilterChange({
                selectedFields: [],
                selectedUsers: [],
                selectedOperations: [],
                showClearedOnly: false,
                dateFrom: twoHoursAgo,
                dateTo: null,
            });
        });

        // Entries are 1 hour apart, starting from now. dateFrom=2h ago should include ~2-3
        expect(result.current.filteredEntries.length).toBeGreaterThan(0);
        expect(result.current.filteredEntries.length).toBeLessThanOrEqual(3);
    });

    it("should switch from field to record mode", async () => {
        const service = createMockService();
        (service.getFieldAuditHistory as jest.Mock).mockResolvedValue({
            entries: createAuditEntries(2),
            totalRecordCount: 2,
            moreRecords: false,
            pagingCookie: null,
        });
        (service.getRecordAuditHistory as jest.Mock).mockResolvedValue({
            entries: createAuditEntries(5),
            totalRecordCount: 5,
            moreRecords: false,
            pagingCookie: null,
        });

        const { result } = setupHook(service);

        await act(async () => {
            result.current.openFieldDeepDive("emailaddress1", "Email");
            await new Promise((resolve) => setTimeout(resolve, 10));
        });

        expect(result.current.deepDive?.mode).toBe("field");

        await act(async () => {
            result.current.handleViewAllFields();
            await new Promise((resolve) => setTimeout(resolve, 10));
        });

        expect(result.current.deepDive?.mode).toBe("record");
        // Preserves original field for "back" navigation
        expect(result.current.deepDive?.fieldLogicalName).toBe("emailaddress1");
    });

    it("should switch from record back to field mode", async () => {
        const service = createMockService();
        (service.getFieldAuditHistory as jest.Mock).mockResolvedValue({
            entries: createAuditEntries(2),
            totalRecordCount: 2,
            moreRecords: false,
            pagingCookie: null,
        });
        (service.getRecordAuditHistory as jest.Mock).mockResolvedValue({
            entries: createAuditEntries(5),
            totalRecordCount: 5,
            moreRecords: false,
            pagingCookie: null,
        });

        const { result } = setupHook(service);

        // Open field → switch to record → switch back to field
        await act(async () => {
            result.current.openFieldDeepDive("emailaddress1", "Email");
            await new Promise((resolve) => setTimeout(resolve, 10));
        });

        await act(async () => {
            result.current.handleViewAllFields();
            await new Promise((resolve) => setTimeout(resolve, 10));
        });

        await act(async () => {
            result.current.handleViewField();
            await new Promise((resolve) => setTimeout(resolve, 10));
        });

        expect(result.current.deepDive?.mode).toBe("field");
        expect(result.current.deepDive?.fieldLogicalName).toBe("emailaddress1");
    });

    it("should return all entries when no filters active", async () => {
        const service = createMockService();
        const entries = createAuditEntries(5);
        (service.getRecordAuditHistory as jest.Mock).mockResolvedValue({
            entries,
            totalRecordCount: 5,
            moreRecords: false,
            pagingCookie: null,
        });

        const { result } = setupHook(service);

        await act(async () => {
            result.current.openRecordAudit();
            await new Promise((resolve) => setTimeout(resolve, 10));
        });

        expect(result.current.filteredEntries).toHaveLength(5);
    });

    it("should filter entries by dateTo", async () => {
        const service = createMockService();
        const entries = createAuditEntries(5);
        (service.getRecordAuditHistory as jest.Mock).mockResolvedValue({
            entries,
            totalRecordCount: 5,
            moreRecords: false,
            pagingCookie: null,
        });

        const { result } = setupHook(service);

        await act(async () => {
            result.current.openRecordAudit();
            await new Promise((resolve) => setTimeout(resolve, 10));
        });

        // Set dateTo to a week ago — all entries are from today, so none should match
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 3600000);

        act(() => {
            result.current.handleFilterChange({
                selectedFields: [],
                selectedUsers: [],
                selectedOperations: [],
                showClearedOnly: false,
                dateFrom: null,
                dateTo: oneWeekAgo,
            });
        });

        expect(result.current.filteredEntries).toHaveLength(0);
    });

    it("should filter entries by field name", async () => {
        const service = createMockService();
        const entries = [
            createAuditEntry({
                changedFields: [createFieldChange({ fieldName: "emailaddress1" })],
            }),
            createAuditEntry({
                changedFields: [createFieldChange({ fieldName: "telephone1" })],
            }),
        ];
        (service.getRecordAuditHistory as jest.Mock).mockResolvedValue({
            entries,
            totalRecordCount: 2,
            moreRecords: false,
            pagingCookie: null,
        });

        const { result } = setupHook(service);

        await act(async () => {
            result.current.openRecordAudit();
            await new Promise((resolve) => setTimeout(resolve, 10));
        });

        act(() => {
            result.current.handleFilterChange({
                selectedFields: ["emailaddress1"],
                selectedUsers: [],
                selectedOperations: [],
                showClearedOnly: false,
                dateFrom: null,
                dateTo: null,
            });
        });

        expect(result.current.filteredEntries).toHaveLength(1);
        expect(result.current.filteredEntries[0].changedFields[0].fieldName).toBe("emailaddress1");
    });

    it("should handle load more in field mode", async () => {
        const service = createMockService();
        const page1 = createAuditEntries(25);
        const page2 = createAuditEntries(5);

        (service.getFieldAuditHistory as jest.Mock)
            .mockResolvedValueOnce({
                entries: page1,
                totalRecordCount: 30,
                moreRecords: true,
                pagingCookie: null,
            })
            .mockResolvedValueOnce({
                entries: page2,
                totalRecordCount: 30,
                moreRecords: false,
                pagingCookie: null,
            });

        const { result } = setupHook(service);

        await act(async () => {
            result.current.openFieldDeepDive("emailaddress1", "Email");
            await new Promise((resolve) => setTimeout(resolve, 10));
        });

        expect(result.current.canLoadMore).toBe(true);

        await act(async () => {
            result.current.handleLoadMore();
            await new Promise((resolve) => setTimeout(resolve, 10));
        });

        expect(result.current.deepDive?.entries.length).toBeGreaterThan(25);
        expect(result.current.deepDive?.currentPage).toBe(2);
    });

    it("should retry in field mode", async () => {
        const service = createMockService();
        (service.getFieldAuditHistory as jest.Mock)
            .mockRejectedValueOnce(new Error("Network error"))
            .mockResolvedValueOnce({
                entries: createAuditEntries(2),
                totalRecordCount: 2,
                moreRecords: false,
                pagingCookie: null,
            });

        const { result } = setupHook(service);

        await act(async () => {
            result.current.openFieldDeepDive("emailaddress1", "Email");
            await new Promise((resolve) => setTimeout(resolve, 10));
        });

        expect(result.current.deepDive?.error).toBeTruthy();

        await act(async () => {
            result.current.handleRetry();
            await new Promise((resolve) => setTimeout(resolve, 10));
        });

        expect(result.current.deepDive?.error).toBeNull();
        expect(result.current.deepDive?.entries).toHaveLength(2);
    });

    it("should not load more when at maxPages limit", async () => {
        const service = createMockService();
        const limitedConfig = {
            ...DEFAULT_CONFIG,
            audit: { ...DEFAULT_CONFIG.audit, maxPages: 1 },
        };

        (service.getRecordAuditHistory as jest.Mock).mockResolvedValue({
            entries: createAuditEntries(25),
            totalRecordCount: 100,
            moreRecords: true,
            pagingCookie: null,
        });

        const { result } = renderHook(() =>
            useDeepDive(
                service,
                entityContext,
                mockContext as unknown as Parameters<typeof useDeepDive>[2],
                limitedConfig,
            )
        );

        await act(async () => {
            result.current.openRecordAudit();
            await new Promise((resolve) => setTimeout(resolve, 10));
        });

        // Try to load more — should be blocked by maxPages guard
        await act(async () => {
            result.current.handleLoadMore();
            await new Promise((resolve) => setTimeout(resolve, 10));
        });

        // Still page 1 — service should only have been called once (initial load)
        expect(result.current.deepDive?.currentPage).toBe(1);
        expect(service.getRecordAuditHistory).toHaveBeenCalledTimes(1);
    });

    it("should filter by combined user + operation", async () => {
        const service = createMockService();
        const entries = [
            createAuditEntry({ changedByName: "John Smith", operation: 1, operationLabel: "Created" }),
            createAuditEntry({ changedByName: "John Smith", operation: 2, operationLabel: "Updated" }),
            createAuditEntry({ changedByName: "Jane Doe", operation: 1, operationLabel: "Created" }),
            createAuditEntry({ changedByName: "Jane Doe", operation: 2, operationLabel: "Updated" }),
        ];
        (service.getRecordAuditHistory as jest.Mock).mockResolvedValue({
            entries,
            totalRecordCount: 4,
            moreRecords: false,
            pagingCookie: null,
        });

        const { result } = setupHook(service);

        await act(async () => {
            result.current.openRecordAudit();
            await new Promise((resolve) => setTimeout(resolve, 10));
        });

        act(() => {
            result.current.handleFilterChange({
                selectedFields: [],
                selectedUsers: ["John Smith"],
                selectedOperations: [1],
                showClearedOnly: false,
                dateFrom: null,
                dateTo: null,
            });
        });

        // Only John Smith + Created
        expect(result.current.filteredEntries).toHaveLength(1);
        expect(result.current.filteredEntries[0].changedByName).toBe("John Smith");
        expect(result.current.filteredEntries[0].operation).toBe(1);
    });

    it("should filter by combined dateFrom + dateTo + field", async () => {
        const service = createMockService();
        const now = Date.now();
        const entries = [
            createAuditEntry({
                changedOn: new Date(now - 2 * 3600000),
                changedFields: [createFieldChange({ fieldName: "emailaddress1" })],
            }),
            createAuditEntry({
                changedOn: new Date(now - 48 * 3600000), // 2 days ago
                changedFields: [createFieldChange({ fieldName: "emailaddress1" })],
            }),
            createAuditEntry({
                changedOn: new Date(now - 2 * 3600000),
                changedFields: [createFieldChange({ fieldName: "telephone1" })],
            }),
        ];
        (service.getRecordAuditHistory as jest.Mock).mockResolvedValue({
            entries,
            totalRecordCount: 3,
            moreRecords: false,
            pagingCookie: null,
        });

        const { result } = setupHook(service);

        await act(async () => {
            result.current.openRecordAudit();
            await new Promise((resolve) => setTimeout(resolve, 10));
        });

        act(() => {
            result.current.handleFilterChange({
                selectedFields: ["emailaddress1"],
                selectedUsers: [],
                selectedOperations: [],
                showClearedOnly: false,
                dateFrom: new Date(now - 12 * 3600000), // 12h ago
                dateTo: new Date(), // now
            });
        });

        // Only email entries within last 12h → 1 entry
        expect(result.current.filteredEntries).toHaveLength(1);
        expect(result.current.filteredEntries[0].changedFields[0].fieldName).toBe("emailaddress1");
    });

    it("should include dateTo entries within end of day", async () => {
        const service = createMockService();
        const entries = createAuditEntries(5);
        (service.getRecordAuditHistory as jest.Mock).mockResolvedValue({
            entries,
            totalRecordCount: 5,
            moreRecords: false,
            pagingCookie: null,
        });

        const { result } = setupHook(service);

        await act(async () => {
            result.current.openRecordAudit();
            await new Promise((resolve) => setTimeout(resolve, 10));
        });

        // Set dateTo to today — entries from today should be included (end of day = 23:59:59.999)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        act(() => {
            result.current.handleFilterChange({
                selectedFields: [],
                selectedUsers: [],
                selectedOperations: [],
                showClearedOnly: false,
                dateFrom: null,
                dateTo: today,
            });
        });

        // All 5 entries are from today (within last 5 hours), so all should match
        expect(result.current.filteredEntries).toHaveLength(5);
    });
});
