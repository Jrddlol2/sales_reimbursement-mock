const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

// 1. Update buildDefaultUsers
content = content.replace(
  "const buildDefaultUsers = (): User[] => [",
  `const buildDefaultUsers = (): User[] => [
  { id: 'u13', name: 'Mia Requestor', email: 'mia@example.com', role: UserRole.REQUESTOR, department: 'Marketing', job_title: 'Marketing Specialist', reports_to: 'u14' },
  { id: 'u14', name: 'Noah Approver', email: 'noah@example.com', role: UserRole.APPROVER, department: 'Marketing', job_title: 'Marketing Director', reports_to: null },
  { id: 'u15', name: 'Olivia Requestor', email: 'olivia@example.com', role: UserRole.REQUESTOR, department: 'Engineering', job_title: 'Software Engineer', reports_to: 'u16' },
  { id: 'u16', name: 'Peter Approver', email: 'peter@example.com', role: UserRole.APPROVER, department: 'Engineering', job_title: 'Engineering Manager', reports_to: null },
  { id: 'u17', name: 'Quinn Requestor', email: 'quinn@example.com', role: UserRole.REQUESTOR, department: 'Operations', job_title: 'Operations Coordinator', reports_to: 'u18' },
  { id: 'u18', name: 'Ryan Approver', email: 'ryan@example.com', role: UserRole.APPROVER, department: 'Operations', job_title: 'Operations Manager', reports_to: null },`
);

fs.writeFileSync('server.ts', content);
