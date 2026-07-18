const fs = require('fs');
let code = fs.readFileSync('src/components/ManagerDashboard.tsx', 'utf8');

// Fix TTS Announcement (remove repetition and delay)
code = code.replace(
`          // Repeat twice for clarity like a call system
          const fullAnnouncement = \`\${newOrderText} እደግመዋለሁ። \${newOrderText}\`;
          setTimeout(() => {
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
          }, 6000);`,
`          try {
            if ("speechSynthesis" in window) {
              const utterance = new SpeechSynthesisUtterance(newOrderText);
              utterance.lang = "am-ET";
              utterance.volume = 1.0;
              window.speechSynthesis.speak(utterance);
            }
          } catch (speechErr) {
            console.error("Speech synthesis failed", speechErr);
          }`);

fs.writeFileSync('src/components/ManagerDashboard.tsx', code);
