// AuditTimeline.tsx — Collapsible timeline of audit entries
import * as React from "react";
import {
    Stack,
    Text,
    Icon,
    IconButton,
    TooltipHost,
    mergeStyles,
} from "@fluentui/react";
import { IAuditEntry, IFieldChange } from "../models/IAuditEntry";
import { IAuditConfig } from "../models/IConfig";
import { colors, operationColors } from "../utils/theme";

export interface IAuditTimelineProps {
    entries: IAuditEntry[];
    config: IAuditConfig;
    /** Map of field logical name → display name for human-readable labels */
    displayNameMap?: Record<string, string>;
    /** Called when user clicks Restore on a field change */
    onRestore?: (change: IFieldChange) => void;
    /** Called when user copies a value */
    onCopy?: (value: string) => void;
    /** Active field filter — when set, only matching fields shown per entry with expand option */
    activeFieldFilter?: string[];
}

const operationIconMap: Record<number, string> = {
    1: "Add",
    2: "Edit",
    3: "Delete",
    4: "View",
};

const operationColorMap = operationColors;

const timelineItemClass = mergeStyles({
    padding: "8px 0",
    ":not(:last-child)": {
        borderBottom: `1px solid ${colors.neutralLight}`,
    },
});

const headerRowClass = mergeStyles({
    display: "flex",
    alignItems: "center",
    gap: "8px",
    cursor: "pointer",
    ":hover": { backgroundColor: colors.neutralLighterAlt },
    borderRadius: 4,
    padding: "4px 4px 4px 0",
});

const dateTextClass = mergeStyles({
    color: colors.neutralSecondary,
    fontSize: "12px",
});

const fieldChangeClass = mergeStyles({
    padding: "6px 12px",
    marginTop: "8px",
    backgroundColor: colors.neutralLighterAlt,
    borderRadius: "4px",
    border: `1px solid ${colors.neutralLight}`,
});

const fieldNameClass = mergeStyles({
    fontWeight: 600,
    fontSize: "12px",
    color: colors.neutralPrimary,
    marginBottom: "2px",
});

const valueClass = mergeStyles({
    fontSize: "13px",
    color: colors.neutralSecondary,
    wordBreak: "break-word",
});

const arrowClass = mergeStyles({
    color: colors.themePrimary,
    margin: "0 6px",
    fontSize: "12px",
});

const chevronClass = mergeStyles({
    fontSize: 10,
    color: colors.neutralSecondary,
    transition: "transform 0.15s ease",
    marginLeft: "auto",
});

const fieldCountBadge = mergeStyles({
    fontSize: 11,
    color: colors.neutralSecondary,
    backgroundColor: colors.neutralLight,
    borderRadius: 10,
    padding: "1px 8px",
    marginLeft: 4,
});

const truncateValue = (value: string | null, maxLength: number): string => {
    if (!value) return "(empty)";
    if (value.length <= maxLength) return value;
    return value.substring(0, maxLength) + "...";
};

/**
 * Formats a date based on the config dateFormat setting.
 * - "short": compact date (e.g., "Mar 14, 2026")
 * - "long": full date + time (e.g., "March 14, 2026, 3:45 PM")
 * - "relative": falls back to "long" in the timeline (Quick Peek handles its own relative)
 */
const formatTimelineDate = (date: Date, dateFormat: string): string => {
    if (dateFormat === "long" || dateFormat === "relative") {
        return date.toLocaleString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
        });
    }
    // "short" (default)
    return date.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
};

const actionButtonStyles = {
    root: { width: 24, height: 24 },
    icon: { fontSize: 12 },
};

/**
 * Resolves the display label for a field change, using displayNameMap when available.
 */
const resolveFieldLabel = (
    change: IFieldChange,
    displayNameMap?: Record<string, string>,
): string =>
    displayNameMap?.[change.displayName]
    ?? displayNameMap?.[change.fieldName]
    ?? change.displayName;

/**
 * Builds a human-readable summary of an audit entry for copy-all.
 * Example: "Updated by John Smith, Mar 14, 2026, 3:45 PM\n- Email: old@test.com → new@test.com\n- Phone: 555-0100 → 555-0199"
 */
const buildEntrySummary = (
    entry: IAuditEntry,
    config: IAuditConfig,
    displayNameMap?: Record<string, string>,
): string => {
    const configOpLabels: Record<number, string> = {
        1: config.labels.createdLabel,
        2: config.labels.updatedLabel,
        3: config.labels.deletedLabel,
    };
    const opLabel = configOpLabels[entry.operation] ?? entry.operationLabel;
    const date = formatTimelineDate(entry.changedOn, config.audit.dateFormat);
    const header = `${opLabel} by ${entry.changedByName}, ${date}`;

    if (entry.changedFields.length === 0) {
        return header;
    }

    const lines = entry.changedFields.map((change) => {
        const label = resolveFieldLabel(change, displayNameMap);
        const oldVal = change.oldValue ?? "(empty)";
        const newVal = change.newValue ?? "(empty)";
        return `- ${label}: ${oldVal} \u2192 ${newVal}`;
    });

    return `${header}\n${lines.join("\n")}`;
};

