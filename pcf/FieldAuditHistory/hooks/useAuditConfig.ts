// useAuditConfig.ts — Config loading and table config resolution

import * as React from "react";
import { IInputs } from "../generated/ManifestTypes";
import { DataverseService } from "../services/DataverseService";
import { IAuditConfig, ITableConfig, DEFAULT_CONFIG } from "../models/IConfig";
import { EntityContext } from "./loadAuditData";

export interface UseAuditConfigReturn {
    config: IAuditConfig;
    tableConfig: ITableConfig;
    displayNameMap: Record<string, string>;
    auditedFields: Set<string> | null;
    metadataLoading: boolean;
}

/**
 * Loads the config web resource, resolves per-table config,
 * fetches audit-enabled attributes, and builds the display name map.
 * All loading happens on mount in parallel.
 */
export function useAuditConfig(
    context: ComponentFramework.Context<IInputs>,
    entityContext: EntityContext | null,
    service: DataverseService,
): UseAuditConfigReturn {
    const [config, setConfig] = React.useState<IAuditConfig>(DEFAULT_CONFIG);
    const [tableConfig, setTableConfig] = React.useState<ITableConfig>({
        mode: "audited",
        fields: [],
    });
    const [displayNameMap, setDisplayNameMap] = React.useState<
        Record<string, string>
    >({});
    const [auditedFields, setAuditedFields] = React.useState<Set<
        string
    > | null>(null);
    const [metadataLoading, setMetadataLoading] = React.useState(true);

    React.useEffect(() => {
        if (!entityContext) {
            setMetadataLoading(false);
            return;
        }

        let cancelled = false;

        void (async () => {
            try {
                const configName =
                    context.parameters.configWebResourceName?.raw;
                const [loadedConfig, fields] = await Promise.all([
                    configName
                        ? service.loadConfig(context.webAPI, configName)
                        : Promise.resolve(DEFAULT_CONFIG),
                    service.getAuditEnabledAttributes(
                        entityContext.entityTypeName
                    ),
                ]);

                if (cancelled) return;

                setConfig(loadedConfig);

                const resolved = DataverseService.resolveTableConfig(
                    loadedConfig,
                    entityContext.entityTypeName
                );
                setTableConfig(resolved);

                setDisplayNameMap(service.getAttributeDisplayNames());

                if (fields !== null) {
                    setAuditedFields(new Set(fields));
                } else {
                    setAuditedFields(null);
                }
            } catch {
                if (!cancelled) {
                    setAuditedFields(null);
                }
            } finally {
                if (!cancelled) {
                    setMetadataLoading(false);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [entityContext, context, service]);

    return { config, tableConfig, displayNameMap, auditedFields, metadataLoading };
}
