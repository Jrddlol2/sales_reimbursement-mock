const fs = require('fs');

let content = fs.readFileSync('src/pages/ProcessingQueue.tsx', 'utf8');
content = content.replace(/ClaimPulseTimeline/g, 'ClaimActivityTimeline');
fs.writeFileSync('src/pages/ProcessingQueue.tsx', content);

console.log('fixed Pulse -> Activity in ProcessingQueue');
