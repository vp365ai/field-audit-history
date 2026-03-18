# TODO - Field Audit History

## ~~User-Friendly Audit Status Messages~~ ✅ Shipped in v3.4.4

Implemented in v3.4.4 — the control now detects and displays clear messages for each scenario:

1. ✅ Environment auditing not enabled → `getOrgAuditEnabled()`
2. ✅ Table auditing not enabled → `getEntityAuditEnabled()`
3. ✅ No fields have auditing enabled → empty attribute list detection
4. ✅ Auditing enabled but no audit records yet → lightweight record probe

All messages are configurable via the JSON web resource `labels` section.
