import * as React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { RestoreConfirmDialog, IRestoreConfirmDialogProps } from "../components/RestoreConfirmDialog";
import { DEFAULT_CONFIG } from "../models/IConfig";
import { createFieldChange } from "./helpers";

describe("RestoreConfirmDialog", () => {
    function makeProps(overrides: Partial<IRestoreConfirmDialogProps> = {}): IRestoreConfirmDialogProps {
        return {
            isOpen: true,
            change: createFieldChange({ displayName: "emailaddress1", oldValue: "old@test.com" }),
            restoring: false,
            successMessage: null,
            errorMessage: null,
            config: DEFAULT_CONFIG,
            onConfirm: jest.fn(),
            onCancel: jest.fn(),
            onDismiss: jest.fn(),
            ...overrides,
        };
    }

    afterEach(() => {
        cleanup();
        // Clear Fluent UI layer host to prevent cross-test interference
        const layerHost = document.getElementById("fluent-default-layer-host");
        if (layerHost) layerHost.innerHTML = "";
        jest.clearAllMocks();
    });

    it("should render field name in body text", () => {
        const props = makeProps();
        render(<RestoreConfirmDialog {...props} />);

        expect(screen.getByText(/emailaddress1/)).toBeInTheDocument();
    });

    it("should render title from config", () => {
        const props = makeProps();
        render(<RestoreConfirmDialog {...props} />);

        expect(screen.getByText("Restore Value")).toBeInTheDocument();
    });

    it("should call onConfirm when Restore button clicked", () => {
        const props = makeProps();
        render(<RestoreConfirmDialog {...props} />);

        fireEvent.click(screen.getByText("Restore"));
        expect(props.onConfirm).toHaveBeenCalledTimes(1);
    });

    it("should call onCancel when Cancel button clicked", () => {
        const props = makeProps();
        render(<RestoreConfirmDialog {...props} />);

        fireEvent.click(screen.getByText("Cancel"));
        expect(props.onCancel).toHaveBeenCalledTimes(1);
    });

    it("should show spinner while restoring", () => {
        const props = makeProps({ restoring: true });
        render(<RestoreConfirmDialog {...props} />);

        expect(screen.getByText("Restoring...")).toBeInTheDocument();
    });

    it("should disable buttons while restoring", () => {
        const props = makeProps({ restoring: true });
        render(<RestoreConfirmDialog {...props} />);

        expect(screen.getByText("Restore").closest("button")).toBeDisabled();
        expect(screen.getByText("Cancel").closest("button")).toBeDisabled();
    });

    it("should show success MessageBar and Close button", () => {
        const props = makeProps({
            successMessage: "Value restored. Refresh the form to see the update.",
        });
        render(<RestoreConfirmDialog {...props} />);

        // Fluent UI MessageBar text may not appear in JSDOM textContent —
        // assert the element class and dialog switches to Close button
        const successBar = document.querySelector(".ms-MessageBar--success");
        expect(successBar).not.toBeNull();
        expect(screen.getByText("Close")).toBeInTheDocument();
        expect(screen.queryByText("Cancel")).toBeNull();
    });

    it("should show error MessageBar and Close button", () => {
        const props = makeProps({
            errorMessage: "Restore failed: Network timeout",
        });
        render(<RestoreConfirmDialog {...props} />);

        // Fluent UI error MessageBar uses assertive aria-live which may not populate
        // textContent in JSDOM — assert the element exists and Close is shown
        const errorBar = document.querySelector(".ms-MessageBar--error");
        expect(errorBar).not.toBeNull();
        expect(screen.getByText("Close")).toBeInTheDocument();
        // Restore/Cancel buttons should NOT be present (hasResult = true)
        expect(screen.queryByText("Cancel")).toBeNull();
    });

    it("should call onDismiss when Close button clicked after result", () => {
        const props = makeProps({
            successMessage: "Value restored.",
        });
        render(<RestoreConfirmDialog {...props} />);

        fireEvent.click(screen.getByText("Close"));
        expect(props.onDismiss).toHaveBeenCalledTimes(1);
    });

    it("should not render when isOpen is false", () => {
        const props = makeProps({ isOpen: false });
        const { container } = render(<RestoreConfirmDialog {...props} />);

        expect(container.innerHTML).toBe("");
    });

    it("should not render when change is null", () => {
        const props = makeProps({ change: null });
        const { container } = render(<RestoreConfirmDialog {...props} />);

        expect(container.innerHTML).toBe("");
    });
});
