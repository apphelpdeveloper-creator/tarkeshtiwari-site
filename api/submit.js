const crypto = require('crypto');

const SECRET = 'tarkesh-hr-assessment-secret-2025-xk9p';

// Section labels for results display
const SECTION_LABELS = {
  1: 'Employee Relations & Investigations',
  2: 'HR Operations & Service Delivery',
  3: 'HR Business Partnering',
  4: 'Talent Management & Total Rewards',
  5: 'Compliance, Risk & Employment Law',
  6: 'Leadership, Judgment & Professional Effectiveness',
  7: 'HR Products & AI in HR'
};

function decrypt(token) {
  const [ivHex, encrypted] = token.split(':');
  const key = crypto.scryptSync(SECRET, 'salt', 32);
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return JSON.parse(decrypted);
}

function scoreSubmission(answerKey, answers) {
  // answers is an object: { questionId: selectedOptionIndex }
  const sectionScores = {};
  let totalCorrect = 0;

  // Initialise section scores
  Object.keys(SECTION_LABELS).forEach(id => {
    sectionScores[parseInt(id)] = { correct: 0, total: 0, label: SECTION_LABELS[id] };
  });

  answerKey.forEach(({ id, section, correct }) => {
    const sectionId = parseInt(section);
    if (!sectionScores[sectionId]) return;
    sectionScores[sectionId].total++;

    const given = answers[id];
    if (given !== undefined && given !== null && parseInt(given) === correct) {
      sectionScores[sectionId].correct++;
      totalCorrect++;
    }
  });

  return { sectionScores, totalCorrect, totalQuestions: answerKey.length };
}

function buildResults(sectionScores, totalCorrect, totalQuestions, participant) {
  const overallPct = Math.round((totalCorrect / totalQuestions) * 100);

  const sections = Object.values(sectionScores).map(s => {
    const pct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
    let tier;
    if (pct >= 80) tier = 'strength';
    else if (pct >= 60) tier = 'proficient';
    else tier = 'develop';

    return {
      label: s.label,
      correct: s.correct,
      total: s.total,
      pct,
      tier
    };
  });

  const strengths = sections.filter(s => s.tier === 'strength');
  const develop = sections.filter(s => s.tier === 'develop');
  const proficient = sections.filter(s => s.tier === 'proficient');

  return {
    participant,
    overall: {
      correct: totalCorrect,
      total: totalQuestions,
      pct: overallPct
    },
    sections,
    strengths,
    proficient,
    develop
  };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { token, answers } = req.body;
    if (!token || !answers) {
      return res.status(400).json({ error: 'Missing token or answers' });
    }

    const session = decrypt(token);

    // Check expiry
    if (Date.now() > session.expiresAt) {
      return res.status(400).json({ error: 'Session expired' });
    }

    const { sectionScores, totalCorrect, totalQuestions } = scoreSubmission(session.answerKey, answers);
    const results = buildResults(sectionScores, totalCorrect, totalQuestions, session.participant);

    return res.status(200).json({ results });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
