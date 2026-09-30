import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { formatKundliForAI } from './kundliService.js';

const geminiKey = (() => {
  const raw = String(process.env.GEMINI_API_KEY || '').trim();
  if (!raw || raw === 'your_gemini_api_key_here') return null;
  return raw;
})();

const openaiKey = (() => {
  const raw = String(process.env.OPENAI_API_KEY || '').trim();
  if (!raw || raw === 'your_openai_api_key_here') return null;
  return raw;
})();

const genAI = geminiKey ? new GoogleGenerativeAI(geminiKey) : null;
const GEMINI_MODEL = String(process.env.GEMINI_MODEL || 'gemini-1.5-pro').trim() || 'gemini-1.5-pro';

const openai = openaiKey ? new OpenAI({ apiKey: openaiKey }) : null;
const OPENAI_MODEL = String(process.env.OPENAI_MODEL || 'gpt-4o-mini').trim() || 'gpt-4o-mini';

export function getAiProvider() {
  if (genAI) return 'gemini';
  if (openai) return 'gpt';
  return 'fallback';
}

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
- हमेशा पहले उपयोगकर्ता के सटीक प्रश्न का उत्तर दें — सामान्य कुंडली सारांश से शुरुआत न करें
- उत्तर 4 से 6 पूरे पैराग्राफ में लिखें। प्रत्येक पैराग्राफ 4–6 वाक्य का हो। एक-दो पंक्ति का उत्तर कभी न दें
- पहले पैराग्राफ में सीधे प्रश्न का उत्तर, फिर भाव/ग्रह/दशा, फिर समय, फिर उपाय, अंत में एक अनुवर्ती प्रश्न
- पंचांग प्रश्नों (एकादशी, अमावस्या) पर तिथियां और आध्यात्मिक महत्व बताएं
- प्रोत्साहन दें पर ईमानदार रहें; ठोस उपाय (मंत्र, रत्न, उपवास, दान) विस्तार से सुझाएं
- 100% निश्चितता का दावा न करें — "सितारे संकेत करते हैं", "आपकी कुंडली बताती है" जैसे वाक्य प्रयोग करें`,

  en: `You are Pandit Ji, a wise and compassionate Vedic astrologer on the Astro AI app.
You respond entirely in English. Use a warm, respectful tone.

