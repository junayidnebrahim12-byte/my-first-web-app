import { useState, useEffect, useRef, FormEvent, ChangeEvent } from 'react';
import { collection, onSnapshot, query, orderBy, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useBusiness } from '../lib/BusinessContext';
import { MenuItem, Order } from '../types';
import { Trash2, Edit2, EyeOff, Eye, Plus, CheckCircle, Clock, Image as ImageIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ManagerDashboard() {
  const { settings, updateSettings, loading: settingsLoading } = useBusiness();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const navigate = useNavigate();
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');

  // Settings Form State
  const [bName, setBName] = useState('');
  const [mName, setMName] = useState('');
  const [acc, setAcc] = useState('');
  const [phone, setPhone] = useState('');
  const [hotelImageUrl, setHotelImageUrl] = useState('');

  // Menu Form State
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemImage, setNewItemImage] = useState('');

  const previousOrderCount = useRef(0);
  const knownOrders = useRef<Set<string>>(new Set());
  const isInitialOrderLoad = useRef(true);
  const audioContext = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (settings) {
      setBName(settings.name);
      setMName(settings.managerName);
      setAcc(settings.accountNumber);
      setPhone(settings.phone);
      setHotelImageUrl(settings.hotelImageUrl || '');
    }
  }, [settings]);

  useEffect(() => {
    const unsubItems = onSnapshot(collection(db, 'menuItems'), (snapshot) => {
      const fetchedItems: MenuItem[] = [];
      snapshot.forEach((doc) => {
        fetchedItems.push({ id: doc.id, ...doc.data() } as MenuItem);
      });
      setItems(fetchedItems);
    });

    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubOrders = onSnapshot(q, (snapshot) => {
      const fetchedOrders: Order[] = [];
      let newPendingOrders: Order[] = [];
      
      snapshot.forEach((doc) => {
        const order = { id: doc.id, ...doc.data() } as Order;
        fetchedOrders.push(order);
        
        if (order.status === 'pending' && !knownOrders.current.has(order.id!)) {
          knownOrders.current.add(order.id!);
          if (!isInitialOrderLoad.current) {
            newPendingOrders.push(order);
          }
        }
      });
      
      if (!isInitialOrderLoad.current && newPendingOrders.length > 0) {
        playBeep();
        
        // Speak all new orders
        newPendingOrders.forEach(o => {
          const orderItemsText = (o.items && o.items.length > 0) ? o.items.map(i => `${i.quantity || 1} ${i.name}`).join('፣ ') : '';
          let newOrderText = `ማሳሰቢያ! አዲስ ትዕዛዝ ገብቷል። ከ ደንበኛ ${o.customerName || 'ያልታወቀ'}፣ ጠረጴዛ ቁጥር ${o.chairCode || 'ያልተገለጸ'}።`;
          if (orderItemsText) newOrderText += ` ያዘዙት፣ ${orderItemsText}።`;
          if (o.voiceText) newOrderText += ` ማብራሪያ: ${o.voiceText}`;
          
          try {
            if ("speechSynthesis" in window) {
              const utterance = new SpeechSynthesisUtterance(newOrderText);
              utterance.lang = "am-ET";
              utterance.volume = 1.0;
              window.speechSynthesis.speak(utterance);
            }
          } catch (speechErr) {
            console.error("Speech synthesis failed", speechErr);
          }
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

  const playBeep = () => {
    try {
      const audioCtx = audioContext.current;
      if (audioCtx) {
        if (audioCtx.state === "suspended") audioCtx.resume();
        
        // Play a single clear notification tone
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
        oscillator.stop(audioCtx.currentTime + 0.8);
      }
    } catch (e) {
      console.error("Audio beep failed", e);
    }
  };

  const handleSaveSettings = async (e: FormEvent) => {
    e.preventDefault();
    await updateSettings({ name: bName, managerName: mName, accountNumber: acc, phone, hotelImageUrl });
    alert('Settings saved!');
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 400;
          const MAX_HEIGHT = 400;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          setNewItemImage(dataUrl);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddMenuItem = async (e: FormEvent) => {
    e.preventDefault();
    if (!newItemName || !newItemPrice) return;
    const newDoc = doc(collection(db, 'menuItems'));
    await setDoc(newDoc, {
      name: newItemName,
      price: parseFloat(newItemPrice),
      available: true,
      category: 'General',
      imageUrl: newItemImage || null
    });
    setNewItemName('');
    setNewItemPrice('');
    setNewItemImage('');
  };

  const toggleAvailability = async (id: string, current: boolean) => {
    await updateDoc(doc(db, 'menuItems', id), { available: !current });
  };

  const deleteMenuItem = async (id: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      await deleteDoc(doc(db, 'menuItems', id));
    }
  };

  const markOrderComplete = async (id: string) => {
    await updateDoc(doc(db, 'orders', id), { status: 'completed' });
  };

  const deleteOrder = async (id: string) => {
    if (confirm('Are you sure you want to delete this order history?')) {
      await deleteDoc(doc(db, 'orders', id));
    }
  };

  const dailyTotal = orders
    .filter(o => o.status === 'completed')
    .reduce((sum, order) => {
      const t = Number(order.total);
      return sum + (isNaN(t) ? 0 : t);
    }, 0);

  if (settingsLoading) return <div>Loading...</div>;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-stone-100 p-4 flex flex-col items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-stone-200 w-full max-w-sm text-center">
          <h2 className="text-2xl font-bold mb-4 text-stone-800">Manager Access</h2>
          <p className="text-sm text-stone-500 mb-6">Enter PIN to access dashboard (Default: 1234)</p>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (pinInput === (settings?.managerPin || '1234')) {
              setIsAuthenticated(true);
              if (!audioContext.current) {
                audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
              }
              if (audioContext.current.state === 'suspended') {
                audioContext.current.resume();
              }
            } else {
              alert('Incorrect PIN');
              setPinInput('');
            }
          }}>
            <input type="password" placeholder="Enter PIN" value={pinInput} onChange={e => setPinInput(e.target.value)} className="w-full p-3 text-center tracking-widest text-xl bg-stone-50 border rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-orange-500" autoFocus />
            <button type="submit" className="w-full bg-orange-600 text-white py-3 rounded-lg font-bold hover:bg-orange-700 transition-colors">Login</button>
          </form>
          <button onClick={() => navigate('/')} className="mt-6 text-stone-500 hover:text-stone-700 underline text-sm">Back to Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-stone-800">Manager Dashboard</h1>
            <p className="text-stone-500">Manage your coffee shop operations</p>
          </div>
          <div className="flex items-center gap-4">
             <button onClick={playBeep} className="text-sm text-stone-400 underline" title="Test audio (requires user interaction first)">Test Sound</button>
             <button onClick={() => navigate('/')} className="bg-stone-200 text-stone-700 px-4 py-2 rounded-lg font-bold hover:bg-stone-300 text-sm">Sign Out</button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Settings & Menu Management (Left Col) */}
          <div className="lg:col-span-1 space-y-8">
            
            {/* Business Settings */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
              <h2 className="text-lg font-bold mb-4 flex items-center"><Edit2 size={18} className="mr-2"/> Business Profile</h2>
              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Business Name</label>
                  <input type="text" value={bName} onChange={e => setBName(e.target.value)} className="w-full p-2 bg-stone-50 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Manager Name</label>
                  <input type="text" value={mName} onChange={e => setMName(e.target.value)} className="w-full p-2 bg-stone-50 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Account Number</label>
                  <input type="text" value={acc} onChange={e => setAcc(e.target.value)} className="w-full p-2 bg-stone-50 border rounded-lg" />
                </div>
                <div>
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
                </div>
                <button type="submit" className="w-full bg-stone-800 text-white py-2 rounded-lg font-medium">Save Profile</button>
              </form>
            </div>

            {/* Menu Management */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
              <h2 className="text-lg font-bold mb-4 flex items-center"><Plus size={18} className="mr-2"/> Menu Management</h2>
              
              <form onSubmit={handleAddMenuItem} className="flex flex-col space-y-2 mb-6">
                <div className="flex space-x-2">
                  <input type="text" placeholder="Item name" value={newItemName} onChange={e => setNewItemName(e.target.value)} className="flex-1 p-2 bg-stone-50 border rounded-lg text-sm" />
                  <input type="number" placeholder="Price" value={newItemPrice} onChange={e => setNewItemPrice(e.target.value)} className="w-20 p-2 bg-stone-50 border rounded-lg text-sm" />
                </div>
                <div className="flex space-x-2 items-center">
                  <label className="flex-1 cursor-pointer bg-stone-50 border rounded-lg p-2 text-sm text-stone-500 hover:bg-stone-100 flex items-center justify-center border-dashed">
                    <ImageIcon size={16} className="mr-2" />
                    {newItemImage ? 'Image Selected' : 'Upload Food Image'}
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                  </label>
                  {newItemImage && (
                    <div className="w-10 h-10 rounded-lg overflow-hidden border border-stone-200 flex-shrink-0">
                       <img src={newItemImage} className="w-full h-full object-cover" alt="Preview" />
                    </div>
                  )}
                  <button type="submit" className="bg-orange-600 text-white p-2 rounded-lg font-bold w-12 flex justify-center hover:bg-orange-700 transition-colors"><Plus size={20}/></button>
                </div>
              </form>

              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {items.map(item => (
                  <div key={item.id} className={`p-3 border rounded-xl flex justify-between items-center ${!item.available ? 'bg-stone-50 opacity-60' : 'bg-white'}`}>
                    <div className="flex items-center space-x-3">
                      {item.imageUrl && (
                        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-stone-100 border border-stone-200">
                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-stone-800 text-sm">{item.name}</p>
                        <p className="text-orange-700 font-medium text-xs">{item.price} Br</p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button onClick={() => toggleAvailability(item.id!, item.available)} className="p-2 bg-stone-100 rounded-lg text-stone-600 hover:bg-stone-200">
                        {item.available ? <Eye size={16}/> : <EyeOff size={16}/>}
                      </button>
                      <button onClick={() => deleteMenuItem(item.id!)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100">
                        <Trash2 size={16}/>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Orders Stream (Right Col) */}
          <div className="lg:col-span-2">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 h-full">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold flex items-center"><Clock size={20} className="mr-2 text-orange-600"/> Live Orders</h2>
                <div className="flex items-center space-x-4">
                  <div className="bg-stone-100 px-3 py-1 rounded-lg border border-stone-200">
                     <span className="text-xs text-stone-500 font-bold uppercase tracking-wider mr-2">Today's Total:</span>
                     <span className="font-black text-orange-600">{dailyTotal.toFixed(2)} Br</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm font-medium">
                    <span className="flex h-3 w-3 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                    <span>Receiving</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {orders.map(order => (
                  <div key={order.id} className={`p-4 rounded-xl border ${order.status === 'pending' ? 'border-orange-200 bg-orange-50/50 shadow-sm' : 'border-stone-200 bg-stone-50 opacity-70'}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-lg">{order.customerName}</h3>
                        <p className="text-orange-800 font-bold bg-orange-100 px-2 py-0.5 rounded text-sm inline-block mt-1">
                          Chair / Table: {order.chairCode}
                        </p>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <p className="font-bold text-xl">{(Number(order.total) || 0).toFixed(2)} Br</p>
                        {order.status === 'pending' ? (
                          <button onClick={() => markOrderComplete(order.id!)} className="mt-2 text-sm bg-green-600 text-white px-3 py-1 rounded-full flex items-center hover:bg-green-700">
                            <CheckCircle size={14} className="mr-1"/> Complete
                          </button>
                        ) : (
                          <div className="flex items-center mt-2 space-x-2">
                             <span className="text-sm text-stone-500 flex items-center"><CheckCircle size={14} className="mr-1"/> Done</span>
                             <button onClick={() => deleteOrder(order.id!)} className="text-red-500 hover:text-red-700 p-1 bg-red-50 rounded-md hover:bg-red-100 transition-colors" title="Delete History">
                               <Trash2 size={16} />
                             </button>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-lg p-3 border border-stone-100">
                      <ul className="space-y-1">
                        {(order.items || []).map((item, idx) => (
                          <li key={idx} className="flex justify-between text-sm">
                            <span><span className="font-bold text-stone-400 mr-2">{item.quantity || 1}x</span> {item.name || 'Unknown Item'}</span>
                            <span className="text-stone-500">{((Number(item.price) || 0) * (Number(item.quantity) || 1)).toFixed(2)} Br</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {(order.receiptImageUrl || order.voiceText) && (
                      <div className="mt-3 flex gap-4">
                        {order.receiptImageUrl && (
                          <div className="bg-white p-2 rounded border border-stone-200 inline-block">
                            <p className="text-xs text-stone-500 font-bold mb-1 uppercase tracking-wider">Receipt</p>
                            <img src={order.receiptImageUrl} alt="Receipt" className="max-w-[120px] rounded cursor-pointer hover:opacity-90" onClick={() => window.open(order.receiptImageUrl, '_blank')} />
                          </div>
                        )}
                        {order.voiceText && (
                          <div className="bg-white p-2 rounded border border-stone-200 inline-block flex-1 max-w-[250px]">
                            <p className="text-xs text-stone-500 font-bold mb-1 uppercase tracking-wider">Voice Text Summary</p>
                            <p className="text-sm font-semibold text-stone-700 mt-1 bg-stone-50 p-2 rounded">{order.voiceText}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {orders.length === 0 && (
                  <div className="text-center py-12 text-stone-400 border-2 border-dashed rounded-xl">
                    No orders yet.
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
