/* eslint-disable @typescript-eslint/unbound-method */
import { act } from "@testing-library/react";
import { renderHook } from "./renderHook";
import { useRestore } from "../hooks/useRestore";
import { DEFAULT_CONFIG } from "../models/IConfig";
import { EntityContext } from "../hooks/loadAuditData";
import {
    createMockService,
    createFieldChange,
    createLookupFieldChange,
    createMockContext,
} from "./helpers";

describe("useRestore", () => {
    const entityContext: EntityContext = { entityId: "record-001", entityTypeName: "contact" };

    function setupHook(
        overrides: {
            ec?: EntityContext | null;
            allowRestore?: boolean;
        } = {},
    ) {
        const service = createMockService();
        const mockContext = createMockContext();
        const config = {
            ...DEFAULT_CONFIG,
            features: {
                ...DEFAULT_CONFIG.features,
                allowRestore: overrides.allowRestore ?? true,
            },
        };
        const ec = overrides.ec !== undefined ? overrides.ec : entityContext;

        const { result, rerender, unmount } = renderHook(() =>
            useRestore(
                service,
                ec,
                mockContext as unknown as ComponentFramework.Context<Record<string, unknown>>,
                config,
            )
        );

        return { result, rerender, unmount, service, mockContext };
    }

    it("should start in idle state", () => {
        const { result } = setupHook();

        expect(result.current.restoreState.change).toBeNull();
        expect(result.current.restoreState.dialogOpen).toBe(false);
        expect(result.current.restoreState.restoring).toBe(false);
        expect(result.current.restoreState.successMessage).toBeNull();
        expect(result.current.restoreState.errorMessage).toBeNull();
    });

    it("should open dialog when requestRestore is called", () => {
        const { result } = setupHook();
        const change = createFieldChange();

        act(() => {
            result.current.requestRestore(change);
        });

        expect(result.current.restoreState.dialogOpen).toBe(true);
        expect(result.current.restoreState.change).toEqual(change);
    });

    it("should close dialog when cancelRestore is called", () => {
        const { result } = setupHook();

        act(() => {
            result.current.requestRestore(createFieldChange());
        });
        act(() => {
            result.current.cancelRestore();
        });

        expect(result.current.restoreState.dialogOpen).toBe(false);
        expect(result.current.restoreState.change).toBeNull();
    });

    it("should call restoreFieldValue on confirmRestore", async () => {
        const { result, service, mockContext } = setupHook();
        const change = createFieldChange();

        act(() => {
            result.current.requestRestore(change);
        });

        await act(async () => {
            result.current.confirmRestore();
            await new Promise((resolve) => setTimeout(resolve, 10));
        });

        expect(service.restoreFieldValue).toHaveBeenCalledWith(
            mockContext.webAPI,
            "contact",
            "record-001",
            change,
        );
    });

    it("should set successMessage after successful restore", async () => {
        const { result } = setupHook();

        act(() => {
            result.current.requestRestore(createFieldChange());
        });

        await act(async () => {
            result.current.confirmRestore();
            await new Promise((resolve) => setTimeout(resolve, 10));
        });

        expect(result.current.restoreState.successMessage).toBe(
            DEFAULT_CONFIG.labels.restoreSuccessMessage
        );
        expect(result.current.restoreState.errorMessage).toBeNull();
    });

    it("should set errorMessage on restore failure", async () => {
        const { result, service } = setupHook();
        (service.restoreFieldValue as jest.Mock).mockRejectedValue(
            new Error("You don't have permission to update this record.")
        );

        act(() => {
            result.current.requestRestore(createFieldChange());
        });

        await act(async () => {
            result.current.confirmRestore();
            await new Promise((resolve) => setTimeout(resolve, 10));
        });

        expect(result.current.restoreState.errorMessage).toBe(
            "You don't have permission to update this record."
        );
        expect(result.current.restoreState.successMessage).toBeNull();
    });

    it("should clear state when dismissResult is called", async () => {
        const { result } = setupHook();

        act(() => {
            result.current.requestRestore(createFieldChange());
        });

        await act(async () => {
            result.current.confirmRestore();
            await new Promise((resolve) => setTimeout(resolve, 10));
        });

        act(() => {
            result.current.dismissResult();
        });

        expect(result.current.restoreState.dialogOpen).toBe(false);
        expect(result.current.restoreState.change).toBeNull();
        expect(result.current.restoreState.successMessage).toBeNull();
    });

    it("should no-op when config.features.allowRestore is false", () => {
        const { result } = setupHook({ allowRestore: false });

        act(() => {
            result.current.requestRestore(createFieldChange());
        });

        expect(result.current.restoreState.dialogOpen).toBe(false);
    });

    it("should no-op when entityContext is null", () => {
        const { result } = setupHook({ ec: null });

        act(() => {
            result.current.requestRestore(createFieldChange());
        });

        expect(result.current.restoreState.dialogOpen).toBe(false);
    });

    it("should handle lookup field restore", async () => {
        const { result, service } = setupHook();
        const change = createLookupFieldChange();

        act(() => {
            result.current.requestRestore(change);
        });

        await act(async () => {
            result.current.confirmRestore();
            await new Promise((resolve) => setTimeout(resolve, 10));
        });

        expect(service.restoreFieldValue).toHaveBeenCalledWith(
            expect.anything(),
            "contact",
            "record-001",
            change,
        );
        expect(result.current.restoreState.successMessage).toBeTruthy();
    });
});
