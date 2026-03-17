import * as React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { AuditTimeline } from "../components/AuditTimeline";
import { createAuditEntry, createFieldChange, createConfig } from "./helpers";

describe("AuditTimeline", () => {
    const config = createConfig();

    it("should render timeline entries", () => {
        const entries = [
            createAuditEntry({ auditId: "a1", operationLabel: "Updated", changedByName: "John Smith" }),
            createAuditEntry({ auditId: "a2", operationLabel: "Created", changedByName: "Jane Doe" }),
        ];

        render(<AuditTimeline entries={entries} config={config} />);

        // User names appear as "by John Smith" within a <span>
        expect(screen.getByText(/John Smith/)).toBeInTheDocument();
        expect(screen.getByText(/Jane Doe/)).toBeInTheDocument();
    });

    it("should show operation labels when enabled", () => {
        const entries = [
            createAuditEntry({ operationLabel: "Updated" }),
        ];

        render(<AuditTimeline entries={entries} config={config} />);

        expect(screen.getByText("Updated")).toBeInTheDocument();
    });

    it("should hide operation labels when disabled", () => {
        const customConfig = createConfig({
            display: { ...config.display, showOperationType: false },
        });
        const entries = [createAuditEntry({ operationLabel: "Updated" })];

        render(<AuditTimeline entries={entries} config={customConfig} />);

        expect(screen.queryByText("Updated")).not.toBeInTheDocument();
    });

    it("should display field changes with old and new values", () => {
        const entries = [
            createAuditEntry({
                changedFields: [
                    createFieldChange({ oldValue: "old@test.com", newValue: "new@test.com" }),
                ],
            }),
        ];

        render(<AuditTimeline entries={entries} config={config} />);

        expect(screen.getByText("old@test.com")).toBeInTheDocument();
        expect(screen.getByText("new@test.com")).toBeInTheDocument();
    });

    it("should show (empty) for null values", () => {
        const entries = [
            createAuditEntry({
                changedFields: [
                    createFieldChange({ oldValue: null, newValue: "new@test.com" }),
                ],
            }),
        ];

        render(<AuditTimeline entries={entries} config={config} />);

        expect(screen.getByText("(empty)")).toBeInTheDocument();
    });

    it("should truncate long values", () => {
        const longValue = "a".repeat(250);
        const customConfig = createConfig({
            display: { ...config.display, valuePreviewLength: 50 },
        });
        const entries = [
            createAuditEntry({
                changedFields: [createFieldChange({ newValue: longValue })],
            }),
        ];

        render(<AuditTimeline entries={entries} config={customConfig} />);

        // Should show truncated value with ...
        const truncated = screen.getByText(/^a{50}\.\.\./);
        expect(truncated).toBeInTheDocument();
    });

    it("should render multiple field changes per entry", () => {
        const entries = [
            createAuditEntry({
                changedFields: [
                    createFieldChange({ displayName: "emailaddress1" }),
                    createFieldChange({ displayName: "telephone1", fieldName: "telephone1" }),
                ],
            }),
        ];

        render(<AuditTimeline entries={entries} config={config} />);

        expect(screen.getByText("emailaddress1")).toBeInTheDocument();
        expect(screen.getByText("telephone1")).toBeInTheDocument();
    });

    it("should show fallback when changedFields is empty", () => {
        const entries = [
            createAuditEntry({ changedFields: [] }),
        ];

        render(<AuditTimeline entries={entries} config={config} />);

        expect(screen.getByText("Value changed (details not available)")).toBeInTheDocument();
    });

    it("should use display names from displayNameMap", () => {
        const displayNameMap = {
            emailaddress1: "Email Address",
        };
        const entries = [
            createAuditEntry({
                changedFields: [createFieldChange({ fieldName: "emailaddress1", displayName: "emailaddress1" })],
            }),
        ];

        render(<AuditTimeline entries={entries} config={config} displayNameMap={displayNameMap} />);

        expect(screen.getByText("Email Address")).toBeInTheDocument();
    });

    it("should use config operation labels instead of hardcoded ones", () => {
        const customConfig = createConfig({
            labels: {
                ...config.labels,
                createdLabel: "Erstellt",
                updatedLabel: "Aktualisiert",
                deletedLabel: "Gelöscht",
            },
        });
        const entries = [
            createAuditEntry({ operation: 2, operationLabel: "Updated" }),
        ];

        render(<AuditTimeline entries={entries} config={customConfig} />);

        expect(screen.getByText("Aktualisiert")).toBeInTheDocument();
        expect(screen.queryByText("Updated")).not.toBeInTheDocument();
    });

    it("should render all timeline entries", () => {
        const entries = [
            createAuditEntry({ auditId: "a1" }),
            createAuditEntry({ auditId: "a2" }),
            createAuditEntry({ auditId: "a3" }),
        ];

        render(<AuditTimeline entries={entries} config={config} />);

        // All three entries render (borders handled via CSS)
        expect(screen.getAllByText("Updated")).toHaveLength(3);
    });

    it("should show Restore button when onRestore is provided and rawOldValue exists", () => {
        const onRestore = jest.fn();
        const entries = [
            createAuditEntry({
                changedFields: [createFieldChange({ rawOldValue: "old@test.com" })],
            }),
        ];

        render(<AuditTimeline entries={entries} config={config} onRestore={onRestore} />);

        const restoreBtn = screen.getByLabelText("Restore");
        expect(restoreBtn).toBeInTheDocument();
        fireEvent.click(restoreBtn);
        expect(onRestore).toHaveBeenCalledTimes(1);
    });

    it("should not show Restore button when rawOldValue is undefined", () => {
        const onRestore = jest.fn();
        const entries = [
            createAuditEntry({
                changedFields: [createFieldChange({
                    rawOldValue: undefined,
                })],
            }),
        ];

        render(<AuditTimeline entries={entries} config={config} onRestore={onRestore} />);

        expect(screen.queryByLabelText("Restore")).not.toBeInTheDocument();
    });

    it("should not show Restore button when allowRestore is false", () => {
        const onRestore = jest.fn();
        const noRestoreConfig = createConfig({
            features: { ...config.features, allowRestore: false },
        });
        const entries = [
            createAuditEntry({
                changedFields: [createFieldChange({ rawOldValue: "old@test.com" })],
            }),
        ];

        render(<AuditTimeline entries={entries} config={noRestoreConfig} onRestore={onRestore} />);

        expect(screen.queryByLabelText("Restore")).not.toBeInTheDocument();
    });

    it("should show Copy button when onCopy is provided", () => {
        const onCopy = jest.fn();
        const entries = [
            createAuditEntry({
                changedFields: [createFieldChange()],
            }),
        ];

        render(<AuditTimeline entries={entries} config={config} onCopy={onCopy} />);

        const copyBtn = screen.getByLabelText("Copy value");
        expect(copyBtn).toBeInTheDocument();
        fireEvent.click(copyBtn);
        expect(onCopy).toHaveBeenCalledWith("emailaddress1: old@test.com → new@test.com");
    });

    it("should format dates with long format when configured", () => {
        const longConfig = createConfig({
            audit: { ...config.audit, dateFormat: "long" },
        });
        const entries = [
            createAuditEntry({ changedOn: new Date("2026-03-10T15:30:00Z") }),
        ];

        render(<AuditTimeline entries={entries} config={longConfig} />);

        // Long format includes full month name — "March" instead of "Mar"
        expect(screen.getByText(/March/)).toBeInTheDocument();
    });
});
