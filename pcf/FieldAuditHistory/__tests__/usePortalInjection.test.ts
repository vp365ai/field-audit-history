import { shouldShowIcon } from "../hooks/usePortalInjection";
import { ITableConfig } from "../models/IConfig";

describe("shouldShowIcon", () => {
    const auditedFields = new Set(["emailaddress1", "telephone1", "jobtitle"]);

    describe("mode: audited", () => {
        const tableConfig: ITableConfig = { mode: "audited", fields: [] };

        it("should show icon for audited fields", () => {
            expect(shouldShowIcon("emailaddress1", tableConfig, auditedFields)).toBe(true);
        });

        it("should not show icon for non-audited fields", () => {
            expect(shouldShowIcon("address1_line1", tableConfig, auditedFields)).toBe(false);
        });

        it("should show icon for all fields when auditedFields is null (fallback)", () => {
            expect(shouldShowIcon("anyfield", tableConfig, null)).toBe(true);
        });
    });

    describe("mode: include", () => {
        const tableConfig: ITableConfig = {
            mode: "include",
            fields: ["emailaddress1", "telephone1"],
        };

        it("should show icon for included fields", () => {
            expect(shouldShowIcon("emailaddress1", tableConfig, auditedFields)).toBe(true);
        });

        it("should not show icon for non-included fields", () => {
            expect(shouldShowIcon("jobtitle", tableConfig, auditedFields)).toBe(false);
        });

        it("should not show icon for non-included non-audited fields", () => {
            expect(shouldShowIcon("address1_line1", tableConfig, auditedFields)).toBe(false);
        });
    });

    describe("mode: exclude", () => {
        const tableConfig: ITableConfig = {
            mode: "exclude",
            fields: ["telephone1"],
        };

        it("should not show icon for excluded fields", () => {
            expect(shouldShowIcon("telephone1", tableConfig, auditedFields)).toBe(false);
        });

        it("should show icon for non-excluded audited fields", () => {
            expect(shouldShowIcon("emailaddress1", tableConfig, auditedFields)).toBe(true);
        });

        it("should not show icon for non-excluded non-audited fields", () => {
            expect(shouldShowIcon("address1_line1", tableConfig, auditedFields)).toBe(false);
        });

        it("should show icon when auditedFields is null (fallback)", () => {
            expect(shouldShowIcon("anyfield", tableConfig, null)).toBe(true);
        });
    });

    describe("mode: all", () => {
        const tableConfig: ITableConfig = { mode: "all", fields: [] };

        it("should show icon for any field", () => {
            expect(shouldShowIcon("emailaddress1", tableConfig, auditedFields)).toBe(true);
            expect(shouldShowIcon("address1_line1", tableConfig, auditedFields)).toBe(true);
            expect(shouldShowIcon("random_field", tableConfig, null)).toBe(true);
        });
    });
});
