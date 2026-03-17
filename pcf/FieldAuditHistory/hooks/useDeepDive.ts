// useDeepDive.ts — Deep Dive panel state, loading, and filtering

import * as React from "react";
import { IInputs } from "../generated/ManifestTypes";
import { DataverseService, AuditPrivilegeError } from "../services/DataverseService";
import { IAuditEntry } from "../models/IAuditEntry";
import { IAuditConfig, IFilterState } from "../models/IConfig";
import { loadAuditData, EntityContext } from "./loadAuditData";

export interface DeepDiveState {
    mode: "record" | "field";
    fieldLogicalName: string | null;
    fieldDisplayName: string;
    entries: IAuditEntry[];
    loading: boolean;
    loadingMore: boolean;
    error: string | null;
    totalCount: number;
    moreRecords: boolean;
    currentPage: number;
}

const EMPTY_FILTER_STATE: IFilterState = {
    selectedFields: [],
    selectedUsers: [],
    selectedOperations: [],
    showClearedOnly: false,
    dateFrom: null,
    dateTo: null,
};

export interface UseDeepDiveReturn {
    deepDive: DeepDiveState | null;
    filteredEntries: IAuditEntry[];
    filterState: IFilterState;
    panelTitle: string;
    canLoadMore: boolean;
    openRecordAudit: () => void;
    openFieldDeepDive: (fieldLogicalName: string, fieldDisplayName: string) => void;
    handleDismiss: () => void;
    handleLoadMore: () => void;
    handleRetry: () => void;
    handleFilterChange: (filters: IFilterState) => void;
    handleViewAllFields: () => void;
    handleViewField: () => void;
}