Rules:
- Always reference the user's Kundli details when available (Sun sign, Moon sign, Lagna, Nakshatra, planetary positions)
- Give specific, thoughtful predictions about marriage, career, health, finance, children/progeny, and any topic the user asks
- ALWAYS answer the user's exact question first in the opening sentences — never open with a generic chart dump or a canned horoscope
- Write 4 to 6 full paragraphs. Each paragraph must have 4–6 sentences. Never give a one-line or two-line reply
- Structure: (1) direct answer, (2) houses, planets and dasha from THIS chart, (3) likely timing, (4) practical remedies in detail, (5) one follow-up question in the last paragraph
- For Panchang questions (Ekadashi, Amavasya, Purnima), provide dates and spiritual significance
- Be encouraging but honest. Mention remedies (mantras, gemstones, fasting, daan) with how and when to do them
- Never claim 100% certainty — use phrases like "the stars indicate", "your chart suggests"`,
};

const STEP_PROMPTS = {
  hi: {
    greeting: 'उपयोगकर्ता का गर्मजोशी से स्वागत करें। अपना परिचय पंडित जी के रूप में दें और जन्म तिथि (DD/MM/YYYY) पूछें।',
    dob: 'जन्म तिथि के लिए धन्यवाद। अब सटीक जन्म समय (जैसे 10:30 AM) पूछें। लग्न और भावों की गणना के लिए समय महत्वपूर्ण है।',
    birthTime: 'जन्म समय नोट कर लिया। अब जन्म स्थान (शहर, राज्य/देश) पूछें।',
    birthPlace: 'जन्म स्थान दर्ज हो गया और कुंडली तैयार है। 4 पूरे पैराग्राफ में कुंडली समझाएं (सूर्य, चंद्र, लग्न, नक्षत्र, दशा, ग्रह) फिर प्रश्न पूछें। एक सूची भर न दें।',
    problem: 'उपयोगकर्ता अपनी समस्या या प्रश्न साझा कर रहा है। 4–6 पूरे पैराग्राफ में विस्तृत वैदिक पढ़ाई दें — सीधा उत्तर, कुंडली, समय, उपाय, फिर एक प्रश्न।',
    consultation: 'परामर्श जारी रखें। नवीनतम प्रश्न का 4–6 पैराग्राफ में विस्तृत उत्तर दें। एक-पंक्ति जवाब मना है।',
  },
  en: {
    greeting: `Greet the user warmly as Pandit Ji from Astro AI. Introduce yourself briefly and ask for their Date of Birth (DD/MM/YYYY or any format). Make it feel personal and welcoming.`,
    dob: `Thank them for sharing their date of birth. Now ask for their exact Birth Time (e.g., 10:30 AM). Explain that accurate time is important for Lagna and house calculations.`,
    birthTime: `Acknowledge the birth time. Now ask for their Place of Birth (city, state/country). Explain this helps with timezone and geographic coordinates for the Kundli.`,
    birthPlace: `The birth place is recorded and the Kundli is ready. Write 4 full paragraphs explaining this chart (Sun, Moon, Lagna, Nakshatra, Dasha, planets and what to ask next). Do not give a short bullet list.`,
    problem: `The user is sharing their concern. Write a FULL consultation of 4–6 paragraphs: answer the exact question, explain houses/planets/dasha from this Kundli, give timing, give remedies, then one follow-up. Do not write a short template.`,
    consultation: `Continue the consultation in 4–6 full paragraphs. Answer the latest question in depth using this Kundli. One-line answers are forbidden.`,
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

function planetLine(k) {
  const p = k?.planets || {};
  return `Sun in ${k?.sunSign}, Moon in ${k?.moonSign}, Mars in ${p.Mars || '—'}, Mercury in ${p.Mercury || '—'}, Jupiter in ${p.Jupiter || '—'}, Venus in ${p.Venus || '—'}, Saturn in ${p.Saturn || '—'}`;
}

function detailedTopicReading(k, topic, userMessage, lang) {
  const sun = k?.sunSign || 'your Sun sign';
  const moon = k?.moonSign || 'your Moon sign';
  const lagna = k?.lagna || 'your Lagna';
  const nak = k?.nakshatra || 'your Nakshatra';
  const dasha = k?.currentDasha || 'the current';
  const place = k?.birthDetails?.birthPlace || '';
  const planets = planetLine(k);
  const q = String(userMessage || '').trim();

  if (lang === 'hi') {
    const openings = {
      career: `आपने करियर के बारे में पूछा${q ? ` — “${q}”` : ''}। आपकी कुंडली में **${lagna} लग्न** और **${sun} सूर्य** दशम भाव (कर्म भाव) को दिशा देते हैं। ${dasha} दशा सक्रिय है, इसलिए पेशे में बदलाव या प्रगति अक्सर इसी चक्र से जुड़ती है।`,
      marriage: `विवाह के प्रश्न पर कुंडली साफ संकेत देती है। सप्तम भाव (विवाह भाव) **${moon} चंद्र** और शुक्र की स्थिति से प्रभावित है। ${lagna} लग्न वाले जातकों में विवाह का योग धैर्य और सही समय दोनों मांगता है।`,
      health: `स्वास्थ्य के लिए षष्ठ भाव और लग्न दोनों देखे जाते हैं। **${sun} सूर्य** शरीर की ऊर्जा दिखाता है और **${moon} चंद्र** मन-नींद को। ${dasha} दशा में दिनचर्या सुधारना फलदायी रहता है।`,
      finance: `धन के लिए द्वितीय और एकादश भाव देखे जाते हैं। **${sun} सूर्य** और **${dasha} दशा** आय के स्रोत को रंग देते हैं। अचानक दौलत से अधिक स्थिर बचत का योग दिखता है।`,
      education: `पंचम भाव विद्या और बुद्धि का कारक है। **${nak} नक्षत्र** सीखने की शैली बताता है। ${dasha} दशा परीक्षा या नए कोर्स के लिए सहयोगी हो सकती है।`,
      travel: `नवम और द्वादश भाव विदेश व यात्रा दिखाते हैं। ${lagna} लग्न और ${dasha} दशा के साथ यात्रा का समय चुनना बेहतर रहता है।`,
      general: `आपका प्रश्न कुंडली के साथ पढ़ा गया है। **${sun} सूर्य, ${moon} चंद्र, ${lagna} लग्न, ${nak} नक्षत्र** और **${dasha} दशा** मिलकर वर्तमान मार्ग बनाते हैं।`,
    };
    const body2 = `जन्म स्थान ${place || 'आपके बताए स्थान'} के साथ ग्रह स्थिति इस प्रकार है: ${planets}। लग्न **${lagna}** जीवन की बाहरी शैली है, चंद्र **${moon}** मन की प्रतिक्रिया, सूर्य **${sun}** उद्देश्य। नक्षत्र **${nak}** बताता है कि आप निर्णय कैसे लेते हैं — जल्दी, धीरे या चक्रों में।`;
    const body3 = `समय के विषय में — ${dasha} महादशा में बड़े निर्णय 3–6 महीनों की खिड़की में पकते दिखते हैं, पूर्ण फल अक्सर 12–18 महीने में स्थिर होता है। शुक्र/गुरु गोचर जब लग्न या संबंधित भाव को छूते हैं, तब अवसर साफ दिखते हैं। राहु-केतु काल में जल्दबाजी से बचें।`;
    const remedies = `उपाय व्यावहारिक रखें: प्रातः सूर्य नमस्कार या 12 सूर्य नमस्कार, सोमवार को चंद्र के लिए सफेद दान (चावल/दूध), और दशम भाव के लिए शनिवार को तेल-अन्न दान। मंत्र — करियर हेतु “ॐ सूर्याय नमः”, विवाह हेतु “ॐ शुं शुक्राय नमः”, स्वास्थ्य हेतु “ॐ चंद्राय नमः” — 108 जप, 21 दिन। रत्न बिना ज्योतिषी की सलाह के न पहनें; पहले पंचमुखी रुद्राक्ष या चांदी की अंगूठी सरल विकल्प है।`;
    const follow = {
      career: 'क्या आप नौकरी बदलना चाहते हैं, व्यापार, या वर्तमान पद पर प्रमोशन?',
      marriage: 'क्या आप विवाह की समय-सीमा जानना चाहते हैं, या कुंडली मिलान/दोष?',
      health: 'क्या कोई विशेष अंग या तनाव है जिस पर विस्तार से पढ़ाई चाहिए?',
      finance: 'क्या प्रश्न नौकरी की आय, संपत्ति, या कर्ज से जुड़ा है?',
      education: 'किस परीक्षा या विषय में मार्गदर्शन चाहिए?',
      travel: 'देश के भीतर यात्रा है या विदेश बसने का विचार?',
      general: 'करियर, विवाह, स्वास्थ्य या धन — आगे किस विषय को विस्तार दें?',
    };
    return `🔮 ${openings[topic] || openings.general}\n\n${body2}\n\n${body3}\n\n${remedies}\n\n💫 ${follow[topic] || follow.general}`;
  }

  const openings = {
    career: `On **career**, your chart does not point to a vague “good job” line — it shows a path. With **${lagna} Lagna** and **${sun} Sun**, the 10th house (Karma Bhava) is the seat of work, status and calling. **${dasha} Dasha** is running, so promotions, a switch, or a new field usually ripen in this cycle rather than overnight.`,
    marriage: `On **marriage**, the 7th house, Venus and the Moon decide timing more than a lucky guess. Your **${moon} Moon** shows emotional readiness and **${lagna} Lagna** shows how you appear as a partner. The stars indicate a union that lasts when you do not rush the first promising match.`,
    health: `On **health**, vitality is read from Lagna and the 6th house. **${sun} Sun** rules stamina; **${moon} Moon** rules sleep and the nervous system. During **${dasha} Dasha**, small daily discipline helps more than a single ritual.`,
    finance: `On **money**, the 2nd house (savings) and 11th house (gains) matter together. **${sun} Sun** and **${dasha} Dasha** colour how income arrives — usually steady accumulation rather than a sudden jackpot.`,
    education: `On **studies**, the 5th house and Mercury/Jupiter show intellect. **${nak} Nakshatra** describes how you learn. **${dasha} Dasha** can support exams, a course or a skill if you keep a fixed routine.`,
    travel: `On **travel and abroad**, the 9th and 12th houses speak. With **${lagna} Lagna** and **${dasha} Dasha**, journeys for work or dharma tend to succeed more than impulsive trips.`,
    general: `I have read your question with this Kundli: **${sun} Sun, ${moon} Moon, ${lagna} Lagna, ${nak} Nakshatra**, and **${dasha} Dasha**. That combination is the lens for the answer below.`,
  };
  const body2 = `Birth place **${place || 'the place you shared'}** is noted. Planetary sketch: ${planets}. Lagna **${lagna}** is how the world meets you; Moon **${moon}** is how you feel under pressure; Sun **${sun}** is purpose. Nakshatra **${nak}** shows whether you decide fast, slowly, or in repeating cycles. Use this map — do not ignore a weak house just because a YouTube clip named your Sun sign.`;
  const body3 = `**Timing:** In ${dasha} Mahadasha, important results often appear in a 3–6 month window and settle over 12–18 months. When Jupiter or Venus transits Lagna or the house of the question, doors open more clearly. Avoid signing major papers only in a Rahu-Ketu rush. If you asked “soon”, the chart suggests movement in this dasha, not a promise of next week.`;
  const remedies = `**Remedies (do these, do not only hear them):** 12 Surya Namaskar or morning sunlight on the face; Monday white daan (rice or milk) for the Moon; Saturday oil/grain daan if work feels blocked by Saturn. Mantras for 21 days, 108 times — career: “Om Suryaya Namah”; marriage: “Om Shum Shukraya Namah”; health: “Om Chandraya Namah”. Do not buy a gemstone from a shop push; a simple panchmukhi rudraksha or silver ring is safer until a skilled jyotishi checks your chart. Fasting on the weekday of the concerned planet (Sunday Sun, Monday Moon, Friday Venus) helps more than fear.`;
  const follow = {
    career: 'Shall I read job-change, business, or promotion in your current role next?',
    marriage: 'Do you want timing of marriage, matching, or a specific dosha next?',
    health: 'Is there a particular organ, sleep issue, or stress you want read in depth?',
    finance: 'Is the question about salary, property, or debt?',
    education: 'Which exam or subject should we open next?',
    travel: 'Is this domestic travel or settling abroad?',
    general: 'Which area should we open next — career, marriage, health, or money?',
  };
  return `🔮 ${openings[topic] || openings.general}\n\n${body2}\n\n${body3}\n\n${remedies}\n\n💫 ${follow[topic] || follow.general}`;
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
    const p = k.planets || {};
    if (lang === 'hi') {
      return `✨ आपकी कुंडली तैयार हो गई है — यह केवल एक राशि-सूची नहीं, एक पूरा नक्शा है।

