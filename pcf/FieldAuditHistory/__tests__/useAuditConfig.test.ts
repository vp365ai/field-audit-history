/* eslint-disable @typescript-eslint/unbound-method */
import { act } from "@testing-library/react";
import { renderHook } from "./renderHook";
import { useAuditConfig } from "../hooks/useAuditConfig";
import { DEFAULT_CONFIG } from "../models/IConfig";
import { createMockContext, createMockService } from "./helpers";
import { EntityContext } from "../hooks/loadAuditData";

describe("useAuditConfig", () => {
    const entityContext: EntityContext = {
        entityId: "record-001",
        entityTypeName: "contact",
    };

    it("should return defaults and stop loading when entityContext is null", () => {
        const mockContext = createMockContext();
        const service = createMockService();

        const { result } = renderHook(() =>
            useAuditConfig(
                mockContext as unknown as Parameters<typeof useAuditConfig>[0],
                null,
                service,
            )
        );

        expect(result.current.metadataLoading).toBe(false);
        expect(result.current.config).toEqual(DEFAULT_CONFIG);
    });

    it("should load config and metadata when entityContext is provided", async () => {
        const mockContext = createMockContext();
        const service = createMockService();
        (service.getAttributeDisplayNames as jest.Mock).mockReturnValue({
            emailaddress1: "Email",
        });

        const { result } = renderHook(() =>
            useAuditConfig(
                mockContext as unknown as Parameters<typeof useAuditConfig>[0],
                entityContext,
                service,
            )
        );

        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 10));
        });

        expect(service.getAuditEnabledAttributes).toHaveBeenCalledWith("contact");
        expect(result.current.metadataLoading).toBe(false);
        expect(result.current.auditedFields).toEqual(new Set(["emailaddress1"]));
    });

    it("should use DEFAULT_CONFIG when no configWebResourceName", async () => {
        const mockContext = createMockContext();
        const service = createMockService();

        await act(async () => {
            renderHook(() =>
                useAuditConfig(
                    mockContext as unknown as Parameters<typeof useAuditConfig>[0],
                    entityContext,
                    service,
                )
            );
            await new Promise((resolve) => setTimeout(resolve, 10));
        });

        // loadConfig should NOT have been called (configWebResourceName is null)
        expect(service.loadConfig).not.toHaveBeenCalled();
    });

    it("should load config when configWebResourceName is provided", async () => {
        const mockContext = createMockContext();
        mockContext.parameters.configWebResourceName = { raw: "vp365_config" };
        const service = createMockService();

        await act(async () => {
            renderHook(() =>
                useAuditConfig(
                    mockContext as unknown as Parameters<typeof useAuditConfig>[0],
                    entityContext,
                    service,
                )
            );
            await new Promise((resolve) => setTimeout(resolve, 10));
        });

        expect(service.loadConfig).toHaveBeenCalledWith(
            mockContext.webAPI,
            "vp365_config"
        );
    });

    it("should handle metadata loading exception gracefully", async () => {
        const mockContext = createMockContext();
        const service = createMockService();
        (service.getAuditEnabledAttributes as jest.Mock).mockRejectedValue(new Error("Network timeout"));

        const { result } = renderHook(() =>
            useAuditConfig(
                mockContext as unknown as Parameters<typeof useAuditConfig>[0],
                entityContext,
                service,
            )
        );

        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 10));
        });

        // Exception in metadata loading should set auditedFields to null and stop loading
        expect(result.current.auditedFields).toBeNull();
        expect(result.current.metadataLoading).toBe(false);
    });

    it("should handle metadata failure gracefully", async () => {
        const mockContext = createMockContext();
        const service = createMockService();
        (service.getAuditEnabledAttributes as jest.Mock).mockResolvedValue(null);

        const { result } = renderHook(() =>
            useAuditConfig(
                mockContext as unknown as Parameters<typeof useAuditConfig>[0],
                entityContext,
                service,
            )
        );

        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 10));
        });

        expect(result.current.auditedFields).toBeNull();
        expect(result.current.metadataLoading).toBe(false);
    });

    it("should resolve table config for the entity", async () => {
        const mockContext = createMockContext();
        const service = createMockService();

        const { result } = renderHook(() =>
            useAuditConfig(
                mockContext as unknown as Parameters<typeof useAuditConfig>[0],
                entityContext,
                service,
            )
        );

        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 10));
        });

        expect(result.current.tableConfig.mode).toBe("audited");
    });
});
