// index.ts — PCF lifecycle entry point (virtual React control)

import { IInputs, IOutputs } from "./generated/ManifestTypes";
import { AuditHistoryApp, IAuditHistoryAppProps } from "./components/AuditHistoryApp";
import * as React from "react";

export class FieldAuditHistory
    implements ComponentFramework.ReactControl<IInputs, IOutputs>
{
    /**
     * Reference to the PCF context — provides access to parameters,
     * webAPI, page info, and control metadata.
     */
    private _context: ComponentFramework.Context<IInputs> | null = null;

    constructor() {
        // No initialization needed — all setup happens in init()
    }

    /**
     * Called once when the control is loaded on the form.
     * Stores the context reference for use in updateView().
     *
     * @param context - PCF context with parameters and platform APIs
     * @param notifyOutputChanged - Callback to notify the platform of output changes
     *                              (not used — we don't modify the host field)
     * @param state - Saved state from previous session (not used)
     */
    public init(
        context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
        state: ComponentFramework.Dictionary
    ): void {
        this._context = context;
        // notifyOutputChanged and state are not used in this control.
        // We don't modify the bound field value — it's just a host.
    }

    /**
     * Called by the platform whenever the control should re-render.
     * Returns a React element that the platform renders in its React tree.
     *
     * WHAT WE PASS TO THE REACT COMPONENT:
     * - context: full PCF context (for webAPI, page info, parameters)
     * - hostFieldLogicalName: the logical name of the field this control
     *   is bound to, so the component can exclude it from icon injection
     *
     * HOW WE GET THE HOST FIELD NAME:
     * PCF provides field metadata via context.parameters.boundField.attributes.
     * This is not in the official type definitions, so we use a type assertion.
     * The attributes object contains LogicalName, DisplayName, Type, etc.
     */
    public updateView(
        context: ComponentFramework.Context<IInputs>
    ): React.ReactElement {
        this._context = context;

        // Extract the host field's logical name from bound field metadata.
        // This allows the React component to skip injecting an icon on the
        // host field itself (since we're rendering the status indicator there).
        const boundParams = context.parameters.boundField as unknown as
            { attributes?: { LogicalName?: string } } | undefined;
        const hostFieldLogicalName = boundParams?.attributes?.LogicalName ?? "";

        const props: IAuditHistoryAppProps = {
            context,
            hostFieldLogicalName,
        };

        return React.createElement(AuditHistoryApp, props);
    }

    /**
     * Returns the control's output values.
     *
     * We return an empty object because this control does not modify
     * the host field's value. The host field is purely a container
     * for the PCF control to exist on the form.
     *
     * Returning {} (instead of { boundField: undefined }) ensures
     * the platform doesn't clear the host field's existing value.
     */
    public getOutputs(): IOutputs {
        return {};
    }

    /**
     * Called when the control is removed from the form.
     * React handles portal cleanup automatically when components unmount.
     * The MutationObserver disconnection and DOM cleanup are handled
     * by the useEffect cleanup in AuditHistoryApp.
     */
    public destroy(): void {
        // React unmount handles all cleanup via useEffect return functions.
        // No additional cleanup needed here.
    }
}