**${k.sunSign} सूर्य** आपके उद्देश्य और बाहरी पहचान को दिखाता है, **${k.moonSign} चंद्र** मन और प्रतिक्रिया को, **${k.lagna} लग्न** दुनिया आपको कैसे देखती है। **${k.nakshatra} नक्षत्र** निर्णय की गति बताता है और **${k.currentDasha} दशा** वर्तमान समय का स्वामी है। जन्म स्थान **${k.birthDetails?.birthPlace || ''}** दर्ज है।

ग्रह स्थिति: सूर्य ${k.sunSign}, चंद्र ${k.moonSign}, मंगल ${p.Mars || '—'}, बुध ${p.Mercury || '—'}, गुरु ${p.Jupiter || '—'}, शुक्र ${p.Venus || '—'}, शनि ${p.Saturn || '—'}। ${k.summary} दशम भाव कर्म/करियर, सप्तम भाव विवाह, षष्ठ भाव स्वास्थ्य, द्वितीय-एकादश धन से जुड़े हैं — अगला प्रश्न इन्हीं घरों से पढ़ा जाएगा।

अब विस्तार से पूछें: करियर, विवाह का समय, स्वास्थ्य, धन, संतान, या विदेश। जितना साफ प्रश्न होगा, पढ़ाई उतनी गहरी होगी। 🔮`;
    }
    return `✨ Your Kundli has been generated — this is a full map, not a one-line Sun-sign note.

