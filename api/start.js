const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const SECRET = 'tarkesh-hr-assessment-secret-2025-xk9p';
const QUESTIONS_PER_SESSION = 75;
const SECTION_COUNTS = [11, 11, 11, 11, 11, 10, 10]; // by section order; sums to 75

// Load the question bank from disk. The file is bundled into this function via
// vercel.json -> functions["api/start.js"].includeFiles. We try a few candidate
// paths so it resolves whether cwd is the project root or the function dir.
function loadBank() {
  const candidates = [
    path.join(process.cwd(), 'data', 'question_bank.json'),
    path.join(__dirname, '..', 'data', 'question_bank.json'),
    path.join(__dirname, 'data', 'question_bank.json')
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch (e) { /* try next candidate */ }
  }
  throw new Error('question_bank.json not found. Checked: ' + candidates.join(' | '));
}

// Shuffle a question's options. Supports the v2 shape ({ text, tendency }) and
// legacy string options. Returns the option text array (for the browser), the
// tendency array aligned to the shuffled order, and the new correct index.
function shuffleOptions(options, correctIndex) {
  const indexed = options.map((opt, i) => {
    const isObj = opt && typeof opt === 'object';
    return {
      text: isObj ? opt.text : opt,
      tendency: isObj ? (opt.tendency || null) : null,
      isCorrect: i === correctIndex
    };
  });
  for (let i = indexed.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indexed[i], indexed[j]] = [indexed[j], indexed[i]];
  }
  return {
    options: indexed.map(o => o.text),
    tendencies: indexed.map(o => o.tendency),
    correct: indexed.findIndex(o => o.isCorrect)
  };
}

function selectQuestions(bank) {
  const selected = [];
  bank.sections.forEach((section, idx) => {
    const pool = [...section.questions];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const take = pool.slice(0, SECTION_COUNTS[idx] || 0);
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
  for (let i = selected.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [selected[i], selected[j]] = [selected[j], selected[i]];
  }
  return selected;
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

    const bank = loadBank();
    const selected = selectQuestions(bank);

    // Answer key (kept server-side, encrypted in the token): correct index plus
    // the tendency of each option, which submit.js uses to build the profile.
    const answerKey = selected.map(q => ({
      id: q.id,
      section: q.section,
      correct: q.options.correct,
      tendencies: q.options.tendencies
    }));

    const token = encrypt({
      answerKey,
      participant: { name, position, company, email },
      issuedAt: Date.now(),
      expiresAt: Date.now() + (60 * 60 * 1000) // 1 hour
    });

    // Strip the answers before sending questions to the browser.
    const questions = selected.map(q => ({
      id: q.id,
      section: q.section,
      sectionLabel: q.sectionLabel,
      question: q.question,
      options: q.options.options
    }));

    return res.status(200).json({ questions, token });
  } catch (err) {
    console.error('START ERROR:', err.message, err.stack);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
