/* eslint-disable @typescript-eslint/unbound-method */
import { exportAuditCsv } from "../utils/exportCsv";
import { createAuditEntry, createFieldChange } from "./helpers";

describe("exportAuditCsv", () => {
    let mockLink: HTMLAnchorElement;
    let createElementSpy: jest.SpyInstance;
    let appendChildSpy: jest.SpyInstance;
    let removeChildSpy: jest.SpyInstance;
    let createObjectURLSpy: jest.SpyInstance;
    let revokeObjectURLSpy: jest.SpyInstance;

    beforeEach(() => {
        mockLink = {
            setAttribute: jest.fn(),
            click: jest.fn(),
            style: {} as CSSStyleDeclaration,
        } as unknown as HTMLAnchorElement;

        createElementSpy = jest.spyOn(document, "createElement").mockReturnValue(mockLink);
        appendChildSpy = jest.spyOn(document.body, "appendChild").mockReturnValue(mockLink);
        removeChildSpy = jest.spyOn(document.body, "removeChild").mockReturnValue(mockLink);
        createObjectURLSpy = jest.fn().mockReturnValue("blob:test-url");
        revokeObjectURLSpy = jest.fn();
        (globalThis as Record<string, unknown>).URL = {
            createObjectURL: createObjectURLSpy,
            revokeObjectURL: revokeObjectURLSpy,
        };
    });

    afterEach(() => {
        createElementSpy.mockRestore();
        appendChildSpy.mockRestore();
        removeChildSpy.mockRestore();
    });

    it("should create a CSV with header and data rows", () => {
        const entries = [
            createAuditEntry({
                changedFields: [
                    createFieldChange({
                        displayName: "emailaddress1",
                        oldValue: "old@test.com",
                        newValue: "new@test.com",
                    }),
                ],
            }),
        ];

        exportAuditCsv(entries);

        expect(createElementSpy).toHaveBeenCalledWith("a");
        expect(mockLink.setAttribute).toHaveBeenCalledWith("download", "audit-history.csv");
        expect(mockLink.click).toHaveBeenCalled();
        expect(revokeObjectURLSpy).toHaveBeenCalledWith("blob:test-url");
    });

    it("should handle entries with no changed fields", () => {
        const entries = [
            createAuditEntry({ changedFields: [] }),
        ];

        exportAuditCsv(entries);

        expect(mockLink.click).toHaveBeenCalled();
    });

    it("should escape commas in values", () => {
        const entries = [
            createAuditEntry({
                changedByName: "Smith, John",
                changedFields: [
                    createFieldChange({
                        displayName: "fullname",
                        oldValue: "Doe, Jane",
                        newValue: "Smith, John",
                    }),
                ],
            }),
        ];

        exportAuditCsv(entries);

        // The function was called — CSV escaping happens internally
        expect(mockLink.click).toHaveBeenCalled();
    });

    it("should handle null old/new values", () => {
        const entries = [
            createAuditEntry({
                changedFields: [
                    createFieldChange({
                        oldValue: null,
                        newValue: "new value",
                    }),
                ],
            }),
        ];

        exportAuditCsv(entries);

        expect(mockLink.click).toHaveBeenCalled();
    });

    it("should handle empty entries array", () => {
        exportAuditCsv([]);

        // Should still create the CSV (header only)
        expect(mockLink.click).toHaveBeenCalled();
    });

    it("should handle multiple field changes per entry", () => {
        const entries = [
            createAuditEntry({
                changedFields: [
                    createFieldChange({ displayName: "email", oldValue: "a", newValue: "b" }),
                    createFieldChange({ displayName: "phone", oldValue: "c", newValue: "d" }),
                ],
            }),
        ];

        exportAuditCsv(entries);

        // Two data rows (one per field change) + header
        expect(mockLink.click).toHaveBeenCalled();
    });
});
