const fs = require('fs');
let code = fs.readFileSync('src/components/MenuPage.tsx', 'utf8');

code = code.replace(
  /return \(\) => unsub\(\);\s*}, \[\]\);/,
  `return () => unsub();
  }, []);

  const hasAutoStartedCall = useRef(false);

  useEffect(() => {
    // Automatically start live call when user lands on this page and data is loaded
    if (!loading && settings && items.length >= 0 && !hasAutoStartedCall.current && callState === 'idle') {
      hasAutoStartedCall.current = true;
      startLiveCall();
    }
  }, [loading, settings, items, callState]);`
);

fs.writeFileSync('src/components/MenuPage.tsx', code);
