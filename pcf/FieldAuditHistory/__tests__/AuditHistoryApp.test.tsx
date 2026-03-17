import * as React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { AuditHistoryApp, IAuditHistoryAppProps } from "../components/AuditHistoryApp";
import {
    createMockContext,
    mockAuditEnabledAttributesResponse,
    mockAuditResponse,
    createAuditEntries,
} from "./helpers";

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
        mockAuditEnabledAttributesResponse(["emailaddress1"]);

        renderApp();

        expect(screen.getByText("Detecting audited fields...")).toBeInTheDocument();
    });

    it("should show audit tracking status after metadata loads", async () => {
        mockAuditEnabledAttributesResponse(["emailaddress1", "telephone1"]);

        renderApp();

        await waitFor(() => {
            expect(screen.getByText(/Audit tracking/)).toBeInTheDocument();
        });
    });

    it("should render View All link", async () => {
        mockAuditEnabledAttributesResponse(["emailaddress1"]);

        renderApp();

        await waitFor(() => {
            expect(screen.getByText(/View All/)).toBeInTheDocument();
        });
    });

    it("should open Deep Dive panel when status indicator is clicked", async () => {
        mockAuditEnabledAttributesResponse(["emailaddress1"]);

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
        mockAuditEnabledAttributesResponse(["emailaddress1"]);

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
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: false,
            status: 500,
            json: () => Promise.resolve({}),
        });

        renderApp();

        await waitFor(() => {
            expect(screen.getByText(/Audit tracking/)).toBeInTheDocument();
        });
    });

    it("should have accessible status indicator with role=button", async () => {
        mockAuditEnabledAttributesResponse(["emailaddress1"]);

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
        mockAuditEnabledAttributesResponse(["emailaddress1"]);

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
        mockAuditEnabledAttributesResponse(["emailaddress1"]);

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
});
