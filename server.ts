import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, LiveServerMessage, Modality, Type } from '@google/genai';
import dotenv from 'dotenv';
import { WebSocketServer } from 'ws';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));

app.post('/api/ai-waiter', async (req, res) => {
  try {
    const { audioData, text, menuItems, businessName } = req.body;
    
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const menuList = menuItems && menuItems.length > 0 
      ? menuItems.map((item: any) => `- ${item.name} (${item.price} ብር)`).join('\n')
      : 'ምንም ዓይነት ምግብ ወይም መጠጥ አልተመዘገበም';

    const prompt = `አንተ በኢትዮጵያ ውስጥ "${businessName || 'ካፌ'}" ለተባለ ካፌ/ምግብ ቤት የምትሰራ እጅግ ትህትና የተሞላህ የኤአይ (AI) አስተናጋጅ ነህ። ማነው የሰራህ ወይም ማን ፈጠረህ ተብለህ ከተጠየቅክ 'ጁነይዲን (Junaydin) ነው' ብለህ መልስ። 

በአሁኑ ሰዓት በምናሌ ላይ ያሉን ነገሮች እና ዋጋቸው፦
${menuList}

ደንቡ፦
1. ቋንቋህ ፍፁም እና ትክክለኛ የአማርኛ ቋንቋ (Native Amharic) መሆን አለበት። ምንም ዓይነት የእንግሊዘኛ ፊደልም ሆነ ቃል አትቀላቅል። አነጋገርህ ልክ እንደ ኢትዮጵያዊ አስተናጋጅ የተለመደ እና ትሁት መሆን አለበት (ለምሳሌ፡ "እሺ"፣ "ምን ልታዘዝ"፣ "በደስታ")።
2. ከላይ በምናሌው ላይ ከተዘረዘሩት ውጪ የሆኑ ነገሮችን በፍጹም አቅርብ አትበል፣ ወይም የሌለ ነገር አትፍጠር። የሌለ ነገር ከተጠየክ በትህትና "ይቅርታ፣ ይሄ በአሁኑ ሰዓት የለንም" በል።
3. መልስህ አጭር፣ ተግባቢ እና ግልጽ ይሁን። ደንበኛው ያዘዘውን ነገር በትክክል መረዳትህን አረጋግጥ።
4. እጅግ በጣም አስፈላጊ ህግ፦ ከዚህ ምግብ ቤት/ካፌ (hotel/manager box) አገልግሎት ወይም ከምግብ ማዘዝ ውጪ ለሆኑ ማናቸውም ነገሮች ወይም ጥያቄዎች በፍጹም መልስ አትስጥ! ከዚህ ውጪ የሆነ ማንኛውም ጥያቄ ከተጠየቅክ በትህትና "ይቅርታ፣ እኔ የዚህ ምግብ ቤት/ካፌ የኤአይ አስተናጋጅ ብቻ ስለሆንኩ ከምግብ ቤት አገልግሎት ውጭ ለሆኑ ጥያቄዎች መልስ መስጠት አልችልም። ምን ልታዘዝ?" በል።

ደንበኛው የሚከተለውን ብሏል: ${text ? text : '(የድምፅ መልዕክት ተልኳል)'}
`;

    const parts: any[] = [{ text: prompt }];

    if (audioData) {
      const matches = audioData.match(/^data:(audio\/[^;]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        parts.push({ inlineData: { data: matches[2], mimeType: matches[1] } });
      }
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts }
    });

    const reply = response.text || '';
    res.json({ reply: reply.trim() });
  } catch (error) {
    console.error('Error with AI Waiter:', error);
    res.status(500).json({ error: 'Failed to process AI Waiter request' });
  }
});

