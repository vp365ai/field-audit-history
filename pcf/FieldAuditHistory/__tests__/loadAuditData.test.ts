/* eslint-disable @typescript-eslint/unbound-method */
import { loadAuditData, EntityContext, AuditLoadTarget } from "../hooks/loadAuditData";
import { createMockService, createAuditEntries, resetAuditIdCounter } from "./helpers";

describe("loadAuditData", () => {
    const entityContext: EntityContext = {
        entityId: "record-001",
        entityTypeName: "contact",
    };
    const visibleOperations = [1, 2, 3];

    beforeEach(() => {
        resetAuditIdCounter();
    });

    it("should load record-level audit data", async () => {
        const service = createMockService();
        const entries = createAuditEntries(3);
        (service.getRecordAuditHistory as jest.Mock).mockResolvedValue({
            entries,
            totalRecordCount: 3,
            moreRecords: false,
            pagingCookie: null,
        });

        const target: AuditLoadTarget = { type: "record" };
        const result = await loadAuditData(service, entityContext, target, 1, 25, visibleOperations);

        expect(service.getEntitySetName).toHaveBeenCalledWith("contact");
        expect(service.getRecordAuditHistory).toHaveBeenCalledWith("contacts", "record-001", 1, 25);
        expect(result.entries).toHaveLength(3);
        expect(result.totalCount).toBe(3);
        expect(result.moreRecords).toBe(false);
    });

    it("should load field-level audit data", async () => {
        const service = createMockService();
        const entries = createAuditEntries(2);
        (service.getFieldAuditHistory as jest.Mock).mockResolvedValue({
            entries,
            totalRecordCount: 2,
            moreRecords: false,
            pagingCookie: null,
        });

        const target: AuditLoadTarget = { type: "field", fieldLogicalName: "emailaddress1" };
        const result = await loadAuditData(service, entityContext, target, 1, 25, visibleOperations);

        expect(service.getFieldAuditHistory).toHaveBeenCalledWith("contacts", "record-001", "emailaddress1", 1, 25);
        expect(result.entries).toHaveLength(2);
    });

    it("should filter entries by visible operations", async () => {
        const service = createMockService();
        const entries = createAuditEntries(5);
        // Make one entry operation=4 (Accessed) which should be filtered out
        entries[2] = { ...entries[2], operation: 4, operationLabel: "Accessed" };
        (service.getRecordAuditHistory as jest.Mock).mockResolvedValue({
            entries,
            totalRecordCount: 5,
            moreRecords: false,
            pagingCookie: null,
        });

        const result = await loadAuditData(
            service, entityContext, { type: "record" }, 1, 25, [1, 2, 3]
        );

        expect(result.entries).toHaveLength(4);
        expect(result.entries.every((e) => [1, 2, 3].includes(e.operation))).toBe(true);
    });

    it("should pass pagination parameters", async () => {
        const service = createMockService();
        (service.getRecordAuditHistory as jest.Mock).mockResolvedValue({
            entries: [],
            totalRecordCount: 100,
            moreRecords: true,
            pagingCookie: null,
        });

        const result = await loadAuditData(
            service, entityContext, { type: "record" }, 3, 50, visibleOperations
        );

        expect(service.getRecordAuditHistory).toHaveBeenCalledWith("contacts", "record-001", 3, 50);
        expect(result.totalCount).toBe(100);
        expect(result.moreRecords).toBe(true);
    });

    it("should return no entries when visibleOperations is empty", async () => {
        const service = createMockService();
        const entries = createAuditEntries(5);
        (service.getRecordAuditHistory as jest.Mock).mockResolvedValue({
            entries,
            totalRecordCount: 5,
            moreRecords: false,
            pagingCookie: null,
        });

        const result = await loadAuditData(
            service, entityContext, { type: "record" }, 1, 25, []
        );

        // Empty visibleOperations means no operations match the filter
        expect(result.entries).toHaveLength(0);
        expect(result.totalCount).toBe(5);
    });

    it("should propagate service errors", async () => {
        const service = createMockService();
        (service.getEntitySetName as jest.Mock).mockRejectedValue(new Error("Network error"));

        await expect(
            loadAuditData(service, entityContext, { type: "record" }, 1, 25, visibleOperations)
        ).rejects.toThrow("Network error");
    });
});
