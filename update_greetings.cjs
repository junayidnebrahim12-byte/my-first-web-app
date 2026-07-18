const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/} else if \(langCode === 'ti'\) {[\s\S]*?} else if \(langCode === 'ha'\) {[\s\S]*?}/,
`} else if (langCode === 'tr') {
                 greetingText = \`System Message: The call has just started. You MUST immediately greet the user by saying exactly (in pure Turkish): "Değerli müşterilerimiz, bu Junaydin tarafından yaratılmış mükemmel bir teknolojidir. \${businessName || 'Kafeye'} hoş geldiniz! Ne sipariş etmek istersiniz?" You must speak right now. \\nHere is the menu with prices: \\n\${menuInfo}\\nRemember: Speak only in Turkish.\`;
             } else if (langCode === 'zh') {
                 greetingText = \`System Message: The call has just started. You MUST immediately greet the user by saying exactly (in pure Chinese): "亲爱的顾客，这是由 Junaydin 创造的卓越技术。欢迎来到\${businessName || '咖啡馆'}！您想点什么？" You must speak right now. \\nHere is the menu with prices: \\n\${menuInfo}\\nRemember: Speak only in Chinese.\`;
             }`
);

fs.writeFileSync('server.ts', code);
