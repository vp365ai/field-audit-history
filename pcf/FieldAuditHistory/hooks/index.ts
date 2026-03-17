// index.ts — Barrel exports for hooks

export { useEntityContext } from "./useEntityContext";
export { useAuditConfig } from "./useAuditConfig";
export type { UseAuditConfigReturn } from "./useAuditConfig";
export { usePortalInjection, shouldShowIcon } from "./usePortalInjection";
export type { PortalTarget } from "./usePortalInjection";
export { useDeepDive } from "./useDeepDive";
export type { DeepDiveState, UseDeepDiveReturn } from "./useDeepDive";
export { useQuickPeek } from "./useQuickPeek";
export type { QuickPeekState, UseQuickPeekReturn } from "./useQuickPeek";
export { loadAuditData } from "./loadAuditData";
export type { EntityContext, AuditLoadTarget, AuditLoadResult } from "./loadAuditData";
export { useRestore } from "./useRestore";
export type { RestoreState, UseRestoreReturn } from "./useRestore";
