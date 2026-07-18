import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useLanguage } from '../lib/LanguageContext';
import { useBusiness } from '../lib/BusinessContext';
import { Language } from '../types';
import { motion } from 'motion/react';

export default function LandingPage() {
  const { setLanguage } = useLanguage();
  const { settings, loading } = useBusiness();
  const navigate = useNavigate();

  const handleLanguageSelect = (lang: Language) => {
    setLanguage(lang);
    navigate('/menu');
  };

  const languages: { code: Language; name: string; nativeName: string }[] = [
    { code: 'en', name: 'ENGLISH', nativeName: '' },
    { code: 'am', name: 'አማርኛ', nativeName: 'AMHARIC' },
    { code: 'ar', name: 'العربية', nativeName: 'ARABIC' },
    { code: 'om', name: 'AFAN OROMO', nativeName: '' },
    { code: 'tr', name: 'TÜRKÇE', nativeName: 'TURKISH' },
    { code: 'zh', name: '中文', nativeName: 'CHINESE' },
  ];

  if (loading) {
    return <div className="min-h-screen bg-stone-900 flex items-center justify-center text-white">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-orange-50 font-sans flex flex-col items-center justify-between py-12 px-6 relative overflow-hidden" 
         style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/wood-pattern.png")', backgroundBlendMode: 'multiply' }}>
      
      {/* Phone Mockup Frame (Optional visual flair) */}
      <div className="absolute inset-0 border-[16px] border-black rounded-[3rem] pointer-events-none opacity-20"></div>

      <div className="absolute top-4 right-6 z-20">
         <button onClick={() => navigate('/manager')} className="text-[10px] text-stone-400 uppercase tracking-widest hover:text-stone-600 font-bold bg-white/50 px-3 py-1 rounded-full shadow-sm border border-stone-200 backdrop-blur-sm">Manager Access</button>
      </div>

      {/* QR Code Section */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm flex flex-col items-center mt-8"
      >
        {settings?.hotelImageUrl ? (
          <div className="relative w-64 h-64 mb-8 rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white bg-white flex items-center justify-center">
            <img src={settings.hotelImageUrl} alt="Hotel/Business" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="relative p-12 bg-stone-100 rounded-full shadow-2xl mb-8 flex items-center justify-center">
             <div className="absolute top-8 text-stone-600 font-bold tracking-widest text-sm z-10 bg-stone-100 px-2">SCAN HERE</div>
             {/* Decorative corners */}
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
        )}
        
        <h1 className="text-3xl font-black text-stone-900 text-center drop-shadow-md tracking-tight uppercase">
          Welcome to
          <br/>
          <span className="text-orange-600">[{settings?.name}]</span>
        </h1>
      </motion.div>

      {/* Developer Settings Access */}
      <div className="absolute bottom-4 left-6 z-20">
         <button onClick={() => navigate('/developer')} className="text-[10px] text-stone-400 uppercase tracking-widest hover:text-stone-600 font-bold bg-white/50 px-2 py-1 rounded shadow-sm border border-stone-200 backdrop-blur-sm opacity-50 hover:opacity-100 transition-opacity">Dev Box</button>
      </div>

      {/* Language Selection Card */}
      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-sm bg-stone-50 rounded-3xl p-6 shadow-2xl pb-10"
      >
        <div className="flex items-center justify-center mb-6">
          <div className="h-1 w-12 bg-stone-300 rounded-full mb-2"></div>
        </div>
        <h2 className="text-center text-stone-800 font-bold text-xl mb-6">Language selection</h2>
        
        <div className="grid grid-cols-2 gap-4">
          {languages.slice(0, 3).map((lang, index) => (
             <button
              key={lang.code}
              onClick={() => handleLanguageSelect(lang.code)}
              className={`p-4 rounded-2xl flex flex-col items-center justify-center border-2 transition-all active:scale-95
                ${index === 0 ? 'border-orange-500 bg-orange-100 text-orange-900 col-span-2 sm:col-span-1 shadow-sm' : 'border-stone-200 bg-white text-stone-700 hover:border-orange-400'}`}
             >
                <span className="text-2xl mb-1">{lang.code === 'en' ? '🌐' : (lang.code === 'am' ? '🇪🇹' : '🇸🇦')}</span>
                <span className="font-bold text-sm">{lang.name}</span>
                {lang.nativeName && <span className="text-xs text-stone-500">{lang.nativeName}</span>}
             </button>
          ))}
          {/* Bottom row */}
          {languages.slice(3).map(lang => (
             <button
              key={lang.code}
              onClick={() => handleLanguageSelect(lang.code)}
              className="p-4 rounded-2xl flex flex-col items-center justify-center border-2 border-stone-200 bg-white text-stone-700 hover:border-orange-400 transition-all active:scale-95"
             >
                <span className="text-2xl mb-1">🇪🇹</span>
                <span className="font-bold text-sm">{lang.name}</span>
                {lang.nativeName && <span className="text-xs text-stone-500">{lang.nativeName}</span>}
             </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