**${k.sunSign} Sun** shows purpose and outer identity. **${k.moonSign} Moon** shows mind, sleep and how you react under pressure. **${k.lagna} Lagna** is how the world meets you. **${k.nakshatra} Nakshatra** describes the pace of your decisions, and **${k.currentDasha} Dasha** is the time-lord running now. Birth place **${k.birthDetails?.birthPlace || ''}** is recorded.

Planets in this chart: Sun ${k.sunSign}, Moon ${k.moonSign}, Mars ${p.Mars || '—'}, Mercury ${p.Mercury || '—'}, Jupiter ${p.Jupiter || '—'}, Venus ${p.Venus || '—'}, Saturn ${p.Saturn || '—'}. ${k.summary} The 10th house will be used for career, the 7th for marriage, the 6th for health, and the 2nd/11th for money — so the next question is read from those houses, not from a generic horoscope.

Ask one clear question next: career path, marriage timing, health, finances, children, or travel abroad. The more specific the question, the deeper the reading. 🔮`;
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

    return detailedTopicReading(k, topic, userMessage, lang);
  }

  return lang === 'hi'
    ? 'मैं आपका मार्गदर्शन करने के लिए यहां हूं। कृपया और विवरण साझा करें ताकि मैं आपके सितारे सही पढ़ सकूं। 🙏'
    : 'I am here to guide you. Please share more details so I can read your stars accurately. 🙏';
}

function buildSystemContext(session, step) {
  const lang = resolveLang(session.language);
  const kundliContext = formatKundliForAI(session.kundli);
  const stepInstruction = STEP_PROMPTS[lang]?.[step];
  let context = SYSTEM_PROMPTS[lang];

  if (kundliContext) context += `\n\n${kundliContext}`;
  if (stepInstruction) context += `\n\nCurrent conversation step: ${step}. Instruction: ${stepInstruction}`;
  context += `\n\nIMPORTANT: Respond ONLY in ${lang === 'hi' ? 'Hindi (Devanagari script)' : 'English'}. Match the user's selected app language.`;

  return context;
}

