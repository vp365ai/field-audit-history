// useRestore.ts — Field value restore workflow state machine

import * as React from "react";
import { IFieldChange } from "../models/IAuditEntry";
import { IAuditConfig } from "../models/IConfig";
import { DataverseService } from "../services/DataverseService";
import { EntityContext } from "./loadAuditData";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Xrm: any;

export interface RestoreState {
    /** The field change being restored (null when idle) */
    change: IFieldChange | null;
    /** Whether the confirmation dialog is open */
    dialogOpen: boolean;
    /** Whether a restore PATCH is in flight */
    restoring: boolean;
    /** Success message after restore completes */
    successMessage: string | null;
    /** Error message if restore fails */
    errorMessage: string | null;
}

export interface UseRestoreReturn {
    restoreState: RestoreState;
    /** Opens the confirmation dialog for a specific field change */
    requestRestore: (change: IFieldChange) => void;
    /** Confirms the restore and executes the PATCH */
    confirmRestore: () => void;
    /** Cancels the restore dialog */
    cancelRestore: () => void;
    /** Dismisses success/error messages and returns to idle */
    dismissResult: () => void;
}

const INITIAL_STATE: RestoreState = {
    change: null,
    dialogOpen: false,
    restoring: false,
    successMessage: null,
    errorMessage: null,
};

export function useRestore(
    service: DataverseService,
    entityContext: EntityContext | null,
    context: ComponentFramework.Context<Record<string, unknown>>,
    config: IAuditConfig,
): UseRestoreReturn {
    const [state, setState] = React.useState<RestoreState>(INITIAL_STATE);

    const requestRestore = React.useCallback(
        (change: IFieldChange) => {
            if (!config.features.allowRestore) return;
            if (!entityContext) return;
            setState({
                change,
                dialogOpen: true,
                restoring: false,
                successMessage: null,
                errorMessage: null,
            });
        },
        [config.features.allowRestore, entityContext]
    );

    const cancelRestore = React.useCallback(() => {
        setState(INITIAL_STATE);
    }, []);

    const dismissResult = React.useCallback(() => {
        setState(INITIAL_STATE);
    }, []);

    const confirmRestore = React.useCallback(() => {
        if (!state.change || !entityContext) return;

        setState((prev) => ({ ...prev, restoring: true }));

        const change = state.change;

        void (async () => {
            try {
                await service.restoreFieldValue(
                    context.webAPI,
                    entityContext.entityTypeName,
                    entityContext.entityId,
                    change,
                );

                setState({
                    change,
                    dialogOpen: true,
                    restoring: false,
                    successMessage: config.labels.restoreSuccessMessage,
                    errorMessage: null,
                });

                // Best-effort form refresh
                try {
                    if (typeof Xrm !== "undefined") {
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
                        Xrm?.Page?.data?.refresh?.(true);
                    }
                } catch {
                    // Ignore — form refresh is optional
                }
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : config.labels.restoreErrorMessage;
                setState({
                    change,
                    dialogOpen: true,
                    restoring: false,
                    successMessage: null,
                    errorMessage: msg,
                });
            }
        })();
    }, [state.change, entityContext, service, context.webAPI, config.labels]);

    return {
        restoreState: state,
        requestRestore,
        confirmRestore,
        cancelRestore,
        dismissResult,
    };
}
