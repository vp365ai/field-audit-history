# TODO - Field Audit History

## User-Friendly Audit Status Messages

The control should detect and display clear messages for each of these scenarios instead of showing nothing or a generic error:

### 1. Environment auditing not enabled
- **Detect:** Check org-level audit setting via `Xrm.Utility.getGlobalContext()` or Web API query to `organization` entity (`isauditenabled`)
- **Message:** "Auditing is not enabled for this environment. Go to Settings > Auditing > Global Audit Settings to enable it."
- **Test:** Unit test with mocked org settings returning `isauditenabled = false`

### 2. Table auditing not enabled
- **Detect:** Entity metadata `IsAuditEnabled` property is `false` for the current table
- **Message:** "Auditing is not enabled for this table. Enable it in table properties > 'Audit changes to its data'."
- **Test:** Unit test with mocked entity metadata returning `IsAuditEnabled = false`

### 3. No fields have auditing enabled
- **Detect:** After scanning field metadata, zero fields have `IsAuditEnabled = true`
- **Message:** "No fields on this table have auditing enabled. Enable auditing on individual columns in column properties."
- **Test:** Unit test with mocked field metadata where all fields return `IsAuditEnabled = false`

### 4. Auditing enabled but no audit records yet
- **Detect:** Audit API returns zero entries for this record
- **Message:** "Audit tracking is active but no changes have been recorded yet for this record."
- **Test:** Unit test with mocked audit API returning empty results

### Implementation notes
- All messages should be displayed in the status bar area (host field container)
- Messages should be informative, not alarming - the form works normally regardless
- Each scenario should have a corresponding unit test
- Consider making messages configurable via the JSON web resource (labels section)
