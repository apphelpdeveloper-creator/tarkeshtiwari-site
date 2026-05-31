const crypto = require('crypto');

const SECRET = 'tarkesh-hr-assessment-secret-2025-xk9p';

const SECTION_LABELS = {
  1: 'Employee Relations & Investigations',
  2: 'HR Operations & Service Delivery',
  3: 'HR Business Partnering',
  4: 'Talent Management & Total Rewards',
  5: 'Compliance, Risk & Employment Law',
  6: 'Leadership, Judgment & Professional Effectiveness',
  7: 'HR Products & AI in HR'
};

const TENDENCY_PROFILES = {
  COURAGEOUS: {
    label: 'Courageous Leader',
    description: 'You hold your position under pressure, name difficult truths, and make evidence-based decisions even when it is uncomfortable. You prioritise what is right over what is easy.',
    colour: '#2d7a4f'
  },
  AVOIDER: {
    label: 'Conflict Avoider',
    description: 'You tend to delay difficult conversations, monitor situations longer than necessary, or seek consensus before acting. Your instinct is to preserve harmony — sometimes at the cost of timely intervention.',
    colour: '#7a6a2d'
  },
  PLEASER: {
    label: 'People Pleaser',
    description: 'You prioritise relationships and stakeholder satisfaction, often aligning with whoever holds power in the room. You are valued for your diplomacy but may struggle to hold a position when challenged.',
    colour: '#4a6a9a'
  },
  ROBOT: {
    label: 'Process Purist',
    description: 'You apply policy and process with consistency and rigour. You provide stability and defensibility — but can struggle when context requires judgment that sits outside the standard framework.',
    colour: '#6a4a9a'
  },
  ESCALATOR: {
    label: 'Over-escalator',
    description: 'You involve Legal, CHRO, or senior leaders quickly and often. You protect the organisation from risk through caution — but sometimes escalate where direct, independent action would have been faster and more effective.',
    colour: '#9a4a4a'
  }
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
  const sectionScores = {};
  const tendencyCounts = { COURAGEOUS: 0, AVOIDER: 0, PLEASER: 0, ROBOT: 0, ESCALATOR: 0 };
  let totalCorrect = 0;

  Object.keys(SECTION_LABELS).forEach(id => {
    sectionScores[parseInt(id)] = { correct: 0, total: 0, label: SECTION_LABELS[id] };
  });

  answerKey.forEach(({ id, section, correct, tendencies }) => {
    const sectionId = parseInt(section);
    if (!sectionScores[sectionId]) return;
    sectionScores[sectionId].total++;

    const given = answers[id];
    const givenIdx = given !== undefined && given !== null ? parseInt(given) : null;

    if (givenIdx !== null && givenIdx === correct) {
      sectionScores[sectionId].correct++;
      totalCorrect++;
      tendencyCounts['COURAGEOUS']++;
    } else if (givenIdx !== null && tendencies && tendencies[givenIdx]) {
      const t = tendencies[givenIdx];
      if (tendencyCounts[t] !== undefined) tendencyCounts[t]++;
    }
  });

  return { sectionScores, totalCorrect, totalQuestions: answerKey.length, tendencyCounts };
}

function getDominantTendency(tendencyCounts) {
  // Exclude COURAGEOUS from the "wrong answer tendency" profile
  const wrongTendencies = { ...tendencyCounts };
  delete wrongTendencies.COURAGEOUS;

  const dominant = Object.entries(wrongTendencies).sort((a, b) => b[1] - a[1])[0];
  const total = Object.values(wrongTendencies).reduce((a, b) => a + b, 0);

  // If mostly correct answers, they are primarily COURAGEOUS
  if (tendencyCounts.COURAGEOUS >= total) {
    return { key: 'COURAGEOUS', count: tendencyCounts.COURAGEOUS, total: tendencyCounts.COURAGEOUS + total };
  }

  return { key: dominant[0], count: dominant[1], total: tendencyCounts.COURAGEOUS + total };
}

function buildResults(sectionScores, totalCorrect, totalQuestions, participant, tendencyCounts) {
  const overallPct = Math.round((totalCorrect / totalQuestions) * 100);

  const sections = Object.values(sectionScores).map(s => {
    const pct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
    let tier;
    if (pct >= 80) tier = 'strength';
    else if (pct >= 60) tier = 'proficient';
    else tier = 'develop';
    return { label: s.label, correct: s.correct, total: s.total, pct, tier };
  });

  const strengths = sections.filter(s => s.tier === 'strength');
  const develop = sections.filter(s => s.tier === 'develop');
  const dominantTendency = getDominantTendency(tendencyCounts);
  const tendencyProfile = TENDENCY_PROFILES[dominantTendency.key];

  return {
    participant,
    overall: { correct: totalCorrect, total: totalQuestions, pct: overallPct },
    sections,
    strengths,
    develop,
    tendencyProfile: {
      key: dominantTendency.key,
      label: tendencyProfile.label,
      description: tendencyProfile.description,
      colour: tendencyProfile.colour,
      counts: tendencyCounts
    }
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
    if (!token || !answers) return res.status(400).json({ error: 'Missing token or answers' });

    const session = decrypt(token);
    if (Date.now() > session.expiresAt) return res.status(400).json({ error: 'Session expired' });

    const { sectionScores, totalCorrect, totalQuestions, tendencyCounts } = scoreSubmission(session.answerKey, answers);
    const results = buildResults(sectionScores, totalCorrect, totalQuestions, session.participant, tendencyCounts);

    return res.status(200).json({ results });
  } catch (err) {
    console.error('SUBMIT ERROR:', err.message, err.stack);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