export function useDeepDive(
    service: DataverseService,
    entityContext: EntityContext | null,
    context: ComponentFramework.Context<IInputs>,
    config: IAuditConfig,
): UseDeepDiveReturn {
    const [deepDive, setDeepDive] = React.useState<DeepDiveState | null>(null);
    const [filterState, setFilterState] = React.useState<IFilterState>(EMPTY_FILTER_STATE);
    const abortRef = React.useRef<AbortController | null>(null);

    const loadData = React.useCallback(
        async (
            target: { type: "record" } | { type: "field"; fieldLogicalName: string },
            page: number,
            append: boolean
        ) => {
            if (!entityContext) {
                setDeepDive((prev) =>
                    prev
                        ? { ...prev, error: "Unable to determine the current record.", loading: false }
                        : null
                );
                return;
            }

            // Abort previous request
            abortRef.current?.abort();
            const controller = new AbortController();
            abortRef.current = controller;

            setDeepDive((prev) =>
                prev
                    ? {
                          ...prev,
                          ...(append ? { loadingMore: true } : { loading: true }),
                          error: null,
                      }
                    : null
            );

            try {
                const pageSize =
                    context.parameters.pageSize?.raw ??
                    config.audit.defaultPageSize;

                const result = await loadAuditData(
                    service,
                    entityContext,
                    target,
                    page,
                    pageSize,
                    config.audit.visibleOperations
                );

                if (controller.signal.aborted) return;

                setDeepDive((prev) =>
                    prev
                        ? {
                              ...prev,
                              entries: append
                                  ? [...prev.entries, ...result.entries]
                                  : result.entries,
                              totalCount: result.totalCount,
                              moreRecords: result.moreRecords,
                              currentPage: page,
                              loading: false,
                              loadingMore: false,
                          }
                        : null
                );
            } catch (err) {
                if (controller.signal.aborted) return;

                const msg =
                    err instanceof AuditPrivilegeError
                        ? err.message
                        : err instanceof Error
                        ? err.message
                        : config.labels.errorMessage;

                setDeepDive((prev) =>
                    prev
                        ? { ...prev, error: msg, loading: false, loadingMore: false }
                        : null
                );
            }
        },
        [entityContext, context, config, service]
    );

    const filteredEntries = React.useMemo(() => {
        if (!deepDive) return [];

        const noFilters =
            filterState.selectedFields.length === 0 &&
            filterState.selectedUsers.length === 0 &&
            filterState.selectedOperations.length === 0 &&
            !filterState.showClearedOnly &&
            filterState.dateFrom === null &&
            filterState.dateTo === null;

        if (noFilters) return deepDive.entries;

        return deepDive.entries.filter((entry) => {
            if (filterState.selectedFields.length > 0) {
                const entryFieldNames = entry.changedFields.map(
                    (f) => f.fieldName
                );
                if (
                    !filterState.selectedFields.some((f) =>
                        entryFieldNames.includes(f)
                    )
                ) {
                    return false;
                }
            }
            if (
                filterState.selectedUsers.length > 0 &&
                !filterState.selectedUsers.includes(entry.changedByName)
            ) {
                return false;
            }
            if (
                filterState.selectedOperations.length > 0 &&
                !filterState.selectedOperations.includes(entry.operation)
            ) {
                return false;
            }
            // Cleared filter: show only entries where at least one field was cleared
            if (filterState.showClearedOnly) {
                const hasCleared = entry.changedFields.some(
                    (f) => f.newValue === null || f.newValue === "" || f.newValue === "(empty)"
                );
                if (!hasCleared) return false;
            }
            if (
                filterState.dateFrom &&
                entry.changedOn < filterState.dateFrom
            ) {
                return false;
            }
            if (filterState.dateTo) {
                const endOfDay = new Date(filterState.dateTo);
                endOfDay.setHours(23, 59, 59, 999);
                if (entry.changedOn > endOfDay) {
                    return false;
                }
            }
            return true;
        });
    }, [deepDive, filterState]);

    const canLoadMore = React.useMemo(() => {
        if (!deepDive) return false;
        return (
            deepDive.moreRecords &&
            deepDive.currentPage < config.audit.maxPages
        );
    }, [deepDive, config.audit.maxPages]);

    const panelTitle = React.useMemo(() => {
        if (!deepDive) return "";
        if (deepDive.mode === "field" && deepDive.fieldDisplayName) {
            return `${deepDive.fieldDisplayName} — ${config.labels.fieldPanelTitle}`;
        }
        return config.labels.panelTitle;
    }, [deepDive, config.labels]);

    const openRecordAudit = React.useCallback(() => {
        setFilterState(EMPTY_FILTER_STATE);
        setDeepDive({
            mode: "record",
            fieldLogicalName: null,
            fieldDisplayName: "",
            entries: [],
            loading: true,
            loadingMore: false,
            error: null,
            totalCount: 0,
            moreRecords: false,
            currentPage: 1,
        });
        void loadData({ type: "record" }, 1, false);
    }, [loadData]);

    const openFieldDeepDive = React.useCallback(
        (fieldLogicalName: string, fieldDisplayName: string) => {
            setFilterState(EMPTY_FILTER_STATE);
            setDeepDive({
                mode: "field",
                fieldLogicalName,
                fieldDisplayName,
                entries: [],
                loading: true,
                loadingMore: false,
                error: null,
                totalCount: 0,
                moreRecords: false,
                currentPage: 1,
            });
            void loadData(
                { type: "field", fieldLogicalName },
                1,
                false
            );
        },
        [loadData]
    );

    const handleDismiss = React.useCallback(() => {
        abortRef.current?.abort();
        setDeepDive(null);
        setFilterState(EMPTY_FILTER_STATE);
    }, []);

    const handleLoadMore = React.useCallback(() => {
        if (!deepDive) return;
        if (deepDive.currentPage >= config.audit.maxPages) return;

        const nextPage = deepDive.currentPage + 1;

        if (deepDive.mode === "field" && deepDive.fieldLogicalName) {
            void loadData(
                { type: "field", fieldLogicalName: deepDive.fieldLogicalName },
                nextPage,
                true
            );
        } else {
            void loadData({ type: "record" }, nextPage, true);
        }
    }, [deepDive, config.audit.maxPages, loadData]);

    const handleRetry = React.useCallback(() => {
        if (!deepDive) return;

        setDeepDive((prev) =>
            prev
                ? { ...prev, entries: [], loading: true, error: null }
                : null
        );

        if (deepDive.mode === "field" && deepDive.fieldLogicalName) {
            void loadData(
                { type: "field", fieldLogicalName: deepDive.fieldLogicalName },
                1,
                false
            );
        } else {
            void loadData({ type: "record" }, 1, false);
        }
    }, [deepDive, loadData]);

    const handleFilterChange = React.useCallback((filters: IFilterState) => {
        setFilterState(filters);
    }, []);

    const handleViewAllFields = React.useCallback(() => {
        if (!deepDive) return;

        setFilterState(EMPTY_FILTER_STATE);
        setDeepDive({
            mode: "record",
            fieldLogicalName: deepDive.fieldLogicalName,
            fieldDisplayName: deepDive.fieldDisplayName,
            entries: [],
            loading: true,
            loadingMore: false,
            error: null,
            totalCount: 0,
            moreRecords: false,
            currentPage: 1,
        });

        void loadData({ type: "record" }, 1, false);
    }, [deepDive, loadData]);

    const handleViewField = React.useCallback(() => {
        if (!deepDive?.fieldLogicalName) return;

        const fieldName = deepDive.fieldLogicalName;
        const displayName = deepDive.fieldDisplayName;

        setFilterState(EMPTY_FILTER_STATE);
        setDeepDive({
            mode: "field",
            fieldLogicalName: fieldName,
            fieldDisplayName: displayName,
            entries: [],
            loading: true,
            loadingMore: false,
            error: null,
            totalCount: 0,
            moreRecords: false,
            currentPage: 1,
        });

        void loadData(
            { type: "field", fieldLogicalName: fieldName },
            1,
            false
        );
    }, [deepDive, loadData]);

    // Cleanup on unmount
    React.useEffect(() => {
        return () => {
            abortRef.current?.abort();
        };
    }, []);

    return {
        deepDive,
        filteredEntries,
        filterState,
        panelTitle,
        canLoadMore,
        openRecordAudit,
        openFieldDeepDive,
        handleDismiss,
        handleLoadMore,
        handleRetry,
        handleFilterChange,
        handleViewAllFields,
        handleViewField,
    };
}
