const fs = require('fs');
let code = fs.readFileSync('src/components/ManagerDashboard.tsx', 'utf8');
code = code.replace(
`          setTimeout(() => {
            try {
              if ("speechSynthesis" in window) {
                const utterance = new SpeechSynthesisUtterance(fullAnnouncement);
                utterance.lang = "am-ET";
                utterance.volume = 1.0;
                utterance.rate = 0.85;
                utterance.pitch = 1.0;
                window.speechSynthesis.speak(utterance);
              }
            } catch (speechErr) {
              console.error("Speech synthesis failed", speechErr);
            }
          }, 6000);
          try {
          
      isInitialOrderLoad.current = false;
      setOrders(fetchedOrders);
    });`,
`          setTimeout(() => {
            try {
              if ("speechSynthesis" in window) {
                const utterance = new SpeechSynthesisUtterance(fullAnnouncement);
                utterance.lang = "am-ET";
                utterance.volume = 1.0;
                utterance.rate = 0.85;
                utterance.pitch = 1.0;
                window.speechSynthesis.speak(utterance);
              }
            } catch (speechErr) {
              console.error("Speech synthesis failed", speechErr);
            }
          }, 6000);
        });
      }
      
      isInitialOrderLoad.current = false;
      setOrders(fetchedOrders);
    });

    return () => {
      unsubItems();
      unsubOrders();
    };
  }, []);

  const playBeep = () => {`);
fs.writeFileSync('src/components/ManagerDashboard.tsx', code);
