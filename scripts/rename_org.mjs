import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const excludeDirs = ['node_modules', '.git', 'dist', '.next'];
const excludeFiles = ['package-lock.json']; // Will be regenerated

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (!excludeDirs.includes(file)) {
        walk(fullPath);
      }
    } else {
      if (!excludeFiles.includes(file) && !file.endsWith('.png') && !file.endsWith('.svg')) {
        let content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('@agentdeskbot/')) {
          const newContent = content.replace(/@agentdesk\//g, '@agentdeskbot/');
          fs.writeFileSync(fullPath, newContent, 'utf8');
          console.log(`Updated: ${fullPath}`);
        }
      }
    }
  }
}

walk(rootDir);
console.log('Done!');
