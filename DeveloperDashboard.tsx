import { useState, FormEvent } from 'react';
import { useBusiness } from '../lib/BusinessContext';
import { useNavigate } from 'react-router-dom';
import { Settings, Save, ArrowLeft, Key } from 'lucide-react';

export default function DeveloperDashboard() {
  const { settings, updateSettings, loading } = useBusiness();
  const navigate = useNavigate();
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [devKey, setDevKey] = useState('');

  // Settings form state
  const [bName, setBName] = useState(settings?.name || '');
  const [mName, setMName] = useState(settings?.managerName || '');
  const [mPin, setMPin] = useState(settings?.managerPin || '');
  const [accNum, setAccNum] = useState(settings?.accountNumber || '');
  const [phone, setPhone] = useState(settings?.phone || '');
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (loading) return <div className="min-h-screen bg-stone-900 flex items-center justify-center text-white">Loading...</div>;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-stone-900 flex flex-col items-center justify-center p-4">
        <div className="bg-stone-800 p-8 rounded-2xl shadow-xl border border-stone-700 w-full max-w-sm text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-stone-700 rounded-full flex items-center justify-center">
              <Key size={32} className="text-orange-500" />
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-2 text-white">Developer Box</h2>
          <p className="text-sm text-stone-400 mb-8">Restricted access area.</p>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (devKey === '0926junayidnai') {
              setIsAuthenticated(true);
              // Initialize state if empty
              if (!bName) setBName(settings?.name || '');
              if (!mName) setMName(settings?.managerName || '');
              if (!mPin) setMPin(settings?.managerPin || '');
              if (!accNum) setAccNum(settings?.accountNumber || '');
              if (!phone) setPhone(settings?.phone || '');
            } else {
              alert('Invalid developer key');
              setDevKey('');
            }
          }}>
            <input 
              type="password" 
              placeholder="Enter Developer Key" 
              value={devKey} 
              onChange={e => setDevKey(e.target.value)} 
              className="w-full p-3 text-center tracking-widest text-lg bg-stone-900 text-white border border-stone-700 rounded-lg mb-6 focus:outline-none focus:border-orange-500" 
              autoFocus 
            />
            <button type="submit" className="w-full bg-orange-600 text-white py-3 rounded-lg font-bold hover:bg-orange-700 transition-colors uppercase tracking-wider text-sm">Verify Key</button>
          </form>
          <button onClick={() => navigate('/')} className="mt-6 text-stone-500 hover:text-stone-300 text-sm flex items-center justify-center w-full transition-colors">
            <ArrowLeft size={16} className="mr-2" /> Back to App
          </button>
        </div>
      </div>
    );
  }

  const handleUpdateSettings = async (e: FormEvent) => {
    e.preventDefault();
    if (settings) {
      await updateSettings({
        ...settings,
        name: bName,
        managerName: mName,
        managerPin: mPin,
        accountNumber: accNum,
        phone: phone,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const generateRandomPin = () => {
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    setMPin(pin);
  };

  return (
    <div className="min-h-screen bg-stone-900 text-stone-300 p-4 md:p-8 font-mono">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-8 border-b border-stone-800 pb-4">
          <div className="flex items-center">
            <Settings size={24} className="text-orange-500 mr-3" />
            <h1 className="text-2xl font-bold text-white uppercase tracking-wider">System Developer Box</h1>
          </div>
          <button onClick={() => navigate('/')} className="bg-stone-800 text-stone-300 px-4 py-2 rounded font-bold hover:bg-stone-700 text-sm flex items-center transition-colors">
            <ArrowLeft size={16} className="mr-2" /> Exit
          </button>
        </div>

        <div className="bg-stone-800 p-6 rounded-xl border border-stone-700 shadow-xl mb-8">
          <h2 className="text-lg font-bold text-white mb-6 uppercase tracking-wider border-b border-stone-700 pb-2">Client Configuration</h2>
          <p className="text-sm text-stone-400 mb-6">Configure the fundamental application settings for a new client (manager).</p>
          
          <form onSubmit={handleUpdateSettings} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Business Name</label>
                <input type="text" value={bName} onChange={e => setBName(e.target.value)} className="w-full p-3 bg-stone-900 border border-stone-700 rounded text-white focus:outline-none focus:border-orange-500 transition-colors" />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Manager Name</label>
                <input type="text" value={mName} onChange={e => setMName(e.target.value)} className="w-full p-3 bg-stone-900 border border-stone-700 rounded text-white focus:outline-none focus:border-orange-500 transition-colors" />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Account Number (CBE)</label>
                <input type="text" value={accNum} onChange={e => setAccNum(e.target.value)} className="w-full p-3 bg-stone-900 border border-stone-700 rounded text-white focus:outline-none focus:border-orange-500 transition-colors" />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Support Phone</label>
                <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-3 bg-stone-900 border border-stone-700 rounded text-white focus:outline-none focus:border-orange-500 transition-colors" />
              </div>
            </div>

            <div className="bg-stone-900/50 p-4 rounded-lg border border-stone-700 mt-6">
               <label className="block text-xs font-bold text-orange-500 uppercase tracking-wider mb-2">Manager Access PIN</label>
               <div className="flex space-x-3">
                  <input type="text" value={mPin} onChange={e => setMPin(e.target.value)} className="flex-1 p-3 bg-stone-900 border border-stone-700 rounded text-white text-lg tracking-widest focus:outline-none focus:border-orange-500 font-bold" />
                  <button type="button" onClick={generateRandomPin} className="px-4 py-3 bg-stone-800 border border-stone-600 rounded text-sm hover:bg-stone-700 transition-colors font-bold whitespace-nowrap">Generate Code</button>
               </div>
               <p className="text-xs text-stone-500 mt-2">This is the code you will provide to the restaurant manager for access.</p>
            </div>

            <div className="flex justify-end pt-4">
              <button type="submit" className="bg-orange-600 text-white px-8 py-3 rounded font-bold hover:bg-orange-700 flex items-center transition-colors uppercase tracking-wider text-sm shadow-lg shadow-orange-900/50">
                <Save size={18} className="mr-2" /> Save Configuration
              </button>
            </div>
            
            {saveSuccess && (
              <div className="mt-4 p-3 bg-green-900/30 border border-green-800 text-green-400 rounded text-sm text-center font-bold flex items-center justify-center">
                <CheckCircle size={16} className="mr-2" /> Configuration successfully deployed to client instance.
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

// Add CheckCircle icon
import { CheckCircle } from 'lucide-react';
