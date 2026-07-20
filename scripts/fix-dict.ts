import * as fs from 'fs';
import * as path from 'path';

function walk(dir: string, callback: (filepath: string) => void) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filepath = path.join(dir, file);
    if (fs.statSync(filepath).isDirectory()) {
      walk(filepath, callback);
    } else if (filepath.endsWith('.tsx') || filepath.endsWith('.ts')) {
      callback(filepath);
    }
  }
}

walk(path.join(process.cwd(), 'components'), (filepath) => {
  let content = fs.readFileSync(filepath, 'utf-8');
  if (content.includes('dict: any')) {
    content = content.replace(/dict: any/g, 'dict: Dictionary');
    if (!content.includes("import type { Dictionary }")) {
      // Find the last import and insert after
      const lines = content.split('\n');
      const lastImportIndex = lines.findLastIndex(l => l.startsWith('import '));
      if (lastImportIndex !== -1) {
        lines.splice(lastImportIndex + 1, 0, "import type { Dictionary } from '@/lib/dictionary';");
      } else {
        lines.unshift("import type { Dictionary } from '@/lib/dictionary';");
      }
      content = lines.join('\n');
    }
    fs.writeFileSync(filepath, content);
    console.log(`Updated ${filepath}`);
  }
});
