const fs = require('fs');
const file = 'server.ts';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('systemSettings')) {
  const settingsCode = `
// System Settings (In-Memory)
let systemSettings = {
  expenseCategories: [
    'Client Meals', 'Travel', 'Accommodation', 'Transportation',
    'Office Supplies', 'Software Subscriptions', 'Training', 'Miscellaneous'
  ],
  highValueThreshold: 50000
};

app.get('/api/admin/settings', (req, res) => {
  res.json(systemSettings);
});

app.put('/api/admin/settings', (req, res) => {
  const user = getUser(req);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const { expenseCategories, highValueThreshold } = req.body;
  if (expenseCategories && Array.isArray(expenseCategories)) {
    systemSettings.expenseCategories = expenseCategories;
  }
  if (typeof highValueThreshold === 'number') {
    systemSettings.highValueThreshold = highValueThreshold;
  }
  res.json(systemSettings);
});

`;
  
  content = content.replace(
    "// Reset Simulation",
    settingsCode + "\n// Reset Simulation"
  );
  fs.writeFileSync(file, content);
}
