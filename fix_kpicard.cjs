const fs = require('fs');
let content = fs.readFileSync('src/components/dashboard/KPICard.tsx', 'utf8');

// 1. Add danger variant to the type
content = content.replace(
  "export type CardVariant = 'action' | 'success' | 'warning' | 'info' | 'default';",
  "export type CardVariant = 'action' | 'success' | 'warning' | 'info' | 'default' | 'danger';"
);

// 2. Add danger variant styling
content = content.replace(
  "    default: {",
  `    danger: {
      card: 'bg-red-50 border border-red-200 hover:border-red-300 transition-colors',
      iconContainer: 'bg-red-100 text-red-600',
      title: 'text-red-700 font-medium',
      value: 'text-red-700',
      description: 'text-red-600',
      context: 'text-red-500/80',
      btn: 'bg-red-100 text-red-800 hover:bg-red-200',
      topBar: 'bg-red-500'
    },
    default: {`
);

fs.writeFileSync('src/components/dashboard/KPICard.tsx', content);
