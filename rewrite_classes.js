const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

const buttonPrimaryRegex = /className="[^"]*bg-brand[^"]*text-white[^"]*"/g;
const buttonSecondaryRegex = /className="[^"]*bg-white[^"]*text-gray-700[^"]*border[^"]*"/g;
const cardRegex = /className="[^"]*bg-white[^"]*shadow[^"]*rounded[^"]*"/g;
const inputRegex = /className="[^"]*border[^"]*rounded[^"]*w-full[^"]*"/g;

walkDir('./src', (filePath) => {
  if (!filePath.endsWith('.tsx')) return;
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Let's not blindly replace all, we can just replace specific known long tailwind classes with our corp-* classes.
  // Actually, replacing class strings safely is hard with simple regex.
  
});
