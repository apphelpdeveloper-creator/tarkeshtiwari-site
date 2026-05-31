const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const SECRET = process.env.ENCRYPTION_SECRET;
const QUESTIONS_PER_SESSION = 75;
const QUESTIONS_PER_SECTION = Math.floor(QUESTIONS_PER_SESSION / 7);

function selectQuestions(bank) {
  const selected = [];
  const sections = bank.sections;

  // Select ~10-11 questions per section (75 total across 7 sections)
  const counts = [11, 11, 11, 11, 11, 10, 10]; // sums to 75

  sections.forEach((section, idx) => {
    const pool = [...section.questions];
    // Shuffle pool
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const take = pool.slice(0, counts[idx]);
    take.forEach(q => {
      selected.push({
        id: q.id,
        section: section.id,
        sectionLabel: section.label,
        type: q.type,
        difficulty: q.difficulty,
        question: q.question,
        options: shuffleOptions(q.options, q.correct)
      });
    });
  });

  // Shuffle the full selected set
  for (let i = selected.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [selected[i], selected[j]] = [selected[j], selected[i]];
  }

  return selected;
}

function shuffleOptions(options, correctIndex) {
  // Create indexed options, shuffle, track new correct index
  const indexed = options.map((text, i) => ({ text, isCorrect: i === correctIndex }));
  for (let i = indexed.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indexed[i], indexed[j]] = [indexed[j], indexed[i]];
  }
  const newCorrectIndex = indexed.findIndex(o => o.isCorrect);
  return {
    options: indexed.map(o => o.text),
    correct: newCorrectIndex
  };
}

function encrypt(data) {
  const key = crypto.scryptSync(SECRET, 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { name, position, company, email } = req.body;
    if (!name || !position || !company || !email) {
      return res.status(400).json({ error: 'All fields required' });
    }

    // Load question bank
    const bankPath = path.join(process.cwd(), 'data', 'question_bank.json');
    const bank = JSON.parse(fs.readFileSync(bankPath, 'utf8'));

    // Select and shuffle questions
    const selected = selectQuestions(bank);

    // Build answer key (encrypted)
    const answerKey = selected.map(q => ({
      id: q.id,
      section: q.section,
      correct: q.options.correct
    }));

    const token = encrypt({
      answerKey,
      participant: { name, position, company, email },
      issuedAt: Date.now(),
      expiresAt: Date.now() + (60 * 60 * 1000) // 1 hour
    });

    // Strip correct answers before sending to browser
    const questions = selected.map(q => ({
      id: q.id,
      section: q.section,
      sectionLabel: q.sectionLabel,
      question: q.question,
      options: q.options.options
    }));

    return res.status(200).json({ questions, token });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
