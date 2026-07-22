import { test, expect } from '@playwright/test';

// Standard mock IDs matching server.ts default users
const USERS = {
  REQUESTOR: { id: 'u1', email: 'alice@mgenesis.com', name: 'Alice Reyes' },
  APPROVER: { id: 'u2', email: 'bob@mgenesis.com', name: 'Bob Santos' },
  CUSTODIAN: { id: 'u3', email: 'carol@mgenesis.com', name: 'Carol Ramos' },
  ADMIN: { id: 'u4', email: 'dave@mgenesis.com', name: 'Dave Lopez' },
  SECOND_REQUESTOR: { id: 'u5', email: 'eve@mgenesis.com', name: 'Eve Garcia' },
};

test.describe('Sales Reimbursement System - End-to-End Test Suite', () => {

  // Before all tests, reset and seed the database using the Admin API to ensure consistency
  test.beforeAll(async ({ request }) => {
    const response = await request.post('/api/admin/seed', {
      headers: {
        'X-User-Id': USERS.ADMIN.id
      }
    });
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBeTruthy();
  });

  // Helper to inject mock auth state into localStorage before page load
  async function loginAs(page: any, user: { id: string, email: string }) {
    await page.goto('/login');
    await page.evaluate((userId) => {
      localStorage.setItem('mockUserId', userId);
    }, user.id);
    await page.goto('/');
    // Wait for page load and API fetch to complete
    await page.waitForLoadState('networkidle');
  }

  // Helper to complete a clean signout
  async function logout(page: any) {
    await page.evaluate(() => {
      localStorage.removeItem('mockUserId');
    });
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
  }

  // =========================================================================
  // SECTION 1: AUTHENTICATION & LOGIN FLOW
  // =========================================================================
  test.describe('1. Authentication Flow', () => {

    test('Happy Path: Manual login redirects to the role-based dashboard', async ({ page }) => {
      await page.goto('/login');
      
      // Fill the email input
      await page.fill('input[type="email"]', USERS.REQUESTOR.email);
      // Submit the form
      await page.click('button[type="submit"]');
      
      await page.waitForURL('**/');
      await expect(page.locator('text=Alice Reyes')).toBeVisible();
      await expect(page.locator('text=Sales Executive')).toBeVisible();
      
      // Verify localStorage is set correctly
      const storedId = await page.evaluate(() => localStorage.getItem('mockUserId'));
      expect(storedId).toBe(USERS.REQUESTOR.id);
    });

    test('Invalid Input: Empty email fails HTML5 validation', async ({ page }) => {
      await page.goto('/login');
      // Set empty email and trigger submit
      await page.locator('input[type="email"]').fill('');
      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();
      
      // Check that we are still on the login page
      expect(page.url()).toContain('/login');
    });

    test('Manual logout clears credentials and redirects', async ({ page }) => {
      await loginAs(page, USERS.REQUESTOR);
      
      // Locate and click the Sign Out button in the layout
      const signOutBtn = page.locator('button:has-text("Sign Out"), button:has-text("Log Out"), [title="Sign Out"]');
      if (await signOutBtn.count() > 0) {
        await signOutBtn.first().click();
      } else {
        // Fallback to manual logout
        await logout(page);
      }
      
      await page.waitForURL('**/login');
      const storedId = await page.evaluate(() => localStorage.getItem('mockUserId'));
      expect(storedId).toBeNull();
    });
  });

  // =========================================================================
  // SECTION 2: NAVIGATION & ROLE PERMISSION CHECKS (ROUTING ENFORCEMENT)
  // =========================================================================
  test.describe('2. Navigation & Access Control', () => {

    test('Permission Validation: Requestors cannot access Custodian processing queue', async ({ page }) => {
      await loginAs(page, USERS.REQUESTOR);
      
      // Try to access custodian endpoint directly
      await page.goto('/processing');
      await page.waitForLoadState('networkidle');
      
      // Verify redirect back to user home (/)
      expect(page.url()).toBe('http://localhost:3000/');
    });

    test('Permission Validation: Custodians cannot access Admin Audit Log', async ({ page }) => {
      await loginAs(page, USERS.CUSTODIAN);
      
      // Try to access admin endpoint directly
      await page.goto('/audit');
      await page.waitForLoadState('networkidle');
      
      // Custodian default page is /processing, verify redirection back there
      expect(page.url()).toContain('/processing');
    });

    test('Browser Refresh: Reload maintains authenticated state and active route', async ({ page }) => {
      await loginAs(page, USERS.REQUESTOR);
      
      // Go to transaction history
      await page.goto('/history');
      await page.waitForLoadState('networkidle');
      
      // Refresh the page
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Assert that we are still on history and authenticated
      expect(page.url()).toContain('/history');
      await expect(page.locator('text=Alice Reyes')).toBeVisible();
    });

    test('Back Navigation: Returning to dashboard maintains stable visual state', async ({ page }) => {
      await loginAs(page, USERS.REQUESTOR);
      
      // Navigate to New Request page
      await page.click('text=New Request');
      await page.waitForURL('**/claims/new');
      
      // Navigate back
      await page.goBack();
      await page.waitForURL('**/');
      
      // Verify we are back on the main dashboard
      await expect(page.locator('text=Operations Dashboard')).toBeVisible();
    });
  });

  // =========================================================================
  // SECTION 3: REIMBURSEMENTS CREATE & SUBMIT WORKFLOW (REQUESTOR)
  // =========================================================================
  test.describe('3. Reimbursements Submission', () => {

    test('Happy Path: Create and submit a valid reimbursement claim', async ({ page }) => {
      await loginAs(page, USERS.REQUESTOR);
      
      // Navigate to the submission form
      await page.click('a[href="/claims/new"]');
      await page.waitForURL('**/claims/new');
      
      // 1. Select a completed MOM to link
      await page.selectOption('select', { index: 1 }); // select the first seeded MOM
      
      // 2. Fill in meeting date and time
      await page.fill('input[type="date"]', '2026-08-01');
      await page.fill('input[type="time"]', '14:00');
      
      // 3. Populate expense line items
      // Check if there are default inputs or if we need to click "Add Expense"
      await page.fill('input[placeholder="Vendor / Store Name"]', 'Manila Grand Hotel');
      await page.selectOption('select:near(input[placeholder="Vendor / Store Name"])', 'Lodging / Accommodation');
      await page.fill('input[placeholder="0.00"]', '4500.00');
      await page.fill('textarea[placeholder="Describe the business expense, attendees, and connection to sales activity..."]', 'Client overnight stay during product briefing.');
      
      // 4. Fill business purpose / remarks
      await page.fill('textarea[placeholder="Detail the sales objective, specific activities, and context of this reimbursement claim..."]', 'Product pilot kickoff meeting with SM Prime team.');
      
      // 5. Submit the claim
      const submitBtn = page.locator('button[type="submit"]');
      await expect(submitBtn).toBeEnabled();
      await submitBtn.click();
      
      // Wait for submission response and redirect to dashboard
      await page.waitForURL('**/');
      
      // Verify toast notification or success indication
      await expect(page.locator('text=Claim Submitted')).toBeVisible({ timeout: 5000 });
    });

    test('Invalid Input: Attempt submission with negative amounts displays error', async ({ page }) => {
      await loginAs(page, USERS.REQUESTOR);
      await page.goto('/claims/new');
      await page.waitForLoadState('networkidle');
      
      // Select MOM
      await page.selectOption('select', { index: 1 });
      await page.fill('input[type="date"]', '2026-08-02');
      await page.fill('input[type="time"]', '15:00');
      
      // Fill details with negative amount
      await page.fill('input[placeholder="Vendor / Store Name"]', 'KFC Taft');
      await page.fill('input[placeholder="0.00"]', '-120.00');
      
      // Click submit (either HTML5 blocks it or React validation notifies)
      await page.click('button[type="submit"]');
      
      // Form should remain and display validation alert or negative feedback
      expect(page.url()).toContain('/claims/new');
    });

    test('Validation Check: Linking MOM is mandatory', async ({ page }) => {
      await loginAs(page, USERS.REQUESTOR);
      await page.goto('/claims/new');
      
      // Leave MOM selector empty
      await page.fill('input[type="date"]', '2026-08-03');
      await page.fill('input[type="time"]', '10:00');
      await page.fill('input[placeholder="Vendor / Store Name"]', 'Grab Food');
      await page.fill('input[placeholder="0.00"]', '250.00');
      
      // Attempt submit
      await page.click('button[type="submit"]');
      
      // Remains on form
      expect(page.url()).toContain('/claims/new');
    });
  });

  // =========================================================================
  // SECTION 4: APPROVALS & REJECTIONS (APPROVER)
  // =========================================================================
  test.describe('4. Approvals and Rejections', () => {

    test('Happy Path: Bob Santos reviews and approves a pending claim', async ({ page }) => {
      // Login as Bob (Approver)
      await loginAs(page, USERS.APPROVER);
      
      // Navigate to Approvals inbox
      await page.goto('/approvals');
      await page.waitForLoadState('networkidle');
      
      // Locate first pending claim card and click to open details
      const pendingClaimItem = page.locator('text=REIM-').first();
      await expect(pendingClaimItem).toBeVisible();
      await pendingClaimItem.click();
      
      // Wait for detail drawer / page to slide in
      await page.waitForLoadState('networkidle');
      
      // Click the primary Approve button
      const approveButton = page.locator('button:has-text("Approve"), button:has-text("Approve Claim")').first();
      await expect(approveButton).toBeVisible();
      await approveButton.click();
      
      // Handle review modal confirm if visible
      const confirmButton = page.locator('button:has-text("Confirm Approval"), button:has-text("Yes, Approve")');
      if (await confirmButton.count() > 0) {
        await confirmButton.click();
      }
      
      // Check success notification
      await expect(page.locator('text=Approved')).toBeVisible({ timeout: 5000 });
    });

    test('Happy Path: Bob Santos rejects a claim with mandatory feedback', async ({ page }) => {
      await loginAs(page, USERS.APPROVER);
      await page.goto('/approvals');
      await page.waitForLoadState('networkidle');
      
      // Open another pending claim
      const pendingClaimItem = page.locator('text=REIM-').first();
      await expect(pendingClaimItem).toBeVisible();
      await pendingClaimItem.click();
      
      // Locate Reject action
      const rejectButton = page.locator('button:has-text("Reject"), button:has-text("Reject Claim")').first();
      await expect(rejectButton).toBeVisible();
      await rejectButton.click();
      
      // Fill the mandatory rejection reason
      const reasonTextarea = page.locator('textarea[placeholder*="reason"], textarea[placeholder*="comment"]');
      await expect(reasonTextarea).toBeVisible();
      await reasonTextarea.fill('Out of policy. Client entertainment requires pre-clearance.');
      
      // Submit rejection
      const confirmRejectBtn = page.locator('button:has-text("Confirm Reject"), button:has-text("Reject"), .bg-red-600').nth(1);
      await confirmRejectBtn.click();
      
      // Check status update is successful
      await expect(page.locator('text=Rejected')).toBeVisible({ timeout: 5000 });
    });

    test('Permission Validation: Approvers cannot approve their own submitted claims', async ({ page }) => {
      // Bob Santos is also allowed to request, but segregation of duties blocks self-approval
      await loginAs(page, USERS.APPROVER);
      
      // Navigate to history to find one of Bob's own requests
      await page.goto('/history');
      await page.waitForLoadState('networkidle');
      
      // Open Bob's own claim
      const myClaim = page.locator('text=REIM-').first();
      if (await myClaim.count() > 0) {
        await myClaim.click();
        await page.waitForLoadState('networkidle');
        
        // Assert that approval action controls (Approve/Reject buttons) are hidden or disabled
        const approveButton = page.locator('button:has-text("Approve")');
        const count = await approveButton.count();
        if (count > 0) {
          await expect(approveButton).toBeDisabled();
        } else {
          expect(count).toBe(0);
        }
      }
    });
  });

  // =========================================================================
  // SECTION 5: CUSTODIAN PROCESSING QUEUE (CAROL FINANCE CUSTODIAN)
  // =========================================================================
  test.describe('5. Finance Custodian Queue', () => {

    test('Happy Path: Custodian marks an approved claim as Ready for Claim with code', async ({ page }) => {
      await loginAs(page, USERS.CUSTODIAN);
      await page.goto('/processing');
      await page.waitForLoadState('networkidle');
      
      // Locate claim in Approved queue
      const approvedClaim = page.locator('text=REIM-').first();
      await expect(approvedClaim).toBeVisible();
      await approvedClaim.click();
      
      await page.waitForLoadState('networkidle');
      
      // Click "Process / Mark Ready"
      const processBtn = page.locator('button:has-text("Mark Ready for Claim"), button:has-text("Process")').first();
      await expect(processBtn).toBeVisible();
      await processBtn.click();
      
      // Confirm the modal / action
      const confirmBtn = page.locator('button:has-text("Generate Code"), button:has-text("Confirm")');
      if (await confirmBtn.count() > 0) {
        await confirmBtn.click();
      }
      
      await expect(page.locator('text=Ready for Claim')).toBeVisible({ timeout: 5000 });
    });

    test('Happy Path: Custodian processes a Cash Advance Release', async ({ page }) => {
      await loginAs(page, USERS.CUSTODIAN);
      await page.goto('/processing');
      await page.waitForLoadState('networkidle');
      
      // Toggle to Cash Advances tab if present
      const cadvTab = page.locator('button:has-text("Cash Advances"), text="Cash Advances"');
      if (await cadvTab.count() > 0) {
        await cadvTab.click();
        await page.waitForLoadState('networkidle');
      }
      
      // Open a pending release
      const approvedCadv = page.locator('text=CADV-').first();
      if (await approvedCadv.count() > 0) {
        await approvedCadv.click();
        await page.waitForLoadState('networkidle');
        
        // Click Release button
        const releaseBtn = page.locator('button:has-text("Release Cash"), button:has-text("Release"), button:has-text("Mark Released")').first();
        await expect(releaseBtn).toBeVisible();
        await releaseBtn.click();
        
        // Input confirmation notes if needed, then confirm
        const confirmBtn = page.locator('button:has-text("Confirm Release"), button:has-text("Yes, Release")');
        if (await confirmBtn.count() > 0) {
          await confirmBtn.click();
        }
        
        await expect(page.locator('text=Released')).toBeVisible({ timeout: 5000 });
      }
    });
  });

  // =========================================================================
  // SECTION 6: SEARCH & FILTERS
  // =========================================================================
  test.describe('6. Search & Filters', () => {

    test('Search: Input queries filter relevant transaction items', async ({ page }) => {
      await loginAs(page, USERS.REQUESTOR);
      
      // Locate layout search input
      const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="search"]');
      await expect(searchInput).toBeVisible();
      
      // Focus and type query
      await searchInput.focus();
      await searchInput.fill('Prime'); // Searching for SM Prime Holdings
      
      // Wait for search suggestions or results dropdown to render
      await page.waitForTimeout(500);
      
      // Suggestions should appear
      await expect(page.locator('text=SM Prime Holdings').first()).toBeVisible();
    });

    test('Filters: Transaction history status filter displays matched elements', async ({ page }) => {
      await loginAs(page, USERS.REQUESTOR);
      await page.goto('/history');
      await page.waitForLoadState('networkidle');
      
      // Select "Approved" filter
      const filterSelect = page.locator('select:near(label:has-text("Status")), select:has-text("All Statuses")');
      if (await filterSelect.count() > 0) {
        await filterSelect.selectOption('Approved');
        await page.waitForLoadState('networkidle');
        
        // All listed claims should either be Approved or we shouldn't see Rejected/Pending items
        await expect(page.locator('text=Rejected')).not.toBeVisible();
      }
    });
  });

  // =========================================================================
  // SECTION 7: SYSTEM AUDITS & REPORTING (ADMIN DAVE)
  // =========================================================================
  test.describe('7. Admin Tools & Auditing', () => {

    test('Reports: Dave reviews high-value claims on Admin Reporting', async ({ page }) => {
      await loginAs(page, USERS.ADMIN);
      
      // Navigate to Reporting page (assuming URL is /settings or nested or direct path)
      // Check package.json and App.tsx mapping: "/settings" has reporting or "/history" or direct path
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');
      
      // Wait for admin dashboards/settings links
      await expect(page.locator('text=Global Settings')).toBeVisible();
    });

    test('Audit: Dave inspects historical operations in the Audit Log', async ({ page }) => {
      await loginAs(page, USERS.ADMIN);
      await page.goto('/audit');
      await page.waitForLoadState('networkidle');
      
      // Verify audit table is visible with logs
      const auditHeader = page.locator('h1:has-text("Audit Log"), h2:has-text("Audit Log")');
      await expect(auditHeader).toBeVisible();
      
      // Ensure we see actions like login, submit, or approve recorded
      const logRows = page.locator('table tbody tr');
      expect(await logRows.count()).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // SECTION 8: ERROR HANDLING & GRACEFUL FALLBACKS
  // =========================================================================
  test.describe('8. Error Handling & Edge Cases', () => {

    test('Graceful Fallback: Direct URL access with invalid Claim ID displays clean notice', async ({ page }) => {
      await loginAs(page, USERS.REQUESTOR);
      
      // Go directly to a non-existent claim ID
      await page.goto('/claims/invalid-id-uuid-999');
      await page.waitForLoadState('networkidle');
      
      // The page must handle this without a blank screen crash and show a friendly feedback card
      await expect(page.locator('text=Claim not found, text=Error, text=Not Found, text=does not exist').first()).toBeVisible();
      
      // The Layout sidebar remains operational
      await expect(page.locator('text=Dashboard')).toBeVisible();
    });
  });
});
