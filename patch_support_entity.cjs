const fs = require('fs');
const file = 'server.ts';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('supportRequests')) {
  const supportCode = `
// Support Requests
let supportRequests: any[] = [];

app.post('/api/support', (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const { title, description, referenceId } = req.body;
  const newRequest = {
    id: uuidv4(),
    requestorId: user.id,
    title,
    description,
    referenceId,
    status: 'OPEN',
    created_at: new Date().toISOString(),
    comments: []
  };
  supportRequests.push(newRequest);
  res.json(newRequest);
});

app.get('/api/support', (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  let reqs = supportRequests;
  if (user.role !== UserRole.ADMIN) {
    reqs = reqs.filter(r => r.requestorId === user.id);
  }
  const enriched = reqs.map(r => ({
    ...r,
    requestor: users.find(u => u.id === r.requestorId)
  }));
  res.json(enriched);
});
`;
  
  content = content.replace(
    "// Reset Simulation",
    supportCode + "\n// Reset Simulation"
  );
  fs.writeFileSync(file, content);
}
