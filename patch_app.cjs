const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace("import { Settings }", "import { Settings } from './pages/Settings';\nimport { HistoricalImport }");

code = code.replace(/<Route path="settings" element=\{<Settings \/>\} \/>/, '<Route path="settings" element={<Settings />} />\n                  <Route path="settings/import" element={<HistoricalImport />} />');

fs.writeFileSync('src/App.tsx', code);
