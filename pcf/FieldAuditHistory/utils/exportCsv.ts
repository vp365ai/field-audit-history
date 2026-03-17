// exportCsv.ts — CSV export and browser download for audit entries

import { IAuditEntry } from "../models/IAuditEntry";

/**
 * Escapes a CSV field value.
 * Wraps in double quotes if it contains commas, quotes, or newlines.
 */
function escapeCsv(value: string): string {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
}

/**
 * Converts audit entries to CSV format and triggers a browser download.
 * Columns: Date, User, Operation, Field, Old Value, New Value
 */
export function exportAuditCsv(entries: IAuditEntry[]): void {
    const header = "Date,User,Operation,Field,Old Value,New Value";
    const rows: string[] = [header];

    for (const entry of entries) {
        if (entry.changedFields.length === 0) {
            rows.push([
                escapeCsv(entry.changedOn.toLocaleString()),
                escapeCsv(entry.changedByName),
                escapeCsv(entry.operationLabel),
                "",
                "",
                "",
            ].join(","));
        } else {
            for (const change of entry.changedFields) {
                rows.push([
                    escapeCsv(entry.changedOn.toLocaleString()),
                    escapeCsv(entry.changedByName),
                    escapeCsv(entry.operationLabel),
                    escapeCsv(change.displayName || change.fieldName),
                    escapeCsv(change.oldValue ?? ""),
                    escapeCsv(change.newValue ?? ""),
                ].join(","));
            }
        }
    }

    const csvContent = rows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "audit-history.csv");
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
