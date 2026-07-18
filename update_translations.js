const fs = require('fs');
let code = fs.readFileSync('src/lib/translations.ts', 'utf8');
code = code.replace(/ha:\s*{/, 'zh: {');
code = code.replace(/ti:\s*{/, 'tr: {');
fs.writeFileSync('src/lib/translations.ts', code);
