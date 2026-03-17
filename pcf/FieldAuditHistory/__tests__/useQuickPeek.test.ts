import { act } from "@testing-library/react";
import { renderHook } from "./renderHook";
import { useQuickPeek } from "../hooks/useQuickPeek";
import { DEFAULT_CONFIG } from "../models/IConfig";
import { createMockService, createMockContext, createAuditEntries, resetAuditIdCounter } from "./helpers";
import { EntityContext } from "../hooks/loadAuditData";
import { PortalTarget } from "../hooks/usePortalInjection";
import { AuditPrivilegeError } from "../services/DataverseService";

describe("useQuickPeek", () => {
    const entityContext: EntityContext = {
        entityId: "record-001",
        entityTypeName: "contact",
    };
    const mockContext = createMockContext();
    const config = DEFAULT_CONFIG;
    const onOpenDeepDive = jest.fn();

    const portalTargets: PortalTarget[] = [
        {
            fieldLogicalName: "emailaddress1",
            fieldDisplayName: "Email",
            portalElement: document.createElement("span"),
        },
    ];

    beforeEach(() => {
        resetAuditIdCounter();
        onOpenDeepDive.mockClear();
    });

    function setupHook(
        service = createMockService(),
        ec: EntityContext | null = entityContext,
    ) {
        return renderHook(() =>
            useQuickPeek(
                service,
                ec,
                mockContext as unknown as Parameters<typeof useQuickPeek>[2],
                config,
                portalTargets,
                onOpenDeepDive,
            )
        );
    }

    it("should start with null quickPeek state", () => {
        const service = createMockService();
        const { result } = setupHook(service);
        expect(result.current.quickPeek).toBeNull();
    });

    it("should open quick peek on icon click", async () => {
        const service = createMockService();
        const entries = createAuditEntries(3);
        (service.getFieldAuditHistory as jest.Mock).mockResolvedValue({
            entries,
            totalRecordCount: 3,
            moreRecords: false,
            pagingCookie: null,
        });

        const anchor = document.createElement("button");
        const { result } = setupHook(service);

        await act(async () => {
            result.current.handleIconClick("emailaddress1", anchor);
            await new Promise((resolve) => setTimeout(resolve, 10));
        });

        expect(result.current.quickPeek).not.toBeNull();
        expect(result.current.quickPeek?.fieldLogicalName).toBe("emailaddress1");
        expect(result.current.quickPeek?.fieldDisplayName).toBe("Email");
        expect(result.current.quickPeek?.entries).toHaveLength(3);
        expect(result.current.quickPeek?.loading).toBe(false);
    });

    it("should dismiss quick peek", async () => {
        const service = createMockService();
        (service.getFieldAuditHistory as jest.Mock).mockResolvedValue({
            entries: createAuditEntries(1),
            totalRecordCount: 1,
            moreRecords: false,
            pagingCookie: null,
        });

        const anchor = document.createElement("button");
        const { result } = setupHook(service);

        await act(async () => {
            result.current.handleIconClick("emailaddress1", anchor);
            await new Promise((resolve) => setTimeout(resolve, 10));
        });

        act(() => {
            result.current.handleQuickPeekDismiss();
        });

        expect(result.current.quickPeek).toBeNull();
    });

    it("should retry loading on error", async () => {
        const service = createMockService();
        (service.getFieldAuditHistory as jest.Mock)
            .mockRejectedValueOnce(new Error("Network error"))
            .mockResolvedValueOnce({
                entries: createAuditEntries(2),
                totalRecordCount: 2,
                moreRecords: false,
                pagingCookie: null,
            });

        const anchor = document.createElement("button");
        const { result } = setupHook(service);

        await act(async () => {
            result.current.handleIconClick("emailaddress1", anchor);
            await new Promise((resolve) => setTimeout(resolve, 10));
        });

        expect(result.current.quickPeek?.error).toBeTruthy();

        await act(async () => {
            result.current.handleQuickPeekRetry();
            await new Promise((resolve) => setTimeout(resolve, 10));
        });

        expect(result.current.quickPeek?.error).toBeNull();
        expect(result.current.quickPeek?.entries).toHaveLength(2);
    });

    it("should call onOpenDeepDive on view full history", async () => {
        const service = createMockService();
        (service.getFieldAuditHistory as jest.Mock).mockResolvedValue({
            entries: createAuditEntries(1),
            totalRecordCount: 1,
            moreRecords: false,
            pagingCookie: null,
        });

        const anchor = document.createElement("button");
        const { result } = setupHook(service);

        await act(async () => {
            result.current.handleIconClick("emailaddress1", anchor);
            await new Promise((resolve) => setTimeout(resolve, 10));
        });

        act(() => {
            result.current.handleQuickPeekViewFull();
        });

        expect(result.current.quickPeek).toBeNull();
        expect(onOpenDeepDive).toHaveBeenCalledWith("emailaddress1", "Email");
    });

    it("should show error when entityContext is null", async () => {
        const service = createMockService();
        const anchor = document.createElement("button");
        const { result } = setupHook(service, null);

        await act(async () => {
            result.current.handleIconClick("emailaddress1", anchor);
            await new Promise((resolve) => setTimeout(resolve, 10));
        });

        expect(result.current.quickPeek?.error).toBe("Unable to determine the current record.");
    });

    it("should use field logical name as display name for unknown fields", async () => {
        const service = createMockService();
        (service.getFieldAuditHistory as jest.Mock).mockResolvedValue({
            entries: [],
            totalRecordCount: 0,
            moreRecords: false,
            pagingCookie: null,
        });

        const anchor = document.createElement("button");
        const { result } = setupHook(service);

        await act(async () => {
            result.current.handleIconClick("unknown_field", anchor);
            await new Promise((resolve) => setTimeout(resolve, 10));
        });

        expect(result.current.quickPeek?.fieldDisplayName).toBe("unknown_field");
    });

    it("should show permission error when AuditPrivilegeError is thrown", async () => {
        const service = createMockService();
        (service.getFieldAuditHistory as jest.Mock).mockRejectedValue(
            new AuditPrivilegeError("You do not have permission to view audit logs")
        );

        const anchor = document.createElement("button");
        const { result } = setupHook(service);

        await act(async () => {
            result.current.handleIconClick("emailaddress1", anchor);
            await new Promise((resolve) => setTimeout(resolve, 10));
        });

        expect(result.current.quickPeek?.error).toBe("You do not have permission to view audit logs");
        expect(result.current.quickPeek?.entries).toHaveLength(0);
    });

    it("should not call view full when quickPeek is null", () => {
        const service = createMockService();
        const { result } = setupHook(service);

        act(() => {
            result.current.handleQuickPeekViewFull();
        });

        expect(onOpenDeepDive).not.toHaveBeenCalled();
    });
});
