// useQuickPeek.ts — Quick Peek callout state and handlers

import * as React from "react";
import { IInputs } from "../generated/ManifestTypes";
import { DataverseService, AuditPrivilegeError } from "../services/DataverseService";
import { IAuditEntry } from "../models/IAuditEntry";
import { IAuditConfig } from "../models/IConfig";
import { loadAuditData, EntityContext } from "./loadAuditData";
import { PortalTarget } from "./usePortalInjection";

export interface QuickPeekState {
    fieldLogicalName: string;
    fieldDisplayName: string;
    anchorElement: HTMLElement;
    entries: IAuditEntry[];
    loading: boolean;
    error: string | null;
}

export interface UseQuickPeekReturn {
    quickPeek: QuickPeekState | null;
    handleIconClick: (fieldLogicalName: string, anchorElement: HTMLElement) => void;
    handleQuickPeekDismiss: () => void;
    handleQuickPeekRetry: () => void;
    handleQuickPeekViewFull: () => void;
}

export function useQuickPeek(
    service: DataverseService,
    entityContext: EntityContext | null,
    context: ComponentFramework.Context<IInputs>,
    config: IAuditConfig,
    portalTargets: PortalTarget[],
    onOpenDeepDive: (fieldLogicalName: string, fieldDisplayName: string) => void,
): UseQuickPeekReturn {
    const [quickPeek, setQuickPeek] = React.useState<QuickPeekState | null>(null);
    const abortRef = React.useRef<AbortController | null>(null);

    const loadFieldData = React.useCallback(
        async (fieldName: string): Promise<{ entries: IAuditEntry[]; error: string | null }> => {
            if (!entityContext) {
                return { entries: [], error: "Unable to determine the current record." };
            }

            try {
                const pageSize =
                    context.parameters.pageSize?.raw ?? config.audit.defaultPageSize;

                const result = await loadAuditData(
                    service,
                    entityContext,
                    { type: "field", fieldLogicalName: fieldName },
                    1,
                    pageSize,
                    config.audit.visibleOperations,
                );

                return { entries: result.entries, error: null };
            } catch (err) {
                if (err instanceof AuditPrivilegeError) {
                    return { entries: [], error: err.message };
                }
                return {
                    entries: [],
                    error: err instanceof Error ? err.message : config.labels.errorMessage,
                };
            }
        },
        [entityContext, context, config, service]
    );

    const handleIconClick = React.useCallback(
        (fieldLogicalName: string, anchorElement: HTMLElement) => {
            const target = portalTargets.find(
                (t) => t.fieldLogicalName === fieldLogicalName
            );
            const displayName = target?.fieldDisplayName ?? fieldLogicalName;

            // Abort previous request
            abortRef.current?.abort();
            const controller = new AbortController();
            abortRef.current = controller;

            setQuickPeek({
                fieldLogicalName,
                fieldDisplayName: displayName,
                anchorElement,
                entries: [],
                loading: true,
                error: null,
            });

            void loadFieldData(fieldLogicalName).then((result) => {
                if (!controller.signal.aborted) {
                    setQuickPeek((prev) =>
                        prev && prev.fieldLogicalName === fieldLogicalName
                            ? { ...prev, entries: result.entries, loading: false, error: result.error }
                            : prev
                    );
                }
                return result;
            });
        },
        [portalTargets, loadFieldData]
    );

    const handleQuickPeekDismiss = React.useCallback(() => {
        abortRef.current?.abort();
        setQuickPeek(null);
    }, []);

    const handleQuickPeekRetry = React.useCallback(() => {
        if (!quickPeek) return;
        const fieldName = quickPeek.fieldLogicalName;

        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setQuickPeek((prev) => (prev ? { ...prev, loading: true, error: null } : null));

        void loadFieldData(fieldName).then((result) => {
            if (!controller.signal.aborted) {
                setQuickPeek((prev) =>
                    prev && prev.fieldLogicalName === fieldName
                        ? { ...prev, entries: result.entries, loading: false, error: result.error }
                        : prev
                );
            }
            return result;
        });
    }, [quickPeek, loadFieldData]);

    const handleQuickPeekViewFull = React.useCallback(() => {
        if (!quickPeek) return;

        const fieldName = quickPeek.fieldLogicalName;
        const displayName = quickPeek.fieldDisplayName;

        abortRef.current?.abort();
        setQuickPeek(null);

        onOpenDeepDive(fieldName, displayName);
    }, [quickPeek, onOpenDeepDive]);

    // Cleanup on unmount
    React.useEffect(() => {
        return () => {
            abortRef.current?.abort();
        };
    }, []);

    return {
        quickPeek,
        handleIconClick,
        handleQuickPeekDismiss,
        handleQuickPeekRetry,
        handleQuickPeekViewFull,
    };
}