const FieldChangeItem: React.FC<{
    change: IFieldChange;
    maxLength: number;
    displayNameMap?: Record<string, string>;
    onRestore?: (change: IFieldChange) => void;
    onCopy?: (value: string) => void;
    config: IAuditConfig;
}> = ({ change, maxLength, displayNameMap, onRestore, onCopy, config }) => {
    const [copyTooltip, setCopyTooltip] = React.useState(false);

    const label = resolveFieldLabel(change, displayNameMap);

    const canRestore = config.features.allowRestore
        && onRestore !== undefined
        && change.rawOldValue !== undefined;

    const canCopy = config.features.allowCopy && onCopy !== undefined;

    const handleCopy = React.useCallback(() => {
        const text = `${label}: ${change.oldValue ?? "(empty)"} \u2192 ${change.newValue ?? "(empty)"}`;
        if (onCopy) onCopy(text);
        setCopyTooltip(true);
        setTimeout(() => setCopyTooltip(false), 1500);
    }, [label, change.oldValue, change.newValue, onCopy]);

    return (
        <div className={fieldChangeClass}>
            <Stack horizontal verticalAlign="center" horizontalAlign="space-between">
                <div className={fieldNameClass}>{label}</div>
                <Stack horizontal tokens={{ childrenGap: 2 }}>
                    {canCopy && (
                        <TooltipHost content={copyTooltip ? config.labels.copySuccessLabel : "Copy"}>
                            <IconButton
                                iconProps={{ iconName: "Copy" }}
                                styles={actionButtonStyles}
                                ariaLabel="Copy value"
                                onClick={handleCopy}
                            />
                        </TooltipHost>
                    )}
                    {canRestore && (
                        <TooltipHost content={config.labels.restoreButtonLabel}>
                            <IconButton
                                iconProps={{ iconName: "Undo" }}
                                styles={actionButtonStyles}
                                ariaLabel={config.labels.restoreButtonLabel}
                                onClick={() => onRestore(change)}
                            />
                        </TooltipHost>
                    )}
                </Stack>
            </Stack>
            <Stack horizontal verticalAlign="center" wrap>
                <Text className={valueClass}>
                    {truncateValue(change.oldValue, maxLength)}
                </Text>
                <Icon iconName="Forward" className={arrowClass} />
                <Text className={valueClass}>
                    {truncateValue(change.newValue, maxLength)}
                </Text>
            </Stack>
        </div>
    );
};

const emptyChangesClass = mergeStyles({
    padding: "6px 12px",
    marginTop: "8px",
    fontSize: "12px",
    color: colors.neutralTertiary,
    fontStyle: "italic",
});

const showAllLinkClass = mergeStyles({
    fontSize: 12,
    color: colors.themePrimary,
    cursor: "pointer",
    padding: "4px 12px",
    ":hover": { textDecoration: "underline" },
});

const FieldChangesSection: React.FC<{
    entry: IAuditEntry;
    config: IAuditConfig;
    displayNameMap?: Record<string, string>;
    onRestore?: (change: IFieldChange) => void;
    onCopy?: (value: string) => void;
    activeFieldFilter?: string[];
    showAllFields: boolean;
    onToggleShowAll: () => void;
}> = ({ entry, config, displayNameMap, onRestore, onCopy, activeFieldFilter, showAllFields, onToggleShowAll }) => {
    const hasFilter = activeFieldFilter && activeFieldFilter.length > 0;
    const visibleFields = hasFilter && !showAllFields
        ? entry.changedFields.filter((f) => activeFieldFilter.includes(f.fieldName))
        : entry.changedFields;
    const hiddenCount = entry.changedFields.length - visibleFields.length;

    return (
        <Stack tokens={{ childrenGap: 4 }}>
            {visibleFields.map((change, idx) => (
                <FieldChangeItem
                    key={`${entry.auditId}-${idx}`}
                    change={change}
                    maxLength={config.display.valuePreviewLength}
                    displayNameMap={displayNameMap}
                    onRestore={onRestore}
                    onCopy={onCopy}
                    config={config}
                />
            ))}
            {hasFilter && hiddenCount > 0 && (
                <div
                    className={showAllLinkClass}
                    onClick={onToggleShowAll}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onToggleShowAll();
                        }
                    }}
                >
                    Show all {entry.changedFields.length} changes in this update
                </div>
            )}
            {hasFilter && showAllFields && hiddenCount > 0 && (
                <div
                    className={showAllLinkClass}
                    onClick={onToggleShowAll}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onToggleShowAll();
                        }
                    }}
                >
                    Show only filtered fields
                </div>
            )}
        </Stack>
    );
};

