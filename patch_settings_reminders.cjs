const fs = require('fs');
let code = fs.readFileSync('src/pages/Settings.tsx', 'utf8');

const triggerRemindersFn = `
  const handleTriggerReminders = async () => {
    try {
      const res = await apiFetch('/api/jobs/reminders', { method: 'POST' });
      toast.success(\`\${res.message}\`);
    } catch (err: any) {
      toast.error('Failed to trigger reminders: ' + err.message);
    }
  };
`;

code = code.replace("const handleSave = async (e: React.FormEvent) => {", triggerRemindersFn + "\n  const handleSave = async (e: React.FormEvent) => {");

const triggerRemindersBtn = `
              <button
                onClick={handleSeedYearData}
                disabled={seeding || seedingYear}
                className="px-4 py-2 bg-slate-950 text-white text-xs font-bold uppercase tracking-wider rounded hover:bg-slate-800 transition-colors disabled:opacity-50 shadow-sm font-display"
              >
                {seedingYear ? 'Generating History...' : 'Generate 1 Year of History'}
              </button>
              <button
                onClick={handleTriggerReminders}
                className="px-4 py-2 bg-slate-950 text-white text-xs font-bold uppercase tracking-wider rounded hover:bg-slate-800 transition-colors shadow-sm font-display"
              >
                Trigger Overdue Reminders
              </button>
`;

code = code.replace(/<button\n\s*onClick=\{handleSeedYearData\}[\s\S]*?\{seedingYear \? 'Generating History\.\.\.' : 'Generate 1 Year of History'\}\n\s*<\/button>/, triggerRemindersBtn);

fs.writeFileSync('src/pages/Settings.tsx', code);
