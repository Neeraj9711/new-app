import { GoogleGenerativeAI } from '@google/generative-ai';
import { formatKundliForAI } from './kundliService.js';

const geminiKey = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here'
  ? process.env.GEMINI_API_KEY
  : null;

const genAI = geminiKey ? new GoogleGenerativeAI(geminiKey) : null;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest';

function resolveLang(language) {
  return language === 'en' ? 'en' : 'hi';
}

const SYSTEM_PROMPTS = {
  hi: `आप पंडित जी हैं, Astro AI ऐप पर एक बुद्धिमान और करुणामय वैदिक ज्योतिषी।
आप हमेशा पूरी तरह से हिंदी (देवनागरी) में उत्तर दें। सम्मानजनक भाषा (आप) का प्रयोग करें।
वैदिक शब्दावली स्वाभाविक रूप से प्रयोग करें (कुंडली, ग्रह, नक्षत्र, दोष, लग्न, दशा)।

नियम:
- उपलब्ध होने पर उपयोगकर्ता की कुंडली विवरण का संदर्भ दें
- विवाह, करियर, स्वास्थ्य, वित्त, संतान/पुत्र-कन्या और अन्य विषयों पर व्यक्तिगत मार्गदर्शन दें
- हमेशा पहले उपयोगकर्ता के सटीक प्रश्न का उत्तर दें
- उत्तर के बाद एक प्रासंगिक अनुवर्ती प्रश्न पूछें
- पंचांग प्रश्नों (एकादशी, अमावस्या) पर तिथियां और आध्यात्मिक महत्व बताएं
- प्रोत्साहन दें पर ईमानदार रहें; उपाय (मंत्र, रत्न, उपवास) सुझाएं
- उत्तर संक्षिप्त रखें (2-4 पैराग्राफ), मोबाइल पर पढ़ने में आसान
- 100% निश्चितता का दावा न करें — "सितारे संकेत करते हैं", "आपकी कुंडली बताती है" जैसे वाक्य प्रयोग करें`,

  en: `You are Pandit Ji, a wise and compassionate Vedic astrologer on the Astro AI app.
You respond entirely in English. Use a warm, respectful tone.

Rules:
- Always reference the user's Kundli details when available (Sun sign, Moon sign, Lagna, Nakshatra, planetary positions)
- Give specific, thoughtful predictions about marriage, career, health, finance, children/progeny, and any topic the user asks
- ALWAYS answer the user's exact question first — do not give a generic reading when they ask something specific
- After answering, ALWAYS ask one relevant follow-up question to deepen the consultation
- For Panchang questions (Ekadashi, Amavasya, Purnima), provide dates and spiritual significance
- Be encouraging but honest. Mention remedies (mantras, gemstones, fasting) when appropriate
- Keep responses concise (2-4 paragraphs) and easy to read on mobile
- Never claim 100% certainty — use phrases like "the stars indicate", "your chart suggests"`,
};

