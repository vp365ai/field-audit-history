import { DEFAULT_CONFIG, IAuditConfig } from "../models/IConfig";

describe("IConfig — DEFAULT_CONFIG", () => {
    it("should have version 3.4.0", () => {
        expect(DEFAULT_CONFIG._version).toBe("3.4.0");
    });

    it("should have sensible audit defaults", () => {
        expect(DEFAULT_CONFIG.audit.defaultPageSize).toBe(25);
        expect(DEFAULT_CONFIG.audit.maxPages).toBe(10);
        expect(DEFAULT_CONFIG.audit.visibleOperations).toEqual([1, 2]);
        expect(DEFAULT_CONFIG.audit.dateFormat).toBe("short");
    });

    it("should have wildcard table config", () => {
        expect(DEFAULT_CONFIG.tables["*"]).toEqual({ mode: "audited", fields: [] });
    });

    it("should have quickPeek defaults", () => {
        expect(DEFAULT_CONFIG.quickPeek.maxEntries).toBe(8);
        expect(DEFAULT_CONFIG.quickPeek.showUserFilter).toBe(true);
    });

    it("should have display defaults", () => {
        expect(DEFAULT_CONFIG.display.panelWidth).toBe("80%");
        expect(DEFAULT_CONFIG.display.showChangedBy).toBe(true);
        expect(DEFAULT_CONFIG.display.showOperationType).toBe(true);
        expect(DEFAULT_CONFIG.display.valuePreviewLength).toBe(200);
        expect(DEFAULT_CONFIG.display.showFilters).toBe(true);
    });

    it("should have all required label keys", () => {
        const labels = DEFAULT_CONFIG.labels;
        expect(labels.panelTitle).toBeTruthy();
        expect(labels.fieldPanelTitle).toBeTruthy();
        expect(labels.noRecordsMessage).toBeTruthy();
        expect(labels.loadMoreButton).toBeTruthy();
        expect(labels.errorMessage).toBeTruthy();
        expect(labels.statusLabel).toBeTruthy();
        expect(labels.statusLoadingLabel).toBeTruthy();
        expect(labels.quickPeekNoChanges).toBeTruthy();
        expect(labels.quickPeekViewFull).toBeTruthy();
    });

    it("should have features defaults", () => {
        expect(DEFAULT_CONFIG.features.allowRestore).toBe(true);
        expect(DEFAULT_CONFIG.features.allowCopy).toBe(true);
        expect(DEFAULT_CONFIG.features.allowExport).toBe(true);
    });

    it("should have restore/copy/export label keys", () => {
        const labels = DEFAULT_CONFIG.labels;
        expect(labels.restoreConfirmTitle).toBeTruthy();
        expect(labels.restoreConfirmMessage).toBeTruthy();
        expect(labels.restoreSuccessMessage).toBeTruthy();
        expect(labels.restoreErrorMessage).toBeTruthy();
        expect(labels.restoreButtonLabel).toBeTruthy();
        expect(labels.copySuccessLabel).toBeTruthy();
        expect(labels.exportButtonLabel).toBeTruthy();
    });

    it("should be a frozen-shape object (all sections present)", () => {
        const config: IAuditConfig = DEFAULT_CONFIG;
        expect(config).toHaveProperty("_version");
        expect(config).toHaveProperty("features");
        expect(config).toHaveProperty("audit");
        expect(config).toHaveProperty("tables");
        expect(config).toHaveProperty("quickPeek");
        expect(config).toHaveProperty("display");
        expect(config).toHaveProperty("labels");
    });
});
