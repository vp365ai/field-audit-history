// QuickPeekCallout.tsx — Compact single-field audit popup
import * as React from "react";
import {
    Callout,
    DirectionalHint,
    Stack,
    Text,
    Icon,
    IconButton,
    Spinner,
    SpinnerSize,
    Dropdown,
    IDropdownOption,
    Link,
    TooltipHost,
    mergeStyles,
    MessageBar,
    MessageBarType,
} from "@fluentui/react";
import { IAuditEntry, IFieldChange } from "../models/IAuditEntry";
import { IAuditConfig } from "../models/IConfig";
import { colors, operationColors } from "../utils/theme";

export interface IQuickPeekCalloutProps {
    /** The DOM element to anchor the callout to */
    target: HTMLElement;

    /** Display name for the header */
    fieldDisplayName: string;

    /** Audit entries to display (pre-loaded, already filtered to this field) */
    entries: IAuditEntry[];

    /** True while loading data */
    loading: boolean;

    /** Error message if loading failed */
    error: string | null;

    /** Config for labels and display options */
    config: IAuditConfig;

    /** Called when the user clicks outside or presses Escape */
    onDismiss: () => void;

    /** Called when user clicks "View full history →" */
    onViewFullHistory: () => void;

    /** Called when user clicks Retry after an error */
    onRetry: () => void;

    /** Called when user clicks Restore on a field change */
    onRestore?: (change: IFieldChange) => void;

    /** Called when user copies a value */
    onCopy?: (value: string) => void;
}

const calloutContentClass = mergeStyles({
    width: 380,
    maxHeight: 420,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
});

