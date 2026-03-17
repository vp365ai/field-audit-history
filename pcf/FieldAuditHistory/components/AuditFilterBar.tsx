// AuditFilterBar.tsx — Client-side filter bar for the audit panel
import * as React from "react";
import {
    Stack,
    ComboBox,
    IComboBox,
    IComboBoxOption,
    DatePicker,
    DefaultButton,
    IconButton,
    Text,
    mergeStyles,
} from "@fluentui/react";
import { IAuditEntry } from "../models/IAuditEntry";
import { IAuditConfig, IFilterState } from "../models/IConfig";
import { colors } from "../utils/theme";

export interface IAuditFilterBarProps {
    /** All loaded entries (used to populate filter options) */
    entries: IAuditEntry[];

    /** Current filter state */
    filterState: IFilterState;

    /** Called when any filter changes */
    onFilterChange: (filters: IFilterState) => void;

    /** Number of entries after filtering */
    filteredCount: number;

    /** Total entries loaded (before filtering) */
    totalLoaded: number;

    /** Map of field logical name → display name for human-readable labels */
    displayNameMap?: Record<string, string>;

    /** Config for operation labels */
    config?: IAuditConfig;
}

const OP_COLORS: Record<number, string> = {
    1: colors.greenDark,
    2: colors.themePrimary,
};

const DEFAULT_OP_LABELS: Record<number, string> = {
    1: "Created",
    2: "Updated",
};

const filterContainerClass = mergeStyles({
    padding: "8px 0",
    borderBottom: `1px solid ${colors.neutralLight}`,
    marginBottom: 8,
});

const filterRowClass = mergeStyles({
    display: "flex",
    flexWrap: "wrap",
    gap: "12px",
    alignItems: "flex-end",
});

const filterItemClass = mergeStyles({
    minWidth: 160,
    flex: "1 1 160px",
    maxWidth: 240,
});

const dateItemClass = mergeStyles({
    minWidth: 140,
    flex: "1 1 140px",
    maxWidth: 180,
});

const headerRowClass = mergeStyles({
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
});

const countTextClass = mergeStyles({
    fontSize: 12,
    color: colors.neutralSecondary,
});

const opButtonBase = mergeStyles({
    minWidth: 0,
    padding: "2px 10px",
    fontSize: 12,
    height: 28,
    borderRadius: 14,
    border: `1px solid ${colors.neutralLight}`,
    cursor: "pointer",
});

const opButtonRow = mergeStyles({
    display: "flex",
    gap: "6px",
    alignItems: "center",
    flexWrap: "wrap",
});