const TimelineEntry: React.FC<{
    entry: IAuditEntry;
    config: IAuditConfig;
    displayNameMap?: Record<string, string>;
    onRestore?: (change: IFieldChange) => void;
    onCopy?: (value: string) => void;
    defaultExpanded?: boolean;
    activeFieldFilter?: string[];
}> = ({ entry, config, displayNameMap, onRestore, onCopy, defaultExpanded = true, activeFieldFilter }) => {
    const [expanded, setExpanded] = React.useState(defaultExpanded);
    const [showAllFields, setShowAllFields] = React.useState(false);
    const [summaryTooltip, setSummaryTooltip] = React.useState(false);

    const iconName = operationIconMap[entry.operation] || "Info";
    const iconColor = operationColorMap[entry.operation] || colors.neutralQuaternaryAlt;

    // Use config labels when available, fall back to service-provided label
    const configOpLabels: Record<number, string> = {
        1: config.labels.createdLabel,
        2: config.labels.updatedLabel,
        3: config.labels.deletedLabel,
    };
    const operationLabel = configOpLabels[entry.operation] ?? entry.operationLabel;
    const fieldCount = entry.changedFields.length;

    const canCopySummary = config.features.allowCopy && onCopy !== undefined;

    const handleCopySummary = React.useCallback((ev: React.MouseEvent<HTMLElement>) => {
        ev.stopPropagation();
        const summary = buildEntrySummary(entry, config, displayNameMap);
        if (onCopy) onCopy(summary);
        setSummaryTooltip(true);
        setTimeout(() => setSummaryTooltip(false), 1500);
    }, [entry, config, displayNameMap, onCopy]);

    return (
        <div className={timelineItemClass}>
            {/* Clickable header — click to expand/collapse */}
            <div
                className={headerRowClass}
                onClick={() => setExpanded(!expanded)}
                role="button"
                aria-expanded={expanded}
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setExpanded(!expanded);
                    }
                }}
            >
                <Icon
                    iconName={iconName}
                    styles={{ root: { color: iconColor, fontSize: 16, flexShrink: 0 } }}
                />
                <Stack styles={{ root: { flex: 1, minWidth: 0 } }}>
                    <Stack horizontal tokens={{ childrenGap: 6 }} verticalAlign="center">
                        {config.display.showOperationType && (
                            <Text styles={{ root: { fontWeight: 600, fontSize: 13 } }}>
                                {operationLabel}
                            </Text>
                        )}
                        {config.display.showChangedBy && (
                            <Text styles={{ root: { fontSize: 13 } }}>
                                by {entry.changedByName}
                            </Text>
                        )}
                        {fieldCount > 0 && (
                            <span className={fieldCountBadge}>
                                {fieldCount} field{fieldCount !== 1 ? "s" : ""}
                            </span>
                        )}
                    </Stack>
                    <Text className={dateTextClass}>
                        {formatTimelineDate(entry.changedOn, config.audit.dateFormat)}
                    </Text>
                </Stack>

                {/* Copy summary button */}
                {canCopySummary && fieldCount > 0 && (
                    <TooltipHost
                        content={summaryTooltip
                            ? config.labels.copySuccessLabel
                            : config.labels.copySummaryLabel}
                    >
                        <IconButton
                            iconProps={{ iconName: "ClipboardList" }}
                            styles={{
                                root: { width: 28, height: 28 },
                                icon: { fontSize: 14 },
                            }}
                            ariaLabel={config.labels.copySummaryLabel}
                            onClick={handleCopySummary}
                        />
                    </TooltipHost>
                )}

                {/* Expand/collapse chevron */}
                {fieldCount > 0 && (
                    <Icon
                        iconName={expanded ? "ChevronUp" : "ChevronDown"}
                        className={chevronClass}
                    />
                )}
            </div>

            {/* Field changes — collapsible, with optional field filtering */}
            {expanded && (
                entry.changedFields.length > 0 ? (
                    <FieldChangesSection
                        entry={entry}
                        config={config}
                        displayNameMap={displayNameMap}
                        onRestore={onRestore}
                        onCopy={onCopy}
                        activeFieldFilter={activeFieldFilter}
                        showAllFields={showAllFields}
                        onToggleShowAll={() => setShowAllFields(!showAllFields)}
                    />
                ) : (
                    <div className={emptyChangesClass}>
                        Value changed (details not available)
                    </div>
                )
            )}
        </div>
    );
};

export const AuditTimeline: React.FC<IAuditTimelineProps> = ({
    entries,
    config,
    displayNameMap,
    onRestore,
    onCopy,
    activeFieldFilter,
}) => (
    <Stack>
        {entries.map((entry) => (
            <TimelineEntry
                key={entry.auditId}
                entry={entry}
                config={config}
                displayNameMap={displayNameMap}
                onRestore={onRestore}
                onCopy={onCopy}
                activeFieldFilter={activeFieldFilter}
            />
        ))}
    </Stack>
);
