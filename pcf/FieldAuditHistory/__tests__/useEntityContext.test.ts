import { renderHook } from "./renderHook";
import { useEntityContext } from "../hooks/useEntityContext";
import { createMockContext } from "./helpers";

describe("useEntityContext", () => {
    it("should extract entityId and entityTypeName from context", () => {
        const mockContext = createMockContext();
        const { result } = renderHook(() =>
            useEntityContext(mockContext as unknown as Parameters<typeof useEntityContext>[0])
        );

        expect(result.current).toEqual({
            entityId: "record-001",
            entityTypeName: "contact",
        });
    });

    it("should return null when page is missing", () => {
        const mockContext = {
            parameters: { boundField: { raw: "test" }, configWebResourceName: { raw: null }, pageSize: { raw: 25 } },
            webAPI: { retrieveMultipleRecords: jest.fn() },
        };

        const { result } = renderHook(() =>
            useEntityContext(mockContext as unknown as Parameters<typeof useEntityContext>[0])
        );

        expect(result.current).toBeNull();
    });

    it("should return null when entityId is missing", () => {
        const mockContext = {
            ...createMockContext(),
            page: { entityTypeName: "contact" },
        };

        const { result } = renderHook(() =>
            useEntityContext(mockContext as unknown as Parameters<typeof useEntityContext>[0])
        );

        expect(result.current).toBeNull();
    });

    it("should return null when entityTypeName is missing", () => {
        const mockContext = {
            ...createMockContext(),
            page: { entityId: "record-001" },
        };

        const { result } = renderHook(() =>
            useEntityContext(mockContext as unknown as Parameters<typeof useEntityContext>[0])
        );

        expect(result.current).toBeNull();
    });
});
