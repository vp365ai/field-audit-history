import * as React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { AuditHistoryApp, IAuditHistoryAppProps } from "../components/AuditHistoryApp";
import {
    createMockContext,
    mockAuditEnabledAttributesResponse,
    mockOrgAuditResponse,
    mockEntityAuditSettingResponse,
    mockEntitySetNameResponse,
    mockAuditResponse,
    createAuditEntries,
} from "./helpers";

/**
 * Sets up all fetch mocks needed for a full init cycle.
 * The hook now makes parallel calls: attributes, org audit, entity audit,
 * then sequential: entity set name, record audit sample.
 */
function mockFullInit(options: {
    fields?: string[];
    orgEnabled?: boolean;
    tableEnabled?: boolean;
    hasRecords?: boolean;
} = {}) {
    const {
        fields = ["emailaddress1"],
        orgEnabled = true,
        tableEnabled = true,
        hasRecords = true,
    } = options;
    mockAuditEnabledAttributesResponse(fields);
    mockOrgAuditResponse(orgEnabled);
    mockEntityAuditSettingResponse(tableEnabled);
    // Only mock entity set name + record audit if we'll reach the probe
    if (orgEnabled && tableEnabled && fields.length > 0) {
        mockEntitySetNameResponse("contacts");
        mockAuditResponse(
            hasRecords ? createAuditEntries(1) : [],
            hasRecords ? 1 : 0,
            false,
        );
    }
}

// Mock ReactDOM.createPortal to render inline for testing
jest.mock("react-dom", () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const original = jest.requireActual("react-dom");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return {
        ...original,
        createPortal: (node: React.ReactNode) => node,
    };
});

function renderApp() {
    const mockContext = createMockContext();
    const props = {
        context: mockContext,
        hostFieldLogicalName: "vp365_audithost",
    } as unknown as IAuditHistoryAppProps;

    return render(<AuditHistoryApp {...props} />);
}

function renderAppUnsaved() {
    const mockContext = createMockContext();
    // Simulate unsaved record — no entityId
    mockContext.page.entityId = "";
    const props = {
        context: mockContext,
        hostFieldLogicalName: "vp365_audithost",
    } as unknown as IAuditHistoryAppProps;

    return render(<AuditHistoryApp {...props} />);
}

describe("AuditHistoryApp", () => {
    it("should render save message when record is unsaved", () => {
        renderAppUnsaved();

        expect(screen.getByText("Save the record to view audit history")).toBeInTheDocument();
        expect(screen.queryByText(/Audit tracking/)).not.toBeInTheDocument();
        expect(screen.queryByText(/View All/)).not.toBeInTheDocument();
    });

    it("should render status indicator with loading state initially", () => {
        mockFullInit();

        renderApp();

        expect(screen.getByText("Detecting audited fields...")).toBeInTheDocument();
    });

    it("should show audit tracking status after metadata loads", async () => {
        mockFullInit({ fields: ["emailaddress1", "telephone1"] });

        renderApp();

        await waitFor(() => {
            expect(screen.getByText(/Audit tracking/)).toBeInTheDocument();
        });
    });

    it("should render View All link", async () => {
        mockFullInit();

        renderApp();

        await waitFor(() => {
            expect(screen.getByText(/View All/)).toBeInTheDocument();
        });
    });

    it("should open Deep Dive panel when status indicator is clicked", async () => {
        mockFullInit();

        renderApp();

        await waitFor(() => {
            expect(screen.getByText(/Audit tracking/)).toBeInTheDocument();
        });

        mockAuditResponse(createAuditEntries(3), 3, false);

        act(() => {
            fireEvent.click(screen.getByText(/Audit tracking/));
        });

        await waitFor(() => {
            expect(screen.getByText("Record Audit History")).toBeInTheDocument();
        });
    });

    it("should open Deep Dive when View All is clicked", async () => {
        mockFullInit();

        renderApp();

        await waitFor(() => {
            expect(screen.getByText(/View All/)).toBeInTheDocument();
        });

        mockAuditResponse(createAuditEntries(2), 2, false);

        act(() => {
            fireEvent.click(screen.getByText(/View All/));
        });

        await waitFor(() => {
            expect(screen.getByText("Record Audit History")).toBeInTheDocument();
        });
    });

    it("should handle metadata loading failure gracefully", async () => {
        // Attributes fail, org and entity audit fail-open
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: false,
            status: 500,
            statusText: "Error",
            json: () => Promise.resolve({}),
        });

        renderApp();

        await waitFor(() => {
            expect(screen.getByText(/Audit tracking/)).toBeInTheDocument();
        });
    });

    it("should have accessible status indicator with role=button", async () => {
        mockFullInit();

        renderApp();

        await waitFor(() => {
            expect(screen.getByText(/Audit tracking/)).toBeInTheDocument();
        });

        // The status indicator should have tabIndex for keyboard access
        const statusArea = screen.getByText(/Audit tracking/).closest('[role="button"]');
        expect(statusArea).toBeTruthy();
        expect(statusArea).toHaveAttribute("tabindex", "0");
    });

    it("should open Deep Dive when Enter key is pressed on status indicator", async () => {
        mockFullInit();

        renderApp();

        await waitFor(() => {
            expect(screen.getByText(/Audit tracking/)).toBeInTheDocument();
        });

        mockAuditResponse(createAuditEntries(3), 3, false);

        const statusArea = screen.getByText(/Audit tracking/).closest('[role="button"]')!;
        act(() => {
            fireEvent.keyDown(statusArea, { key: "Enter" });
        });

        await waitFor(() => {
            expect(screen.getByText("Record Audit History")).toBeInTheDocument();
        });
    });

    it("should open Deep Dive when Space key is pressed on status indicator", async () => {
        mockFullInit();

        renderApp();

        await waitFor(() => {
            expect(screen.getByText(/Audit tracking/)).toBeInTheDocument();
        });

        mockAuditResponse(createAuditEntries(3), 3, false);

        const statusArea = screen.getByText(/Audit tracking/).closest('[role="button"]')!;
        act(() => {
            fireEvent.keyDown(statusArea, { key: " " });
        });

        await waitFor(() => {
            expect(screen.getByText("Record Audit History")).toBeInTheDocument();
        });
    });

    // ========================================================================
    // Audit status messages
    // ========================================================================
    it("should show org audit disabled message", async () => {
        mockFullInit({ orgEnabled: false });

        renderApp();

        await waitFor(() => {
            expect(screen.getByText(/Auditing is not enabled for this environment/)).toBeInTheDocument();
        });
        expect(screen.queryByText(/Audit tracking/)).not.toBeInTheDocument();
    });

    it("should show table audit disabled message", async () => {
        mockFullInit({ tableEnabled: false });

        renderApp();

        await waitFor(() => {
            expect(screen.getByText(/Auditing is not enabled for this table/)).toBeInTheDocument();
        });
    });

    it("should show no audited fields message", async () => {
        mockFullInit({ fields: [] });

        renderApp();

        await waitFor(() => {
            expect(screen.getByText(/No fields on this table have auditing enabled/)).toBeInTheDocument();
        });
    });

    it("should show no audit records message", async () => {
        mockFullInit({ hasRecords: false });

        renderApp();

        await waitFor(() => {
            expect(screen.getByText(/no changes have been recorded yet/)).toBeInTheDocument();
        });
    });

    it("should show normal status when auditing is fully configured", async () => {
        mockFullInit();

        renderApp();

        await waitFor(() => {
            expect(screen.getByText(/Audit tracking/)).toBeInTheDocument();
            expect(screen.getByText(/View All/)).toBeInTheDocument();
        });
    });
});
