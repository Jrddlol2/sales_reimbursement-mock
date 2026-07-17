const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const reminderEndpoint = `
  // System Jobs
  app.post('/api/jobs/reminders', (req, res) => {
    let sentCount = 0;
    const now = new Date();
    
    cashAdvances.forEach(ca => {
      if (ca.status === 'RELEASED' && ca.releaseDate && !ca.reminderSent) {
        const releaseTime = new Date(ca.releaseDate).getTime();
        const daysSinceRelease = (now.getTime() - releaseTime) / (1000 * 3600 * 24);
        
        if (daysSinceRelease > 7) {
          const reqName = users.find(u => u.id === ca.requestorId)?.name || 'User';
          const subject = \`URGENT: Liquidation Overdue - CADV-\${ca.id.substring(0, 6)}\`;
          const body = \`Your Cash Advance for PHP \${ca.amount} was released on \${new Date(ca.releaseDate).toLocaleDateString()}.\n\nIt has been over 7 days since release. Please file your liquidation immediately to avoid payroll deductions.\`;
          
          sendEmail(ca.requestorId, subject, body);
          ca.reminderSent = true;
          sentCount++;
        }
      }
    });
    
    res.json({ message: \`Sent \${sentCount} reminders.\`, count: sentCount });
  });
`;

code = code.replace("app.use('/api', apiRouter);", reminderEndpoint + "\n  app.use('/api', apiRouter);");

fs.writeFileSync('server.ts', code);
