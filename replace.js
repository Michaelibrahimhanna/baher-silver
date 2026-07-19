const fs = require('fs');
const path = require('path');

function replaceInDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      replaceInDir(fullPath);
    } else if (fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      content = content.replace(/brand-gray-light/g, 'brand-gray-soft');
      content = content.replace(/brand-gray-dark/g, 'brand-black/60');
      fs.writeFileSync(fullPath, content);
    }
  }
}

replaceInDir('d:/baher-silver/components');