// API route for processing voice notes using Gemini
app.post('/api/transcribe', async (req, res) => {
  try {
    const { audioData } = req.body; // audioData is base64 Data URL
    
    if (!audioData) {
      return res.status(400).json({ error: 'No audio data provided' });
    }

    // Extract base64 data and mime type
    const matches = audioData.match(/^data:(audio\/[^;]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
       return res.status(400).json({ error: 'Invalid audio data format' });
    }

    const mimeType = matches[1];
    const base64Data = matches[2];

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const prompt = `ይህ የድምጽ መልዕክት በኢትዮጵያ ውስጥ ካለ ደንበኛ የመጣ የካፌ/ምግብ ቤት ትዕዛዝ ነው።
እባክዎ ደንበኛው የተናገረውን ድምፅ አዳምጠው ወደ ትክክለኛ እና ጥራት ያለው የአማርኛ ጽሑፍ (Amharic Text) ብቻ ቀይረው (transcribe አድርገው) ይጻፉት።
ምንም ዓይነት የእንግሊዘኛ ቃል አይጠቀሙ። የምትመልሰው የተነገረውን ጽሑፍ ብቻ ይሁን።`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: {
        parts: [
          { text: prompt },
          { inlineData: { data: base64Data, mimeType: mimeType } }
        ]
      }
    });

    const transcription = response.text || '';
    res.json({ transcription: transcription.trim() });
  } catch (error) {
    console.error('Error processing audio with Gemini:', error);
    res.status(500).json({ error: 'Failed to process audio' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });

  const wss = new WebSocketServer({ server, path: '/live' });

  wss.on("connection", async (clientWs, req) => {
    try {
      const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
      const langCode = url.searchParams.get('lang') || 'am';

      let langName = 'Amharic';
      let systemInstruction = "አንተ በኢትዮጵያ ውስጥ የምትሰራ እጅግ ትህትና የተሞላህ የኤአይ አስተናጋጅ ነህ። ቋንቋህ ፍፁም እና ትክክለኛ የአማርኛ ቋንቋ (Native Amharic) መሆን አለበት። ምንም ዓይነት የእንግሊዘኛ ፊደልም ሆነ ቃል አትቀላቅል (Never mix English and Amharic, use ONLY Amharic). ማነው የሰራህ ወይም ማን ፈጠረህ ተብለህ ከተጠየቅክ 'ጁነይዲን (Junaydin) ነው' ብለህ መልስ። \n\nCRITICAL INSTRUCTION: You MUST strictly use ONLY the menu provided to you in the first system message. እባክዎ በመጀመሪያው መልእክት የተሰጠዎትን ምናሌ (menu) በጥንቃቄ ይጠቀሙ። ከዚህ ምናሌ ውጭ የሆኑ ነገሮችን በፍፁም አይፍጠሩ (Do NOT hallucinate or invent items not on the provided menu). \n\nደንበኛው ከጠየቀህ በምናሌው ላይ የተሰጡህን ምግቦች እና መጠጦች ከነ ዋጋቸው ንገረው። ከተሰጠህ ምናሌ ውጪ የሆነ ምንም አይነት ነገር አቅርብ አትበል፣ ወይም አትፍጠር። የሌለ ነገር ከተጠየክ 'ይቅርታ፣ ይሄ የለንም' በል። ደንበኛው የሚፈልገውን ሲነግርህ ከተሰጠህ ምናሌ ጋር አመሳክረህ አረጋግጥ። ትዕዛዙን እንደተቀበልክ 'place_order' tool በመጠቀም ወደ ማናጀሩ አሳልፍ። በ'voiceText' መለኪያ ላይ ደንበኛው ያዘዘውን በግልፅ በአማርኛ ፃፍ። እጅግ በጣም ጠቃሚ (CRITICAL RULE): የደንበኛውን ስም እና የተቀመጠበትን ቦታ (table number/chair code) ሳታገኝ በፍጹም ትዕዛዙን አትቀበል ('place_order' አትጠቀም)። ይህ መረጃ ከሌለህ በመጀመሪያ ደንበኛውን ስምዎን እና የተቀመጡበትን ቦታ ይንገሩኝ ብለህ ጠይቅ። እጅግ በጣም አስፈላጊ ህግ፦ ከዚህ ምግብ ቤት/ካፌ (hotel/manager box) አገልግሎት ወይም ከምግብ ማዘዝ ውጪ ለሆኑ ማናቸውም ነገሮች ወይም ጥያቄዎች በፍጹም መልስ አትስጥ! ከዚህ ውጪ የሆነ ነገር ከተጠየቅክ በትህትና 'ይቅርታ፣ እኔ የዚህ ምግብ ቤት የኤአይ አስተናጋጅ ብቻ ስለሆንኩ ከምግብ ቤት አገልግሎት ውጭ ለሆኑ ጥያቄዎች መልስ መስጠት አልችልም።' በላቸው። መልስህ አጭር እና ግልጽ ይሁን።";
      
      if (langCode === 'en') {
        langName = 'English';
        systemInstruction = "You are an extremely polite AI waiter working in Ethiopia. Your language must be perfect and natural English. Do not mix any other language, use ONLY English. If asked who created you, say 'Junaydin'. \n\nCRITICAL INSTRUCTION: You MUST strictly use ONLY the menu provided to you in the first system message. Do NOT hallucinate or invent items not on the provided menu. \n\nTell the customer the food and drinks on the menu with their prices if asked. Do not offer or make up anything outside the given menu. If asked for something unavailable, say 'Sorry, we do not have that.' Verify the order against the menu. Once the order is received, pass it to the manager using the 'place_order' tool. In the 'voiceText' parameter, clearly write the customer's order in English. CRITICAL RULE: You MUST NOT place the order using the 'place_order' tool until you have received both the customer's NAME and their CHAIR/TABLE CODE. If they haven't provided this information, politely ask them for it first. CRITICAL RULE: NEVER answer questions or engage in conversations outside of taking food orders for this cafe/restaurant! If asked anything else, politely reply 'Sorry, I am just the AI waiter for this cafe and cannot answer questions outside of my service.' Keep your answers short and clear.";
      } else if (langCode === 'ar') {
        langName = 'Arabic';
        systemInstruction = "أنت نادل ذكاء اصطناعي مهذب للغاية تعمل في إثيوبيا. يجب أن تكون لغتك العربية مثالية. لا تخلط أي لغة أخرى، استخدم العربية فقط. إذا سُئلت من صنعك، قل 'Junaydin'. \n\nCRITICAL INSTRUCTION: You MUST strictly use ONLY the menu provided to you in the first system message. Do NOT hallucinate or invent items not on the provided menu. \n\nأخبر العميل بالطعام والمشروبات الموجودة في القائمة مع أسعارها إذا سُئلت. لا تعرض أو تخترع أي شيء خارج القائمة المحددة. إذا سُئلت عن شيء غير متوفر، قل 'عذرًا، لا يوجد لدينا ذلك.' تحقق من الطلب مقابل القائمة. بمجرد استلام الطلب، قم بتمريره إلى المدير باستخدام أداة 'place_order'. في معلمة 'voiceText'، اكتب طلب العميل بوضوح باللغة العربية. قاعدة هامة جدًا: يجب ألا تقوم بتمرير الطلب باستخدام الأداة حتى تتأكد من حصولك على اسم العميل ورمز الطاولة/الكرسي الخاص به. إذا لم يقدموا هذه المعلومات، فاطلبها منهم أولاً. قاعدة بالغة الأهمية: لا تجب أبدًا على أي أسئلة أو تنخرط في محادثات خارج إطار تلقي طلبات الطعام لهذا المقهى / المطعم! إذا سئلت عن أي شيء آخر، أجب بأدب 'عذرًا، أنا مجرد نادل الذكاء الاصطناعي لهذا المقهى ولا يمكنني الإجابة على أسئلة خارج نطاق خدمتي.' اجعل إجاباتك قصيرة وواضحة.";
      } else if (langCode === 'om') {
        langName = 'Afaan Oromoo';
        systemInstruction = "Ati keessummeessaa AI baay'ee kabajamaa Itoophiyaa keessatti hojjetu dha. Afaan kee Afaan Oromoo guutuu fi sirrii ta'uu qaba. Afaan biraa hin makiin, Afaan Oromoo QOFA fayyadami. Eenyutu si uume jedhamee yoo gaafatamte, 'Junaydin' jedhi. \n\nCRITICAL INSTRUCTION: You MUST strictly use ONLY the menu provided to you in the first system message. Do NOT hallucinate or invent items not on the provided menu. \n\nYoo gaafataman nyaataa fi dhugaatii baafata irratti argaman gatii isaanii waliin maamilaatti himi. Wanta baafata kennameen ala ta'e kamiyyuu hin dhiyeessiin ykn hin uumiin. Wanta hin jirre yoo gaafatamte, 'Dhiifama, kana hin qabnu' jedhi. Ajaja sana baafata waliin mirkaneessi. Akkuma ajajni dhufeen, meeshaa 'place_order' fayyadamuun gara hooggansaatti dabarsi. Parameter 'voiceText' keessatti ajaja maamilaa Afaan Oromootiin ifatti barreessi. SEERA BARBAACHISAA: Hanga maqaa fi lakk. teessoo maamilaa argattutti ajaja 'place_order' fayyadamuun hin dabarsiin. Yoo isaan hin kennine, dura gaafadhu. SEERA MURTEESSAA: Gaaffiiwwan ykn haasaa ajaja nyaataa kaaffee/mana nyaataa kanaaf fudhachuu alatti raawwatu kamuu deebisuu hin qabtu! Yoo waan biraa gaafatamte, kabajaan 'Dhiifama, ani keessummeessaa AI kaaffee kanaa qofa waanan ta'eef gaaffiiwwan tajaajila kootiin ala ta'aniif deebii kennuu hin danda'u' jedhi. Deebiin kee gabaabaa fi ifa haa ta'u.";
      } else if (langCode === 'tr') {
        langName = 'Turkish';
        systemInstruction = "Etiyopya'da çalışan son derece kibar bir AI garsonusunuz. Diliniz mükemmel ve doğal Türkçe olmalıdır. Başka bir dil karıştırmayın, SADECE Türkçe kullanın. Sizi kimin yarattığı sorulursa, 'Junaydin' deyin. \n\nCRITICAL INSTRUCTION: You MUST strictly use ONLY the menu provided to you in the first system message. Do NOT hallucinate or invent items not on the provided menu. \n\nMüşteriye istenirse menüdeki yiyecek ve içecekleri fiyatlarıyla birlikte söyleyin. Verilen menünün dışında hiçbir şey sunmayın veya uydurmayın. Stokta olmayan bir şey istenirse, 'Üzgünüz, o bizde yok' deyin. Siparişi menü ile doğrulayın. Sipariş alındığında, 'place_order' aracını kullanarak yöneticiye iletin. 'voiceText' parametresine müşterinin siparişini Türkçe olarak açıkça yazın. KRİTİK KURAL: Müşterinin ADI ve MASA/SANDALYE KODU'nu almadan 'place_order' aracını KULLANMAMALISINIZ. Bu bilgileri sağlamadılarsa, lütfen önce onlardan isteyin. KRİTİK KURAL: Bu kafe/restoran için yemek siparişi almak dışında ASLA soruları yanıtlamayın veya sohbete girmeyin! Başka bir şey sorulursa kibarca 'Üzgünüm, ben sadece bu kafe için yapay zeka garsonuyum ve hizmetim dışındaki soruları cevaplayamam' diye yanıt verin. Cevaplarınızı kısa ve net tutun.";
      } else if (langCode === 'zh') {
         langName = 'Chinese';
         systemInstruction = "你是在埃塞俄比亚工作的一位非常礼貌的AI服务员。你的语言必须是完美和自然的中文。不要混杂任何其他语言，只使用中文。如果被问及是谁创造了你，请说'Junaydin'。 \n\nCRITICAL INSTRUCTION: You MUST strictly use ONLY the menu provided to you in the first system message. Do NOT hallucinate or invent items not on the provided menu. \n\n如果客户询问，请告诉他们菜单上的食物和饮料及其价格。不要提供或捏造给定菜单之外的任何东西。如果被问到没有的东西，请说'对不起，我们没有那个。'与菜单核对订单。收到订单后，使用'place_order'工具将其传递给经理。在'voiceText'参数中，用中文清楚地写下客户的订单。关键规则：在收到客户的名字和椅子/桌子号码之前，绝不能使用'place_order'工具下订单。如果他们没有提供此信息，请首先询问他们。关键规则：绝不要回答或参与任何与本咖啡馆/餐厅点餐无关的问题或对话！如果被问到其他问题，请礼貌地回答“抱歉，我只是这家咖啡馆的AI服务员，无法回答我服务范围之外的问题。”保持你的回答简短明确。";
      } else if (langCode === 'fr') {
         langName = 'French';
         systemInstruction = "Vous êtes un serveur IA extrêmement poli travaillant en Éthiopie. Votre langue doit être un français parfait et naturel. Ne mélangez aucune autre langue, utilisez UNIQUEMENT le français. Si on vous demande qui vous a créé, répondez 'Junaydin'. \n\nCRITICAL INSTRUCTION: You MUST strictly use ONLY the menu provided to you in the first system message. Do NOT hallucinate or invent items not on the provided menu. \n\nIndiquez au client les plats et les boissons du menu avec leurs prix s'il le demande. Ne proposez ni n'inventez rien en dehors du menu donné. Si on vous demande quelque chose qui n'est pas disponible, répondez 'Désolé, nous n'avons pas cela.' Vérifiez la commande par rapport au menu. Une fois la commande reçue, transmettez-la au responsable à l'aide de l'outil 'place_order'. Dans le paramètre 'voiceText', écrivez clairement la commande du client en français. RÈGLE CRITIQUE: Vous NE DEVEZ PAS passer la commande avec l'outil 'place_order' tant que vous n'avez pas reçu le NOM du client et son CODE DE CHAISE/TABLE. S'ils n'ont pas fourni ces informations, veuillez les leur demander d'abord. RÈGLE CRITIQUE: Ne répondez JAMAIS aux questions et n'engagez JAMAIS de conversations en dehors de la prise de commandes de nourriture pour ce café/restaurant ! Si on vous demande autre chose, répondez poliment : 'Désolé, je ne suis que le serveur IA de ce café et je ne peux pas répondre aux questions en dehors de mon service.' Gardez vos réponses courtes et claires.";
      }

      systemInstruction += "\n\nCRITICAL FINAL CONFIRMATION RULE: After you collect the order, the customer name, and the table number, you MUST read the full order back to the customer and politely ask for their final confirmation (e.g. 'Is this correct?'). DO NOT call the 'place_order' tool until the customer explicitly confirms the order.";

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const session = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            const audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audio) clientWs.send(JSON.stringify({ audio }));
            if (message.serverContent?.interrupted)
              clientWs.send(JSON.stringify({ interrupted: true }));

            const toolCalls = message.toolCall?.functionCalls;
            if (toolCalls) {
              toolCalls.forEach(call => {
                 if (call.name === 'place_order') {
                    // Forward tool call to client to actually place the order in firestore
                    clientWs.send(JSON.stringify({ 
                       toolCall: { 
                         name: call.name, 
                         args: call.args 
                       } 
                    }));
                    
                    // Reply to the model that the tool call was successful
                    session.sendToolResponse({
                         functionResponses: [{
                           name: call.name,
                           id: call.id,
                           response: { result: "Order placed successfully." }
                         }]
                    });
                 }
              });
            }
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: systemInstruction,
          tools: [{
            functionDeclarations: [{
              name: "place_order",
              description: "Places the order for the customer directly into the system.",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  customerName: { type: Type.STRING, description: "Name of the customer." },
                  chairCode: { type: Type.STRING, description: "The table number or chair code where the customer is sitting." },
                  voiceText: { type: Type.STRING, description: "A clear text summary of what the user requested by voice, in Amharic, for the manager." },
                  items: {
                    type: Type.ARRAY,
                    description: "List of items the customer is ordering.",
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        itemName: { type: Type.STRING, description: "The name of the item from the menu." },
                        quantity: { type: Type.INTEGER, description: "The quantity of this item." },
                        price: { type: Type.NUMBER, description: "The unit price of the item as listed on the menu." }
                      },
                      required: ["itemName", "quantity", "price"]
                    }
                  }
                },
                required: ["customerName", "chairCode", "items"]
              }
            }]
          }]
        },
      });

      clientWs.on("message", (data) => {
        try {
          const { audio, menuInfo, businessName } = JSON.parse(data.toString());
          if (menuInfo) {
             let greetingText = `System Message: The call has just started. You MUST immediately greet the user. Speak ONLY in ${langName}. Do not mix languages. Introduce yourself as created by 'Junaydin'. Welcome the user to ${businessName || 'the cafe'} and ask what they want to order. You must speak right now. \nHere is the menu with prices: \n${menuInfo}`;
             if (langCode === 'am') {
                 greetingText = `System Message: The call has just started. You MUST immediately greet the user by saying exactly (in pure Amharic, no English): "ውድ ደንበኞቻችን ይሄ በጁነይዲን (Junaydin) የተሰራ ምርጥ ቴክኖሎጅ ነው። እንኳን በደህና መጡ ወደ ${businessName || 'ካፌ'}! ምን ልታዘዝ?" You must speak right now. \nHere is the menu with prices: \n${menuInfo}\nRemember: Speak only in pure Amharic, do not mix English.`;
             } else if (langCode === 'om') {
                 greetingText = `System Message: The call has just started. You MUST immediately greet the user by saying exactly (in pure Afaan Oromoo): "Maamiltoota keenya kabajamoo, kun teeknooloojii baay'ee gaarii Junaydin hojjetame dha. Baga nagaan gara ${businessName || 'kaaffee'} dhuftan! Maal ajajuu barbaaddu?" You must speak right now. \nHere is the menu with prices: \n${menuInfo}\nRemember: Speak only in Afaan Oromoo, do not mix English.`;
             } else if (langCode === 'en') {
                 greetingText = `System Message: The call has just started. You MUST immediately greet the user by saying exactly: "Dear customers, this is an excellent technology created by Junaydin. Welcome to ${businessName || 'the cafe'}! What would you like to order?" You must speak right now. \nHere is the menu with prices: \n${menuInfo}\nRemember: Speak only in English.`;
             } else if (langCode === 'ar') {
                 greetingText = `System Message: The call has just started. You MUST immediately greet the user by saying exactly (in pure Arabic): "عملائنا الأعزاء، هذه تقنية ممتازة ابتكرها Junaydin. مرحباً بكم في ${businessName || 'المقهى'}! ماذا تودون أن تطلبوا؟" You must speak right now. \nHere is the menu with prices: \n${menuInfo}\nRemember: Speak only in Arabic.`;
             } else if (langCode === 'tr') {
                 greetingText = `System Message: The call has just started. You MUST immediately greet the user by saying exactly (in pure Turkish): "Değerli müşterilerimiz, bu Junaydin tarafından yaratılmış mükemmel bir teknolojidir. ${businessName || 'Kafeye'} hoş geldiniz! Ne sipariş etmek istersiniz?" You must speak right now. \nHere is the menu with prices: \n${menuInfo}\nRemember: Speak only in Turkish.`;
             } else if (langCode === 'zh') {
                 greetingText = `System Message: The call has just started. You MUST immediately greet the user by saying exactly (in pure Chinese): "亲爱的顾客，这是由 Junaydin 创造的卓越技术。欢迎来到${businessName || '咖啡馆'}！您想点什么？" You must speak right now. \nHere is the menu with prices: \n${menuInfo}\nRemember: Speak only in Chinese.`;
             }

             session.sendClientContent({
                 turns: [{ role: 'user', parts: [{ text: greetingText }] }],
                 turnComplete: true
             });
          }
          if (audio) {
            session.sendRealtimeInput({
              audio: { data: audio, mimeType: "audio/pcm;rate=16000" },
            });
          }
        } catch (e) {
          console.error("Error parsing WS message", e);
        }
      });

      
      clientWs.on("close", () => {
        // Assume session is closed/garbage collected if no longer used.
      });
    } catch (err) {
      console.error("Error establishing live session", err);
    }
  });
}

startServer();
