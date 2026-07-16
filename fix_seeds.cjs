const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

// Append new claims and cash advances for the new users right before claimCounter = seedCounter;
const additionalSeeds = `
    // --- Additional seeds for other departments ---
    const mkMomAndClaim = (reqId, appId, category, amt, status, daysAgo) => {
      const momId = uuidv4();
      const mom = {
        id: momId,
        requestor_id: reqId,
        client_name: 'Internal / Partner',
        contact_person: 'Partner Contact',
        date: rDate(daysAgo).toISOString(),
        meeting_type: 'In-person',
        purpose: 'Departmental sync',
        discussion: 'Regular departmental meeting.',
        action_items: 'None',
        status: MomStatus.APPROVED,
        created_at: rDate(daysAgo).toISOString()
      };
      moms.push(mom);
      mkClaim({
        requestorId: reqId,
        approverId: appId,
        mom,
        status,
        category,
        amount: amt,
        createdDaysAgo: daysAgo,
        approvedDaysAgo: daysAgo > 2 ? daysAgo - 1 : undefined,
        processedDaysAgo: daysAgo > 3 ? daysAgo - 2 : undefined
      });
    };

    // Marketing (u13 -> u14)
    mkMomAndClaim('u13', 'u14', 'Marketing Materials', 15000, ClaimStatus.COMPLETED, 15);
    mkMomAndClaim('u13', 'u14', 'Event Hosting', 25000, ClaimStatus.PENDING_APPROVAL, 2);
    
    // Engineering (u15 -> u16)
    mkMomAndClaim('u15', 'u16', 'Software Licenses', 8500, ClaimStatus.PROCESSING, 5);
    mkMomAndClaim('u15', 'u16', 'Cloud Hosting', 12000, ClaimStatus.COMPLETED, 20);
    mkMomAndClaim('u15', 'u16', 'Team Lunch', 4500, ClaimStatus.REJECTED, 3);
    
    // Operations (u17 -> u18)
    mkMomAndClaim('u17', 'u18', 'Office Supplies', 6000, ClaimStatus.READY_FOR_CLAIM, 7);
    mkMomAndClaim('u17', 'u18', 'Equipment Repair', 9500, ClaimStatus.COMPLETED, 12);
    
    const mkCa = (reqId, appId, amt, purpose, status, days) => {
      const caId = uuidv4();
      cashAdvances.push({
        id: caId,
        requestorId: reqId,
        amount: amt,
        purpose,
        approverId: appId,
        status,
        createdAt: rDate(days).toISOString(),
        approvedAt: status === CashAdvanceStatus.APPROVED || status === CashAdvanceStatus.RELEASED ? rDate(days-1).toISOString() : undefined,
        releasedAt: status === CashAdvanceStatus.RELEASED ? rDate(days-2).toISOString() : undefined,
      });
    };
    
    mkCa('u13', 'u14', 10000, 'Upcoming Expo', CashAdvanceStatus.APPROVED, 3);
    mkCa('u15', 'u16', 5000, 'Server Migration Overtime Food', CashAdvanceStatus.RELEASED, 4);
    mkCa('u17', 'u18', 20000, 'Facility Maintenance Deposit', CashAdvanceStatus.SUBMITTED, 1);
`;

content = content.replace(
  "claimCounter = seedCounter;",
  additionalSeeds + "\n    claimCounter = seedCounter;"
);

fs.writeFileSync('server.ts', content);
