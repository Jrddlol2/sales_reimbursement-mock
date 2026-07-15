sed -i '/import { KPITile } from '"'"'..\/components\/KPITile'"'"';/a \
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from '"'"'recharts'"'"';\
' src/pages/ApprovalQueue.tsx
