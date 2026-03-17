// usePortalInjection.ts — DOM scanning and portal injection

import * as React from "react";
import { ITableConfig } from "../models/IConfig";
import { EntityContext } from "./loadAuditData";

const PORTAL_MARKER_ATTR = "data-audit-portal";
const MUTATION_DEBOUNCE_MS = 500;
const INITIAL_SCAN_DELAY_MS = 800;

export interface PortalTarget {
    fieldLogicalName: string;
    fieldDisplayName: string;
    portalElement: HTMLSpanElement;
}

export function shouldShowIcon(
    fieldName: string,
    tableConfig: ITableConfig,
    auditedFields: Set<string> | null,
): boolean {
    switch (tableConfig.mode) {
        case "include":
            return tableConfig.fields.includes(fieldName);
        case "exclude":
            if (tableConfig.fields.includes(fieldName)) return false;
            return auditedFields === null || auditedFields.has(fieldName);
        case "all":
            return true;
        case "audited":
        default:
            return auditedFields === null || auditedFields.has(fieldName);
    }
}

export function usePortalInjection(
    hostFieldLogicalName: string,
    tableConfig: ITableConfig,
    auditedFields: Set<string> | null,
    metadataLoading: boolean,
    entityContext: EntityContext | null,
): { portalTargets: PortalTarget[] } {
    const portalContainersRef = React.useRef<Map<string, HTMLSpanElement>>(
        new Map()
    );
    const scanFnRef = React.useRef<() => void>(() => undefined);
    const debounceTimerRef = React.useRef<number>(0);

    const [portalTargets, setPortalTargets] = React.useState<PortalTarget[]>(
        []
    );

    const shouldShowIconCb = React.useCallback(
        (fieldName: string): boolean =>
            shouldShowIcon(fieldName, tableConfig, auditedFields),
        [tableConfig, auditedFields]
    );

    const scanFormForFields = React.useCallback(() => {
        const currentContainers = portalContainersRef.current;
        const newTargets: PortalTarget[] = [];
        let hasNewInjections = false;

        const GUID_LABEL_ID_REGEX =
            /^id-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-\d+-(.+)-field-label$/i;

        const processField = (
            fieldName: string,
            displayName: string,
            anchorElement: Element
        ): void => {
            if (fieldName === hostFieldLogicalName) return;

            if (currentContainers.has(fieldName)) {
                const existing = currentContainers.get(fieldName);
                if (existing && document.body.contains(existing)) {
                    newTargets.push({
                        fieldLogicalName: fieldName,
                        fieldDisplayName: displayName,
                        portalElement: existing,
                    });
                    return;
                }
                currentContainers.delete(fieldName);
            }

            if (!shouldShowIconCb(fieldName)) return;

            if (
                anchorElement.querySelector(
                    `[${PORTAL_MARKER_ATTR}="${fieldName}"]`
                )
            ) {
                return;
            }

            const portalSpan = document.createElement("span");
            portalSpan.setAttribute(PORTAL_MARKER_ATTR, fieldName);
            portalSpan.style.display = "inline-flex";
            portalSpan.style.alignItems = "center";
            portalSpan.style.verticalAlign = "middle";

            anchorElement.appendChild(portalSpan);
            currentContainers.set(fieldName, portalSpan);

            newTargets.push({
                fieldLogicalName: fieldName,
                fieldDisplayName: displayName,
                portalElement: portalSpan,
            });

            hasNewInjections = true;
        };

        // Strategy 1 (PRIMARY): <label> elements with GUID-prefixed id
        const labelElements = document.querySelectorAll(
            'label[id$="-field-label"]'
        );
        labelElements.forEach((label) => {
            const id = label.id;
            const match = GUID_LABEL_ID_REGEX.exec(id);
            if (!match) return;
            const fieldName = match[1];
            if (!fieldName) return;
            const displayName = label.textContent?.trim() ?? fieldName;
            const labelWrapper = label.parentElement;
            if (!labelWrapper) return;
            processField(fieldName, displayName, labelWrapper);
        });

        // Strategy 2 (FALLBACK): data-id containers
        const labelContainers = document.querySelectorAll(
            '[data-id$="-field-label"]'
        );
        labelContainers.forEach((container) => {
            const dataId = container.getAttribute("data-id") ?? "";
            const fieldName = dataId.replace(/-field-label$/, "");
            if (!fieldName) return;

            if (currentContainers.has(fieldName)) {
                const existing = currentContainers.get(fieldName);
                if (existing && document.body.contains(existing)) {
                    const alreadyTargeted = newTargets.some(
                        (t) => t.fieldLogicalName === fieldName
                    );
                    if (!alreadyTargeted) {
                        const label = container.querySelector("label");
                        newTargets.push({
                            fieldLogicalName: fieldName,
                            fieldDisplayName:
                                label?.textContent?.trim() ?? fieldName,
                            portalElement: existing,
                        });
                    }
                }
                return;
            }

            const label = container.querySelector("label");
            const displayName = label?.textContent?.trim() ?? fieldName;
            processField(fieldName, displayName, container);
        });

        if (hasNewInjections || newTargets.length !== portalTargets.length) {
            setPortalTargets(newTargets);
        }
    }, [shouldShowIconCb, hostFieldLogicalName, portalTargets.length]);

    scanFnRef.current = scanFormForFields;

    React.useEffect(() => {
        if (metadataLoading || !entityContext) return;

        const debouncedScan = (): void => {
            window.clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = window.setTimeout(() => {
                scanFnRef.current();
            }, MUTATION_DEBOUNCE_MS);
        };

        const initialTimer = window.setTimeout(() => {
            scanFnRef.current();
        }, INITIAL_SCAN_DELAY_MS);

        const observer = new MutationObserver(debouncedScan);

        const formBody =
            document.querySelector('[data-id="form-body"]') ??
            document.querySelector('[data-id="editFormRoot"]') ??
            document.body;

        observer.observe(formBody, {
            childList: true,
            subtree: true,
        });

        return () => {
            observer.disconnect();
            window.clearTimeout(initialTimer);
            window.clearTimeout(debounceTimerRef.current);

            document
                .querySelectorAll(`[${PORTAL_MARKER_ATTR}]`)
                .forEach((el) => {
                    el.remove();
                });

            portalContainersRef.current.clear();
        };
    }, [metadataLoading, entityContext]);

    return { portalTargets };
}