const STEP_PROMPTS = {
  hi: {
    greeting: 'उपयोगकर्ता का गर्मजोशी से स्वागत करें। अपना परिचय पंडित जी के रूप में दें और जन्म तिथि (DD/MM/YYYY) पूछें।',
    dob: 'जन्म तिथि के लिए धन्यवाद। अब सटीक जन्म समय (जैसे 10:30 AM) पूछें। लग्न और भावों की गणना के लिए समय महत्वपूर्ण है।',
    birthTime: 'जन्म समय नोट कर लिया। अब जन्म स्थान (शहर, राज्य/देश) पूछें।',
    birthPlace: 'जन्म स्थान दर्ज हो गया और कुंडली तैयार है। जन्म कुंडली का संक्षिप्त सारांश (सूर्य, चंद्र, लग्न, नक्षत्र, दशा) दें, फिर उनकी समस्या या प्रश्न पूछें।',
    problem: 'उपयोगकर्ता अपनी समस्या या प्रश्न साझा कर रहा है। कुंडली पढ़कर सटीक प्रश्न का पहले उत्तर दें, फिर वैदिक अंतर्दृष्टि और उपाय दें। अंत में एक अनुवर्ती प्रश्न पूछें।',
    consultation: 'परामर्श जारी रखें। नवीनतम प्रश्न का कुंडली के आधार पर सीधा उत्तर दें। सामान्य पढ़ाई दोहराएं नहीं। अंत में एक अनुवर्ती प्रश्न पूछें।',
  },
  en: {
    greeting: `Greet the user warmly as Pandit Ji from Astro AI. Introduce yourself briefly and ask for their Date of Birth (DD/MM/YYYY or any format). Make it feel personal and welcoming.`,
    dob: `Thank them for sharing their date of birth. Now ask for their exact Birth Time (e.g., 10:30 AM). Explain that accurate time is important for Lagna and house calculations.`,
    birthTime: `Acknowledge the birth time. Now ask for their Place of Birth (city, state/country). Explain this helps with timezone and geographic coordinates for the Kundli.`,
    birthPlace: `The user's birth place has been recorded and their Kundli is now generated. Present a brief, warm summary of their birth chart (Sun, Moon, Lagna, Nakshatra, Dasha), then ask what concern or question they have.`,
    problem: `The user is sharing their concern or question. Read their Kundli and answer their EXACT question directly and specifically first. Then give Vedic astrological insight, remedies if relevant, and one follow-up question.`,
    consultation: `Continue the consultation. Answer the user's EXACT latest question directly first using their Kundli. Do not repeat generic life readings. End with one follow-up question.`,
  },
};

function detectQuestionTopic(message) {
  const lower = message.toLowerCase();
  if (/kids?|children|child|baby|babies|progeny|offspring|boy|girl|how many (kids|children|child)|बच्च|संतान|पुत्र|बेटा|बेटी/.test(lower)) return 'children';
  if (/marriage|wedding|spouse|love|relationship|partner|married|शादी|विवाह|पति|पत्नी/.test(lower)) return 'marriage';
  if (/job|career|work|business|profession|promotion|employ|करियर|नौकरी/.test(lower)) return 'career';
  if (/health|illness|medical|body|disease|sick|स्वास्थ्य|बीमार/.test(lower)) return 'health';
  if (/money|finance|wealth|income|loan|rich|property|धन|वित्त|पैसा/.test(lower)) return 'finance';
  if (/ekadashi|एकादशी/.test(lower)) return 'ekadashi';
  if (/amavasya|amavashya|अमावस/.test(lower)) return 'amavasya';
  if (/education|study|exam|college|university|पढ़ाई|शिक्षा/.test(lower)) return 'education';
  if (/travel|abroad|foreign|visa|relocate|विदेश/.test(lower)) return 'travel';
  return 'general';
}

