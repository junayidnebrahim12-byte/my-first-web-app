const fs = require('fs');
let code = fs.readFileSync('src/components/ManagerDashboard.tsx', 'utf8');

code = code.replace(
`        // Play a clear two-tone chime (Ding-Dong) like a call system
        const playTone = (freq: number, startTime: number, duration: number) => {
          const oscillator = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          oscillator.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          
          oscillator.type = "sine";
          oscillator.frequency.setValueAtTime(freq, startTime);
          
          gainNode.gain.setValueAtTime(0, startTime);
          gainNode.gain.linearRampToValueAtTime(1, startTime + 0.05); // LOUD
          gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
          
          oscillator.start(startTime);
          oscillator.stop(startTime + duration);
        };

        const now = audioCtx.currentTime;
        // Repeat Ding-Dong 3 times
        playTone(659.25, now, 0.6); // E5
        playTone(523.25, now + 0.6, 1.0); // C5
        
        playTone(659.25, now + 2.0, 0.6); // E5
        playTone(523.25, now + 2.6, 1.0); // C5
        
        playTone(659.25, now + 4.0, 0.6); // E5
        playTone(523.25, now + 4.6, 1.0); // C5`,
`        // Play a single clear notification tone
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
        
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(1, audioCtx.currentTime + 0.05);
        gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.8);
        
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.8);`);

fs.writeFileSync('src/components/ManagerDashboard.tsx', code);
