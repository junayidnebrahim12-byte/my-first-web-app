const fs = require('fs');
let code = fs.readFileSync('src/components/MenuPage.tsx', 'utf8');

code = code.replace(
  /if \(\!loading && settings && items\.length >= 0 && \!hasAutoStartedCall\.current && callState === 'idle'\) {/,
  `if (!loading && settings && !hasAutoStartedCall.current && callState === 'idle') {`
);

fs.writeFileSync('src/components/MenuPage.tsx', code);