function getChildrenReading(k, userMessage = '', lang = 'hi') {
  const lower = userMessage.toLowerCase();
  const jupiter = k?.planets?.Jupiter || 'Jupiter';
  const fifthLord = k?.planets?.Venus || 'Venus';
  const seed = (k?.sunSign?.length || 0) + (k?.nakshatra?.length || 0) + (k?.lagna?.length || 0);
  const counts = lang === 'hi'
    ? ['एक आशीर्वादित संतान', 'दो संतान', 'दो से तीन संतान']
    : ['one blessed child', 'two children', 'two to three children'];
  const count = counts[seed % 3];

  if (lang === 'hi') {
    let genderNote = '';
    if (/boy|son|male|बेटा|पुत्र/.test(lower)) {
      genderNote = `\n\n**बेटे** के संबंध में — मंगल और गुरु पंचम भाव को प्रभावित करते हैं। ${k?.sunSign} सूर्य और ${k?.lagna} लग्न के साथ, ${k?.currentDasha} दशा में पुत्र के योग बन रहे हैं।`;
    } else if (/girl|daughter|female|बेटी/.test(lower)) {
      genderNote = `\n\n**बेटी** के संबंध में — शुक्र और चंद्र पंचम भाव को शोभित करते हैं। आपका ${k?.moonSign} चंद्र और ${k?.nakshatra} नक्षत्र पुत्री के आशीर्वाद के अनुकूल हैं।`;
    }
    return `**संतान और पुत्र-कन्याओं** के विषय में — आपका पंचम भाव (पुत्र भाव) **${jupiter}** से प्रभावित है, **${fifthLord}** परिवार विस्तार को आकार देता है।\n\nआपके ${k?.sunSign || 'जन्म'} सूर्य, ${k?.lagna || 'उदय'} लग्न और ${k?.nakshatra || 'जन्म नक्षत्र'} नक्षत्र के आधार पर, सितारे **${count}** का संकेत देते हैं। ${k?.currentDasha || 'वर्तमान'} दशा आने वाले वर्षों में परिवार वृद्धि का समर्थन करती है।${genderNote}\n\nसंतान/गर्भधारण के शुभ समय अक्सर गुरु के पंचम या एकादश भाव में गोचर के साथ मेल खाते हैं।`;
  }

  let genderNote = '';
  if (/boy|son|male/.test(lower)) {
    genderNote = `\n\nRegarding a **baby boy** — Mars and Jupiter influence the 5th house. With ${k?.sunSign} Sun and ${k?.lagna} Lagna, the chart suggests favourable indications for a son, especially during ${k?.currentDasha} Dasha.`;
  } else if (/girl|daughter|female/.test(lower)) {
    genderNote = `\n\nRegarding a **baby girl** — Venus and Moon grace the 5th house. Your ${k?.moonSign} Moon and ${k?.nakshatra} Nakshatra favour the blessing of a daughter.`;
  }
  return `Regarding **children & progeny** — your 5th house (Putra Bhava) is influenced by **${jupiter}**, with **${fifthLord}** shaping family expansion.\n\nBased on your ${k?.sunSign || 'birth'} Sun, ${k?.lagna || 'rising'} Lagna, and ${k?.nakshatra || 'birth star'} Nakshatra, the stars indicate **${count}** in your destiny. ${k?.currentDasha || 'The current'} Dasha supports family growth in the coming years.${genderNote}\n\nFavourable periods for conception/children often align when Jupiter transits your 5th or 11th house.`;
}

