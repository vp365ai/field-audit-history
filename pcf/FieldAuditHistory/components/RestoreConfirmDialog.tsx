// RestoreConfirmDialog.tsx — Confirmation dialog for field restore
import * as React from "react";
import {
    Dialog,
    DialogType,
    DialogFooter,
    PrimaryButton,
    DefaultButton,
    Spinner,
    SpinnerSize,
    MessageBar,
    MessageBarType,
    Text,
} from "@fluentui/react";
import { IFieldChange } from "../models/IAuditEntry";
import { IAuditConfig } from "../models/IConfig";

export interface IRestoreConfirmDialogProps {
    isOpen: boolean;
    change: IFieldChange | null;
    restoring: boolean;
    successMessage: string | null;
    errorMessage: string | null;
    config: IAuditConfig;
    onConfirm: () => void;
    onCancel: () => void;
    onDismiss: () => void;
}

export const RestoreConfirmDialog: React.FC<IRestoreConfirmDialogProps> = ({
    isOpen,
    change,
    restoring,
    successMessage,
    errorMessage,
    config,
    onConfirm,
    onCancel,
    onDismiss,
}) => {
    if (!isOpen || !change) return null;

    const hasResult = successMessage !== null || errorMessage !== null;

    const bodyText = config.labels.restoreConfirmMessage
        .replace("{field}", change.displayName)
        .replace("{value}", change.oldValue ?? "(empty)");

    return (
        <Dialog
            hidden={false}
            onDismiss={hasResult ? onDismiss : onCancel}
            dialogContentProps={{
                type: DialogType.normal,
                title: config.labels.restoreConfirmTitle,
            }}
            modalProps={{
                isBlocking: restoring,
            }}
        >
            {!hasResult && (
                <>
                    <Text>{bodyText}</Text>
                    {restoring && (
                        <Spinner
                            size={SpinnerSize.small}
                            label="Restoring..."
                            styles={{ root: { marginTop: 12 } }}
                        />
                    )}
                </>
            )}

            {successMessage && (
                <MessageBar messageBarType={MessageBarType.success}>
                    {successMessage}
                </MessageBar>
            )}

            {errorMessage && (
                <MessageBar messageBarType={MessageBarType.error}>
                    {errorMessage}
                </MessageBar>
            )}

            <DialogFooter>
                {!hasResult ? (
                    <>
                        <PrimaryButton
                            text={config.labels.restoreButtonLabel}
                            onClick={onConfirm}
                            disabled={restoring}
                        />
                        <DefaultButton
                            text="Cancel"
                            onClick={onCancel}
                            disabled={restoring}
                        />
                    </>
                ) : (
                    <DefaultButton text="Close" onClick={onDismiss} />
                )}
            </DialogFooter>
        </Dialog>
    );
};
