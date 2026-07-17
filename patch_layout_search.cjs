const fs = require('fs');
const file = 'src/components/Layout.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('debouncedSearchQuery')) {
  content = content.replace(
    "const [searchQuery, setSearchQuery] = useState('');",
    "const [searchQuery, setSearchQuery] = useState('');\n  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');\n\n  useEffect(() => {\n    const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery), 300);\n    return () => clearTimeout(timer);\n  }, [searchQuery]);"
  );
  
  content = content.replace(
    "useEffect(() => {\n    if (!searchQuery.trim()) {",
    "useEffect(() => {\n    if (!debouncedSearchQuery.trim()) {"
  );
  
  content = content.replace(
    "const q = searchQuery.toLowerCase();",
    "const q = debouncedSearchQuery.toLowerCase();"
  );
  
  content = content.replace(
    "[searchQuery, allClaims, allCadvs, allLiqs, allUsers]",
    "[debouncedSearchQuery, allClaims, allCadvs, allLiqs, allUsers]"
  );

  // Add department, client, and release code (or_number/custom_claim_code)
  content = content.replace(
    "const reqName = getRequestorName(c).toLowerCase();\n      return c.id.toLowerCase().includes(q)\n        || reqName.includes(q)\n        || (c.expense_category || '').toLowerCase().includes(q)\n        || (c.notes || '').toLowerCase().includes(q)\n        || c.total_amount.toString().includes(q);",
    "const reqName = getRequestorName(c).toLowerCase();\n      const reqDept = getRequestorDept(c).toLowerCase();\n      return c.id.toLowerCase().includes(q)\n        || reqName.includes(q)\n        || reqDept.includes(q)\n        || (c.expense_category || '').toLowerCase().includes(q)\n        || (c.notes || '').toLowerCase().includes(q)\n        || c.total_amount.toString().includes(q)\n        || (c.or_number || '').toLowerCase().includes(q)\n        || (c.custom_claim_code || '').toLowerCase().includes(q);"
  );
  
  content = content.replace(
    "const reqName = getRequestorName(c).toLowerCase();\n      return c.id.toLowerCase().includes(q)\n        || reqName.includes(q)\n        || (c.purpose || '').toLowerCase().includes(q)\n        || c.amount.toString().includes(q);",
    "const reqName = getRequestorName(c).toLowerCase();\n      const reqDept = getRequestorDept(c).toLowerCase();\n      return c.id.toLowerCase().includes(q)\n        || reqName.includes(q)\n        || reqDept.includes(q)\n        || (c.purpose || '').toLowerCase().includes(q)\n        || c.amount.toString().includes(q);"
  );
  
  content = content.replace(
    "const reqName = getRequestorName(l).toLowerCase();\n      return l.id.toLowerCase().includes(q)\n        || reqName.includes(q)\n        || l.totalSpent.toString().includes(q);",
    "const reqName = getRequestorName(l).toLowerCase();\n      const reqDept = getRequestorDept(l).toLowerCase();\n      return l.id.toLowerCase().includes(q)\n        || reqName.includes(q)\n        || reqDept.includes(q)\n        || l.totalSpent.toString().includes(q);"
  );
  
  content = content.replace(
    "const getRequestorName = (record: any) => {\n      const reqId = record.requestorId || record.requestor_id;\n      if (record.requestor?.name) return record.requestor.name;\n      const u = allUsers.find(x => x.id === reqId);\n      return u ? u.name : '';\n    };",
    "const getRequestorName = (record: any) => {\n      const reqId = record.requestorId || record.requestor_id;\n      if (record.requestor?.name) return record.requestor.name;\n      const u = allUsers.find(x => x.id === reqId);\n      return u ? u.name : '';\n    };\n\n    const getRequestorDept = (record: any) => {\n      const reqId = record.requestorId || record.requestor_id;\n      if (record.requestor?.department) return record.requestor.department;\n      const u = allUsers.find(x => x.id === reqId);\n      return u ? u.department : '';\n    };"
  );
  
  fs.writeFileSync(file, content);
}
