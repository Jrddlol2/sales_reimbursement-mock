const fs = require('fs');
const file = 'src/pages/SubmitClaim.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('expenseCategories')) {
  content = content.replace(
    "const [advancePurpose, setAdvancePurpose] = useState('');",
    "const [advancePurpose, setAdvancePurpose] = useState('');\n  const [expenseCategories, setExpenseCategories] = useState<string[]>([]);"
  );
  
  content = content.replace(
    "const [advancePurpose, setAdvancePurpose] = useState('');",
    "const [advancePurpose, setAdvancePurpose] = useState('');"
  );
  
  // Actually, let's just add it where data is loaded
  const loadCategories = `
    apiFetch('/api/admin/settings').then(data => {
      if (data.expenseCategories) setExpenseCategories(data.expenseCategories);
    }).catch(console.error);`;
    
  // find the useEffect that loads users/moms
  content = content.replace(
    "        const mRes = await apiFetch('/api/moms');",
    "        const mRes = await apiFetch('/api/moms');\n" + loadCategories
  );
  
  // replace the hardcoded passing of REIMBURSEMENT_CATEGORIES
  content = content.replace(
    "categories={REIMBURSEMENT_CATEGORIES}",
    "categories={expenseCategories.length > 0 ? expenseCategories : REIMBURSEMENT_CATEGORIES}"
  );
  
  fs.writeFileSync(file, content);
}
