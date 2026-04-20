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

// ---- Gemini AI Function ----
async function askGemini(prompt) {
  const fetch = (await import('node-fetch')).default;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 300, temperature: 0.7 }
      })
    }
  );

  const data = await res.json();

  if (data.candidates && data.candidates[0]) {
    return data.candidates[0].content.parts[0].text;
  }

  console.error('Gemini Error:', JSON.stringify(data));
  throw new Error('Gemini response error');
}

// ---- Find Student by Phone ----
function findStudent(phone) {
  const clean = phone.replace('whatsapp:', '').replace(/\s/g, '');
  return students.find(s =>
    s.phone === clean ||
    s.phone === '+92' + clean.slice(-10)
  );
}

// ============================================================
// WHATSAPP WEBHOOK
// ============================================================
app.post('/whatsapp', async (req, res) => {
  const { Body, From } = req.body;
  const text  = (Body || '').trim();
  const phone = (From || '').replace('whatsapp:', '');

  console.log(`📱 Message from ${phone}: ${text}`);

  const student = findStudent(phone);
  const info = student
    ? `Yeh ${student.parent} ka number hai. Bacha: ${student.name}, Class: ${student.class}, Fee: ${student.fee}, Attendance: ${student.attendance}%, Transport: ${student.transport}.`
    : `Yeh number school database mein nahi hai.`;

  const prompt = `Aap Sonofmrak School Lahore ka WhatsApp Bot hain.

Student Info: ${info}

School Details:
- Fees: Primary Rs.2800/month, Middle Rs.3500/month, Matric Rs.4500/month
- Buses: Bus 1 (Johar Town), Bus 3 (DHA Phase 5)
- Timings: 8AM se 2PM, Monday to Saturday
- Exams: Term 2 — 5 May 2026 se shuru
- Emergency: 0311-1234567

Parent ka message: "${text}"

Rules:
- Urdu aur English mix mein likho
- Chhota jawab (max 5 lines)
- Emojis use karo
- 1 = fees, 2 = attendance, 3 = bus, 4 = result, 5 = complaint
- Hamesha polite raho

Jawab:`;

  try {
    const reply = await askGemini(prompt);

    res.set('Content-Type', 'text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${reply.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</Message>
</Response>`);

    console.log(`✅ Reply: ${reply.substring(0, 60)}...`);

  } catch (err) {
    console.error('❌ Error:', err.message);
    res.set('Content-Type', 'text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Assalam o Alaikum! 🏫 Thodi technical dikkat hai. Dobara try karein. 🙏</Message>
</Response>`);
  }
});

// ---- Health Check ----
app.get('/', (req, res) => {
  res.json({
    status: '✅ Sonofmrak School Bot chal raha hai!',
    time: new Date().toLocaleString('en-PK'),
    students: students.length
  });
});

// ---- Start ----
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🏫 Sonofmrak School Bot\n✅ Port ${PORT} pe chal raha hai\n📱 Webhook: POST /whatsapp\n`);
});
