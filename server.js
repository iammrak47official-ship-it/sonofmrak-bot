const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---- Student Database ----
const students = [
  { id: 'S001', name: 'Ali Hassan',    class: '8-A',  parent: 'Hassan Ali',    phone: '+923001234567', fee: 'Paid',    transport: 'Bus 3', attendance: 94 },
  { id: 'S002', name: 'Fatima Malik',  class: '10-B', parent: 'Malik Shahid',  phone: '+923009876543', fee: 'Pending', transport: 'Self',  attendance: 88 },
  { id: 'S003', name: 'Usman Tariq',   class: '5-C',  parent: 'Tariq Mehmood', phone: '+923331112233', fee: 'Paid',    transport: 'Bus 1', attendance: 97 },
];

// ---- Gemini AI ----
async function askGemini(prompt) {
  const fetch = (await import('node-fetch')).default;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 200, temperature: 0.5 }
      })
    }
  );

  const data = await res.json();
  if (data.candidates && data.candidates[0]) {
    return data.candidates[0].content.parts[0].text.trim();
  }
  console.error('Gemini Error:', JSON.stringify(data));
  throw new Error('Gemini error');
}

// ---- Find Student ----
function findStudent(phone) {
  const clean = phone.replace('whatsapp:', '').replace(/\s/g, '');
  return students.find(s =>
    s.phone === clean ||
    s.phone === '+92' + clean.slice(-10)
  );
}

// ---- Quick Replies for 1-5 ----
function quickReply(text) {
  const t = text.trim();

  if (t === '1') return `💰 *Fees Information*\n\n• Primary: Rs. 2,800/month\n• Middle: Rs. 3,500/month\n• Matric: Rs. 4,500/month\n\nDeadline: 25 April 2026\nJazzCash / EasyPaisa / Bank qabool hai ✅`;

  if (t === '2') return `✅ *Attendance*\n\nAaj 94% students present hain.\n\nApne bachay ki attendance ke liye Student ID bhejein (jaise: S001)`;

  if (t === '3') return `🚌 *Bus Information*\n\n• Bus 1: Johar Town — Rashid Khan\n• Bus 3: DHA Phase 5 — Arshad Ali\n• Bus 4: Gulberg — Imran Shah\n\nPickup time: 7:30 AM`;

  if (t === '4') return `📋 *Result Card*\n\nResult lene ke liye:\n📞 042-12345678 pe call karein\nYa school admin office aayein\n\nApna Student ID bhi bhej sakte hain`;

  if (t === '5') return `📝 *Complaint Darj Ho Gayi*\n\nID: C${Date.now().toString().slice(-4)} ✅\nStatus: Pending\n\n24 ghante mein jawab milega. Shukriya! 🙏`;

  return null;
}

// ============================================================
// WHATSAPP WEBHOOK
// ============================================================
app.post('/whatsapp', async (req, res) => {
  const { Body, From } = req.body;
  const text  = (Body || '').trim();
  const phone = (From || '').replace('whatsapp:', '');

  console.log(`📱 From ${phone}: ${text}`);

  // 1. Quick replies
  const quick = quickReply(text);
  if (quick) {
    res.set('Content-Type', 'text/xml');
    return res.send(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${quick}</Message></Response>`);
  }

  // 2. Greeting — menu dikhao
  const greetings = ['hi', 'hello', 'salam', 'assalam', 'start', 'menu'];
  if (greetings.some(g => text.toLowerCase().includes(g))) {
    const reply = `Assalam o Alaikum! 🏫\n*Sonofmrak School Lahore*\n\nAp kya jaanna chahte hain?\n\n1️⃣ Fees info\n2️⃣ Attendance\n3️⃣ Bus timing\n4️⃣ Result card\n5️⃣ Complaint darj karein\n\nNumber type karein ya seedha sawaal puchein 👇`;
    res.set('Content-Type', 'text/xml');
    return res.send(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${reply}</Message></Response>`);
  }

  // 3. Student info
  const student = findStudent(phone);
  const info = student
    ? `Parent: ${student.parent}, Student: ${student.name}, Class: ${student.class}, Fee: ${student.fee}, Attendance: ${student.attendance}%, Transport: ${student.transport}`
    : 'Number database mein nahi hai';

  // 4. AI jawab
  const prompt = `Aap Sonofmrak School Lahore ka WhatsApp assistant hain.

Student info: ${info}

School:
- Fees: Primary Rs.2800, Middle Rs.3500, Matric Rs.4500/month
- Buses: Bus 1 Johar Town, Bus 3 DHA, Bus 4 Gulberg
- Timings: 8AM-2PM Mon-Sat
- Term 2 Exams: 5 May 2026
- Emergency: 0311-1234567

Parent message: "${text}"

Rules:
- Urdu/English mix
- 3-4 lines max
- Emojis use karo
- Sirf school info do

Jawab:`;

  try {
    const reply = await askGemini(prompt);
    res.set('Content-Type', 'text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${reply.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</Message></Response>`);
    console.log(`✅ Reply sent`);
  } catch (err) {
    console.error('❌ Error:', err.message);
    res.set('Content-Type', 'text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>🏫 Sonofmrak School\n\n1️⃣ Fees\n2️⃣ Attendance\n3️⃣ Bus\n4️⃣ Result\n5️⃣ Complaint\n\nNumber type karein</Message></Response>`);
  }
});

// ---- Health Check ----
app.get('/', (req, res) => {
  res.json({ status: '✅ Sonofmrak School Bot Live!', time: new Date().toLocaleString('en-PK') });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🏫 Sonofmrak School Bot\n✅ Port ${PORT} pe chal raha hai\n📱 Webhook: POST /whatsapp\n`);
});