function buildChatHistory(session, userMessage) {
  const history = session.messages.slice(-10);
  const lastIsCurrent = history.at(-1)?.role === 'user' && history.at(-1)?.content === userMessage;
  let historyToSend = lastIsCurrent ? history.slice(0, -1) : history;
  const firstUserIdx = historyToSend.findIndex((msg) => msg.role === 'user');
  historyToSend = firstUserIdx === -1 ? [] : historyToSend.slice(firstUserIdx);
  return historyToSend.map((msg) => ({
    role: msg.role === 'user' ? 'user' : 'assistant',
    content: msg.content,
  }));
}

async function callGemini(session, userMessage, step) {
  const history = buildChatHistory(session, userMessage).map((msg) => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }],
  }));
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: buildSystemContext(session, step),
    generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
  });
  const chat = model.startChat({ history });
  const result = await chat.sendMessage(userMessage);
  return result.response.text();
}

async function callGpt(session, userMessage, step) {
  const result = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    temperature: 0.6,
    max_tokens: 2500,
    messages: [
      { role: 'system', content: buildSystemContext(session, step) },
      ...buildChatHistory(session, userMessage),
      { role: 'user', content: userMessage },
    ],
  });
  return result.choices?.[0]?.message?.content || '';
}

export async function getAIResponse(session, userMessage, step) {
  let lastError = null;
  if (genAI) {
    try {
      const content = (await callGemini(session, userMessage, step))?.trim();
      if (content) return { content, source: 'gemini' };
    } catch (err) {
      lastError = err.message;
      console.error('Gemini error:', err.message);
    }
  }
  if (openai) {
    try {
      const content = (await callGpt(session, userMessage, step))?.trim();
      if (content) return { content, source: 'gpt' };
    } catch (err) {
      lastError = err.message;
      console.error('OpenAI error:', err.message);
    }
  }
  if (!genAI && !openai) {
    console.warn('No GEMINI_API_KEY or OPENAI_API_KEY — using detailed template replies');
  }
  return {
    content: fallbackResponse(session, userMessage, step),
    source: 'fallback',
    error: lastError,
  };
}

export async function getQuickAnswer(question, kundli = null, language = 'hi') {
  const lang = resolveLang(language);
  const session = { kundli, messages: [], language: lang };
  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({
        model: GEMINI_MODEL,
        systemInstruction: SYSTEM_PROMPTS[lang],
        generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
      });
      const kundliContext = formatKundliForAI(kundli);
      const result = await model.generateContent(`${kundliContext ? `${kundliContext}\n\n` : ''}User question: ${question}`);
      const text = result.response.text();
      if (text) return text;
    } catch (err) {
      console.error('Gemini quick answer error:', err.message);
    }
  }
  return fallbackResponse(session, question, 'consultation');
}

export { GEMINI_MODEL, OPENAI_MODEL };
