// AuditIcon.tsx — History icon injected via React Portal
import * as React from "react";
import { IconButton, TooltipHost } from "@fluentui/react";
import { colors } from "../utils/theme";

export interface IAuditIconProps {
    /** The logical name of the field this icon is next to */
    fieldLogicalName: string;

    /** Human-readable display name from the field label */
    fieldDisplayName: string;

    /** Tooltip text — configurable via IConfig.display.iconTooltip */
    tooltip: string;

    /** Called when the user clicks the icon — passes field name + anchor element */
    onClick: (fieldLogicalName: string, anchorElement: HTMLElement) => void;
}

const auditIconButtonStyles = {
    root: {
        height: 20,
        width: 20,
        padding: 0,
        marginLeft: 4,
        verticalAlign: "middle",
        backgroundColor: "transparent",
        border: "none",
    },
    rootHovered: {
        backgroundColor: colors.neutralLighter,
        borderRadius: "2px",
    },
    rootPressed: {
        backgroundColor: colors.neutralLight,
    },
    icon: {
        fontSize: 12,
        color: colors.neutralTertiary,
    },
    iconHovered: {
        color: colors.themePrimary,
    },
};

export const AuditIcon: React.FC<IAuditIconProps> = ({
    fieldLogicalName,
    fieldDisplayName,
    tooltip,
    onClick,
}) => {
    const handleClick = React.useCallback(
        (ev: React.MouseEvent<HTMLButtonElement>) => {
            ev.stopPropagation();
            ev.preventDefault();
            onClick(fieldLogicalName, ev.currentTarget as HTMLElement);
        },
        [fieldLogicalName, onClick]
    );

    return (
        <TooltipHost content={`${tooltip}: ${fieldDisplayName}`}>
            <IconButton
                iconProps={{ iconName: "History" }}
                styles={auditIconButtonStyles}
                onClick={handleClick}
                ariaLabel={`${tooltip} for ${fieldDisplayName}`}
            />
        </TooltipHost>
    );
};
