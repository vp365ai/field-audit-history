import { act } from "@testing-library/react";
import { renderHook } from "./renderHook";
import { usePortalInjection } from "../hooks/usePortalInjection";
import { ITableConfig } from "../models/IConfig";
import { EntityContext } from "../hooks/loadAuditData";

/**
 * Creates a Dynamics 365-style label element with GUID-prefixed id.
 * Pattern: id-{GUID}-{index}-{fieldName}-field-label
 */
function createGuidLabel(fieldName: string, displayName: string): HTMLElement {
    const guid = "00000000-0000-0000-0000-000000000001";
    const label = document.createElement("label");
    label.id = `id-${guid}-1-${fieldName}-field-label`;
    label.textContent = displayName;
    const wrapper = document.createElement("div");
    wrapper.appendChild(label);
    document.body.appendChild(wrapper);
    return wrapper;
}

/**
 * Creates a data-id based label container (fallback strategy).
 */
function createDataIdLabel(fieldName: string, displayName: string): HTMLElement {
    const container = document.createElement("div");
    container.setAttribute("data-id", `${fieldName}-field-label`);
    const label = document.createElement("label");
    label.textContent = displayName;
    container.appendChild(label);
    document.body.appendChild(container);
    return container;
}

function cleanupLabels(): void {
    document.querySelectorAll('[data-audit-portal]').forEach((el) => el.remove());
    document.querySelectorAll('label[id$="-field-label"]').forEach((el) => {
        el.parentElement?.remove();
    });
    document.querySelectorAll('[data-id$="-field-label"]').forEach((el) => {
        el.remove();
    });
}

describe("usePortalInjection (DOM scanning)", () => {
    const auditedFields = new Set(["emailaddress1", "telephone1", "jobtitle"]);
    const tableConfig: ITableConfig = { mode: "audited", fields: [] };
    const defaultEntityContext: EntityContext = { entityId: "record-001", entityTypeName: "contact" };

    afterEach(() => {
        cleanupLabels();
        jest.useRealTimers();
    });

    function setupHook(
        hostField = "vp365_audithost",
        tc: ITableConfig = tableConfig,
        af: Set<string> | null = auditedFields,
        loading = false,
        ec: EntityContext | null = defaultEntityContext,
    ) {
        return renderHook(() =>
            usePortalInjection(hostField, tc, af, loading, ec)
        );
    }

    it("should scan labels with GUID-prefixed id and create portal spans", () => {
        jest.useFakeTimers();

        createGuidLabel("emailaddress1", "Email");
        createGuidLabel("telephone1", "Business Phone");

        const { result } = setupHook();

        // Advance past INITIAL_SCAN_DELAY_MS (800ms)
        act(() => {
            jest.advanceTimersByTime(900);
        });

        expect(result.current.portalTargets.length).toBe(2);
        expect(result.current.portalTargets[0].fieldLogicalName).toBe("emailaddress1");
        expect(result.current.portalTargets[0].fieldDisplayName).toBe("Email");
        expect(result.current.portalTargets[1].fieldLogicalName).toBe("telephone1");
    });

    it("should skip the host field to prevent self-injection", () => {
        jest.useFakeTimers();

        createGuidLabel("vp365_audithost", "Audit Host");
        createGuidLabel("emailaddress1", "Email");

        const { result } = setupHook("vp365_audithost");

        act(() => {
            jest.advanceTimersByTime(900);
        });

        // Only emailaddress1 should be injected, not the host field
        expect(result.current.portalTargets.length).toBe(1);
        expect(result.current.portalTargets[0].fieldLogicalName).toBe("emailaddress1");
    });

    it("should not scan when metadataLoading is true", () => {
        jest.useFakeTimers();

        createGuidLabel("emailaddress1", "Email");

        const { result } = setupHook("vp365_audithost", tableConfig, auditedFields, true);

        act(() => {
            jest.advanceTimersByTime(2000);
        });

        expect(result.current.portalTargets.length).toBe(0);
    });

    it("should not scan when entityContext is null (create mode)", () => {
        jest.useFakeTimers();

        createGuidLabel("emailaddress1", "Email");

        const { result } = setupHook("vp365_audithost", tableConfig, auditedFields, false, null);

        act(() => {
            jest.advanceTimersByTime(2000);
        });

        expect(result.current.portalTargets.length).toBe(0);
    });

    it("should respect shouldShowIcon filtering — skip non-audited fields", () => {
        jest.useFakeTimers();

        createGuidLabel("emailaddress1", "Email"); // audited
        createGuidLabel("address1_line1", "Address"); // NOT audited

        const { result } = setupHook();

        act(() => {
            jest.advanceTimersByTime(900);
        });

        expect(result.current.portalTargets.length).toBe(1);
        expect(result.current.portalTargets[0].fieldLogicalName).toBe("emailaddress1");
    });

    it("should fall back to data-id selector when GUID labels not present", () => {
        jest.useFakeTimers();

        createDataIdLabel("emailaddress1", "Email");

        const { result } = setupHook();

        act(() => {
            jest.advanceTimersByTime(900);
        });

        expect(result.current.portalTargets.length).toBe(1);
        expect(result.current.portalTargets[0].fieldLogicalName).toBe("emailaddress1");
        expect(result.current.portalTargets[0].fieldDisplayName).toBe("Email");
    });

    it("should not create duplicate portal spans on re-scan", () => {
        jest.useFakeTimers();

        createGuidLabel("emailaddress1", "Email");

        const { result, rerender } = setupHook();

        act(() => {
            jest.advanceTimersByTime(900);
        });

        expect(result.current.portalTargets.length).toBe(1);

        // Re-render to trigger another scan
        rerender();

        act(() => {
            jest.advanceTimersByTime(900);
        });

        // Should still be 1 portal, not 2
        const portalSpans = document.querySelectorAll('[data-audit-portal="emailaddress1"]');
        expect(portalSpans.length).toBe(1);
    });

    it("should clean up portals on unmount", () => {
        jest.useFakeTimers();

        createGuidLabel("emailaddress1", "Email");

        const { unmount } = setupHook();

        act(() => {
            jest.advanceTimersByTime(900);
        });

        const before = document.querySelectorAll('[data-audit-portal]').length;
        expect(before).toBe(1);

        unmount();

        const after = document.querySelectorAll('[data-audit-portal]').length;
        expect(after).toBe(0);
    });

    it("should use include mode to only show specified fields", () => {
        jest.useFakeTimers();

        const includeConfig: ITableConfig = {
            mode: "include",
            fields: ["emailaddress1"],
        };

        createGuidLabel("emailaddress1", "Email");
        createGuidLabel("telephone1", "Phone"); // audited but not in include list

        const { result } = setupHook("vp365_audithost", includeConfig);

        act(() => {
            jest.advanceTimersByTime(900);
        });

        expect(result.current.portalTargets.length).toBe(1);
        expect(result.current.portalTargets[0].fieldLogicalName).toBe("emailaddress1");
    });
});
