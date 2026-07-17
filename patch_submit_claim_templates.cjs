const fs = require('fs');
const file = 'src/pages/SubmitClaim.tsx';
let content = fs.readFileSync(file, 'utf8');

const TEMPLATES = `
const CLAIM_TEMPLATES = [
  {
    name: 'Client Meeting (Dinner)',
    icon: Sparkle,
    data: {
      expense_category: 'Client Meals',
      remarks: 'Client dinner meeting to discuss Q3 initiatives',
      lineItems: [{ category: 'Client Meals', amount: '2500' }]
    }
  },
  {
    name: 'Sales Visit (Out of Town)',
    icon: Sparkle,
    data: {
      expense_category: 'Travel',
      remarks: 'Out of town sales visit and partner alignment',
      lineItems: [
        { category: 'Travel', amount: '5000' },
        { category: 'Accommodation', amount: '3500' },
        { category: 'Transportation', amount: '1200' }
      ]
    }
  },
  {
    name: 'Local Transport',
    icon: Sparkle,
    data: {
      expense_category: 'Transportation',
      remarks: 'Taxi fare for on-site client presentation',
      lineItems: [{ category: 'Transportation', amount: '600' }]
    }
  }
];
`;

if (!content.includes('CLAIM_TEMPLATES')) {
  content = content.replace(
    "const REIMBURSEMENT_CATEGORIES = [",
    TEMPLATES + "\nconst REIMBURSEMENT_CATEGORIES = ["
  );
  
  // Add a button group for templates above the form
  const templateUI = `
          {/* Templates Section */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2"><Sparkle className="w-4 h-4 text-amber-500" /> Quick Fill Templates</h3>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {CLAIM_TEMPLATES.map((tmpl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    const li = tmpl.data.lineItems.map(item => ({ id: Math.random().toString(), category: item.category, amount: item.amount, receiptName: '', or_number: '' }));
                    setLineItems(li);
                    setRemarks(tmpl.data.remarks);
                    toast.success('Applied ' + tmpl.name + ' template');
                  }}
                  className="flex-shrink-0 flex items-center gap-2 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 px-4 py-2 rounded-lg text-xs font-semibold transition-colors"
                >
                  <tmpl.icon className="w-4 h-4" />
                  {tmpl.name}
                </button>
              ))}
            </div>
          </div>
  `;
  
  content = content.replace(
    "{/* Primary Form */}",
    templateUI + "\n        {/* Primary Form */}"
  );
  
  fs.writeFileSync(file, content);
}
