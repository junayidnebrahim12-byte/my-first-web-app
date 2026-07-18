const fs = require('fs');
let code = fs.readFileSync('src/components/MenuPage.tsx', 'utf8');

code = code.replace(
  /const hasAutoStartedCall = useRef\(false\);[\s\S]*?\}, \[loading, settings, items, callState\]\);/,
  `const hasAutoStartedCall = useRef(false);

  useEffect(() => {
    // Automatically start live call when user lands on this page and data is loaded
    if (!loading && settings && !hasAutoStartedCall.current && callState === 'idle') {
      const timer = setTimeout(() => {
        if (!hasAutoStartedCall.current && callState === 'idle') {
          hasAutoStartedCall.current = true;
          startLiveCall();
        }
      }, 1000); // Wait 1 second to ensure menu items are loaded from Firestore
      return () => clearTimeout(timer);
    }
  }, [loading, settings, callState]);`
);

fs.writeFileSync('src/components/MenuPage.tsx', code);