function fallbackResponse(session, userMessage, step) {
  const lang = resolveLang(session.language);
  const kundli = session.kundli;
  const k = kundli;

  if (lang === 'hi') {
    if (step === 'greeting') {
      return `🙏 नमस्ते! मैं **पंडित जी** हूं, Astro AI पर आपका AI वैदिक ज्योतिषी।\n\nमैं आपकी कुंडली का अध्ययन करूंगा और जीवन के प्रश्नों में मार्गदर्शन दूंगा।\n\nशुरू करने के लिए, कृपया अपनी **जन्म तिथि** साझा करें (जैसे, 15/08/1995)।`;
    }
    if (step === 'dob') {
      return `धन्यवाद! आपकी जन्म तिथि नोट हो गई। 🌟\n\nअब कृपया अपना **सटीक जन्म समय** साझा करें (जैसे, 06:30 AM)। यह लग्न और 12 भावों की गणना के लिए आवश्यक है।`;
    }
    if (step === 'birthTime') {
      return `बहुत अच्छा! जन्म समय दर्ज हो गया। 📍\n\nकृपया अपना **जन्म स्थान** बताएं (शहर और देश, जैसे मुंबई, भारत)।`;
    }
  } else {
    if (step === 'greeting') {
      return `🙏 Namaste! I am **Pandit Ji**, your AI Vedic astrologer on Astro AI.\n\nI will study your Kundli and guide you through life's questions.\n\nTo begin, please share your **Date of Birth** (e.g., 15/08/1995).`;
    }
    if (step === 'dob') {
      return `Thank you! Your birth date is noted. 🌟\n\nNow please share your **exact Birth Time** (e.g., 06:30 AM). This is essential for calculating your Lagna and the 12 houses.`;
    }
    if (step === 'birthTime') {
      return `Wonderful! Birth time recorded. 📍\n\nPlease tell me your **Place of Birth** (city and country, e.g., Mumbai, India).`;
    }
  }

  if (step === 'birthPlace' && k) {
    const labels = lang === 'hi'
      ? { sun: 'सूर्य राशि', moon: 'चंद्र राशि', lagna: 'लग्न', nakshatra: 'नक्षत्र', dasha: 'वर्तमान दशा' }
      : { sun: 'Sun Sign', moon: 'Moon Sign', lagna: 'Lagna', nakshatra: 'Nakshatra', dasha: 'Current Dasha' };
    const header = lang === 'hi' ? '✨ आपकी कुंडली तैयार हो गई!' : '✨ Your Kundli has been generated!';
    const ask = lang === 'hi'
      ? 'अब, कृपया **अपनी समस्या या प्रश्न** साझा करें। 🔮'
      : 'Now, please share **your concern or question**. 🔮';
    return `${header}\n\n• ${labels.sun}: ${k.sunSign}\n• ${labels.moon}: ${k.moonSign}\n• ${labels.lagna}: ${k.lagna}\n• ${labels.nakshatra}: ${k.nakshatra}\n• ${labels.dasha}: ${k.currentDasha}\n\n${k.summary}\n\n${ask}`;
  }

  if (step === 'problem' || step === 'consultation') {
    const topic = detectQuestionTopic(userMessage);
    const isHi = lang === 'hi';

    if (topic === 'children') {
      const prediction = k ? getChildrenReading(k, userMessage, lang) : (isHi ? 'पंचम भाव संतान को नियंत्रित करता है। व्यक्तिगत पढ़ाई के लिए जन्म विवरण साझा करें।' : 'The 5th house governs children. Share birth details for a personalised reading.');
      const followUp = isHi ? 'क्या आप परिवार की योजना के लिए शुभ मुहूर्त जानना चाहेंगे?' : 'Would you like to know the most auspicious timing for planning a family?';
      return `🔮 ${prediction}\n\n💫 ${followUp}`;
    }

    if (topic === 'ekadashi') {
      return isHi
        ? `📿 **एकादशी** ग्यारहवां चंद्र दिवस है — उपवास और भगवान विष्णु की पूजा के लिए पवित्र।\n\nआगामी एकादशी तिथियां **पंचांग** अनुभाग में देखें।\n\n**उपाय:** एकादशी पर "ॐ नमो भगवते वासुदेवाय" 108 बार जप करें।\n\nक्या आप अगली एकादशी की तिथि जानना चाहेंगे?`
        : `📿 **Ekadashi** is the 11th lunar day — sacred for fasting and Lord Vishnu worship.\n\nCheck our **Panchang** section for upcoming dates.\n\n**Remedy:** Chant "Om Namo Bhagavate Vasudevaya" 108 times on Ekadashi.\n\nWould you like the next Ekadashi date?`;
    }

    if (topic === 'amavasya') {
      return isHi
        ? `🌑 **अमावस्या** पितृ तर्पण और आध्यात्मिक शुद्धि के लिए आदर्श है।\n\nअमावस्या पर नए कार्य शुरू करने से बचें। ध्यान, दान और पूर्वजों का सम्मान करें।\n\nक्या आप अपनी कुंडली में पितृ दोष के उपाय जानना चाहेंगे?`
        : `🌑 **Amavasya** (New Moon) is ideal for Pitru Tarpan and spiritual cleansing.\n\nAvoid starting new ventures on Amavasya. Meditate, donate, and honor ancestors.\n\nDo you wish to know remedies for Pitru Dosha in your Kundli?`;
    }

    const titles = {
      hi: { marriage: 'विवाह', career: 'करियर', health: 'स्वास्थ्य', finance: 'वित्त', education: 'शिक्षा', travel: 'विदेश यात्रा', general: 'आपका प्रश्न' },
      en: { marriage: 'marriage', career: 'career', health: 'health', finance: 'finance', education: 'education', travel: 'travel', general: 'your question' },
    };
    const title = titles[lang][topic] || titles[lang].general;
    const prediction = k?.predictions?.[topic]
      || (isHi
        ? `आपने पूछा: "${userMessage}"\n\nआपकी ${k?.sunSign || ''} सूर्य, ${k?.moonSign || ''} चंद्र और ${k?.nakshatra || ''} नक्षत्र के आधार पर — ${k?.currentDasha || ''} दशा सक्रिय है।`
        : `You asked: "${userMessage}"\n\nBased on your ${k?.sunSign} Sun, ${k?.moonSign} Moon, and ${k?.nakshatra} Nakshatra — ${k?.currentDasha} Dasha is active.`);
    const followUp = isHi ? 'क्या आप उपाय या शुभ समय जानना चाहेंगे?' : 'Would you like remedies or auspicious timings?';
    const header = isHi ? `**${title} के लिए पढ़ाई:**` : `**Reading for ${title}:**`;
    return `🔮 ${header}\n\n${prediction}\n\n💫 ${followUp}`;
  }

  return lang === 'hi'
    ? 'मैं आपका मार्गदर्शन करने के लिए यहां हूं। कृपया और विवरण साझा करें ताकि मैं आपके सितारे सही पढ़ सकूं। 🙏'
    : 'I am here to guide you. Please share more details so I can read your stars accurately. 🙏';
}

