import * as React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { AuditPanel } from "../components/AuditPanel";
import {
    createAuditEntries,
    createConfig,
    createEmptyFilterState,
} from "./helpers";

describe("AuditPanel", () => {
    const config = createConfig();
    const entries = createAuditEntries(5);

    const defaultProps = {
        isOpen: true,
        onDismiss: jest.fn(),
        entries,
        filteredEntries: entries,
        loading: false,
        loadingMore: false,
        error: null,
        totalCount: 5,
        moreRecords: false,
        onLoadMore: jest.fn(),
        onRetry: jest.fn(),
        title: "Record Audit History",
        config,
        filterState: createEmptyFilterState(),
        onFilterChange: jest.fn(),
    };

    beforeEach(() => {
        defaultProps.onDismiss.mockClear();
        defaultProps.onLoadMore.mockClear();
        defaultProps.onRetry.mockClear();
    });

    it("should render panel with title", () => {
        render(<AuditPanel {...defaultProps} />);

        expect(screen.getByText("Record Audit History")).toBeInTheDocument();
    });

    it("should show total count", () => {
        render(<AuditPanel {...defaultProps} />);

        expect(screen.getByText("5 changes recorded")).toBeInTheDocument();
    });

    it("should show filtered count when filters active", () => {
        const activeFilter = {
            ...createEmptyFilterState(),
            selectedOperations: [2],
        };

        render(
            <AuditPanel
                {...defaultProps}
                filterState={activeFilter}
                filteredEntries={entries.slice(0, 3)}
            />
        );

        expect(screen.getByText(/Showing 3 of 5 loaded/)).toBeInTheDocument();
    });

    it("should show loading spinner", () => {
        render(<AuditPanel {...defaultProps} loading={true} entries={[]} filteredEntries={[]} />);

        expect(screen.getByText("Loading audit history...")).toBeInTheDocument();
    });

    it("should render error MessageBar in panel", () => {
        render(
            <AuditPanel
                {...defaultProps}
                error="Permission denied"
                entries={[]}
                filteredEntries={[]}
                totalCount={0}
            />
        );

        // Error MessageBar should exist in the DOM
        const errorBar = document.querySelector(".ms-MessageBar--error");
        expect(errorBar).toBeTruthy();
    });

    it("should call onRetry when Retry clicked", () => {
        render(
            <AuditPanel
                {...defaultProps}
                error="Error"
                entries={[]}
                filteredEntries={[]}
                totalCount={0}
            />
        );

        const retryButton = screen.getByText("Retry");
        fireEvent.click(retryButton);

        expect(defaultProps.onRetry).toHaveBeenCalledTimes(1);
    });

    it("should render panel in open state when isOpen=true with empty entries", () => {
        render(
            <AuditPanel
                {...defaultProps}
                entries={[]}
                filteredEntries={[]}
                totalCount={0}
                error={null}
            />
        );

        // Panel should be rendered and open
        const panel = document.querySelector(".ms-Panel.is-open");
        expect(panel).toBeTruthy();
    });

    it("should render filter bar when entries exist with active filters", () => {
        const activeFilter = {
            ...createEmptyFilterState(),
            selectedUsers: ["Nobody"],
        };

        render(
            <AuditPanel
                {...defaultProps}
                filterState={activeFilter}
                filteredEntries={[]}
            />
        );

        // Filter bar should render, showing filtered count
        const bodyText = document.body.textContent ?? "";
        expect(bodyText).toContain("Showing 0 of 5");
    });

    it("should show Load More button when moreRecords is true", () => {
        render(<AuditPanel {...defaultProps} moreRecords={true} />);

        expect(screen.getByText(config.labels.loadMoreButton)).toBeInTheDocument();
    });

    it("should call onLoadMore when Load More clicked", () => {
        render(<AuditPanel {...defaultProps} moreRecords={true} />);

        fireEvent.click(screen.getByText(config.labels.loadMoreButton));

        expect(defaultProps.onLoadMore).toHaveBeenCalledTimes(1);
    });

    it("should hide Load More when no more records", () => {
        render(<AuditPanel {...defaultProps} moreRecords={false} />);

        expect(screen.queryByText(config.labels.loadMoreButton)).not.toBeInTheDocument();
    });

    it("should show loading more spinner", () => {
        render(<AuditPanel {...defaultProps} loadingMore={true} />);

        expect(screen.getByText("Loading more...")).toBeInTheDocument();
    });

    it("should not render when closed", () => {
        render(<AuditPanel {...defaultProps} isOpen={false} entries={[]} filteredEntries={[]} />);

        expect(screen.queryByText("Record Audit History")).not.toBeInTheDocument();
    });

    it("should show filter bar when enabled and entries exist", () => {
        render(<AuditPanel {...defaultProps} />);

        expect(screen.getByText("Filters")).toBeInTheDocument();
    });

    it("should hide filter bar when disabled in config", () => {
        const noFilterConfig = createConfig({
            display: { ...config.display, showFilters: false },
        });

        render(<AuditPanel {...defaultProps} config={noFilterConfig} />);

        expect(screen.queryByText("Filters")).not.toBeInTheDocument();
    });

    // ========================================================================
    // Mode toggle (field ↔ record)
    // ========================================================================

    it("should show 'View all fields' link when in field mode", () => {
        const onViewAllFields = jest.fn();

        render(
            <AuditPanel
                {...defaultProps}
                mode="field"
                fieldDisplayName="Email"
                onViewAllFields={onViewAllFields}
            />
        );

        expect(screen.getByText("View all fields")).toBeInTheDocument();
    });

    it("should call onViewAllFields when link is clicked", () => {
        const onViewAllFields = jest.fn();

        render(
            <AuditPanel
                {...defaultProps}
                mode="field"
                fieldDisplayName="Email"
                onViewAllFields={onViewAllFields}
            />
        );

        fireEvent.click(screen.getByText("View all fields"));

        expect(onViewAllFields).toHaveBeenCalledTimes(1);
    });

    it("should show 'Back to field' link when in record mode with field context", () => {
        const onViewField = jest.fn();

        render(
            <AuditPanel
                {...defaultProps}
                mode="record"
                fieldDisplayName="Hourly Rate"
                onViewField={onViewField}
            />
        );

        expect(screen.getByText("Back to Hourly Rate")).toBeInTheDocument();
    });

    it("should call onViewField when back link is clicked", () => {
        const onViewField = jest.fn();

        render(
            <AuditPanel
                {...defaultProps}
                mode="record"
                fieldDisplayName="Hourly Rate"
                onViewField={onViewField}
            />
        );

        fireEvent.click(screen.getByText("Back to Hourly Rate"));

        expect(onViewField).toHaveBeenCalledTimes(1);
    });

    it("should not show 'Back to field' link in record mode without field context", () => {
        render(
            <AuditPanel
                {...defaultProps}
                mode="record"
                fieldDisplayName=""
            />
        );

        expect(screen.queryByText(/Back to/)).not.toBeInTheDocument();
    });

    it("should not show mode toggle links when mode is not provided", () => {
        render(<AuditPanel {...defaultProps} />);

        expect(screen.queryByText("View all fields")).not.toBeInTheDocument();
        expect(screen.queryByText(/Back to/)).not.toBeInTheDocument();
    });

    it("should show 'View all fields' in field mode even with zero entries", () => {
        const onViewAllFields = jest.fn();

        render(
            <AuditPanel
                {...defaultProps}
                mode="field"
                onViewAllFields={onViewAllFields}
                entries={[]}
                filteredEntries={[]}
                totalCount={0}
            />
        );

        expect(screen.getByText("View all fields")).toBeInTheDocument();
    });
});
