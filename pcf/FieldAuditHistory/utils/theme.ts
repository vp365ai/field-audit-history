// theme.ts — Centralized color tokens for consistent styling

export const colors = {
    themePrimary: "#0078D4",
    neutralPrimary: "#323130",
    neutralSecondary: "#605E5C",
    neutralTertiary: "#A19F9D",
    neutralQuaternaryAlt: "#797775",
    neutralLight: "#EDEBE9",
    neutralLighter: "#F3F2F1",
    neutralLighterAlt: "#FAF9F8",
    white: "#FFFFFF",
    greenDark: "#107C10",
    redDark: "#D13438",
    orange: "#D83B01",
} as const;

/** Operation type → color for timeline dots, icons, and filter buttons */
export const operationColors: Record<number, string> = {
    1: colors.greenDark,   // Created
    2: colors.themePrimary, // Updated
    3: colors.redDark,      // Deleted
    4: colors.neutralQuaternaryAlt, // Accessed
};