const headerClass = mergeStyles({
    padding: "12px 16px 8px",
    borderBottom: `1px solid ${colors.neutralLight}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
});

const headerTitleClass = mergeStyles({
    fontWeight: 600,
    fontSize: 14,
    color: colors.neutralPrimary,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    flex: 1,
});

const entryListClass = mergeStyles({
    flex: 1,
    overflowY: "auto",
    padding: "0 16px",
});

const entryClass = mergeStyles({
    padding: "8px 0",
    borderBottom: `1px solid ${colors.neutralLighter}`,
    ":last-child": {
        borderBottom: "none",
    },
});

const entryHeaderClass = mergeStyles({
    fontSize: 12,
    color: colors.neutralSecondary,
    display: "flex",
    alignItems: "center",
    gap: 6,
});

const entryValuesClass = mergeStyles({
    fontSize: 13,
    color: colors.neutralPrimary,
    marginTop: 2,
    wordBreak: "break-word",
});

const arrowStyle = mergeStyles({
    color: colors.themePrimary,
    margin: "0 4px",
    fontSize: 11,
});

const footerClass = mergeStyles({
    padding: "8px 16px 12px",
    borderTop: `1px solid ${colors.neutralLight}`,
    textAlign: "center",
});

const operationDotClass = (color: string): string =>
    mergeStyles({
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: "50%",
        backgroundColor: color,
        flexShrink: 0,
    });

const OP_COLORS = operationColors;

const compactActionStyles = {
    root: { width: 20, height: 20 },
    icon: { fontSize: 10 },
};

export const QuickPeekCallout: React.FC<IQuickPeekCalloutProps> = ({
    target,
    fieldDisplayName,
    entries,
    loading,
    error,
    config,
    onDismiss,
    onViewFullHistory,
    onRetry,
    onRestore,
    onCopy,
}) => {
    // Optional user filter
    const [selectedUser, setSelectedUser] = React.useState<string>("");

    // Build user options from entries
    const userOptions: IDropdownOption[] = React.useMemo(() => {
        const users = new Set<string>();
        entries.forEach((e) => {
            if (e.changedByName && e.changedByName !== "Unknown") {
                users.add(e.changedByName);
            }
        });
        const opts: IDropdownOption[] = [{ key: "", text: "All users" }];
        Array.from(users).sort().forEach((name) => {
            opts.push({ key: name, text: name });
        });
        return opts;
    }, [entries]);

    // Filter and limit entries
    const displayEntries = React.useMemo(() => {
        let filtered = entries;
        if (selectedUser) {
            filtered = filtered.filter((e) => e.changedByName === selectedUser);
        }
        return filtered.slice(0, config.quickPeek.maxEntries);
    }, [entries, selectedUser, config.quickPeek.maxEntries]);

    const handleUserChange = React.useCallback(
        (_ev: React.FormEvent, option?: IDropdownOption) => {
            if (option) {
                setSelectedUser(option.key as string);
            }
        },
        []
    );

    const truncate = (val: string | null, max: number): string => {
        if (!val) return "(empty)";
        if (val.length <= max) return val;
        return val.substring(0, max) + "\u2026";
    };

    const formatDate = (date: Date): string => {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return "Just now";
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    };

    return (
        <Callout
            target={target}
            onDismiss={onDismiss}
            directionalHint={DirectionalHint.bottomLeftEdge}
            isBeakVisible={false}
            gapSpace={4}
            setInitialFocus
            styles={{
                calloutMain: { borderRadius: 8, boxShadow: "0 6px 20px rgba(0,0,0,0.15)" },
            }}
        >
            <div className={calloutContentClass}>
                {/* Header */}
                <div className={headerClass}>
                    <span className={headerTitleClass} title={fieldDisplayName}>
                        {fieldDisplayName} — Recent Changes
                    </span>
                    {config.quickPeek.showUserFilter && entries.length > 0 && userOptions.length > 2 && (
                        <Dropdown
                            options={userOptions}
                            selectedKey={selectedUser}
                            onChange={handleUserChange}
                            styles={{
                                root: { width: 120 },
                                dropdown: { minWidth: 100 },
                                title: { fontSize: 12, height: 26, lineHeight: 26 },
                                caretDown: { fontSize: 10 },
                            }}
                        />
                    )}
                </div>

                {/* Loading */}
                {loading && (
                    <Stack horizontalAlign="center" tokens={{ padding: "24px 0" }}>
                        <Spinner size={SpinnerSize.medium} />
                    </Stack>
                )}

                {/* Error */}
                {error && !loading && (
                    <Stack tokens={{ padding: "8px 16px" }}>
                        <MessageBar
                            messageBarType={MessageBarType.error}
                            isMultiline={false}
                        >
                            {error}
                        </MessageBar>
                        <Link onClick={onRetry} styles={{ root: { fontSize: 12, marginTop: 4 } }}>
                            Retry
                        </Link>
                    </Stack>
                )}

                {/* Empty state */}
                {!loading && !error && entries.length === 0 && (
                    <Stack horizontalAlign="center" tokens={{ padding: "20px 16px" }}>
                        <Text styles={{ root: { color: colors.neutralSecondary, fontSize: 13 } }}>
                            {config.labels.quickPeekNoChanges}
                        </Text>
                    </Stack>
                )}

                {/* Entry list */}
                {!loading && !error && displayEntries.length > 0 && (
                    <div className={entryListClass}>
                        {displayEntries.map((entry, idx) => (
                            <div key={entry.auditId || idx} className={entryClass}>
                                <div className={entryHeaderClass}>
                                    <span className={operationDotClass(OP_COLORS[entry.operation] ?? colors.neutralQuaternaryAlt)} />
                                    <span>{formatDate(entry.changedOn)}</span>
                                    <span style={{ color: colors.neutralTertiary }}>&middot;</span>
                                    <span>{entry.changedByName}</span>
                                </div>
                                {entry.changedFields.length > 0 ? (
                                    entry.changedFields.map((change, ci) => (
                                        <Stack key={ci} horizontal verticalAlign="center" tokens={{ childrenGap: 2 }}>
                                            <div className={entryValuesClass} style={{ flex: 1 }}>
                                                <Text variant="small">
                                                    {truncate(change.oldValue, 60)}
                                                </Text>
                                                <Icon iconName="Forward" className={arrowStyle} />
                                                <Text variant="small">
                                                    {truncate(change.newValue, 60)}
                                                </Text>
                                            </div>
                                            {config.features.allowCopy && onCopy && (
                                                <TooltipHost content="Copy">
                                                    <IconButton
                                                        iconProps={{ iconName: "Copy" }}
                                                        styles={compactActionStyles}
                                                        ariaLabel="Copy value"
                                                        onClick={() =>
                                                            onCopy(`${change.oldValue ?? "(empty)"} → ${change.newValue ?? "(empty)"}`)
                                                        }
                                                    />
                                                </TooltipHost>
                                            )}
                                            {config.features.allowRestore && onRestore && change.rawOldValue !== undefined && (
                                                <TooltipHost content={config.labels.restoreButtonLabel}>
                                                    <IconButton
                                                        iconProps={{ iconName: "Undo" }}
                                                        styles={compactActionStyles}
                                                        ariaLabel={config.labels.restoreButtonLabel}
                                                        onClick={() => onRestore(change)}
                                                    />
                                                </TooltipHost>
                                            )}
                                        </Stack>
                                    ))
                                ) : (
                                    <div className={entryValuesClass} style={{ color: colors.neutralTertiary, fontStyle: "italic" }}>
                                        Value changed
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Footer — View full history */}
                {!loading && (
                    <div className={footerClass}>
                        <Link onClick={onViewFullHistory} styles={{ root: { fontSize: 13 } }}>
                            {config.labels.quickPeekViewFull} &rarr;
                        </Link>
                    </div>
                )}
            </div>
        </Callout>
    );
};
