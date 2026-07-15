sed -i 's/updated_at: new Date().toISOString()/updated_at: new Date().toISOString(),\n      flagged_high_value: itemsToCreate.some(item => item.amount > 15000)/' server.ts
sed -i 's/claim.updated_at = new Date().toISOString();/claim.updated_at = new Date().toISOString();\n    claim.flagged_high_value = itemsToCreate.some(item => item.amount > 15000);/' server.ts