function buildGeminiContext(session, userMessage, step) {
  const lang = resolveLang(session.language);
  const kundliContext = formatKundliForAI(session.kundli);
  const stepInstruction = STEP_PROMPTS[lang]?.[step];
  let context = SYSTEM_PROMPTS[lang];

  if (kundliContext) context += `\n\n${kundliContext}`;
  if (stepInstruction) context += `\n\nCurrent conversation step: ${step}. Instruction: ${stepInstruction}`;
  context += `\n\nIMPORTANT: Respond ONLY in ${lang === 'hi' ? 'Hindi (Devanagari script)' : 'English'}. Match the user's selected app language.`;

  return context;
}

function buildGeminiHistory(session, userMessage) {
  const history = session.messages.slice(-10);
  const lastIsCurrent = history.at(-1)?.role === 'user' && history.at(-1)?.content === userMessage;
  let historyToSend = lastIsCurrent ? history.slice(0, -1) : history;
  const firstUserIdx = historyToSend.findIndex((msg) => msg.role === 'user');
  historyToSend = firstUserIdx === -1 ? [] : historyToSend.slice(firstUserIdx);
  return historyToSend.map((msg) => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }],
  }));
}

async function callGemini(session, userMessage, step) {
  const systemInstruction = buildGeminiContext(session, userMessage, step);
  const history = buildGeminiHistory(session, userMessage);
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction,
    generationConfig: { temperature: 0.8, maxOutputTokens: 4096 },
  });
  const chat = model.startChat({ history });
  const result = await chat.sendMessage(userMessage);
  return result.response.text();
}

export async function getAIResponse(session, userMessage, step) {
  if (!genAI) {
    return { content: fallbackResponse(session, userMessage, step), source: 'fallback' };
  }
  try {
    const content = (await callGemini(session, userMessage, step))?.trim();
    if (content) return { content, source: 'gemini' };
    return { content: fallbackResponse(session, userMessage, step), source: 'fallback' };
  } catch (err) {
    console.error('Gemini error:', err.message);
    return { content: fallbackResponse(session, userMessage, step), source: 'fallback', error: err.message };
  }
}

export async function getQuickAnswer(question, kundli = null, language = 'hi') {
  const lang = resolveLang(language);
  if (!genAI) {
    return fallbackResponse({ kundli, messages: [], language: lang }, question, 'consultation');
  }
  const kundliContext = formatKundliForAI(kundli);
  const prompt = `${kundliContext ? kundliContext + '\n\n' : ''}User question: ${question}`;
  try {
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction: SYSTEM_PROMPTS[lang],
      generationConfig: { temperature: 0.8, maxOutputTokens: 4096 },
    });
    const result = await model.generateContent(prompt);
    return result.response.text() || fallbackResponse({ kundli, language: lang }, question, 'consultation');
  } catch {
    return fallbackResponse({ kundli, language: lang }, question, 'consultation');
  }
}

export { GEMINI_MODEL };
