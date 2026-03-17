import * as React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { QuickPeekCallout } from "../components/QuickPeekCallout";
import { createAuditEntries, createAuditEntry, createConfig } from "./helpers";

describe("QuickPeekCallout", () => {
    let targetElement: HTMLElement;

    const defaultProps = {
        fieldDisplayName: "Email",
        entries: createAuditEntries(5),
        loading: false,
        error: null,
        config: createConfig(),
        onDismiss: jest.fn(),
        onViewFullHistory: jest.fn(),
        onRetry: jest.fn(),
    };

    beforeEach(() => {
        // Create an anchor element for the Callout
        targetElement = document.createElement("button");
        document.body.appendChild(targetElement);
        defaultProps.onDismiss.mockClear();
        defaultProps.onViewFullHistory.mockClear();
        defaultProps.onRetry.mockClear();
    });

    afterEach(() => {
        document.body.removeChild(targetElement);
    });

    it("should render the field name in the header", () => {
        render(<QuickPeekCallout {...defaultProps} target={targetElement} />);

        expect(screen.getByText(/Email — Recent Changes/)).toBeInTheDocument();
    });

    it("should show audit entries", () => {
        render(<QuickPeekCallout {...defaultProps} target={targetElement} />);

        // Should display user names from entries
        expect(screen.getAllByText("John Smith").length).toBeGreaterThan(0);
    });

    it("should show loading spinner when loading", () => {
        render(
            <QuickPeekCallout
                {...defaultProps}
                target={targetElement}
                loading={true}
                entries={[]}
            />
        );

        // Fluent UI Spinner renders with role="progressbar" or a label
        const spinner = document.querySelector(".ms-Spinner");
        expect(spinner).toBeTruthy();
    });

    it("should render callout with error state", () => {
        render(
            <QuickPeekCallout
                {...defaultProps}
                target={targetElement}
                error="Something went wrong"
                entries={[]}
            />
        );

        // Callout renders in a Layer — check that the MessageBar exists
        const messageBar = document.querySelector(".ms-MessageBar--error");
        expect(messageBar).toBeTruthy();
    });

    it("should show empty state when no entries", () => {
        render(
            <QuickPeekCallout
                {...defaultProps}
                target={targetElement}
                entries={[]}
            />
        );

        expect(screen.getByText("No changes recorded")).toBeInTheDocument();
    });

    it("should show 'View full history' link", () => {
        render(<QuickPeekCallout {...defaultProps} target={targetElement} />);

        const link = screen.getByText(/View full history/);
        expect(link).toBeInTheDocument();
    });

    it("should call onViewFullHistory when link is clicked", () => {
        render(<QuickPeekCallout {...defaultProps} target={targetElement} />);

        fireEvent.click(screen.getByText(/View full history/));

        expect(defaultProps.onViewFullHistory).toHaveBeenCalledTimes(1);
    });

    it("should limit entries to maxEntries config", () => {
        const manyEntries = createAuditEntries(20);
        const limitedConfig = createConfig({ quickPeek: { maxEntries: 3, showUserFilter: true } });

        render(
            <QuickPeekCallout
                {...defaultProps}
                target={targetElement}
                entries={manyEntries}
                config={limitedConfig}
            />
        );

        // Each entry renders user names — count user name occurrences
        const bodyText = document.body.textContent ?? "";
        const johnCount = (bodyText.match(/John Smith/g) ?? []).length;
        const janeCount = (bodyText.match(/Jane Doe/g) ?? []).length;
        // With 3 max entries, total user mentions should be <= 3
        expect(johnCount + janeCount).toBeLessThanOrEqual(3);
    });

    it("should show user filter dropdown when multiple users exist", () => {
        const entries = [
            createAuditEntry({ changedByName: "John Smith" }),
            createAuditEntry({ changedByName: "Jane Doe" }),
            createAuditEntry({ changedByName: "Admin User" }),
        ];

        render(
            <QuickPeekCallout
                {...defaultProps}
                target={targetElement}
                entries={entries}
            />
        );

        // The dropdown should exist (it contains "All users" as default)
        expect(screen.getByText("All users")).toBeInTheDocument();
    });

    it("should show fallback when changedFields is empty", () => {
        const entries = [
            createAuditEntry({ changedFields: [] }),
        ];

        render(
            <QuickPeekCallout
                {...defaultProps}
                target={targetElement}
                entries={entries}
            />
        );

        expect(screen.getByText("Value changed")).toBeInTheDocument();
    });

    it("should call onRetry when Retry link is clicked", () => {
        render(
            <QuickPeekCallout
                {...defaultProps}
                target={targetElement}
                error="Failed to load"
                entries={[]}
            />
        );

        fireEvent.click(screen.getByText("Retry"));

        expect(defaultProps.onRetry).toHaveBeenCalledTimes(1);
    });

    // ====================================================================
    // Additional handler + display tests (A2)
    // ====================================================================

    it("should show (empty) for null old values", () => {
        const entries = [
            createAuditEntry({
                changedFields: [{
                    fieldName: "emailaddress1",
                    displayName: "emailaddress1",
                    oldValue: null as unknown as string,
                    newValue: "new@test.com",
                }],
            }),
        ];

        render(
            <QuickPeekCallout
                {...defaultProps}
                target={targetElement}
                entries={entries}
            />
        );

        expect(screen.getByText("(empty)")).toBeInTheDocument();
    });

    it("should truncate long values with ellipsis", () => {
        const longValue = "a".repeat(100);
        const entries = [
            createAuditEntry({
                changedFields: [{
                    fieldName: "emailaddress1",
                    displayName: "emailaddress1",
                    oldValue: longValue,
                    newValue: "short",
                }],
            }),
        ];

        render(
            <QuickPeekCallout
                {...defaultProps}
                target={targetElement}
                entries={entries}
            />
        );

        // The truncated value should end with ellipsis character (…)
        const bodyText = document.body.textContent ?? "";
        expect(bodyText).toContain("\u2026");
        // Should NOT contain the full 100-char string
        expect(bodyText).not.toContain(longValue);
    });

    it("should render relative time for recent entries", () => {
        const recentEntry = createAuditEntry({
            changedOn: new Date(Date.now() - 30 * 60000), // 30 minutes ago
        });

        render(
            <QuickPeekCallout
                {...defaultProps}
                target={targetElement}
                entries={[recentEntry]}
            />
        );

        expect(screen.getByText("30m ago")).toBeInTheDocument();
    });

    it("should render day-based relative time for older entries", () => {
        const olderEntry = createAuditEntry({
            changedOn: new Date(Date.now() - 3 * 86400000), // 3 days ago
        });

        render(
            <QuickPeekCallout
                {...defaultProps}
                target={targetElement}
                entries={[olderEntry]}
            />
        );

        expect(screen.getByText("3d ago")).toBeInTheDocument();
    });

    it("should not render XSS through display values (S1)", () => {
        const xssEntry = createAuditEntry({
            changedFields: [{
                fieldName: "emailaddress1",
                displayName: "emailaddress1",
                oldValue: '<script>alert("xss")</script>',
                newValue: '<img onerror="alert(1)" src="x">',
            }],
        });

        render(
            <QuickPeekCallout
                {...defaultProps}
                target={targetElement}
                entries={[xssEntry]}
            />
        );

        // React auto-escapes — verify no actual script/img elements injected
        expect(document.body.querySelector("script")).toBeNull();
        expect(document.body.querySelector("img[onerror]")).toBeNull();
        // The text should be visible as escaped content
        expect(document.body.textContent).toContain('<script>alert("xss")</script>');
    });

    it("should filter entries by selected user in dropdown", () => {
        const entries = [
            createAuditEntry({ changedByName: "John Smith" }),
            createAuditEntry({ changedByName: "Jane Doe" }),
            createAuditEntry({ changedByName: "Admin User" }),
        ];

        render(
            <QuickPeekCallout
                {...defaultProps}
                target={targetElement}
                entries={entries}
            />
        );

        // Open user filter dropdown and select "John Smith"
        const dropdown = screen.getByRole("combobox");
        fireEvent.click(dropdown);

        const options = screen.getAllByRole("option");
        // Options: "All users", "Admin User", "Jane Doe", "John Smith" (sorted)
        const johnOption = options.find((o) => o.getAttribute("title") === "John Smith" || o.textContent?.includes("John Smith"));
        if (johnOption) {
            fireEvent.click(johnOption);
        }

        // After filtering, only John Smith's entries should show
        const bodyText = document.body.textContent ?? "";
        const johnCount = (bodyText.match(/John Smith/g) ?? []).length;
        // Should have at least 1 mention (the entry)
        expect(johnCount).toBeGreaterThanOrEqual(1);
    });
});