export const AuditFilterBar: React.FC<IAuditFilterBarProps> = ({
    entries,
    filterState,
    onFilterChange,
    filteredCount,
    totalLoaded,
    displayNameMap,
    config,
}) => {
    const [expanded, setExpanded] = React.useState(true);

    // Build operation buttons from config labels (fall back to defaults)
    // Only Created and Updated — Deleted is not a field-level event
    const operations = React.useMemo(() => [
        { key: 1, label: config?.labels.createdLabel ?? DEFAULT_OP_LABELS[1], color: OP_COLORS[1] },
        { key: 2, label: config?.labels.updatedLabel ?? DEFAULT_OP_LABELS[2], color: OP_COLORS[2] },
    ], [config]);

    const clearedLabel = config?.labels.clearedLabel ?? "Cleared";

    // Build unique field options from loaded entries, using display names when available
    const fieldOptions: IComboBoxOption[] = React.useMemo(() => {
        const fieldMap = new Map<string, string>();
        entries.forEach((entry) => {
            entry.changedFields.forEach((change) => {
                if (!fieldMap.has(change.fieldName)) {
                    const label = (displayNameMap?.[change.displayName]
                        ?? displayNameMap?.[change.fieldName]
                        ?? change.displayName)
                        || change.fieldName;
                    fieldMap.set(change.fieldName, label);
                }
            });
        });
        return Array.from(fieldMap.entries())
            .sort((a, b) => a[1].localeCompare(b[1]))
            .map(([key, text]) => ({ key, text }));
    }, [entries, displayNameMap]);

    // Build unique user options from loaded entries
    const userOptions: IComboBoxOption[] = React.useMemo(() => {
        const users = new Set<string>();
        entries.forEach((entry) => {
            if (entry.changedByName && entry.changedByName !== "Unknown") {
                users.add(entry.changedByName);
            }
        });
        return Array.from(users)
            .sort()
            .map((name) => ({ key: name, text: name }));
    }, [entries]);

    // Check if any filters are active
    const hasActiveFilters =
        filterState.selectedFields.length > 0 ||
        filterState.selectedUsers.length > 0 ||
        filterState.selectedOperations.length > 0 ||
        filterState.showClearedOnly ||
        filterState.dateFrom !== null ||
        filterState.dateTo !== null;

    const handleFieldChange = React.useCallback(
        (_ev: React.FormEvent<IComboBox>, option?: IComboBoxOption) => {
            if (!option) return;
            const key = option.key as string;
            const selected = option.selected
                ? [...filterState.selectedFields, key]
                : filterState.selectedFields.filter((f) => f !== key);
            onFilterChange({ ...filterState, selectedFields: selected });
        },
        [filterState, onFilterChange]
    );

    const handleUserChange = React.useCallback(
        (_ev: React.FormEvent<IComboBox>, option?: IComboBoxOption) => {
            if (!option) return;
            const key = option.key as string;
            const selected = option.selected
                ? [...filterState.selectedUsers, key]
                : filterState.selectedUsers.filter((u) => u !== key);
            onFilterChange({ ...filterState, selectedUsers: selected });
        },
        [filterState, onFilterChange]
    );

    const toggleOperation = React.useCallback(
        (opKey: number) => {
            const ops = filterState.selectedOperations;
            const selected = ops.includes(opKey)
                ? ops.filter((o) => o !== opKey)
                : [...ops, opKey];
            onFilterChange({ ...filterState, selectedOperations: selected });
        },
        [filterState, onFilterChange]
    );

    const toggleCleared = React.useCallback(() => {
        onFilterChange({ ...filterState, showClearedOnly: !filterState.showClearedOnly });
    }, [filterState, onFilterChange]);

    const handleDateFrom = React.useCallback(
        (date: Date | null | undefined) => {
            onFilterChange({ ...filterState, dateFrom: date ?? null });
        },
        [filterState, onFilterChange]
    );

    const handleDateTo = React.useCallback(
        (date: Date | null | undefined) => {
            onFilterChange({ ...filterState, dateTo: date ?? null });
        },
        [filterState, onFilterChange]
    );

    const handleClearFilters = React.useCallback(() => {
        onFilterChange({
            selectedFields: [],
            selectedUsers: [],
            selectedOperations: [],
            showClearedOnly: false,
            dateFrom: null,
            dateTo: null,
        });
    }, [onFilterChange]);

    return (
        <div className={filterContainerClass}>
            {/* Header row: toggle + count + clear */}
            <div className={headerRowClass}>
                <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 6 }}>
                    <IconButton
                        iconProps={{
                            iconName: expanded ? "ChevronUp" : "ChevronDown",
                        }}
                        onClick={() => setExpanded(!expanded)}
                        styles={{
                            root: { height: 24, width: 24 },
                            icon: { fontSize: 12 },
                        }}
                        ariaLabel={expanded ? "Collapse filters" : "Expand filters"}
                    />
                    <Text styles={{ root: { fontWeight: 600, fontSize: 13 } }}>
                        Filters
                    </Text>
                    {hasActiveFilters && (
                        <Text className={countTextClass}>
                            Showing {filteredCount} of {totalLoaded}
                        </Text>
                    )}
                </Stack>
                {hasActiveFilters && (
                    <DefaultButton
                        text="Clear"
                        onClick={handleClearFilters}
                        styles={{
                            root: { height: 26, minWidth: 0, padding: "0 10px", fontSize: 12 },
                        }}
                    />
                )}
            </div>

            {/* Filter controls */}
            {expanded && (
                <div className={filterRowClass}>
                    {/* Field filter — searchable ComboBox */}
                    {fieldOptions.length > 0 && (
                        <div className={filterItemClass}>
                            <ComboBox
                                placeholder="Type to search fields..."
                                label="Field"
                                multiSelect
                                allowFreeform
                                autoComplete="on"
                                options={fieldOptions}
                                selectedKey={filterState.selectedFields}
                                onChange={handleFieldChange}
                                styles={{
                                    root: { minWidth: 140 },
                                    label: { fontSize: 12, fontWeight: 400 },
                                }}
                            />
                        </div>
                    )}

                    {/* User filter — searchable ComboBox */}
                    {userOptions.length > 0 && (
                        <div className={filterItemClass}>
                            <ComboBox
                                placeholder="Type to search users..."
                                label="Changed By"
                                multiSelect
                                allowFreeform
                                autoComplete="on"
                                options={userOptions}
                                selectedKey={filterState.selectedUsers}
                                onChange={handleUserChange}
                                styles={{
                                    root: { minWidth: 140 },
                                    label: { fontSize: 12, fontWeight: 400 },
                                }}
                            />
                        </div>
                    )}

                    {/* Operation toggles — Created, Updated, Cleared */}
                    <div>
                        <Text styles={{ root: { fontSize: 12, display: "block", marginBottom: 2 } }}>
                            Operation
                        </Text>
                        <div className={opButtonRow}>
                            {operations.map((op) => {
                                const isActive =
                                    filterState.selectedOperations.length === 0 ||
                                    filterState.selectedOperations.includes(op.key);
                                return (
                                    <button
                                        key={op.key}
                                        className={opButtonBase}
                                        onClick={() => toggleOperation(op.key)}
                                        style={{
                                            backgroundColor: isActive ? op.color : colors.white,
                                            color: isActive ? colors.white : colors.neutralSecondary,
                                            borderColor: isActive ? op.color : colors.neutralLight,
                                        }}
                                        title={op.label}
                                    >
                                        {op.label}
                                    </button>
                                );
                            })}
                            {/* Cleared toggle — Updated entries where new value is empty */}
                            <button
                                className={opButtonBase}
                                onClick={toggleCleared}
                                style={{
                                    backgroundColor: filterState.showClearedOnly ? colors.orange : colors.white,
                                    color: filterState.showClearedOnly ? colors.white : colors.neutralSecondary,
                                    borderColor: filterState.showClearedOnly ? colors.orange : colors.neutralLight,
                                }}
                                title={`${clearedLabel} — show only changes where a value was cleared`}
                            >
                                {clearedLabel}
                            </button>
                        </div>
                    </div>

                    {/* Date range */}
                    <div className={dateItemClass}>
                        <DatePicker
                            label="From"
                            value={filterState.dateFrom ?? undefined}
                            onSelectDate={handleDateFrom}
                            styles={{
                                root: { minWidth: 120 },
                                textField: { label: { fontSize: 12, fontWeight: 400 } },
                            }}
                        />
                    </div>
                    <div className={dateItemClass}>
                        <DatePicker
                            label="To"
                            value={filterState.dateTo ?? undefined}
                            onSelectDate={handleDateTo}
                            styles={{
                                root: { minWidth: 120 },
                                textField: { label: { fontSize: 12, fontWeight: 400 } },
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
