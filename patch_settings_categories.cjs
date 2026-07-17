const fs = require('fs');
const file = 'src/pages/Settings.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('expenseCategories')) {
  content = content.replace(
    "const [seeding, setSeeding] = useState(false);",
    "const [seeding, setSeeding] = useState(false);\n  const [expenseCategories, setExpenseCategories] = useState<string[]>([]);\n  const [newCategory, setNewCategory] = useState('');\n  const [settingsLoading, setSettingsLoading] = useState(true);"
  );
  
  // load settings
  const loadSettings = `
  useEffect(() => {
    if (user.role === UserRole.ADMIN) {
      apiFetch('/api/admin/settings').then(data => {
        if (data.expenseCategories) setExpenseCategories(data.expenseCategories);
        setSettingsLoading(false);
      }).catch(err => {
        console.error(err);
        setSettingsLoading(false);
      });
    } else {
      setSettingsLoading(false);
    }
  }, [user]);

  const handleAddCategory = () => {
    if (!newCategory.trim()) return;
    if (expenseCategories.includes(newCategory.trim())) {
      toast.error('Category already exists');
      return;
    }
    const newCats = [...expenseCategories, newCategory.trim()];
    setExpenseCategories(newCats);
    setNewCategory('');
    saveSettings(newCats);
  };

  const handleRemoveCategory = (cat: string) => {
    const newCats = expenseCategories.filter(c => c !== cat);
    setExpenseCategories(newCats);
    saveSettings(newCats);
  };

  const saveSettings = async (cats: string[]) => {
    try {
      await apiFetch('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify({ expenseCategories: cats })
      });
      toast.success('Categories updated successfully');
    } catch (err) {
      toast.error('Failed to update settings');
    }
  };
  `;
  
  content = content.replace(
    "  const handleSave = async (e: React.FormEvent) => {",
    loadSettings + "\n  const handleSave = async (e: React.FormEvent) => {"
  );
  
  const categoryUI = `
          {/* Settings Section */}
          <div className="pt-6 border-t border-slate-200 mt-6">
            <h4 className="text-sm font-extrabold text-slate-950 font-display mb-2">Expense Categories</h4>
            <p className="text-xs text-slate-600 mb-4">
              Manage the list of allowed expense categories for reimbursement claims.
            </p>
            {settingsLoading ? (
               <div className="animate-pulse h-10 w-full bg-slate-100 rounded"></div>
            ) : (
               <div className="space-y-4">
                 <div className="flex gap-2">
                   <input
                     type="text"
                     value={newCategory}
                     onChange={e => setNewCategory(e.target.value)}
                     placeholder="New category name"
                     className="flex-1 rounded border-slate-300 border p-2 text-xs focus:border-brand text-slate-900 bg-white"
                     onKeyDown={e => {
                       if (e.key === 'Enter') {
                         e.preventDefault();
                         handleAddCategory();
                       }
                     }}
                   />
                   <button
                     onClick={handleAddCategory}
                     className="px-4 py-2 bg-brand text-white text-xs font-bold uppercase tracking-wider rounded hover:bg-brand-hover transition-colors shadow-sm font-display"
                   >
                     Add
                   </button>
                 </div>
                 <div className="flex flex-wrap gap-2">
                   {expenseCategories.map(cat => (
                     <span key={cat} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
                       {cat}
                       <button onClick={() => handleRemoveCategory(cat)} className="text-slate-400 hover:text-red-500 transition-colors">
                         &times;
                       </button>
                     </span>
                   ))}
                 </div>
               </div>
            )}
          </div>
  `;
  
  content = content.replace(
    "            <HistoricalImport />\n            </div>\n          </div>",
    "            <HistoricalImport />\n            </div>\n          </div>\n" + categoryUI
  );
  
  fs.writeFileSync(file, content);
}
