import { useState, useEffect, FormEvent, useRef, ChangeEvent } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useLanguage } from '../lib/LanguageContext';
import { useBusiness } from '../lib/BusinessContext';
import { Language, MenuItem, OrderItem } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingCart, Plus, Minus, User, MapPin, Volume2, Camera, Mic, Square, MessageSquare, Send, X, PhoneCall } from 'lucide-react';

function pcmToBase64(pcmData: Float32Array) {
  let pcm16Buffer = new Int16Array(pcmData.length);
  for (let i = 0; i < pcmData.length; i++) {
    let s = Math.max(-1, Math.min(1, pcmData[i]));
    pcm16Buffer[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  let uint8Array = new Uint8Array(pcm16Buffer.buffer);
  
  let binary = '';
  let len = uint8Array.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return window.btoa(binary);
}

export default function MenuPage() {
  const { t, language, setLanguage } = useLanguage();
  const { settings, loading } = useBusiness();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [chairCode, setChairCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [comment, setComment] = useState('');
  const [commentSubmitted, setCommentSubmitted] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);

  const [receiptImage, setReceiptImage] = useState<string>('');
  const [isRecording, setIsRecording] = useState(false);
  const [audioData, setAudioData] = useState<string>('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);

  // Refs to avoid stale closures in startLiveCall and ws handlers
  const itemsRef = useRef<MenuItem[]>([]);
  const settingsRef = useRef<any>(null);
  const languageRef = useRef<string>('am');

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  // Live Call states
  const [isLiveCallActive, setIsLiveCallActive] = useState(false);
  const liveWsRef = useRef<WebSocket | null>(null);
  const liveAudioStreamRef = useRef<MediaStream | null>(null);
  const liveNextStartTimeRef = useRef<number>(0);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);

  const startLiveCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      liveAudioStreamRef.current = stream;

      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${window.location.host}/live?lang=${languageRef.current}`;
      const ws = new WebSocket(wsUrl);
      liveWsRef.current = ws;

      const inputAudioCtx = new AudioContext({ sampleRate: 16000 });
      inputAudioCtxRef.current = inputAudioCtx;
      
      const outputAudioCtx = new AudioContext({ sampleRate: 24000 });
      outputAudioCtxRef.current = outputAudioCtx;

      liveNextStartTimeRef.current = 0;

      const source = inputAudioCtx.createMediaStreamSource(stream);
      const processor = inputAudioCtx.createScriptProcessor(4096, 1, 1);
      source.connect(processor);
      processor.connect(inputAudioCtx.destination);

      processor.onaudioprocess = (e) => {
        if (ws.readyState === WebSocket.OPEN) {
          const base64 = pcmToBase64(e.inputBuffer.getChannelData(0));
          ws.send(JSON.stringify({ audio: base64 }));
        }
      };

      ws.onopen = () => {
        const availableItems = items ? items.filter((item: any) => item.available) : [];
        const menuList = availableItems.length > 0 
           ? availableItems.map((item: any) => `- ${item.name} (${item.price} ብር)`).join('\n')
           : 'ምንም ዓይነት ምግብ ወይም መጠጥ አልተመዘገበም';
        ws.send(JSON.stringify({ 
           menuInfo: menuList,
           businessName: settings?.name || 'ካፌ' 
        }));
      };

      ws.onmessage = async (event) => {
        const msg = JSON.parse(event.data);
        if (msg.toolCall) {
          const { name, args } = msg.toolCall;
          if (name === 'place_order') {
            try {
              const matchedItems: OrderItem[] = [];
              let total = 0;

              // Helper function to robustly match items across languages (English, Amharic, Oromo, etc.)
              const findMenuItem = (itemName: string) => {
                const cleanName = itemName.toLowerCase().trim();
                
                // 1. Try exact match
                let found = items.find(i => i.name.toLowerCase().trim() === cleanName);
                if (found) return found;

                // 2. Try substring match (e.g., "macchiato" matches "double macchiato")
                found = items.find(i => {
                  const dbName = i.name.toLowerCase().trim();
                  return dbName.includes(cleanName) || cleanName.includes(dbName);
                });
                if (found) return found;

                // 3. Dictionary lookup for common Ethiopian/standard cafe items in English & Amharic
                const dict: Record<string, string[]> = {
                  'coffee': ['coffee', 'ቡና', 'bunna', 'coffe', 'ኮፊ', 'buna', 'ቡናማ'],
                  'tea': ['tea', 'ሻይ', 'shai', 'shay', 'ቲ'],
                  'macchiato': ['macchiato', 'ማኪያቶ', 'makiato', 'makiatoo', 'machato'],
                  'burger': ['burger', 'በርገር'],
                  'spris': ['spris', 'ስፕሪስ', 'espris', 'juice', 'ጁስ'],
                  'water': ['water', 'ውሃ', 'waha', 'wiha', 'ውሀ'],
                  'milk': ['milk', 'ወተት', 'wetet', 'ሚልክ'],
                  'soft drink': ['soft drink', 'soft', 'ለስላሳ', 'coke', 'ኮካ', 'fanta', 'ፋንታ', 'ስፕራይት'],
                  'beer': ['beer', 'ቢራ', 'bira']
                };

                for (const aliases of Object.values(dict)) {
                  const matchesRequested = aliases.some(alias => cleanName.includes(alias) || alias.includes(cleanName));
                  if (matchesRequested) {
                    const matchedDbItem = items.find(i => {
                      const dbName = i.name.toLowerCase().trim();
                      return aliases.some(alias => dbName.includes(alias) || alias.includes(dbName));
                    });
                    if (matchedDbItem) return matchedDbItem;
                  }
                }

                return null;
              };

              // Map AI recognized items to actual menu items
              args.items?.forEach((argItem: any) => {
                const menuItem = findMenuItem(argItem.itemName);
                if (menuItem) {
                   matchedItems.push({ ...menuItem, quantity: argItem.quantity });
                   total += (menuItem.price * argItem.quantity);
                } else {
                   // Item not found in DB exactly, but AI recognized it. Add it as a generic item so it's not lost.
                   const aiPrice = Number(argItem.price) || 0;
                   matchedItems.push({
                      id: 'unknown-' + Date.now() + Math.random(),
                      name: argItem.itemName,
                      price: aiPrice,
                      quantity: argItem.quantity
                   });
                   total += (aiPrice * argItem.quantity);
                }
              });

              if (matchedItems.length > 0) {
                // Automatically confirm and save order to Firestore
                addDoc(collection(db, 'orders'), {
                  customerName: args.customerName,
                  chairCode: args.chairCode || 'Smart Call Order',
                  items: matchedItems,
                  total,
                  status: 'pending',
                  receiptImageUrl: null,
                  voiceNoteUrl: null,
                  voiceText: args.voiceText || '',
                  createdAt: serverTimestamp()
                }).then((docRef) => {
                  setCurrentOrderId(docRef.id);
                  setOrderSuccess(true);
                  setCustomerName(args.customerName);
                  setChairCode(args.chairCode || 'Smart Call Order');
                }).catch(err => console.error("Error auto-confirming voice order:", err));

                // Let AI say goodbye then stop the call
                setTimeout(() => {
                   stopLiveCall();
                }, 3000);
              }
            } catch (err) {
              console.error("Error placing order from AI tool:", err);
            }
          }
        }
        if (msg.audio && outputAudioCtxRef.current) {
          const audioCtx = outputAudioCtxRef.current;
          const binaryString = window.atob(msg.audio);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const pcm16 = new Int16Array(bytes.buffer);
          const audioBuffer = audioCtx.createBuffer(1, pcm16.length, 24000);
          const channelData = audioBuffer.getChannelData(0);
          for (let i = 0; i < pcm16.length; i++) {
            channelData[i] = pcm16[i] / 32768.0;
          }
          const bufferSource = audioCtx.createBufferSource();
          bufferSource.buffer = audioBuffer;
          bufferSource.connect(audioCtx.destination);
          
          const currentTime = audioCtx.currentTime;
          if (liveNextStartTimeRef.current < currentTime) {
            liveNextStartTimeRef.current = currentTime;
          }
          bufferSource.start(liveNextStartTimeRef.current);
          liveNextStartTimeRef.current += audioBuffer.duration;
        }
        if (msg.interrupted) {
          liveNextStartTimeRef.current = 0;
        }
      };

      setIsLiveCallActive(true);
    } catch (err) {
      console.error("Error starting live call", err);
      alert("Microphone access is required for the live call.");
    }
  };

  const stopLiveCall = () => {
    setIsLiveCallActive(false);
    if (liveWsRef.current) {
      liveWsRef.current.close();
      liveWsRef.current = null;
    }
    if (liveAudioStreamRef.current) {
      liveAudioStreamRef.current.getTracks().forEach(track => track.stop());
      liveAudioStreamRef.current = null;
    }
    if (inputAudioCtxRef.current) {
      inputAudioCtxRef.current.close();
      inputAudioCtxRef.current = null;
    }
    if (outputAudioCtxRef.current) {
      outputAudioCtxRef.current.close();
      outputAudioCtxRef.current = null;
    }
  };

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'menuItems'), (snapshot) => {
      const fetchedItems: MenuItem[] = [];
      snapshot.forEach((doc) => {
        fetchedItems.push({ id: doc.id, ...doc.data() } as MenuItem);
      });
      setItems(fetchedItems);
    });
    return () => unsub();
  }, []);

  const hasAutoStartedCall = useRef(false);

  useEffect(() => {
    // We no longer automatically start the live call.
    // The user must explicitly click the phone button.
  }, [loading, settings, items, isLiveCallActive]);

  useEffect(() => {
    // Restart live call if language changes
    if (isLiveCallActive && hasAutoStartedCall.current) {
      stopLiveCall();
      const timer = setTimeout(() => {
        startLiveCall();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [language]);


  const handleAdd = (item: MenuItem) => {
    setOrderItems(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { id: item.id!, name: item.name, price: item.price, quantity: 1 }];
    });
  };

  const handleRemove = (itemId: string) => {
    setOrderItems(prev => {
      const existing = prev.find(i => i.id === itemId);
      if (existing && existing.quantity > 1) {
        return prev.map(i => i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i);
      }
      return prev.filter(i => i.id !== itemId);
    });
  };

  const total = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleReceiptChange = (e: ChangeEvent<HTMLInputElement>) => {
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
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          setReceiptImage(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitOrder = async (e: FormEvent) => {
    e.preventDefault();
    if (!customerName || !chairCode || orderItems.length === 0) return;
    
    setSubmitting(true);
    try {
      const docRef = await addDoc(collection(db, 'orders'), {
        customerName,
        chairCode,
        items: orderItems,
        total,
        status: 'pending',
        receiptImageUrl: null,
        voiceNoteUrl: null,
        voiceText: null,
        createdAt: serverTimestamp()
      });
      setCurrentOrderId(docRef.id);
      setOrderSuccess(true);
      setOrderItems([]);
    } catch (error) {
      console.error("Error submitting order: ", error);
    }
    setSubmitting(false);
  };

  const handleSubmitComment = async (e: FormEvent) => {
    e.preventDefault();
    if (!comment && !receiptImage) return;
    try {
      if (currentOrderId) {
        const updateData: any = {};
        if (comment) updateData.comment = comment;
        if (receiptImage) updateData.receiptImageUrl = receiptImage;
        await updateDoc(doc(db, 'orders', currentOrderId), updateData);
      }
      if (comment) {
        await addDoc(collection(db, 'feedback'), {
          customerName,
          comment,
          createdAt: serverTimestamp()
        });
      }
      setCommentSubmitted(true);
    } catch (error) {
      console.error("Error submitting comment: ", error);
    }
  };

  const languages: { code: Language; name: string; nativeName: string }[] = [
    { code: 'am', name: 'አማርኛ', nativeName: 'AMHARIC' },
    { code: 'ar', name: 'العربية', nativeName: 'ARABIC' },
    { code: 'en', name: 'English', nativeName: 'ENGLISH' },
    { code: 'om', name: 'Afaan Oromoo', nativeName: 'OROMO' },
    { code: 'tr', name: 'Türkçe', nativeName: 'TURKISH' },
    { code: 'zh', name: '中文', nativeName: 'CHINESE' },
    { code: 'fr', name: 'Français', nativeName: 'FRENCH' }
  ];

  if (loading) return <div className="p-8 text-center text-stone-900 bg-orange-50 min-h-screen">Loading...</div>;

  return (
    <div className="min-h-screen bg-orange-50 font-sans text-stone-900 flex flex-col">
      {/* Header */}
      <header className="bg-orange-600 text-white p-6 flex flex-col md:flex-row justify-between items-center shadow-md gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
            <span className="text-orange-600 text-2xl">☕</span>
          </div>
          <div className="text-center md:text-left">
            <h1 className="text-2xl font-black uppercase tracking-tight">{t('welcomeTo')} {settings?.name}</h1>
            <p className="text-xs opacity-90">{t('managerName')}: {settings?.managerName} | {t('phone')}: {settings?.phone}</p>
          </div>
        </div>
        
        <div className="flex flex-wrap justify-center gap-2">
          {languages.map(lang => (
            <button 
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              className={`px-3 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors ${
                language === lang.code 
                  ? 'bg-white border-white text-orange-600 shadow-lg' 
                  : 'bg-white/20 border border-white/30 text-white hover:bg-white/40'
              }`}
            >
              {lang.name}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row gap-6 p-6 max-w-7xl mx-auto w-full">
        <div className="flex-1 flex flex-col gap-6">
          {orderSuccess ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-2xl shadow-sm border border-green-200 text-center max-w-xl mx-auto w-full">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShoppingCart size={32} />
              </div>
              <h2 className="text-2xl font-bold text-stone-800 mb-2">{t('orderSuccess')}</h2>
              <p className="text-stone-600 mb-6">{t('thankYou')}</p>
              
              {!commentSubmitted ? (
                <form onSubmit={handleSubmitComment} className="text-left mt-6 pt-6 border-t border-stone-100 flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <h4 className="text-xs font-black uppercase text-orange-400">{t('leaveComment')}</h4>
                    <textarea 
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="w-full h-24 bg-stone-50 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 border-none resize-none"
                      placeholder="..."
                    />
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <h4 className="text-xs font-black uppercase text-orange-400">Payment Screenshot / Bill Image</h4>
                    <div className="relative">
                      <label className="flex items-center justify-center gap-2 w-full px-3 py-3 bg-stone-100 hover:bg-stone-200 rounded-xl text-sm font-bold text-stone-700 cursor-pointer transition-colors border border-stone-200">
                        <Camera size={18} />
                        {receiptImage ? t('receiptAttached') : t('attachReceipt')}
                        <input type="file" accept="image/*" className="hidden" onChange={handleReceiptChange} />
                      </label>
                      {receiptImage && (
                        <div className="absolute right-2 top-2 w-8 h-8 rounded overflow-hidden bg-stone-800 border border-stone-500">
                          <img src={receiptImage} alt="Receipt" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                  </div>

                  <button type="submit" disabled={!comment && !receiptImage} className="w-full mt-2 bg-orange-600 text-white py-3 rounded-xl font-bold hover:bg-orange-700 transition-colors disabled:bg-stone-300 disabled:text-stone-500">
                    {t('submitComment')}
                  </button>
                </form>
              ) : (
                <div className="text-green-600 font-bold bg-green-50 p-4 rounded-xl">Feedback submitted successfully.</div>
              )}
              
              <button 
                onClick={() => { setOrderSuccess(false); setCustomerName(''); setChairCode(''); setCommentSubmitted(false); setComment(''); }}
                className="mt-6 text-orange-600 font-bold underline"
              >
                New Order
              </button>
            </motion.div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-black uppercase text-stone-800">{t('menu')}</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {items.map(item => (
                  <div key={item.id} className={item.available 
                    ? "bg-white p-4 rounded-2xl shadow-sm border-2 border-orange-100 flex flex-col justify-between hover:border-orange-500 transition-colors group"
                    : "bg-stone-100 p-4 rounded-2xl border-2 border-dashed border-stone-300 flex flex-col items-center justify-center text-stone-400"
                  }>
                    {item.available ? (
                      <>
                        <div className="flex justify-between items-start mb-2">
                          {item.imageUrl ? (
                            <div className="w-16 h-16 rounded-xl overflow-hidden bg-stone-100 border-2 border-stone-100 shadow-sm">
                              <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <span className="text-4xl">☕</span>
                          )}
                          <span className="bg-orange-100 text-orange-700 font-black px-2 py-1 rounded text-lg italic">{item.price.toFixed(2)} Br</span>
                        </div>
                        <div>
                          <h3 className="text-xl font-bold">{item.name}</h3>
                          {/* We don't have descriptions in MenuItem schema, but we show the item name */}
                        </div>
                        
                        <div className="mt-4 flex items-center justify-between">
                           {orderItems.find(i => i.id === item.id) ? (
                              <div className="flex items-center space-x-3 bg-orange-100 rounded-xl p-1 w-full justify-between">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleRemove(item.id!); }}
                                  className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-orange-600 shadow-sm font-bold active:scale-95"
                                >
                                  <Minus size={20} />
                                </button>
                                <span className="font-black text-orange-800 w-8 text-center text-lg">{orderItems.find(i => i.id === item.id)?.quantity || 0}</span>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleAdd(item); }}
                                  className="w-10 h-10 rounded-lg bg-orange-600 flex items-center justify-center text-white shadow-sm font-bold active:scale-95"
                                >
                                  <Plus size={20} />
                                </button>
                              </div>
                           ) : (
                              <button 
                                onClick={() => handleAdd(item)}
                                className="w-full bg-orange-600 text-white font-bold py-2 rounded-xl hover:bg-orange-700 transition-colors flex items-center justify-center gap-2"
                              >
                                <Plus size={18} /> {t('addToOrder')}
                              </button>
                           )}
                        </div>
                      </>
                    ) : (
                      <>
                        {item.imageUrl ? (
                          <div className="w-16 h-16 rounded-xl overflow-hidden bg-stone-200 border-2 border-stone-200 shadow-sm grayscale opacity-60 mb-2">
                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <span className="text-4xl grayscale mb-2 opacity-60">☕</span>
                        )}
                        <h3 className="text-xl font-bold mb-2 opacity-60">{item.name}</h3>
                        <span className="mt-2 px-3 py-1 bg-stone-200 rounded text-xs uppercase font-black">{t('unavailable')}</span>
                      </>
                    )}
                  </div>
                ))}
                {items.length === 0 && (
                  <div className="col-span-1 sm:col-span-2 text-center p-8 text-stone-500 bg-white rounded-2xl border border-dashed border-stone-300 font-bold">
                    {t('noItems')}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Sidebar / Order Form */}
        {!orderSuccess && (
          <aside className="w-full lg:w-[350px] flex flex-col gap-6">
            <div className="bg-stone-900 text-white p-6 rounded-3xl shadow-xl flex flex-col gap-4 sticky top-6">
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center font-bold text-white text-xl">
                    <User size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] text-stone-400 uppercase">Customer Form</p>
                    <p className="font-bold">{t('yourOrder')}</p>
                  </div>
                </div>
              </div>
              
              <hr className="border-white/10" />

              <form onSubmit={handleSubmitOrder} className="space-y-4">
                <div>
                  <p className="text-[10px] text-stone-400 uppercase mb-1">{t('customerName')}</p>
                  <input 
                    type="text" 
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Enter your name"
                  />
                </div>
                <div>
                  <p className="text-[10px] text-stone-400 uppercase mb-1">{t('chairCode')}</p>
                  <input 
                    type="text" 
                    required
                    value={chairCode}
                    onChange={(e) => setChairCode(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="E.g. Table 5, B-04"
                  />
                </div>
                
                <div className="bg-stone-800 p-4 rounded-2xl mt-4">
                  <p className="text-xs font-bold mb-3 border-b border-stone-700 pb-1">Current Selection</p>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {orderItems.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center">
                        <span className="text-sm"><span className="text-orange-400 font-bold">{item.quantity}x</span> {item.name}</span>
                        <span className="text-sm font-bold">{(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                    {orderItems.length === 0 && (
                      <p className="text-sm text-stone-500 italic">No items selected.</p>
                    )}
                  </div>
                  <div className="flex justify-between items-center text-orange-400 text-lg font-black mt-4 pt-3 border-t border-stone-700">
                    <span>{t('total').toUpperCase()}</span>
                    <span>{total.toFixed(2)} ETB</span>
                  </div>
                </div>

                <div className="flex flex-col gap-3 mt-4">
                  {settings?.accountNumber && (
                    <div className="bg-stone-800 p-4 rounded-xl border border-stone-700 text-center">
                      <p className="text-xs text-stone-400 mb-1">የክፍያ ሂሳብ ቁጥር (CBE Account Number)</p>
                      <p className="text-2xl font-mono font-bold text-orange-400 tracking-wider">{settings.accountNumber}</p>
                      {settings.managerName && <p className="text-sm text-stone-300 mt-1">ስም: {settings.managerName}</p>}
                    </div>
                  )}
                  
                  <div className="flex flex-col gap-2 mt-2">
                    <p className="text-[10px] text-stone-400 uppercase mb-1">Payment Screenshot / Bill Image</p>
                    <div className="relative">
                      <label className="flex items-center justify-center gap-2 w-full px-3 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-bold text-white cursor-pointer transition-colors border border-white/10">
                        <Camera size={18} />
                        {receiptImage ? t('receiptAttached') : t('attachReceipt')}
                        <input type="file" accept="image/*" className="hidden" onChange={handleReceiptChange} />
                      </label>
                      {receiptImage && (
                        <div className="absolute right-2 top-2 w-8 h-8 rounded overflow-hidden bg-stone-800 border border-stone-500">
                          <img src={receiptImage} alt="Receipt" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={orderItems.length === 0 || !customerName || !chairCode || submitting}
                  className="w-full mt-4 bg-orange-600 hover:bg-orange-500 disabled:bg-stone-700 disabled:text-stone-500 text-white font-black py-4 rounded-xl transition-colors active:scale-[0.98] shadow-md uppercase tracking-wide"
                >
                  {submitting ? '...' : t('submitOrder')}
                </button>
              </form>

            </div>

            <div className="flex-1 bg-red-100 rounded-3xl border-2 border-red-500 p-4 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-white fill-current" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
              </div>
              <h3 className="text-red-700 font-black uppercase tracking-tighter">Exit Alert Active</h3>
              <p className="text-red-600 text-[10px] mt-1">System will trigger <strong>BEEP SOUND</strong> for manager if customer leaves without payment.</p>
            </div>
          </aside>
        )}
      </main>
      
      <footer className="bg-stone-900 py-3 px-6 text-white/50 text-[10px] flex justify-between border-t border-white/10">
        <p>© 2024 Project One Platform - Professional Digital Restaurant System</p>
        <p className="font-mono hidden md:block">SYSTEM STATUS: READY | ENCRYPTED | QR_ACTIVE</p>
      </footer>

      {/* Live AI Call Floating Button */}
      <button 
        onClick={startLiveCall}
        className="fixed bottom-6 right-6 w-14 h-14 bg-orange-600 hover:bg-orange-500 rounded-full shadow-2xl flex items-center justify-center text-white z-40 transition-transform hover:scale-105 active:scale-95 border-2 border-white/20 animate-pulse"
      >
        <PhoneCall size={24} />
      </button>

      {/* Live Call Overlay */}
      <AnimatePresence>
        {isLiveCallActive && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-stone-900/95 z-50 flex flex-col items-center justify-center text-white"
          >
            <div className="w-24 h-24 bg-orange-600 rounded-full flex items-center justify-center mb-8 relative">
              <div className="absolute inset-0 bg-orange-500 rounded-full animate-ping opacity-50"></div>
              <PhoneCall size={40} className="text-white relative z-10" />
            </div>
            <h2 className="text-2xl font-bold mb-2">ኤአይ አስተናጋጅ ጋር እየተነጋገሩ ነው</h2>
            <p className="text-stone-400 mb-12">ያለ ምንም ቁልፍ ይናገሩ (Listening...)</p>
            
            <button 
              onClick={stopLiveCall}
              className="w-16 h-16 bg-red-600 hover:bg-red-500 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95"
            >
              <X size={28} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>


    </div>
  );
}
