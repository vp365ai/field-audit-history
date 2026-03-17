// useEntityContext.ts — Extracts entityId/entityTypeName from PCF

import * as React from "react";
import { IInputs } from "../generated/ManifestTypes";
import { EntityContext } from "./loadAuditData";

interface IContextPage {
    page?: { entityId?: string; entityTypeName?: string };
}

/**
 * Extracts entityId and entityTypeName from the PCF context.
 * Returns null when not on a record form.
 *
 * Encapsulates the unsafe `context.page` access (not in PCF type defs)
 * in a single place.
 */
export function useEntityContext(
    context: ComponentFramework.Context<IInputs>
): EntityContext | null {
    return React.useMemo(() => {
        try {
            const page = (context as unknown as IContextPage).page;
            if (page?.entityId && page?.entityTypeName) {
                return {
                    entityId: page.entityId,
                    entityTypeName: page.entityTypeName,
                };
            }
        } catch {
            // Not on a record form
        }
        return null;
    }, [context]);
}
