import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const GEMINI_MODEL = 'gemini-3.8-flash';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const MODELS = [GEMINI_MODEL, 'gemini-flash-latest'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function generateWithRetry(contents, config) {
  for (const model of MODELS) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`Kirim ke Gemini, model: ${model} (percobaan ${attempt})`);
        return await ai.models.generateContent({ model, contents, config });
      } catch (err) {
        const msg = err.message || '';
        console.error(`Gagal (${model}):`, msg.slice(0, 100));

        if (msg.includes('429')) {
          throw new Error('Kuota Gemini habis, tunggu beberapa menit lalu coba lagi.');
        }
        if (msg.includes('404')) break;
        if (attempt < 2) await sleep(2000);
      }
    }
  }
  throw new Error('Model sedang sibuk, coba lagi sebentar lagi.');
}

app.post('/api/chat', async (req, res) => {
  const { conversation } = req.body;
  try {
    if (!Array.isArray(conversation)) {
      throw new Error('Messages must be an array!');
    }

    const contents = conversation.map(({ role, text }) => ({
      role,
      parts: [{ text }],
    }));

    const response = await generateWithRetry(contents, {
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
      systemInstruction:
        'Kamu adalah "Kak Quiz", quiz master bertema ilmu komputer dan pemrograman yang semangat dan ramah. ' +
        'Cara kerja: (1) Saat user menyapa, tawarkan pilihan topik: Dasar Pemrograman, Jaringan, Basis Data, atau AI. ' +
        '(2) Setelah user memilih, ajukan SATU soal pilihan ganda (A, B, C, D) per giliran. ' +
        '(3) Setelah user menjawab, bilang benar atau salah, beri penjelasan singkat 1-2 kalimat, lalu tampilkan skor berjalan, contoh "Skor: 2/3". ' +
        '(4) Setelah itu langsung lanjut ke soal berikutnya. Setelah 5 soal, tampilkan skor akhir dan beri komentar. ' +
        '(5) Hanya bahas quiz seputar ilmu komputer. Di luar itu, tolak dengan sopan dan ajak lanjut quiz. ' +
        '(6) Jawab dalam bahasa Indonesia santai, singkat, tanpa format Markdown seperti ** atau ###, boleh pakai emoji secukupnya.',
    });

    res.status(200).json({ result: response.text });
  } catch (e) {
    console.error('ERROR:', e.message);
    res.status(500).json({ error: e.message });
  }
});

const PORT = 3000;
app.listen(PORT, () =>
  console.log(`Server ready on http://localhost:${PORT}`)
);