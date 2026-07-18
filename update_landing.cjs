const fs = require('fs');
let code = fs.readFileSync('src/components/LandingPage.tsx', 'utf8');

code = code.replace(
  /<div className="relative p-12 bg-stone-100 rounded-full shadow-2xl mb-8 flex items-center justify-center">[\s\S]*?<\/div>/,
  `{settings?.hotelImageUrl ? (
          <div className="relative w-64 h-64 mb-8 rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white">
            <img src={settings.hotelImageUrl} alt="Hotel/Business" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="relative p-12 bg-stone-100 rounded-full shadow-2xl mb-8 flex items-center justify-center">
             <div className="absolute top-8 text-stone-600 font-bold tracking-widest text-sm z-10 bg-stone-100 px-2">SCAN HERE</div>
             <div className="absolute inset-6 border-2 border-orange-500/30 rounded-[2.5rem]"></div>
             <QRCodeSVG 
              value={window.location.origin + '/'} 
              size={180}
              bgColor={"transparent"}
              fgColor={"#ea580c"}
              level={"H"}
              className="relative z-10 mt-4"
            />
          </div>
        )}`
);

fs.writeFileSync('src/components/LandingPage.tsx', code);
