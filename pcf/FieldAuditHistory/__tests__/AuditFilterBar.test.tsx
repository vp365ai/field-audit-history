import * as React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { AuditFilterBar } from "../components/AuditFilterBar";
import { createAuditEntries, createEmptyFilterState } from "./helpers";
import { DEFAULT_CONFIG } from "../models/IConfig";

describe("AuditFilterBar", () => {
    const entries = createAuditEntries(10);
    const defaultProps = {
        entries,
        filterState: createEmptyFilterState(),
        onFilterChange: jest.fn(),
        filteredCount: 10,
        totalLoaded: 10,
    };

    beforeEach(() => {
        defaultProps.onFilterChange.mockClear();
    });

    it("should render filter controls", () => {
        render(<AuditFilterBar {...defaultProps} />);

        expect(screen.getByText("Filters")).toBeInTheDocument();
    });

    it("should render operation toggle buttons", () => {
        render(<AuditFilterBar {...defaultProps} />);

        expect(screen.getByText("Created")).toBeInTheDocument();
        expect(screen.getByText("Updated")).toBeInTheDocument();
        expect(screen.getByText("Cleared")).toBeInTheDocument();
    });

    it("should toggle operation filter on click", () => {
        render(<AuditFilterBar {...defaultProps} />);

        fireEvent.click(screen.getByText("Created"));

        expect(defaultProps.onFilterChange).toHaveBeenCalledWith(
            expect.objectContaining({
                selectedOperations: [1],
            })
        );
    });

    it("should show Clear button when filters are active", () => {
        const activeFilter = {
            ...createEmptyFilterState(),
            selectedOperations: [2],
        };

        render(<AuditFilterBar {...defaultProps} filterState={activeFilter} />);

        expect(screen.getByText("Clear")).toBeInTheDocument();
    });

    it("should not show Clear button when no filters active", () => {
        render(<AuditFilterBar {...defaultProps} />);

        expect(screen.queryByText("Clear")).not.toBeInTheDocument();
    });

    it("should clear all filters on Clear click", () => {
        const activeFilter = {
            ...createEmptyFilterState(),
            selectedOperations: [2],
            selectedUsers: ["John Smith"],
        };

        render(<AuditFilterBar {...defaultProps} filterState={activeFilter} />);

        fireEvent.click(screen.getByText("Clear"));

        expect(defaultProps.onFilterChange).toHaveBeenCalledWith(createEmptyFilterState());
    });

    it("should show filtered count when filters are active", () => {
        const activeFilter = {
            ...createEmptyFilterState(),
            selectedOperations: [2],
        };

        render(
            <AuditFilterBar
                {...defaultProps}
                filterState={activeFilter}
                filteredCount={5}
                totalLoaded={10}
            />
        );

        expect(screen.getByText("Showing 5 of 10")).toBeInTheDocument();
    });

    it("should collapse and expand filter controls", () => {
        render(<AuditFilterBar {...defaultProps} />);

        // Should be expanded by default
        expect(screen.getByText("Operation")).toBeInTheDocument();

        // Click collapse button
        const collapseBtn = screen.getByLabelText("Collapse filters");
        fireEvent.click(collapseBtn);

        // Filter controls should be hidden
        expect(screen.queryByText("Operation")).not.toBeInTheDocument();

        // Click expand button
        const expandBtn = screen.getByLabelText("Expand filters");
        fireEvent.click(expandBtn);

        expect(screen.getByText("Operation")).toBeInTheDocument();
    });

    it("should handle field dropdown selection", () => {
        render(<AuditFilterBar {...defaultProps} />);

        // ComboBox: click caret button to open the dropdown
        const fieldCaret = screen.getByRole("button", { name: /Field/i });
        fireEvent.click(fieldCaret);

        // Click the option for "emailaddress1" (only field in test entries)
        const options = screen.getAllByRole("option");
        fireEvent.click(options[0]);

        expect(defaultProps.onFilterChange).toHaveBeenCalledWith(
            expect.objectContaining({
                selectedFields: ["emailaddress1"],
            })
        );
    });

    it("should handle field dropdown deselection", () => {
        const activeFilter = {
            ...createEmptyFilterState(),
            selectedFields: ["emailaddress1"],
        };

        render(<AuditFilterBar {...defaultProps} filterState={activeFilter} />);

        // ComboBox: click caret button to open the dropdown
        const fieldCaret = screen.getByRole("button", { name: /Field/i });
        fireEvent.click(fieldCaret);

        // Click the already-selected option to deselect
        const options = screen.getAllByRole("option");
        fireEvent.click(options[0]);

        expect(defaultProps.onFilterChange).toHaveBeenCalledWith(
            expect.objectContaining({
                selectedFields: [],
            })
        );
    });

    it("should handle user dropdown selection", () => {
        render(<AuditFilterBar {...defaultProps} />);

        // ComboBox: click caret button to open the dropdown
        const userCaret = screen.getByRole("button", { name: /Changed By/i });
        fireEvent.click(userCaret);

        // Options are sorted: "Jane Doe", "John Smith"
        const options = screen.getAllByRole("option");
        fireEvent.click(options[0]);

        expect(defaultProps.onFilterChange).toHaveBeenCalled();
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        expect((defaultProps.onFilterChange.mock.calls[0][0] as Record<string, unknown>).selectedUsers).toBeDefined();
    });

    it("should deselect an operation toggle", () => {
        const activeFilter = {
            ...createEmptyFilterState(),
            selectedOperations: [1],
        };

        render(<AuditFilterBar {...defaultProps} filterState={activeFilter} />);

        // Click "Created" again to deselect
        fireEvent.click(screen.getByText("Created"));

        expect(defaultProps.onFilterChange).toHaveBeenCalledWith(
            expect.objectContaining({
                selectedOperations: [],
            })
        );
    });

    it("should use config labels for operation buttons", () => {
        const customConfig = {
            ...DEFAULT_CONFIG,
            labels: {
                ...DEFAULT_CONFIG.labels,
                createdLabel: "New",
                updatedLabel: "Modified",
                clearedLabel: "Erased",
            },
        };

        render(
            <AuditFilterBar
                {...defaultProps}
                config={customConfig}
            />
        );

        expect(screen.getByText("New")).toBeInTheDocument();
        expect(screen.getByText("Modified")).toBeInTheDocument();
        expect(screen.getByText("Erased")).toBeInTheDocument();
    });
});
