import os
import re

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    original = content
    
    # 1. Replace button primary
    content = re.sub(r'className="[^"]*bg-brand\s+hover:bg-brand-hover\s+text-white[^"]*"', 'className="corp-btn-primary"', content)
    content = re.sub(r'className="bg-brand hover:bg-brand-hover text-white text-xs font-semibold px-4 py-2 rounded"', 'className="corp-btn-primary"', content)
    
    # 2. Replace button secondary
    content = re.sub(r'className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50[^"]*"', 'className="corp-btn-secondary"', content)
    content = re.sub(r'className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"', 'className="corp-btn-secondary"', content)

    # 3. Replace card
    content = content.replace('className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden"', 'className="corp-card overflow-hidden"')
    content = content.replace('className="bg-white border border-slate-200 rounded overflow-hidden shadow-sm"', 'className="corp-card flex flex-col overflow-hidden"')
    content = content.replace('className="bg-white shadow rounded-lg p-6"', 'className="corp-card p-6"')
    
    # 4. Inputs
    content = content.replace('className="w-full border rounded p-2 text-sm"', 'className="corp-input"')
    content = content.replace('className="w-full border rounded px-3 py-2 focus:border-brand focus:outline-none text-sm"', 'className="corp-input"')

    if content != original:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Updated {filepath}")

for root, _, files in os.walk('src'):
    for file in files:
        if file.endswith('.tsx'):
            process_file(os.path.join(root, file))

