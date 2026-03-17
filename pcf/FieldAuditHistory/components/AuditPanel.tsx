// AuditPanel.tsx — Sidecar panel with timeline, filters, pagination
import * as React from "react";
import {
    Panel,
    PanelType,
    Spinner,
    SpinnerSize,
    MessageBar,
    MessageBarType,
    DefaultButton,
    Stack,
    Text,
    Link,
} from "@fluentui/react";
import { IAuditEntry, IFieldChange } from "../models/IAuditEntry";
import { IAuditConfig, IFilterState } from "../models/IConfig";
import { AuditTimeline } from "./AuditTimeline";
import { AuditFilterBar } from "./AuditFilterBar";
import { colors } from "../utils/theme";

export interface IAuditPanelProps {
    isOpen: boolean;
    onDismiss: () => void;
    /** All loaded entries (before filtering) */
    entries: IAuditEntry[];
    /** Entries after client-side filtering */
    filteredEntries: IAuditEntry[];
    loading: boolean;
    loadingMore: boolean;
    error: string | null;
    /** Total records available on the server */
    totalCount: number;
    moreRecords: boolean;
    onLoadMore: () => void;
    onRetry: () => void;
    title: string;
    config: IAuditConfig;
    /** Current filter state */
    filterState: IFilterState;
    /** Called when filters change */
    onFilterChange: (filters: IFilterState) => void;
    /** Map of field logical name → display name for human-readable labels */
    displayNameMap?: Record<string, string>;
    /** Current panel mode: "record" (all fields) or "field" (single field) */
    mode?: "record" | "field";
    /** Display name of the field when in field mode (for "Back to X" link) */
    fieldDisplayName?: string;
    /** Called to switch from field mode → record mode */
    onViewAllFields?: () => void;
    /** Called to switch from record mode → field mode (back to original field) */
    onViewField?: () => void;
    /** Called when user clicks Restore on a field change */
    onRestore?: (change: IFieldChange) => void;
    /** Called when user copies a value */
    onCopy?: (value: string) => void;
    /** Called when user clicks Export CSV */
    onExport?: () => void;
}

export const AuditPanel: React.FC<IAuditPanelProps> = ({
    isOpen,
    onDismiss,
    entries,
    filteredEntries,
    loading,
    loadingMore,
    error,
    totalCount,
    moreRecords,
    onLoadMore,
    onRetry,
    title,
    config,
    filterState,
    onFilterChange,
    displayNameMap,
    mode,
    fieldDisplayName,
    onViewAllFields,
    onViewField,
    onRestore,
    onCopy,
    onExport,
}) => {
    const hasActiveFilters =
        filterState.selectedFields.length > 0 ||
        filterState.selectedUsers.length > 0 ||
        filterState.selectedOperations.length > 0 ||
        filterState.showClearedOnly ||
        filterState.dateFrom !== null ||
        filterState.dateTo !== null;

    return (
        <Panel
            isOpen={isOpen}
            onDismiss={onDismiss}
            type={PanelType.custom}
            customWidth={config.display.panelWidth}
            headerText={title}
            isLightDismiss
        >
            <Stack tokens={{ childrenGap: 12, padding: "12px 0 24px 0" }}>
                {/* Count summary + mode toggle + export */}
                {totalCount > 0 && (
                    <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 12 }}>
                        <Text styles={{ root: { color: colors.neutralSecondary, fontSize: 12 } }}>
                            {hasActiveFilters
                                ? `Showing ${filteredEntries.length} of ${entries.length} loaded (${totalCount} total recorded)`
                                : `${totalCount} change${totalCount !== 1 ? "s" : ""} recorded`}
                        </Text>
                        {mode === "field" && onViewAllFields && (
                            <Link
                                onClick={onViewAllFields}
                                styles={{ root: { fontSize: 12 } }}
                            >
                                View all fields
                            </Link>
                        )}
                        {mode === "record" && onViewField && fieldDisplayName && (
                            <Link
                                onClick={onViewField}
                                styles={{ root: { fontSize: 12 } }}
                            >
                                Back to {fieldDisplayName}
                            </Link>
                        )}
                        {config.features.allowExport && onExport && filteredEntries.length > 0 && (
                            <Link
                                onClick={onExport}
                                styles={{ root: { fontSize: 12, marginLeft: "auto" } }}
                            >
                                {config.labels.exportButtonLabel}
                            </Link>
                        )}
                    </Stack>
                )}

                {/* Mode toggle when no entries yet (loading or empty) */}
                {totalCount === 0 && !loading && mode === "field" && onViewAllFields && (
                    <Link
                        onClick={onViewAllFields}
                        styles={{ root: { fontSize: 12 } }}
                    >
                        View all fields
                    </Link>
                )}

                {/* Filter bar */}
                {config.display.showFilters && !loading && entries.length > 0 && (
                    <AuditFilterBar
                        entries={entries}
                        filterState={filterState}
                        onFilterChange={onFilterChange}
                        filteredCount={filteredEntries.length}
                        totalLoaded={entries.length}
                        displayNameMap={displayNameMap}
                        config={config}
                    />
                )}

                {/* Error */}
                {error && (
                    <MessageBar
                        messageBarType={MessageBarType.error}
                        isMultiline
                        actions={
                            <DefaultButton onClick={onRetry}>Retry</DefaultButton>
                        }
                    >
                        {error}
                    </MessageBar>
                )}

                {/* Loading spinner */}
                {loading && (
                    <Stack
                        horizontalAlign="center"
                        tokens={{ padding: "40px 0" }}
                    >
                        <Spinner
                            size={SpinnerSize.large}
                            label="Loading audit history..."
                        />
                    </Stack>
                )}

                {/* Empty state */}
                {!loading && !error && entries.length === 0 && (
                    <MessageBar messageBarType={MessageBarType.info}>
                        {config.labels.noRecordsMessage}
                    </MessageBar>
                )}

                {/* No filter results */}
                {!loading && entries.length > 0 && filteredEntries.length === 0 && hasActiveFilters && (
                    <MessageBar messageBarType={MessageBarType.info}>
                        No entries match the current filters.
                    </MessageBar>
                )}

                {/* Timeline — uses filtered entries */}
                {!loading && filteredEntries.length > 0 && (
                    <AuditTimeline
                        entries={filteredEntries}
                        config={config}
                        displayNameMap={displayNameMap}
                        onRestore={onRestore}
                        onCopy={onCopy}
                        activeFieldFilter={filterState.selectedFields.length > 0 ? filterState.selectedFields : undefined}
                    />
                )}

                {/* Loading more spinner */}
                {loadingMore && (
                    <Stack horizontalAlign="center" tokens={{ padding: "12px 0" }}>
                        <Spinner size={SpinnerSize.small} label="Loading more..." />
                    </Stack>
                )}

                {/* Load more button */}
                {!loading && !loadingMore && moreRecords && (
                    <Stack horizontalAlign="center" tokens={{ padding: "8px 0" }}>
                        <DefaultButton
                            text={config.labels.loadMoreButton}
                            onClick={onLoadMore}
                        />
                    </Stack>
                )}
            </Stack>
        </Panel>
    );
};
