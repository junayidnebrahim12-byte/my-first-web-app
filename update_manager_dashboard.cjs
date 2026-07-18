const fs = require('fs');
let code = fs.readFileSync('src/components/ManagerDashboard.tsx', 'utf8');

// Add state
code = code.replace(
  /const \[phone, setPhone\] = useState\(''\);/,
  `const [phone, setPhone] = useState('');
  const [hotelImageUrl, setHotelImageUrl] = useState('');`
);

// Add to useEffect
code = code.replace(
  /setPhone\(settings\.phone\);/,
  `setPhone(settings.phone);
      setHotelImageUrl(settings.hotelImageUrl || '');`
);

// Add to updateSettings
code = code.replace(
  /await updateSettings\({ name: bName, managerName: mName, accountNumber: acc, phone }\);/,
  `await updateSettings({ name: bName, managerName: mName, accountNumber: acc, phone, hotelImageUrl });`
);

// Add to settings form
code = code.replace(
  /<div>\s*<label className="block text-xs font-bold text-stone-500 uppercase mb-1">Phone Number<\/label>\s*<input type="text" value={phone} onChange={e => setPhone\(e\.target\.value\)} className="w-full p-2 bg-stone-50 border rounded-lg" \/>\s*<\/div>/,
  `<div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Phone Number</label>
                  <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-2 bg-stone-50 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Hotel/Cover Image (Replaces QR)</label>
                  <input type="file" accept="image/*" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const img = new Image();
                        img.onload = () => {
                          const canvas = document.createElement('canvas');
                          const MAX_WIDTH = 800;
                          const MAX_HEIGHT = 800;
                          let width = img.width;
                          let height = img.height;
                          if (width > height) {
                            if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                          } else {
                            if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
                          }
                          canvas.width = width; canvas.height = height;
                          const ctx = canvas.getContext('2d');
                          ctx?.drawImage(img, 0, 0, width, height);
                          setHotelImageUrl(canvas.toDataURL('image/jpeg', 0.8));
                        };
                        img.src = event.target?.result as string;
                      };
                      reader.readAsDataURL(file);
                    }
                  }} className="w-full p-2 bg-stone-50 border rounded-lg text-sm" />
                  {hotelImageUrl && <img src={hotelImageUrl} alt="Preview" className="mt-2 h-20 w-auto rounded border" />}
                </div>`
);

fs.writeFileSync('src/components/ManagerDashboard.tsx', code);
