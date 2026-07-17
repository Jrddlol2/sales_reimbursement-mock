const fs = require('fs');
const file = 'src/pages/Settings.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('highValueThreshold')) {
  content = content.replace(
    "const [expenseCategories, setExpenseCategories] = useState<string[]>([]);",
    "const [expenseCategories, setExpenseCategories] = useState<string[]>([]);\n  const [highValueThreshold, setHighValueThreshold] = useState<number>(15000);"
  );
  
  // load settings
  content = content.replace(
    "if (data.expenseCategories) setExpenseCategories(data.expenseCategories);",
    "if (data.expenseCategories) setExpenseCategories(data.expenseCategories);\n        if (typeof data.highValueThreshold === 'number') setHighValueThreshold(data.highValueThreshold);"
  );
  
  // save settings
  content = content.replace(
    "body: JSON.stringify({ expenseCategories: cats })",
    "body: JSON.stringify({ expenseCategories: cats, highValueThreshold })"
  );
  
  // add a function for saving threshold specifically
  const thresholdSaver = `
  const handleSaveThreshold = async () => {
    try {
      await apiFetch('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify({ expenseCategories, highValueThreshold })
      });
      toast.success('High-value threshold updated successfully');
    } catch (err) {
      toast.error('Failed to update threshold');
    }
  };
  `;
  
  content = content.replace(
    "  const handleAddCategory = () => {",
    thresholdSaver + "\n  const handleAddCategory = () => {"
  );
  
  const thresholdUI = `
          {/* Threshold Section */}
          <div className="pt-6 border-t border-slate-200 mt-6">
            <h4 className="text-sm font-extrabold text-slate-950 font-display mb-2">High-Value Claim Threshold</h4>
            <p className="text-xs text-slate-600 mb-4">
              Claims with single line items exceeding this amount will be flagged as high-value for Approvers.
            </p>
            {settingsLoading ? (
               <div className="animate-pulse h-10 w-full bg-slate-100 rounded"></div>
            ) : (
               <div className="flex gap-2 max-w-sm">
                 <div className="relative flex-1">
                   <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                     <span className="text-slate-500 sm:text-xs">₱</span>
                   </div>
                   <input
                     type="number"
                     value={highValueThreshold}
                     onChange={e => setHighValueThreshold(parseInt(e.target.value) || 0)}
                     className="block w-full rounded border-slate-300 border py-2 pl-7 pr-12 text-xs focus:border-brand text-slate-900 bg-white"
                   />
                 </div>
                 <button
                   onClick={handleSaveThreshold}
                   className="px-4 py-2 bg-brand text-white text-xs font-bold uppercase tracking-wider rounded hover:bg-brand-hover transition-colors shadow-sm font-display"
                 >
                   Save
                 </button>
               </div>
            )}
          </div>
  `;
  
  content = content.replace(
    "          </div>\n        </div>\n      )}\n    </div>",
    "          </div>\n" + thresholdUI + "\n        </div>\n      )}\n    </div>"
  );
  
  fs.writeFileSync(file, content);
}
