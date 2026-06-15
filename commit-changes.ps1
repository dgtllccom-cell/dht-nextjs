# commit-changes.ps1
# Run this script from the ACCOUNTS.DGT.LLC directory to commit all pending changes.
# Double-click or run: powershell -ExecutionPolicy Bypass -File commit-changes.ps1

Set-Location $PSScriptRoot

Write-Host "=== Staging all changes ===" -ForegroundColor Cyan
git add -A

Write-Host ""
Write-Host "=== Commit message ===" -ForegroundColor Cyan
$commitMsg = @"
feat: purchase booking simplification, account search fix, reversal auth fix

PURCHASE BOOKING REGISTER
- Remove ScopeRegisterPanel, SummaryCard widgets, overview/daily/general/branch tabs
- Remove Container Confirmation Report and Purchase Booking Financial Report sections
- Render ReportToolbar and main DarkTable list directly below filters
- Retain DetailDrawer for row click inspection

WIZARD STEP 4 REDESIGN
- Remove A4 white document print mockup from Step 4 (report tab)
- Add flat Booking Summary info grid, Cargo Specification Table
- Add Accounting Preview (debit/credit double-entry journal preview)
- Replace Save & Lock Remarks workflow with direct editable textarea
- Transfer Payment button immediately active without remark locking

ACCOUNT SEARCH DECOUPLING (BUG FIX)
- Decouple purchase/sales account search inputs from form.purchaseAccountNo/salesAccountNo
- Inputs now bound to purchaseSearch/salesSearch local state
- Typing raw text no longer overwrites stored account code or clears metadata cards
- Search input primed from account name on focus (not raw code)
- Account code only set when a valid account is confirmed via selection or lookup
- purchaseSearch/salesSearch cleared on form reset and synced on PO edit load

REVERSAL AUTHENTICATION FIX
- resolve: editing/deleting a Cash Entry throws "Authentication is required"
- The reverse_roznamcha_entry RPC calls assert_enterprise_scope_access which checks auth.uid()
- Service-role admin client returns null for auth.uid()
- Fix: inject actorId into Postgres session via set_config before calling the RPC
- The RPC now executes with a valid user identity from the ERP session

VISUAL POLISH
- Renamed A4 column header to Report in register table
- Updated transfer status badges: black (Transferred), red (Not Transferred)
- Unified both page routes (new order + register) to single interface
- Form hides on successful transfer showing only green success banner
- New Booking button resets wizard and smooth-scrolls to top
"@

git commit -m $commitMsg

Write-Host ""
Write-Host "=== Pushing to origin/main ===" -ForegroundColor Cyan
git push origin main

Write-Host ""
Write-Host "=== Done! ===" -ForegroundColor Green
Write-Host "All changes committed and pushed. The worktree blocking issue should now be resolved." -ForegroundColor Green
Read-Host "Press Enter to exit"
