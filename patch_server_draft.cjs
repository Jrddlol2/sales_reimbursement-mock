const fs = require('fs');
const file = 'server.ts';
let content = fs.readFileSync(file, 'utf8');

// Inside app.post('/api/claims' ... 
// Let's replace the rigid checks if is_draft is true
content = content.replace(
  "const { mom_id, expense_category, total_amount, receipt_url, or_number, remarks, supporting_documents, line_items, meeting_date, meeting_time } = req.body;",
  "const { mom_id, expense_category, total_amount, receipt_url, or_number, remarks, supporting_documents, line_items, meeting_date, meeting_time, is_draft } = req.body;"
);

content = content.replace(
  "if (!mom_id) return res.status(400).json({ error: 'Minutes of Meeting (MOM) is required.' });",
  "if (!is_draft && !mom_id) return res.status(400).json({ error: 'Minutes of Meeting (MOM) is required.' });"
);

content = content.replace(
  "if (mom.status !== MomStatus.COMPLETED) {\n      return res.status(400).json({ error: 'Cannot attach an incomplete or draft Minutes of Meeting.' });\n    }",
  "if (!is_draft && mom.status !== MomStatus.COMPLETED) {\n      return res.status(400).json({ error: 'Cannot attach an incomplete or draft Minutes of Meeting.' });\n    }"
);

content = content.replace(
  "if (!meeting_date || !meeting_time) {\n      return res.status(400).json({ error: 'A Review Meeting date and time must be scheduled with your Approver.' });\n    }",
  "if (!is_draft && (!meeting_date || !meeting_time)) {\n      return res.status(400).json({ error: 'A Review Meeting date and time must be scheduled with your Approver.' });\n    }"
);

content = content.replace(
  "if (!item.category) return res.status(400).json({ error: 'Each expense must have a category.' });",
  "if (!is_draft && !item.category) return res.status(400).json({ error: 'Each expense must have a category.' });"
);

content = content.replace(
  "const opts = {\n      requestorId: user.id,\n      approverId: user.reports_to,\n      momId: mom_id,\n      status: ClaimStatus.PENDING_APPROVAL,",
  "const opts = {\n      requestorId: user.id,\n      approverId: user.reports_to,\n      momId: mom_id || '',\n      status: is_draft ? ClaimStatus.DRAFT : ClaimStatus.PENDING_APPROVAL,"
);

fs.writeFileSync(file, content);
