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

    // Bank inlined
    const bank = {
  "meta": {
    "total_questions": 252,
    "sections": 7,
    "questions_per_session": 75,
    "session_timer_seconds": 3300,
    "version": "1.0"
  },
  "sections": [
    {
      "id": 1,
      "label": "Section 1",
      "questions": [
        {
          "id": "S1Q001",
          "type": "knowledge",
          "difficulty": "medium",
          "question": "An employee raises a formal grievance against their line manager alleging sustained intimidating behaviour. The manager is the sole decision-maker for the employee's upcoming performance review. What is the most appropriate immediate action?",
          "options": [
            "Proceed with the performance review as scheduled to avoid disruption",
            "Pause the performance review and appoint an alternative reviewer pending investigation outcome",
            "Invite both parties to a joint meeting to resolve the matter informally first",
            "Escalate to Legal before taking any HR action"
          ],
          "correct": 1
        },
        {
          "id": "S1Q002",
          "type": "sjt",
          "difficulty": "hard",
          "question": "You are three days into investigating a misconduct allegation against a senior manager when their business unit VP calls you directly, says the manager is critical to a major client delivery, and asks you to wrap this up quickly or put it on hold. How do you respond?",
          "options": [
            "Agree to pause the investigation until the client project concludes",
            "Acknowledge the business pressure, explain the legal and reputational risk of pausing a live investigation, and confirm the timeline remains unchanged",
            "Escalate the VP's call to your CHRO without responding directly",
            "Accelerate the investigation to a conclusion within 24 hours to satisfy both needs"
          ],
          "correct": 1
        },
        {
          "id": "S1Q003",
          "type": "knowledge",
          "difficulty": "medium",
          "question": "Under most common law and civil law jurisdictions, what is the primary purpose of a without prejudice conversation in an employment context?",
          "options": [
            "To allow HR to issue a formal warning without union representation present",
            "To enable open settlement discussions that cannot later be used as evidence in tribunal proceedings",
            "To document verbal agreements made outside the formal disciplinary process",
            "To protect HR from personal liability in workplace investigations"
          ],
          "correct": 1
        },
        {
          "id": "S1Q004",
          "type": "sjt",
          "difficulty": "hard",
          "question": "An employee submits a grievance alleging racial discrimination by a peer. During your initial fact-finding, two witnesses independently tell you they did not see anything but their body language and hesitation strongly suggest they are withholding. What do you do?",
          "options": [
            "Accept their statements and close fact-finding — you cannot compel witnesses to say more",
            "Note the inconsistency, re-interview with more targeted open questions, and document the behavioural observations in your investigation notes",
            "Inform the complainant that witnesses were uncooperative and recommend mediation",
            "Refer the matter to an external investigator immediately"
          ],
          "correct": 1
        },
        {
          "id": "S1Q005",
          "type": "behavioural",
          "difficulty": "hard",
          "question": "You have just concluded that the evidence in a misconduct investigation supports dismissal. The business leader asks you privately to find another outcome because this person has a good relationship with the client and replacing them will be expensive. What best describes your approach?",
          "options": [
            "Agree to revisit the evidence and explore a lesser sanction to preserve the business relationship",
            "Acknowledge the business concern, explain the legal and cultural risk of inconsistent sanctioning, and hold the recommendation",
            "Immediately document the conversation as potential interference and escalate to Legal",
            "Propose a performance improvement plan as a compromise outcome"
          ],
          "correct": 1
        },
        {
          "id": "S1Q006",
          "type": "knowledge",
          "difficulty": "easy",
          "question": "Which of the following best describes the standard of proof typically applied in workplace misconduct investigations?",
          "options": [
            "Beyond reasonable doubt — the same standard as criminal proceedings",
            "Absolute certainty — the investigator must be 100% confident",
            "Balance of probabilities — it is more likely than not that the conduct occurred",
            "Reasonable suspicion — there is some credible basis to believe misconduct occurred"
          ],
          "correct": 2
        },
        {
          "id": "S1Q007",
          "type": "sjt",
          "difficulty": "hard",
          "question": "You are the HRBP for a team in Japan. A local manager wants to issue a formal written warning to an employee for repeated lateness. The employee's contract is governed by Japanese labour law. What is your first action?",
          "options": [
            "Draft the warning letter using your standard global template and issue it within 48 hours",
            "Check local legal requirements and consult with your Japan employment law SME before proceeding, given Japan's strong employee protections",
            "Escalate to the global ER team to handle — cross-border cases should not be managed locally",
            "Ask the manager to handle it informally first since formal warnings in Japan are rarely enforceable"
          ],
          "correct": 1
        },
        {
          "id": "S1Q008",
          "type": "behavioural",
          "difficulty": "medium",
          "question": "Halfway through a grievance investigation you realise the respondent is someone you socialise with outside work and have defended publicly in a team setting six months ago. What do you do?",
          "options": [
            "Continue — your professional judgment is not compromised by a social relationship",
            "Disclose the relationship to your manager and recommend recusal, allowing a colleague to take over",
            "Disclose the relationship to both parties and offer them the choice of whether you continue",
            "Complete the investigation and disclose the relationship only in the final report"
          ],
          "correct": 1
        },
        {
          "id": "S1Q009",
          "type": "knowledge",
          "difficulty": "medium",
          "question": "An employee resigns and subsequently claims constructive dismissal. Which of the following scenarios most strongly supports their claim?",
          "options": [
            "The employee disagreed with a performance rating given in their annual review",
            "The employer unilaterally changed the employee's working hours without consultation or contractual basis",
            "The employee was passed over for a promotion in favour of an external candidate",
            "The employee's line manager gave critical feedback in a one-to-one meeting"
          ],
          "correct": 1
        },
        {
          "id": "S1Q010",
          "type": "sjt",
          "difficulty": "hard",
          "question": "During a disciplinary hearing, the employee unexpectedly discloses they have been diagnosed with a serious mental health condition and states this is why their performance has declined. The hearing is for a conduct matter, not performance. How do you proceed?",
          "options": [
            "Continue the hearing — the conduct issue is separate from the health disclosure",
            "Adjourn the hearing, acknowledge the disclosure, ensure the employee has support, and take appropriate legal advice on whether the condition affects the conduct matter or triggers reasonable adjustment obligations",
            "Close the disciplinary and convert it to a capability process immediately",
            "Ask the employee to provide medical evidence before the hearing can resume"
          ],
          "correct": 1
        },
        {
          "id": "S1Q011",
          "type": "knowledge",
          "difficulty": "medium",
          "question": "An employee subject to a live disciplinary investigation approaches a key witness and asks them to tell the truth. The witness feels uncomfortable and reports the conversation to HR. What is the most appropriate HR response?",
          "options": [
            "Take no action — asking someone to tell the truth is not misconduct",
            "Treat the approach as potential interference with the investigation process, consider suspending the subject employee, and document the incident formally",
            "Warn the subject employee verbally and continue the investigation unchanged",
            "Close the current investigation and open a new one covering both the original allegation and the witness approach"
          ],
          "correct": 1
        },
        {
          "id": "S1Q012",
          "type": "sjt",
          "difficulty": "hard",
          "question": "You are managing a collective redundancy process affecting 22 employees across three countries. The business wants to announce the redundancies simultaneously on a Friday afternoon and close consultation the following Monday. What is your position?",
          "options": [
            "Support the approach — simultaneous announcement avoids information leaks and treats everyone equally",
            "Push back firmly — the proposed timeline does not meet statutory consultation requirements in most jurisdictions and creates significant legal exposure",
            "Agree to the announcement timing but extend the consultation window to two weeks",
            "Proceed only for employees in at-will employment jurisdictions and run separate processes elsewhere"
          ],
          "correct": 1
        },
        {
          "id": "S1Q013",
          "type": "behavioural",
          "difficulty": "hard",
          "question": "A senior leader asks you to conduct a light touch investigation into a complaint against their direct report, requesting you do not interview the complainant a second time and keep the outcome proportionate. How do you respond?",
          "options": [
            "Agree — senior leaders have legitimate authority over how HR processes are run in their business unit",
            "Clarify what light touch means, then explain that investigation scope and witness access are determined by the facts and process requirements, not business preference, and document the conversation",
            "Agree on the interview restriction but conduct a thorough investigation otherwise",
            "Decline to conduct the investigation and transfer it to an external party"
          ],
          "correct": 1
        },
        {
          "id": "S1Q014",
          "type": "knowledge",
          "difficulty": "medium",
          "question": "An employee raises a concern about financial irregularities in their department and is subsequently excluded from team meetings and removed from a high-profile project. What is the most significant legal risk for the organisation?",
          "options": [
            "Unfair dismissal — the employee may claim constructive dismissal",
            "Whistleblower retaliation — the treatment may constitute a detriment following a protected disclosure",
            "Breach of confidentiality — the employee disclosed internal financial information",
            "Defamation — if the financial irregularities allegation is unfounded"
          ],
          "correct": 1
        },
        {
          "id": "S1Q015",
          "type": "sjt",
          "difficulty": "medium",
          "question": "During a disciplinary hearing, the employee becomes visibly distressed and begins crying. Their companion asks for an adjournment. The manager chairing the hearing wants to continue because we have already rescheduled twice. What do you advise?",
          "options": [
            "Support the manager — the employee has had adequate preparation time and the process should conclude",
            "Recommend a short adjournment, allow the employee to compose themselves, check their wellbeing, and resume when they confirm they are ready to continue",
            "Adjourn indefinitely and require the employee to provide a medical certificate before rescheduling",
            "Offer the employee the option to submit a written statement instead of continuing the hearing"
          ],
          "correct": 1
        },
        {
          "id": "S1Q016",
          "type": "behavioural",
          "difficulty": "hard",
          "question": "You complete an investigation and find the evidence is genuinely inconclusive — one person's account directly against another's with no corroborating evidence. What do you recommend?",
          "options": [
            "Find in favour of the respondent — the burden of proof rests with the complainant",
            "Find in favour of the complainant — a complaint was raised, which carries its own credibility",
            "Document the inconclusive finding clearly, assess the credibility of each account against observable factors, make a reasoned finding on balance of probabilities, and recommend risk-mitigation actions",
            "Recommend mediation as the investigation cannot reach a conclusion"
          ],
          "correct": 2
        },
        {
          "id": "S1Q017",
          "type": "knowledge",
          "difficulty": "easy",
          "question": "In most jurisdictions, what is the primary legal purpose of suspending an employee during a workplace investigation?",
          "options": [
            "To signal to the organisation that the allegation is being taken seriously",
            "To protect the integrity of the investigation and prevent interference with witnesses or evidence",
            "To begin the process of managing the employee out of the organisation",
            "To remove the employee from a role they may have used to commit the alleged misconduct"
          ],
          "correct": 1
        },
        {
          "id": "S1Q018",
          "type": "sjt",
          "difficulty": "hard",
          "question": "You are about to begin a disciplinary hearing. The employee arrives with a trade union representative who immediately states they will be leading the employee's defence and begins cross-examining the investigating manager. How do you manage the situation?",
          "options": [
            "Allow it — the union representative has the right to represent the employee however they choose",
            "Clarify the role of the companion at the outset — they may support the employee and speak on their behalf, but the hearing is not an adversarial proceeding and the chair controls the process",
            "Adjourn and seek legal advice before proceeding with an unfamiliar union representative",
            "Ask the employee to choose a different companion who will follow your process guidelines"
          ],
          "correct": 1
        },
        {
          "id": "S1Q019",
          "type": "behavioural",
          "difficulty": "hard",
          "question": "You conduct an investigation, reach a finding, and present it to the business. The outcome is challenged by a senior leader who disagrees and asks you to look again. You review your notes and remain confident in your finding. What do you do?",
          "options": [
            "Reopen the investigation to demonstrate responsiveness to senior stakeholder feedback",
            "Offer to walk the senior leader through your evidence and reasoning, remain open to specific new information they can provide, but hold your finding unless genuinely new evidence emerges",
            "Escalate to your CHRO to manage the relationship with the senior leader",
            "Amend the finding to reflect the senior leader's view to preserve the working relationship"
          ],
          "correct": 1
        },
        {
          "id": "S1Q020",
          "type": "knowledge",
          "difficulty": "medium",
          "question": "Which of the following best describes the principle of natural justice as it applies to workplace disciplinary proceedings?",
          "options": [
            "The principle that outcomes must always be proportionate to the severity of the misconduct",
            "The right of the accused to know the case against them, have a fair opportunity to respond, and have their case heard by an unbiased decision-maker",
            "The requirement that all disciplinary decisions be reviewed by an employment lawyer before being issued",
            "The principle that employees cannot be dismissed for a first offence without a prior written warning"
          ],
          "correct": 1
        },
        {
          "id": "S1Q021",
          "type": "knowledge",
          "difficulty": "medium",
          "question": "An employee on a fixed-term contract is not offered renewal. They claim this constitutes unfair dismissal. Under which condition is their claim most likely to succeed?",
          "options": [
            "The fixed-term contract was for more than 12 months",
            "The non-renewal was connected to the employee having raised a protected disclosure during the contract period",
            "The employee had received a positive performance review in the final month",
            "The role was subsequently filled by an external candidate"
          ],
          "correct": 1
        },
        {
          "id": "S1Q022",
          "type": "sjt",
          "difficulty": "medium",
          "question": "A manager approaches you informally to say they think an employee may be stealing from petty cash but they have no direct evidence and do not want to make a formal complaint. What do you do?",
          "options": [
            "Take no action — HR cannot act without a formal complaint",
            "Advise the manager to gather evidence themselves before coming back to HR",
            "Conduct a preliminary fact-find to determine whether there is sufficient basis to open a formal investigation, without alerting the employee at this stage",
            "Immediately suspend the employee pending investigation"
          ],
          "correct": 2
        },
        {
          "id": "S1Q023",
          "type": "behavioural",
          "difficulty": "medium",
          "question": "After a difficult redundancy process, several employees who were retained approach you saying the process felt unfair and morale has dropped significantly. The business considers the matter closed. What do you do?",
          "options": [
            "Respect the business position — the process is concluded and reopening it will cause further disruption",
            "Acknowledge the concerns, conduct structured listening sessions, and present the business with a short-term re-engagement plan with specific actions",
            "Send a company-wide communication reiterating that the selection process was fair",
            "Escalate the morale issue to the CHRO as a formal organisational risk"
          ],
          "correct": 1
        },
        {
          "id": "S1Q024",
          "type": "knowledge",
          "difficulty": "hard",
          "question": "Which of the following scenarios is most likely to constitute indirect discrimination under equality legislation in most jurisdictions?",
          "options": [
            "A manager makes offensive comments about an employee's religion",
            "A company requires all employees to work a fixed Monday-to-Friday schedule, which disproportionately disadvantages employees who observe a Saturday Sabbath",
            "An employee is dismissed for gross misconduct following a thorough investigation",
            "A job advertisement specifies a minimum of five years experience for an entry-level role"
          ],
          "correct": 1
        },
        {
          "id": "S1Q025",
          "type": "sjt",
          "difficulty": "hard",
          "question": "You are mediating between two employees in a long-running interpersonal conflict. During the session, one party discloses that the other has been making derogatory comments about their ethnicity in team messaging channels. This is new information not part of the original mediation referral. What do you do?",
          "options": [
            "Continue the mediation — the disclosure is part of the mediation process and must stay confidential",
            "Pause the mediation, explain that the disclosure constitutes a potential discrimination complaint that falls outside mediation scope, and advise the disclosing party on their right to raise a formal grievance",
            "Note the disclosure and include it in the mediation outcome report",
            "Ask both parties to address the comments as part of the mediation agreement"
          ],
          "correct": 1
        },
        {
          "id": "S1Q026",
          "type": "knowledge",
          "difficulty": "easy",
          "question": "An employee requests a copy of all personal data held about them by the employer. Under GDPR and equivalent data privacy frameworks, what is the employer's obligation?",
          "options": [
            "Provide the data only if the employee is involved in active litigation",
            "Respond within one calendar month in most circumstances, providing a copy of the personal data free of charge",
            "Provide only HR records — payroll and IT data are excluded",
            "Seek legal advice before responding to any subject access request"
          ],
          "correct": 1
        },
        {
          "id": "S1Q027",
          "type": "behavioural",
          "difficulty": "hard",
          "question": "A complainant contacts you two weeks after you closed an investigation, saying new evidence has emerged that directly contradicts the respondent's account. They want the case reopened. What is your response?",
          "options": [
            "Decline — the investigation was closed and all parties were informed of the outcome",
            "Review the new evidence, assess its materiality, and reopen the investigation if the evidence is credible and could reasonably change the finding",
            "Pass the matter to Legal and take no further HR action",
            "Inform the respondent of the new evidence and ask them to comment before deciding whether to reopen"
          ],
          "correct": 1
        },
        {
          "id": "S1Q028",
          "type": "sjt",
          "difficulty": "medium",
          "question": "An employee on a performance improvement plan (PIP) suddenly raises a grievance against their manager, alleging bullying. The grievance is submitted the day before their PIP review meeting. How do you manage the sequencing of these two processes?",
          "options": [
            "Pause the PIP entirely until the grievance is resolved",
            "Proceed with the PIP review — the grievance is likely a tactic to delay consequences",
            "Assess whether the PIP and grievance are related, pause the PIP review pending initial grievance fact-finding, and manage both processes in parallel with clear separation",
            "Dismiss the grievance as vexatious and continue with the PIP as scheduled"
          ],
          "correct": 2
        },
        {
          "id": "S1Q029",
          "type": "knowledge",
          "difficulty": "medium",
          "question": "What distinguishes a capability dismissal from a conduct dismissal?",
          "options": [
            "Capability dismissals do not require any formal process",
            "Conduct dismissals relate to deliberate behaviour or choices; capability dismissals relate to an employee's inability to meet the required standard due to skill, health, or aptitude",
            "Capability dismissals always require a medical assessment; conduct dismissals never do",
            "Only conduct dismissals are subject to unfair dismissal claims"
          ],
          "correct": 1
        },
        {
          "id": "S1Q030",
          "type": "sjt",
          "difficulty": "hard",
          "question": "You are conducting an investigation into a harassment complaint. The accused is a highly respected senior leader with 15 years at the company and an impeccable track record. The complainant is a junior employee who joined six months ago. How does this context affect your investigation approach?",
          "options": [
            "Give greater weight to the senior leader's account given their track record and institutional knowledge",
            "Apply the same objective investigative standard regardless of seniority or tenure — credibility is assessed on evidence, not reputation",
            "Escalate to an external investigator to avoid any perception of bias given the seniority gap",
            "Resolve informally given the reputational stakes for the organisation"
          ],
          "correct": 1
        },
        {
          "id": "S1Q031",
          "type": "behavioural",
          "difficulty": "medium",
          "question": "A manager tells you they want to dismiss an employee immediately for a serious incident, without following any formal process, because they are in their probation period. How do you respond?",
          "options": [
            "Support the dismissal — probationary employees have limited employment rights and process requirements are minimal",
            "Advise that even probationary employees are entitled to basic fairness, confirm what minimum process requirements apply in the relevant jurisdiction, and guide the manager through a brief but defensible process",
            "Refuse to support the dismissal until a full investigation and disciplinary hearing are completed",
            "Recommend extending the probation period rather than dismissing"
          ],
          "correct": 1
        },
        {
          "id": "S1Q032",
          "type": "knowledge",
          "difficulty": "hard",
          "question": "In jurisdictions with at-will employment (such as most US states), which of the following still creates legal risk for an employer terminating an employee?",
          "options": [
            "The employee has been with the company for more than two years",
            "The termination follows the employee filing a workers compensation claim two weeks earlier",
            "The employee received a below-average performance rating in their last review",
            "The role is being backfilled with an external hire"
          ],
          "correct": 1
        },
        {
          "id": "S1Q033",
          "type": "sjt",
          "difficulty": "hard",
          "question": "You are leading an investigation in a country where you are not fluent in the local language. An interpreter is used for witness interviews. You later discover the interpreter is a close friend of the respondent. What action do you take?",
          "options": [
            "Take no action — the interpreter was professional and the transcripts look accurate",
            "Treat the relationship as a conflict of interest, arrange for all interviews to be re-conducted with an independent interpreter, and document the issue in your investigation notes",
            "Ask the interpreter to confirm in writing that they were impartial",
            "Consult Legal and take no further action until instructed"
          ],
          "correct": 1
        },
        {
          "id": "S1Q034",
          "type": "behavioural",
          "difficulty": "medium",
          "question": "An employee comes to you in tears saying they cannot continue working with their manager. They refuse to put anything in writing and ask you to fix it without a formal process. What do you do?",
          "options": [
            "Respect their wishes entirely — act informally and do not document anything",
            "Acknowledge their distress, explore what they want to achieve, explain the options available including informal and formal routes, and document the conversation noting their preference for an informal approach while preserving your ability to act if the situation escalates",
            "Insist they submit a formal grievance before HR can become involved",
            "Speak to the manager informally without disclosing the employee's identity"
          ],
          "correct": 1
        },
        {
          "id": "S1Q035",
          "type": "knowledge",
          "difficulty": "medium",
          "question": "Which of the following best describes the concept of vicarious liability in an employment context?",
          "options": [
            "An employee's personal liability for actions taken on behalf of their employer",
            "An employer's legal responsibility for the wrongful acts of their employees carried out in the course of employment",
            "A manager's obligation to report misconduct to HR within 24 hours",
            "The liability of a parent company for the employment decisions of a subsidiary"
          ],
          "correct": 1
        }
      ]
    },
    {
      "id": 2,
      "label": "Section 2",
      "questions": [
        {
          "id": "S2Q001",
          "type": "knowledge",
          "difficulty": "medium",
          "question": "An HR Operations team is receiving repeated complaints from employees that tickets are being closed without resolution. Which of the following root causes is most likely to be systemic rather than individual?",
          "options": [
            "One specialist consistently closing tickets prematurely",
            "SLA targets measured on ticket closure speed rather than resolution quality",
            "Employees raising tickets incorrectly categorised by the self-service portal",
            "A recent increase in headcount creating temporary backlog"
          ],
          "correct": 1
        },
        {
          "id": "S2Q002",
          "type": "sjt",
          "difficulty": "hard",
          "question": "Your HR Operations team is transitioning from a regional delivery model to a centralised global service centre. Stakeholders in three countries are resisting, claiming local nuance will be lost. How do you manage this?",
          "options": [
            "Proceed with the global model — local resistance to centralisation is a standard change management challenge to be managed through communication",
            "Pause the transition and commission a local needs assessment in each country before proceeding",
            "Acknowledge the concern as legitimate, map specific local requirements that must be preserved, build those into the global model design, and establish local liaison points within the central team",
            "Offer each country the option to remain on a regional model if they fund it from their own budget"
          ],
          "correct": 2
        },
        {
          "id": "S2Q003",
          "type": "knowledge",
          "difficulty": "easy",
          "question": "What is the primary purpose of a service level agreement (SLA) in an HR Operations context?",
          "options": [
            "To set legally binding commitments with employees about HR response times",
            "To establish agreed response and resolution timeframes between HR Operations and its internal customers, creating accountability and enabling performance measurement",
            "To document the scope of HR services excluded from the shared service model",
            "To provide a basis for charging business units for HR services consumed"
          ],
          "correct": 1
        },
        {
          "id": "S2Q004",
          "type": "sjt",
          "difficulty": "medium",
          "question": "Your team's first-contact resolution rate has dropped from 78% to 61% over two months. The team size and volume have not changed. What is your first diagnostic step?",
          "options": [
            "Issue a performance improvement plan to the lowest-performing team members",
            "Analyse ticket data to identify whether the drop is concentrated in specific query types, team members, or time periods, and then investigate the root cause of that pattern",
            "Increase team training hours across the board",
            "Raise the issue with the HRIS vendor as a potential system problem"
          ],
          "correct": 1
        },
        {
          "id": "S2Q005",
          "type": "behavioural",
          "difficulty": "medium",
          "question": "You are asked to lead a process to digitise the entire hire-to-retire employee lifecycle, replacing manual document filing and wet signatures. The project will eliminate several administrative tasks currently performed by two team members. How do you approach the people impact?",
          "options": [
            "Proceed with the digitisation and manage the headcount reduction through natural attrition",
            "Pause the project until you can guarantee no role reductions",
            "Plan the digitisation in parallel with a capability development plan for the affected team members, exploring how their capacity can be redeployed to higher-value work, and manage any headcount impact transparently and in line with policy",
            "Limit the scope of digitisation to avoid impacting existing roles"
          ],
          "correct": 2
        },
        {
          "id": "S2Q006",
          "type": "knowledge",
          "difficulty": "medium",
          "question": "In a tiered HR service delivery model (Tier 0, 1, 2, 3), what type of query should ideally be handled at Tier 0?",
          "options": [
            "Complex employee relations cases requiring HR specialist input",
            "Self-service queries resolved through FAQs, chatbots, or employee portals without human intervention",
            "Payroll escalations requiring payroll team involvement",
            "Cross-border mobility cases requiring COE expertise"
          ],
          "correct": 1
        },
        {
          "id": "S2Q007",
          "type": "sjt",
          "difficulty": "hard",
          "question": "A business leader complains that their team always receives templated, unhelpful responses from HR Operations and that the team feels like a call centre rather than an HR function. What does this feedback tell you and how do you respond?",
          "options": [
            "Thank the leader for the feedback and remind them that standardised responses ensure consistency and compliance",
            "Use the feedback as a signal to review whether scripts and templates are being used as a substitute for judgment, assess the complexity of queries being handled, and explore whether the team needs upskilling or empowerment to provide more contextualised responses",
            "Reassign the leader's team to a dedicated HR Business Partner with no Operations involvement",
            "Conduct a satisfaction survey before taking any action"
          ],
          "correct": 1
        },
        {
          "id": "S2Q008",
          "type": "knowledge",
          "difficulty": "hard",
          "question": "Which of the following is the most significant risk of having HR data managed across multiple disconnected systems without a master data management strategy?",
          "options": [
            "Increased licensing costs from maintaining multiple platforms",
            "Inconsistent employee records leading to payroll errors, compliance failures, and unreliable workforce analytics",
            "Duplication of HR team effort in maintaining separate systems",
            "Difficulty benchmarking HR metrics against industry standards"
          ],
          "correct": 1
        },
        {
          "id": "S2Q009",
          "type": "behavioural",
          "difficulty": "medium",
          "question": "You inherit an HR Operations team where morale is low, processes are undocumented, and the team has a reputation for being slow and difficult. What is your priority in the first 30 days?",
          "options": [
            "Immediately redesign all processes and implement new SLAs to signal change",
            "Listen first — conduct structured one-to-ones with each team member to understand the root causes, build trust, and identify quick wins before making structural changes",
            "Present a full transformation roadmap to the business within two weeks",
            "Replace the lowest performers to send a clear signal about new expectations"
          ],
          "correct": 1
        },
        {
          "id": "S2Q010",
          "type": "sjt",
          "difficulty": "hard",
          "question": "During a payroll audit you discover that 14 employees have been paid incorrectly for three months due to a data entry error made during a system migration. The errors range from underpayments of USD 200 to USD 1,800. What is your immediate course of action?",
          "options": [
            "Correct the errors in the next payroll cycle and send a standard notification to affected employees",
            "Notify all affected employees immediately with a clear explanation, correct underpayments via an off-cycle payment within 48 hours, document the root cause, and implement a control to prevent recurrence",
            "Conduct an internal review before notifying employees to ensure accuracy of the correction",
            "Escalate to Legal before communicating with employees given the potential liability"
          ],
          "correct": 1
        },
        {
          "id": "S2Q011",
          "type": "knowledge",
          "difficulty": "medium",
          "question": "What is the primary purpose of a RACI matrix in an HR Operations context?",
          "options": [
            "To document employee performance expectations across HR roles",
            "To clarify who is Responsible, Accountable, Consulted, and Informed for each process step, reducing ambiguity and preventing duplication",
            "To assign risk ratings to HR operational processes",
            "To map HR processes to regulatory compliance requirements"
          ],
          "correct": 1
        },
        {
          "id": "S2Q012",
          "type": "sjt",
          "difficulty": "medium",
          "question": "A new global HR system is being implemented and your team is responsible for data migration. The IT project lead tells you the timeline requires your team to migrate data over a weekend with no dry run. What do you do?",
          "options": [
            "Agree — weekends are operationally low-risk periods for migrations",
            "Push back on the absence of a dry run, citing data integrity risk, and negotiate a phased migration or at minimum a parallel run period to validate data accuracy before cutover",
            "Agree but document your objection in the project log",
            "Escalate to the CHRO to resolve the timeline conflict with IT"
          ],
          "correct": 1
        },
        {
          "id": "S2Q013",
          "type": "behavioural",
          "difficulty": "hard",
          "question": "Your HR Operations function supports employees across 12 countries. A compliance audit reveals that employment records in three countries are incomplete and in one case contain errors that create legal exposure. What does this situation indicate about your operating model?",
          "options": [
            "The team members responsible for those countries need performance management",
            "The operating model lacks sufficient controls, standardised documentation requirements, and audit-readiness protocols — and requires a structural fix, not just individual accountability",
            "The compliance audit standard is too high for a lean HR Operations team",
            "External legal counsel should manage compliance records going forward"
          ],
          "correct": 1
        },
        {
          "id": "S2Q014",
          "type": "knowledge",
          "difficulty": "easy",
          "question": "Which metric is most useful for measuring the efficiency of an HR Operations shared service centre?",
          "options": [
            "Employee Net Promoter Score across the whole business",
            "Cost per HR transaction, combined with first-contact resolution rate and customer satisfaction score",
            "Total HR headcount as a percentage of total employee population",
            "Number of HR policies reviewed and updated annually"
          ],
          "correct": 1
        },
        {
          "id": "S2Q015",
          "type": "sjt",
          "difficulty": "hard",
          "question": "You are building an HR Operations function from scratch in a new Global Capability Centre. The business wants the team live in 90 days. You have been given budget for 12 FTEs, but no documented processes, no HRIS access, and no handover from the existing regional team who are resistant to the transition. What is your first priority?",
          "options": [
            "Hire all 12 FTEs immediately to meet the 90-day target",
            "Secure HRIS access, begin a structured knowledge transfer process with the regional team regardless of their resistance, document critical processes in parallel with recruitment, and align with the business on a phased go-live that prioritises highest-volume transactions first",
            "Push back on the 90-day timeline entirely — it is not achievable",
            "Begin hiring and use the first 30 days to shadow the regional team before building any processes"
          ],
          "correct": 1
        },
        {
          "id": "S2Q016",
          "type": "knowledge",
          "difficulty": "medium",
          "question": "Which of the following best describes a knowledge management system in the context of HR Operations?",
          "options": [
            "A database of employee training records and certifications",
            "A centralised repository of HR policies, process guides, FAQs, and decision trees that enables consistent, self-service resolution of common queries",
            "A performance management tool tracking HR team competencies",
            "An HRIS module for managing succession planning data"
          ],
          "correct": 1
        },
        {
          "id": "S2Q017",
          "type": "behavioural",
          "difficulty": "medium",
          "question": "A senior stakeholder tells you that HR Operations has become a bottleneck and that the business would be better served by embedding HR administrators directly into each business unit. How do you respond?",
          "options": [
            "Agree to pilot the embedded model in one business unit to test the concept",
            "Dismiss the suggestion — centralised shared services are recognised best practice",
            "Engage seriously with the concern, present data on current service performance, explore whether the issue is structural or execution-related, and make a fact-based case for or against the centralised model",
            "Escalate the conversation to the CHRO to defend the shared services model"
          ],
          "correct": 2
        },
        {
          "id": "S2Q018",
          "type": "sjt",
          "difficulty": "medium",
          "question": "An employee contacts HR Operations with a query that falls outside your team's defined scope — it requires input from three different COEs and has a legal dimension. The employee has been bounced between teams twice already. What do you do?",
          "options": [
            "Direct the employee to the appropriate COE and close the ticket",
            "Own the case as a complex query, coordinate across the relevant teams, provide the employee with a single point of contact and a clear timeline, and use the case to flag a process gap that is creating a poor employee experience",
            "Escalate to your manager before taking any ownership of an out-of-scope case",
            "Advise the employee to contact their HRBP who can navigate the internal landscape"
          ],
          "correct": 1
        },
        {
          "id": "S2Q019",
          "type": "knowledge",
          "difficulty": "hard",
          "question": "What is the most significant governance risk of allowing individual HR Operations team members to make ad-hoc exceptions to HR policy without a documented approval process?",
          "options": [
            "Inconsistent employee experience across the organisation",
            "Precedent-setting without oversight, creating legal exposure, claims of preferential treatment, and undermining the integrity of the policy framework",
            "Increased workload for senior HR Operations staff reviewing exceptions",
            "Reduced employee trust in the self-service portal"
          ],
          "correct": 1
        },
        {
          "id": "S2Q020",
          "type": "sjt",
          "difficulty": "hard",
          "question": "Three months after your team took over a process from a regional HR team, an error is discovered that was actually introduced by the previous team before the transition. The regional team lead is publicly attributing the error to your team in a senior leadership forum. What is your response?",
          "options": [
            "Correct the record publicly in the same forum with the evidence",
            "Let it go — defending your team publicly will create more reputational damage than the error itself",
            "Address the misattribution privately with the regional team lead, present the evidence showing the error predated your team's ownership, and agree on how to communicate the correction to the senior leadership forum",
            "Escalate to HR leadership and let them manage the reputational issue"
          ],
          "correct": 2
        },
        {
          "id": "S2Q021",
          "type": "knowledge",
          "difficulty": "medium",
          "question": "Which of the following is the most effective way to reduce avoidable inbound contact volume to an HR Operations shared service centre?",
          "options": [
            "Reducing the SLA response time to discourage repeat contacts",
            "Improving the quality and accessibility of self-service content so employees can resolve common queries without contacting HR",
            "Adding more FTEs to manage volume more quickly",
            "Limiting the scope of queries the team will handle"
          ],
          "correct": 1
        },
        {
          "id": "S2Q022",
          "type": "behavioural",
          "difficulty": "hard",
          "question": "You discover that a long-standing informal workaround used by your team to process a certain transaction type is technically non-compliant with the company's data governance policy. The workaround has been in use for two years with no adverse incidents. What do you do?",
          "options": [
            "Leave it — it has worked for two years and fixing it creates unnecessary disruption",
            "Document the workaround, assess the compliance risk, remediate it with a compliant process, and report it through the appropriate governance channel as a self-identified issue",
            "Fix the workaround quietly without reporting it to avoid scrutiny",
            "Report it immediately to Legal and pause all related processing until cleared"
          ],
          "correct": 1
        },
        {
          "id": "S2Q023",
          "type": "sjt",
          "difficulty": "medium",
          "question": "Your team is responsible for producing monthly HR dashboards for the business. The HRIS data is consistently incomplete because managers are not updating employee records promptly. How do you address this?",
          "options": [
            "Add a disclaimer to each dashboard noting that data completeness depends on manager inputs",
            "Identify the specific data fields with the highest incompleteness rates, work with HRBPs to understand the root cause, build manager accountability through reporting line visibility, and consider system nudges or workflow gates to enforce timely updates",
            "Escalate to IT to build automated data validation rules",
            "Remove the affected metrics from the dashboard until data quality improves"
          ],
          "correct": 1
        },
        {
          "id": "S2Q024",
          "type": "knowledge",
          "difficulty": "medium",
          "question": "What is the primary purpose of a process control framework in HR Operations?",
          "options": [
            "To document who in HR has authority to approve salary changes",
            "To establish systematic checks that prevent errors, ensure compliance, and create an auditable record of key HR transactions",
            "To set performance targets for HR Operations team members",
            "To define escalation paths for unresolved employee queries"
          ],
          "correct": 1
        },
        {
          "id": "S2Q025",
          "type": "sjt",
          "difficulty": "hard",
          "question": "During an internal audit, it is discovered that your team has been storing sensitive employee medical records in a shared drive accessible to the entire HR department. No breach has occurred, but the storage practice violates data protection policy. What are your immediate and medium-term actions?",
          "options": [
            "Move the files to a restricted folder and inform the team not to repeat the practice",
            "Immediately restrict access to the files, conduct a data mapping exercise to identify all non-compliant storage, notify your Data Protection Officer, remediate all instances, retrain the team, and implement an ongoing control to prevent recurrence",
            "Report the issue to Legal and await their guidance before taking any action",
            "Delete the files and close the issue — no breach occurred so formal reporting is unnecessary"
          ],
          "correct": 1
        },
        {
          "id": "S2Q026",
          "type": "behavioural",
          "difficulty": "medium",
          "question": "Your HR Operations team has high technical accuracy but consistently receives low satisfaction scores from employees who say interactions feel cold and unhelpful. What does this gap indicate and how do you address it?",
          "options": [
            "Technical accuracy is the priority — satisfaction scores are subjective and not a reliable performance measure",
            "The gap signals that process compliance and human experience are being treated as separate, when they should be integrated — upskill the team on communication quality, empathy, and resolution ownership rather than just process adherence",
            "Hire team members with stronger customer service backgrounds to replace technically-focused staff",
            "Introduce a response template library to standardise communication tone"
          ],
          "correct": 1
        },
        {
          "id": "S2Q027",
          "type": "knowledge",
          "difficulty": "hard",
          "question": "In a global HR Operations model, what is the most significant challenge of applying a single global SLA to all employee queries regardless of geography?",
          "options": [
            "Different time zones make global SLAs operationally difficult to monitor",
            "Legal requirements, cultural expectations, and query complexity vary significantly by jurisdiction, meaning a uniform SLA may be simultaneously too slow for some markets and non-compliant in others",
            "Global SLAs are difficult to communicate to employees in multiple languages",
            "Senior stakeholders in different regions will have conflicting views on what constitutes an acceptable response time"
          ],
          "correct": 1
        },
        {
          "id": "S2Q028",
          "type": "sjt",
          "difficulty": "medium",
          "question": "You are asked to present the ROI of your HR Operations digitisation project to the CFO. The project eliminated physical document storage, removed manual signature processes, and freed up 2.3 FTE of capacity. How do you frame the business case?",
          "options": [
            "Focus on the employee experience improvements and satisfaction score uplift",
            "Quantify the cost reduction from eliminated storage costs, calculate the FTE capacity value at fully-loaded cost, and translate the freed capacity into revenue-enabling activities the team has been redeployed to, alongside the compliance risk reduction",
            "Present the project as a compliance investment rather than a cost play",
            "Ask Finance to build the ROI model — HR should not be presenting financial cases to the CFO"
          ],
          "correct": 1
        },
        {
          "id": "S2Q029",
          "type": "knowledge",
          "difficulty": "medium",
          "question": "Which of the following is the most important factor in ensuring a successful HR system implementation from an HR Operations perspective?",
          "options": [
            "Selecting the vendor with the highest analyst ranking",
            "Ensuring robust data migration, change management, user training, and a hypercare period post-go-live, alongside clear process ownership and system governance",
            "Completing the implementation within the original project budget",
            "Involving the IT department as the primary implementation lead"
          ],
          "correct": 1
        },
        {
          "id": "S2Q030",
          "type": "sjt",
          "difficulty": "hard",
          "question": "The HR Operations team in your GCC has grown rapidly from 4 to 19 people in 12 months. Quality metrics have declined slightly and two team members have flagged they feel stretched and unsupported. What does this tell you about your operating model and what do you prioritise?",
          "options": [
            "Rapid growth always causes temporary performance dips — monitor for another quarter before acting",
            "The growth has outpaced your management infrastructure — prioritise structured onboarding, clear role accountabilities, team-level capacity planning, a quality assurance mechanism, and regular one-to-ones to stabilise the team before focusing on further growth",
            "Increase SLA targets to create performance pressure that will naturally drive quality improvement",
            "Hire a deputy team lead to manage day-to-day operations while you focus on strategic projects"
          ],
          "correct": 1
        },
        {
          "id": "S2Q031",
          "type": "knowledge",
          "difficulty": "easy",
          "question": "What is meant by a hypercare period in the context of an HR system go-live?",
          "options": [
            "An extended handholding period for employees who struggle with self-service technology",
            "An intensive post-go-live support window where additional resources are deployed to monitor system performance, resolve issues rapidly, and support users before transitioning to business-as-usual",
            "A period during which all HR system changes are frozen to ensure stability",
            "A structured review of the implementation vendor's performance against contract"
          ],
          "correct": 1
        },
        {
          "id": "S2Q032",
          "type": "sjt",
          "difficulty": "medium",
          "question": "A stakeholder requests a custom HR report that would require your team to extract and combine data from three different systems. The request is urgent and for a board presentation tomorrow. How do you handle it?",
          "options": [
            "Decline — ad-hoc data requests outside your standard reporting suite are not HR Operations' responsibility",
            "Assess feasibility immediately, be transparent about the time required and any data quality caveats, deliver what is achievable within the timeline with clear caveats, and follow up post-board with a higher-quality version",
            "Build the report regardless of the time required — board requests take priority",
            "Direct the stakeholder to the HRIS vendor's support team"
          ],
          "correct": 1
        },
        {
          "id": "S2Q033",
          "type": "behavioural",
          "difficulty": "hard",
          "question": "You are leading an HR Operations function that is delivering well against its KPIs. Your CHRO asks you to take on additional scope covering a region that is currently unserviced, with no additional headcount and a six-week transition timeline. What is your response?",
          "options": [
            "Accept the scope and find a way to make it work — demonstrating agility is important at this level",
            "Decline — taking on additional scope without headcount will compromise current service quality",
            "Accept in principle, present a clear risk assessment showing the impact on current SLAs, propose a phased transition timeline with specific headcount requirements, and request a decision from the CHRO on whether to proceed on those terms or adjust the scope",
            "Agree to a temporary 12-week pilot with no commitments beyond that"
          ],
          "correct": 2
        },
        {
          "id": "S2Q034",
          "type": "knowledge",
          "difficulty": "medium",
          "question": "What does a high volume of repeat contacts on the same query type typically indicate in an HR Operations context?",
          "options": [
            "Employees are not using the self-service portal correctly",
            "The initial resolution is not addressing the root cause of the query, pointing to a knowledge, process, or communication gap that requires systemic attention",
            "The query type is inherently complex and cannot be resolved at first contact",
            "The SLA for that query type is set too low"
          ],
          "correct": 1
        },
        {
          "id": "S2Q035",
          "type": "sjt",
          "difficulty": "hard",
          "question": "You are three months into running an HR Operations team that was previously led by someone who built strong personal loyalty but left undocumented processes, inconsistent practices, and an over-reliance on individual knowledge. How do you build a sustainable operating model without alienating the team?",
          "options": [
            "Implement new processes quickly and decisively — the team will adapt",
            "Spend the first month observing without making any changes to build trust",
            "Co-create the documentation and process standardisation with the team, positioning it as building on what they already know rather than replacing it, while being clear that undocumented single-points of failure are a risk the team itself carries",
            "Identify the key knowledge holders and create formal deputy roles to reduce dependency"
          ],
          "correct": 2
        }
      ]
    },
    {
      "id": 3,
      "label": "Section 3",
      "questions": [
        {
          "id": "S3Q001",
          "type": "sjt",
          "difficulty": "hard",
          "question": "A business leader asks you as their HRBP to help them manage out a poor performer without going through a formal performance process because it will take too long. They want to make the role redundant instead. What do you do?",
          "options": [
            "Support the redundancy — it is a legitimate business decision and faster than a PIP",
            "Refuse entirely and insist on a full performance management process",
            "Explain the legal and ethical risks of using redundancy as a substitute for performance management, explore the genuine business case for the role if redundancy is real, and if there is no genuine case, guide the manager through a proportionate performance process",
            "Escalate to the CHRO before engaging with the manager"
          ],
          "correct": 2
        },
        {
          "id": "S3Q002",
          "type": "knowledge",
          "difficulty": "medium",
          "question": "Which of the following best describes the primary value an effective HRBP provides to a business unit?",
          "options": [
            "Ensuring all HR policies are consistently applied across the business unit",
            "Translating people strategy into business outcomes by aligning HR interventions with business priorities and acting as a trusted advisor to senior leaders",
            "Acting as the primary escalation point for employee relations issues in the business unit",
            "Managing the operational HR processes for the business unit's employees"
          ],
          "correct": 1
        },
        {
          "id": "S3Q003",
          "type": "behavioural",
          "difficulty": "hard",
          "question": "Your business unit leader consistently makes people decisions that are technically within policy but are creating a pattern of excluding certain demographic groups from high-visibility projects and development opportunities. No formal complaint has been made. What do you do?",
          "options": [
            "Take no action — no policy has been breached and no complaint has been raised",
            "Wait until a complaint is made and then investigate",
            "Name the pattern directly with the leader, present the data, explain the legal and cultural risk of the emerging pattern, and work with them to make more equitable allocation decisions — documenting your conversations",
            "Escalate to Legal immediately as the pattern may constitute discrimination"
          ],
          "correct": 2
        },
        {
          "id": "S3Q004",
          "type": "sjt",
          "difficulty": "medium",
          "question": "A business unit leader asks you to conduct stay interviews with their top talent because three high performers have resigned in four months. The leader is surprised and attributes the departures to compensation. What is your approach?",
          "options": [
            "Proceed with stay interviews focused on compensation benchmarking",
            "Conduct qualitative stay interviews exploring multiple retention drivers including management, growth, recognition, and work design — and present the findings with data, not just themes, to give the leader an honest picture even if it implicates their own leadership",
            "Review compensation data first before conducting stay interviews",
            "Recommend an employee engagement survey before conducting individual interviews"
          ],
          "correct": 1
        },
        {
          "id": "S3Q005",
          "type": "knowledge",
          "difficulty": "medium",
          "question": "What is the primary difference between an HRBP and an HR generalist in a mature HR operating model?",
          "options": [
            "HRBPs handle more complex employee relations cases",
            "HRBPs operate at a strategic level, advising senior leaders and shaping organisational capability, while HR generalists typically manage a broader operational case-load",
            "HRBPs have line management responsibility for HR Operations staff",
            "HRBPs are senior in grade but perform the same function as HR generalists"
          ],
          "correct": 1
        },
        {
          "id": "S3Q006",
          "type": "sjt",
          "difficulty": "hard",
          "question": "You are partnering a business unit that is planning a major reorganisation. The business leader shares the proposed structure with you confidentially before any announcement. You immediately recognise that the new structure creates a significant risk of discrimination claims based on the demographic profile of those at risk. What do you do?",
          "options": [
            "Respect the confidentiality of the briefing and wait to see whether the concern materialises",
            "Flag the risk immediately and directly with the business leader, quantify the demographic impact, recommend design changes before the structure is finalised, and document your advice",
            "Brief your CHRO before speaking to the business leader",
            "Raise the concern with Legal before flagging it to the business"
          ],
          "correct": 1
        },
        {
          "id": "S3Q007",
          "type": "behavioural",
          "difficulty": "medium",
          "question": "A business leader regularly contacts you at short notice for HR advice but rarely acts on your recommendations. Over time you notice they use HR as a sounding board rather than as a decision partner. How do you shift the dynamic?",
          "options": [
            "Accept the dynamic — being a sounding board still adds value",
            "Reduce your availability to signal that your time should be used more purposefully",
            "Have a direct conversation with the leader about how they are using HR, share your observation about the pattern of advice not being acted upon, and agree on a more structured approach to your partnership with clear accountabilities",
            "Escalate to the CHRO to request a different business unit assignment"
          ],
          "correct": 2
        },
        {
          "id": "S3Q008",
          "type": "knowledge",
          "difficulty": "hard",
          "question": "What is organisational design in the context of HRBP work, and what is the HRBP's role in it?",
          "options": [
            "Redesigning the HR function's own operating model to improve service delivery",
            "Shaping how a business unit is structured — spans and layers, role accountabilities, decision rights, and reporting lines — to optimise performance, and advising the business leader on design options and trade-offs",
            "Managing headcount planning and workforce forecasting for the business unit",
            "Coordinating job evaluation and grading exercises to ensure pay equity"
          ],
          "correct": 1
        },
        {
          "id": "S3Q009",
          "type": "sjt",
          "difficulty": "hard",
          "question": "You discover through a data analysis that a particular manager's team has a significantly higher attrition rate and lower engagement scores than peers. The manager is a top commercial performer and is well liked by senior leadership. How do you approach this?",
          "options": [
            "Share the data with senior leadership and let them decide how to address it",
            "Raise the data directly with the manager as a people leadership issue, frame it as a risk to the business, work with them to understand the root causes, and create an action plan with clear accountability and timelines — escalating if the pattern does not improve",
            "Monitor for another quarter before taking action — the data may be an anomaly",
            "Recommend a team engagement survey before meeting with the manager"
          ],
          "correct": 1
        },
        {
          "id": "S3Q010",
          "type": "knowledge",
          "difficulty": "medium",
          "question": "A business leader tells their HRBP they want to restructure their team to remove a layer of management. What should the HRBP's first question be?",
          "options": [
            "How many roles will be affected and what is the redundancy cost?",
            "What business outcome is this restructure intended to achieve, and have other structural options been explored?",
            "Has Legal been consulted about the consultation process?",
            "What is the timeline for the restructure to be completed?"
          ],
          "correct": 1
        },
        {
          "id": "S3Q011",
          "type": "behavioural",
          "difficulty": "hard",
          "question": "A business leader tells you they want to give their highest-performing team member a 25% salary increase, significantly above the compensation band, because they are worried about losing them. What is your role in this situation?",
          "options": [
            "Support the increase — retaining top talent is the priority and the leader knows their team",
            "Refuse — salary increases above band require executive approval and cannot be recommended by HR",
            "Explore the full retention risk picture, assess the compensation data for the role and market, advise on the equity implications for peers at similar performance levels, present options including a structured out-of-band exception process, and ensure the decision is made transparently with the right approvals",
            "Recommend a non-monetary retention package to avoid the compensation band issue"
          ],
          "correct": 2
        },
        {
          "id": "S3Q012",
          "type": "sjt",
          "difficulty": "medium",
          "question": "A business unit is planning to hire 15 people in Q1 but the HRBP's workforce data shows the team already has capacity issues due to management overhead and unclear role accountabilities. The hiring plan has executive approval. What do you do?",
          "options": [
            "Support the hiring plan — it has executive approval and is not HR's decision to challenge",
            "Raise the capacity and role clarity concerns with the business leader before hiring begins, present the data, and recommend resolving the structural issues in parallel with or ahead of hiring to avoid adding headcount into a dysfunctional team design",
            "Pause the hiring plan until the team structure is resolved",
            "Flag the concern in the hiring plan documentation and proceed"
          ],
          "correct": 1
        },
        {
          "id": "S3Q013",
          "type": "knowledge",
          "difficulty": "medium",
          "question": "What is the 9-box grid used for in talent management, and what is its primary limitation?",
          "options": [
            "A tool for setting individual performance targets; its limitation is that it does not account for team performance",
            "A framework for assessing employees on performance and potential to identify talent tiers and succession candidates; its primary limitation is that potential ratings are often subjective and can embed bias",
            "A succession planning matrix for senior leadership roles; its limitation is that it only applies to director-level and above",
            "A performance review calibration tool; its limitation is that calibration sessions are time-consuming"
          ],
          "correct": 1
        },
        {
          "id": "S3Q014",
          "type": "sjt",
          "difficulty": "hard",
          "question": "You are partnering a leader who is highly directive, does not delegate, and consistently makes decisions without consulting their team. Engagement in the team is declining. The leader does not see their behaviour as a problem. How do you approach the coaching conversation?",
          "options": [
            "Avoid the conversation — coaching leaders on their style is not within HRBP scope",
            "Present the engagement data as a business risk, share specific behavioural observations, connect the leadership style to the business impact, and invite the leader into a conversation about what they want the team's performance to look like — rather than leading with a critique of their style",
            "Recommend a 360-degree feedback process before having the conversation",
            "Escalate to the leader's line manager and let them address the behaviour"
          ],
          "correct": 1
        },
        {
          "id": "S3Q015",
          "type": "behavioural",
          "difficulty": "medium",
          "question": "You are asked by a business leader to recommend which of two equally-performing candidates should be promoted. You have limited direct observation of either candidate. What is your approach?",
          "options": [
            "Make a recommendation based on the leader's preference — they know the candidates better",
            "Recommend a structured assessment approach — a clear capability framework for the role, evidence-based evaluation from multiple observers, and a consistent set of criteria applied to both candidates — rather than making a personal recommendation from limited data",
            "Recommend the more senior-tenured candidate as a default",
            "Suggest both candidates be placed on a development plan and the promotion decision delayed"
          ],
          "correct": 1
        },
        {
          "id": "S3Q016",
          "type": "knowledge",
          "difficulty": "hard",
          "question": "Which of the following best describes strategic workforce planning in an HRBP context?",
          "options": [
            "Planning the annual headcount budget in alignment with finance",
            "Analysing the gap between the current workforce capability and the future workforce needed to deliver the business strategy, and designing interventions — build, buy, borrow, or automate — to close that gap",
            "Producing monthly headcount reports for the business unit",
            "Managing the talent pipeline for critical roles identified in the succession plan"
          ],
          "correct": 1
        },
        {
          "id": "S3Q017",
          "type": "sjt",
          "difficulty": "medium",
          "question": "A business leader asks for your opinion on whether to dismiss a long-tenured employee who has been underperforming for over a year. The leader has done nothing formal about the performance issue until now. What is your honest assessment?",
          "options": [
            "Support the dismissal — the leader is in the best position to judge performance",
            "Be direct: the absence of any documented performance management process significantly weakens the employer's legal position, and proceeding to dismissal now without a proper process creates substantial unfair dismissal risk — recommend a structured capability process before any termination decision",
            "Recommend a settlement agreement to avoid the process entirely",
            "Tell the leader to document three recent performance incidents and proceed"
          ],
          "correct": 1
        },
        {
          "id": "S3Q018",
          "type": "behavioural",
          "difficulty": "hard",
          "question": "You are the HRBP for a business unit whose leader is well-connected but is regularly described by their team as inconsistent, politically motivated in their decisions, and difficult to trust. The leader has strong upward relationships. How do you build credibility and navigate this?",
          "options": [
            "Align with the leader's agenda — your effectiveness depends on having a strong relationship with the person you support",
            "Build direct relationships with the team and bypass the leader where necessary",
            "Maintain a professional relationship with the leader while building independent trust with the team, raise concerns with the leader directly when you observe specific problematic behaviour, and use data to make people risk visible to senior leadership where the pattern is causing organisational harm",
            "Request a reassignment — the dynamic makes effective HRBP work impossible"
          ],
          "correct": 2
        },
        {
          "id": "S3Q019",
          "type": "knowledge",
          "difficulty": "medium",
          "question": "What does it mean for an HRBP to be a credible activist according to established HR competency frameworks?",
          "options": [
            "Being willing to challenge business decisions that breach employment law",
            "Being trusted by the business and willing to take a position on people issues even when it is uncomfortable, combining deep business knowledge with a clear point of view on what is right for the organisation and its people",
            "Advocating for employees in disputes with management",
            "Actively promoting HR initiatives in the business unit through internal communications"
          ],
          "correct": 1
        },
        {
          "id": "S3Q020",
          "type": "sjt",
          "difficulty": "hard",
          "question": "Your business unit is going through significant change and the leader asks you to help design a communications plan that frames all changes positively and does not mention any downsides. You know some of the changes will have a genuine negative impact on a portion of the team. What do you do?",
          "options": [
            "Help design the plan as requested — the leader controls the message",
            "Refuse to help design any communications plan that is not fully transparent",
            "Advise the leader that communications that avoid or minimise real impacts tend to damage trust more than the changes themselves, propose a plan that acknowledges the impact honestly while framing what support is being provided, and explain the reputational risk of communications employees will see through",
            "Present two versions of the plan and let the leader choose"
          ],
          "correct": 2
        },
        {
          "id": "S3Q021",
          "type": "knowledge",
          "difficulty": "easy",
          "question": "What is the primary purpose of succession planning in an organisation?",
          "options": [
            "To identify employees who are ready to be promoted immediately",
            "To ensure the organisation has a pipeline of capable individuals ready to fill critical roles when they become vacant, reducing dependency on external hiring for key positions",
            "To manage the transition of senior leaders who are approaching retirement",
            "To document the development plans of high-potential employees"
          ],
          "correct": 1
        },
        {
          "id": "S3Q022",
          "type": "sjt",
          "difficulty": "medium",
          "question": "A manager tells you they want to put a team member on a formal performance improvement plan (PIP). When you review the background, you find the manager has never given the employee any documented feedback about their performance concerns. What is your advice?",
          "options": [
            "Support the PIP — formal processes are more impactful than informal feedback",
            "Advise the manager that moving directly to a PIP without prior documented feedback is procedurally weak and could constitute unfair process — recommend a structured informal performance conversation first, clearly documented, with a reasonable improvement timeline before escalating to a formal PIP",
            "Draft the PIP and include a section acknowledging that prior feedback was not formally documented",
            "Decline to support a PIP until the manager has given feedback for at least three months"
          ],
          "correct": 1
        },
        {
          "id": "S3Q023",
          "type": "behavioural",
          "difficulty": "medium",
          "question": "A business leader asks you to justify the value of HR Business Partnering. They say they can get most HR support from the shared service centre and do not see what additional value you add. How do you respond?",
          "options": [
            "Present your activity log showing the volume of HR support you have provided",
            "Acknowledge the challenge directly, make a specific case using examples of people decisions you have influenced, risks you have identified, and commercial outcomes you have contributed to — and offer to be more explicit going forward about the business impact of your interventions",
            "Escalate to the CHRO to defend the HRBP model",
            "Offer to reduce your involvement and let the leader trial running without a dedicated HRBP for a quarter"
          ],
          "correct": 1
        },
        {
          "id": "S3Q024",
          "type": "knowledge",
          "difficulty": "hard",
          "question": "An HRBP is preparing for a talent review for their business unit. Which data set is most important to include to make the conversation strategically useful?",
          "options": [
            "A list of all employees with their current performance ratings",
            "An integrated view of performance ratings, potential assessments, flight risk indicators, critical role vacancy risk, and development readiness — mapped against the business unit's strategic capability needs",
            "The top 10 percent of performers by grade level",
            "Succession candidates nominated by the business unit leader"
          ],
          "correct": 1
        },
        {
          "id": "S3Q025",
          "type": "sjt",
          "difficulty": "hard",
          "question": "You are supporting a restructure that will reduce the business unit from 45 to 30 people. The business leader wants to base selection for redundancy purely on performance ratings. You know the ratings process in this business unit has historically been inconsistent and influenced by personal relationships. What do you do?",
          "options": [
            "Support the ratings-based selection — performance data is the most defensible selection criterion",
            "Flag the inconsistency risk in the ratings data, recommend a multi-criteria selection process with objective criteria validated by a calibration panel, and document your recommendation clearly so that if challenged, the selection process can be defended",
            "Recommend selecting based on role criticality rather than individual performance",
            "Conduct a fresh performance assessment of all 45 employees before making selections"
          ],
          "correct": 1
        },
        {
          "id": "S3Q026",
          "type": "knowledge",
          "difficulty": "medium",
          "question": "What is the concept of psychological safety in a team context, and why is it relevant to HRBP work?",
          "options": [
            "The absence of physical safety hazards in the workplace, which HR must monitor",
            "The belief held by team members that they will not be punished or humiliated for speaking up, asking questions, or making mistakes — relevant because teams with low psychological safety suppress the honesty and challenge that drive performance and surface risk",
            "An employee's right to take mental health leave without managerial scrutiny",
            "A measure of an employee's emotional stability assessed during hiring"
          ],
          "correct": 1
        },
        {
          "id": "S3Q027",
          "type": "behavioural",
          "difficulty": "hard",
          "question": "You have been the HRBP for a business unit for 18 months and have built a strong relationship with the leader. You are now observing behaviour from the leader that is creating genuine employee relations risk, but you are concerned that raising it will damage the relationship. How do you approach this?",
          "options": [
            "Prioritise the relationship — raising the issue risks losing your access and influence",
            "Raise the concern clearly and directly, using specific examples and data, explaining the risk in business terms — and accept that a trusted HRBP relationship must be able to carry challenge, not just support",
            "Document your observations and let the issue surface organically",
            "Brief the CHRO first before raising the concern with the leader"
          ],
          "correct": 1
        },
        {
          "id": "S3Q028",
          "type": "sjt",
          "difficulty": "medium",
          "question": "A senior individual contributor in your business unit tells you they are planning to resign because they have had no development conversation with their manager in over a year and feel invisible. The manager is unaware. What do you do?",
          "options": [
            "Encourage the employee to have the conversation directly with their manager",
            "Thank the employee for being candid, explore what would make them stay, facilitate an honest three-way conversation between the employee, the manager, and yourself — while also addressing the broader pattern with the manager if this reflects a wider development neglect issue across the team",
            "Raise a formal grievance on the employee's behalf for lack of career support",
            "Recommend the employee to apply for an internal transfer to a team where development is stronger"
          ],
          "correct": 1
        },
        {
          "id": "S3Q029",
          "type": "knowledge",
          "difficulty": "medium",
          "question": "What does span of control refer to in organisational design, and what are the risks of spans that are too wide or too narrow?",
          "options": [
            "The geographic scope of a manager's responsibilities; too wide creates travel burden, too narrow limits cultural integration",
            "The number of direct reports a manager is responsible for; too wide reduces the quality of management attention and development, too narrow creates excessive hierarchy and management cost",
            "The range of decision-making authority granted to a manager; too wide creates inconsistency, too narrow slows decisions",
            "The number of business units an HRBP supports; too wide reduces strategic depth, too narrow is inefficient"
          ],
          "correct": 1
        },
        {
          "id": "S3Q030",
          "type": "sjt",
          "difficulty": "hard",
          "question": "You are supporting a new business unit leader who is technically excellent but is struggling to build trust with their inherited team. Three months in, two key team members are considering leaving and the rest of the team are disengaged. The leader is not aware of how serious the situation is. How do you approach this?",
          "options": [
            "Wait — it is too early to intervene in a new leader's settling-in period",
            "Brief the leader's line manager and let them address the situation",
            "Meet with the leader, share the data on team sentiment and the specific flight risks, acknowledge the difficulty of inheriting a team, and co-create an accelerated onboarding and trust-building plan — positioning yourself as a thinking partner rather than a judge",
            "Conduct a team engagement survey and present the results to both the leader and their line manager simultaneously"
          ],
          "correct": 2
        },
        {
          "id": "S3Q031",
          "type": "knowledge",
          "difficulty": "medium",
          "question": "What does it mean to HR business partner at the strategic versus operational level, and why does the distinction matter?",
          "options": [
            "Strategic HRBP work involves L1 and L2 leaders; operational HRBP work involves individual contributors",
            "Strategic HRBP work focuses on future-state capability building, organisational design, and people risk at the business unit level; operational work handles transactional HR processes — the distinction matters because most HRBP time should be invested at the strategic level to generate the highest return",
            "Strategic HRBP work is performed by senior HRBPs; operational work by junior HRBPs",
            "The distinction is primarily one of seniority and does not affect the nature of the work"
          ],
          "correct": 1
        },
        {
          "id": "S3Q032",
          "type": "sjt",
          "difficulty": "hard",
          "question": "You are leading a talent calibration session with four senior leaders. One leader is consistently rating their own team members higher than the evidence supports, while another is consistently rating theirs lower. The imbalance is creating equity issues in the final talent distribution. How do you manage this?",
          "options": [
            "Accept the ratings as submitted — leaders are accountable for their own talent assessments",
            "Name the rating patterns directly in the session using the calibration data, invite the group to apply a consistent evidence-based standard, and facilitate a constructive challenge process where leaders must support ratings with specific behavioural examples",
            "Adjust the ratings yourself after the session to correct the imbalance",
            "Hold separate conversations with the outlier leaders outside the session before finalising ratings"
          ],
          "correct": 1
        },
        {
          "id": "S3Q033",
          "type": "behavioural",
          "difficulty": "medium",
          "question": "A business leader tells you they want to make a lateral move offer to a high-potential employee to develop them for a future VP role, but they have not told the employee about the VP aspiration and the lateral move looks like a sideways step. How do you advise?",
          "options": [
            "Support the move as planned — development intentions do not need to be disclosed",
            "Advise the leader that development moves work best when the employee understands the intent, recommend being transparent with the employee about the VP development trajectory so they can make an informed decision and stay motivated through the lateral step",
            "Recommend against the lateral move — high-potential employees should always be moved upward",
            "Check whether the employee has a competing offer before advising on the approach"
          ],
          "correct": 1
        },
        {
          "id": "S3Q034",
          "type": "knowledge",
          "difficulty": "hard",
          "question": "What is the primary risk of conducting a talent review process where managers complete potential ratings in isolation without calibration?",
          "options": [
            "The process takes longer than a calibrated review",
            "Ratings reflect individual manager bias and inconsistent interpretation of potential criteria, producing a talent picture that cannot be meaningfully compared across the organisation and may systematically disadvantage certain groups",
            "Employees are more likely to be told their rating if managers complete it independently",
            "The HR system cannot accommodate un-calibrated ratings in succession planning modules"
          ],
          "correct": 1
        },
        {
          "id": "S3Q035",
          "type": "sjt",
          "difficulty": "medium",
          "question": "The business unit you support has just been told it will not receive the headcount it requested for next year due to a cost reduction exercise. The leader is frustrated and is now considering making existing team members work across roles they were not hired for. What is your role in this conversation?",
          "options": [
            "Support the leader's decision — managing within reduced resources is a line management responsibility",
            "Acknowledge the resource pressure, help the leader prioritise which work must be done versus which can be deprioritised or automated, assess whether expanding existing roles is contractually and practically viable, and ensure the wellbeing and workload risk to the team is named and managed",
            "Raise a formal challenge to the headcount decision on behalf of the business unit",
            "Recommend outsourcing the additional work to avoid contractual complications"
          ],
          "correct": 1
        }
      ]
    },
    {
      "id": 4,
      "label": "Section 4",
      "questions": [
        {
          "id": "S4Q001",
          "type": "knowledge",
          "difficulty": "medium",
          "question": "What does total rewards mean in a modern HR context?",
          "options": [
            "The sum of base salary and annual bonus for an employee",
            "The complete package of monetary and non-monetary value an employer provides, including base pay, variable pay, benefits, wellbeing, development, and the employee experience",
            "The financial cost of the remuneration package per employee",
            "The combination of salary and equity compensation offered to senior leaders"
          ],
          "correct": 1
        },
        {
          "id": "S4Q002",
          "type": "sjt",
          "difficulty": "hard",
          "question": "A talent acquisition team is struggling to fill senior technical roles. Hiring managers say compensation offers are consistently being rejected. HR Ops data shows offer acceptance rates have fallen from 74% to 52% in six months. What is the most rigorous diagnostic approach?",
          "options": [
            "Increase all offers by 15% and monitor acceptance rates",
            "Conduct exit interviews with candidates who declined offers",
            "Conduct a structured analysis of declined offer feedback, benchmark compensation bands against current market data for those specific roles, assess whether non-compensation factors are also driving declines, and present findings before making any pay changes",
            "Recommend a signing bonus policy to make offers more competitive without adjusting base salary bands"
          ],
          "correct": 2
        },
        {
          "id": "S4Q003",
          "type": "knowledge",
          "difficulty": "medium",
          "question": "What is the difference between job evaluation and market benchmarking in compensation management?",
          "options": [
            "Job evaluation assesses external pay competitiveness; market benchmarking determines internal equity",
            "Job evaluation determines the internal relative value of roles based on responsibilities and impact; market benchmarking assesses how compensation compares to external pay rates for equivalent roles",
            "Job evaluation is performed by HR; market benchmarking is performed by Finance",
            "They are equivalent terms used interchangeably in different organisations"
          ],
          "correct": 1
        },
        {
          "id": "S4Q004",
          "type": "sjt",
          "difficulty": "hard",
          "question": "During an annual compensation review, you identify that women in a particular job family are on average paid 11% less than men at the same grade with equivalent performance ratings and tenure. What do you do?",
          "options": [
            "Flag the finding in the compensation report and recommend a review in the following cycle",
            "Escalate immediately with a quantified remediation proposal, identify the root cause of the gap, prioritise corrections for the most severe cases in the current review cycle, and recommend a structural audit of the entire compensation framework to prevent recurrence",
            "Seek Legal advice before communicating the finding to the CHRO",
            "Adjust the data cut to control for additional variables before concluding there is a genuine gap"
          ],
          "correct": 1
        },
        {
          "id": "S4Q005",
          "type": "knowledge",
          "difficulty": "easy",
          "question": "What is a compa-ratio and what does it indicate?",
          "options": [
            "A comparison of an employee's performance rating against their peer group average",
            "A ratio comparing an employee's actual salary to the midpoint of their pay band, indicating their position within the band and relative pay competitiveness",
            "The ratio of total compensation cost to revenue, used to assess workforce affordability",
            "A compliance metric measuring the percentage of employees within grade"
          ],
          "correct": 1
        },
        {
          "id": "S4Q006",
          "type": "sjt",
          "difficulty": "medium",
          "question": "A high-performing employee tells you they have a competing offer 30% above their current salary and will leave unless matched. The market data you have does not support a 30% increase for the role. How do you advise the business?",
          "options": [
            "Match the offer — losing a high performer is more costly than the salary increase",
            "Decline — matching counteroffers sets a dangerous precedent",
            "Conduct a rapid market analysis for the specific role, assess the total cost of replacement against the retention investment, explore whether the full gap can be bridged through a combination of base, bonus, and non-monetary levers, and make a transparent recommendation to the business with a clear view of both the precedent risk and the replacement risk",
            "Negotiate the employee down to a 15% increase as a compromise"
          ],
          "correct": 2
        },
        {
          "id": "S4Q007",
          "type": "knowledge",
          "difficulty": "medium",
          "question": "What is the primary purpose of a performance calibration process in a pay-for-performance model?",
          "options": [
            "To reduce the time managers spend writing performance reviews",
            "To ensure that performance ratings are applied consistently across teams and that distribution reflects genuine performance differentiation rather than manager leniency or severity bias",
            "To identify which employees should receive a performance improvement plan",
            "To align individual performance ratings with business unit financial results"
          ],
          "correct": 1
        },
        {
          "id": "S4Q008",
          "type": "sjt",
          "difficulty": "hard",
          "question": "An organisation is moving from an annual performance review to a continuous feedback model. Several senior managers are resisting, saying the new approach lacks rigour and makes compensation decisions harder to justify. How do you respond to this concern?",
          "options": [
            "Revert to the annual review model — senior manager buy-in is essential for any performance process to work",
            "Acknowledge the legitimate concern about compensation linkage, design a summary calibration mechanism that aggregates continuous feedback into a defensible rating for compensation purposes, and work with resistant managers to demonstrate how the new model captures more evidence, not less",
            "Mandate the new approach and manage resistance through performance management of non-compliant managers",
            "Run both models in parallel for a year before deciding which to retain"
          ],
          "correct": 1
        },
        {
          "id": "S4Q009",
          "type": "knowledge",
          "difficulty": "hard",
          "question": "What is a long-term incentive plan (LTIP) designed to achieve, and what is its primary retention risk?",
          "options": [
            "To reward employees for long service; the retention risk is that some employees stay beyond their productive years solely to vest",
            "To align senior employees' financial interests with long-term business performance by granting equity or cash instruments that vest over time; the retention risk is that employees leave once a tranche vests, creating cyclical attrition",
            "To supplement pension contributions for senior employees; the risk is tax complexity",
            "To compensate for below-market base salaries; the risk is that the LTIP does not vest if business targets are missed"
          ],
          "correct": 1
        },
        {
          "id": "S4Q010",
          "type": "sjt",
          "difficulty": "medium",
          "question": "The finance team asks HR to cut the L&D budget by 40% to meet a cost reduction target. The L&D plan supports three business-critical capability gaps identified in the strategic workforce plan. How do you respond?",
          "options": [
            "Agree to the cut — finance decisions take precedence over HR plans",
            "Protect the full L&D budget — workforce capability is a strategic investment",
            "Quantify the business risk of each capability gap, calculate the cost of the cut against the risk of the unmet capability needs, propose a prioritised reduced plan that protects the highest-risk investments, and present a joined-up view to the CFO and CHRO rather than accepting a blanket cut",
            "Move the L&D spend to department budgets to take it off the HR cost line"
          ],
          "correct": 2
        },
        {
          "id": "S4Q011",
          "type": "knowledge",
          "difficulty": "medium",
          "question": "What is the primary limitation of using employee engagement survey scores as the sole measure of organisational health?",
          "options": [
            "Engagement surveys are too expensive to run frequently enough to be useful",
            "Survey scores measure sentiment at a point in time and can be influenced by recent events, do not capture performance or retention risk, and can mask important sub-group differences when only reported at an aggregate level",
            "Employees rarely complete engagement surveys honestly when they know their manager will see the results",
            "Engagement is not a reliable predictor of business performance"
          ],
          "correct": 1
        },
        {
          "id": "S4Q012",
          "type": "sjt",
          "difficulty": "hard",
          "question": "A new CEO announces they want to move to a fully variable compensation model where all employees have a significant portion of pay at risk tied to company performance. HR is asked to design and implement this within six months. What are the critical risks you must surface before design begins?",
          "options": [
            "The six-month timeline is too short — recommend 12 months",
            "Surface legal risks around varying existing contractual terms, the behavioural impact of high pay-at-risk on psychological safety and risk-taking, the potential for the model to disadvantage lower-paid employees disproportionately, the need for transparent and credible performance metrics, and the likelihood of increased attrition during transition — all before design decisions are made",
            "Conduct a market benchmarking exercise to validate the model against industry practice",
            "Model the financial cost of the variable pay pool under different performance scenarios"
          ],
          "correct": 1
        },
        {
          "id": "S4Q013",
          "type": "knowledge",
          "difficulty": "medium",
          "question": "What is the difference between voluntary and involuntary attrition, and why does the distinction matter for talent management?",
          "options": [
            "Voluntary attrition is managed exits; involuntary attrition is unmanaged. The distinction affects HR workload planning",
            "Voluntary attrition reflects employees choosing to leave; involuntary is employer-initiated. The distinction matters because voluntary attrition — especially among high performers — signals something about the employee experience, culture, or leadership, while involuntary attrition reflects the organisation's performance management health",
            "The distinction is primarily a payroll and benefits administration consideration",
            "Voluntary attrition is measured quarterly; involuntary attrition is measured annually"
          ],
          "correct": 1
        },
        {
          "id": "S4Q014",
          "type": "sjt",
          "difficulty": "medium",
          "question": "A manager rates an employee as exceptional (top 5%) but when asked to provide specific examples of exceptional performance, cannot give any beyond vague statements like they just get it. How do you handle this in a calibration session?",
          "options": [
            "Accept the rating — managers know their teams and should be trusted",
            "Challenge the rating constructively in the session, ask for specific behavioural evidence, and if none can be provided, apply the calibration group's standard that ratings must be evidenced — downgrading where the evidence does not support the top rating",
            "Accept the rating but note the lack of evidence in the calibration record",
            "Ask the employee to provide a self-assessment to supplement the manager's view"
          ],
          "correct": 1
        },
        {
          "id": "S4Q015",
          "type": "knowledge",
          "difficulty": "hard",
          "question": "What is the concept of pay transparency and what are the primary arguments for and against it in an organisational context?",
          "options": [
            "Pay transparency means publishing all salary data publicly. It is argued to improve equity and reduce negotiation gaps but opposed due to privacy concerns and potential team conflict",
            "Pay transparency refers to sharing pay band information with employees. Arguments for include reducing perceived inequity and improving trust; arguments against include risk of creating pay compression anxiety and increased administrative burden managing exceptions",
            "Pay transparency is a legal requirement in all OECD countries. The debate is about implementation, not principle",
            "Pay transparency is the same as pay equity — both refer to eliminating gender and race pay gaps"
          ],
          "correct": 1
        },
        {
          "id": "S4Q016",
          "type": "sjt",
          "difficulty": "hard",
          "question": "Your organisation's onboarding satisfaction scores have declined for three consecutive quarters despite no change to the onboarding programme. New hire turnover in the first six months has increased. What is the most rigorous analytical approach to diagnosing the root cause?",
          "options": [
            "Redesign the onboarding programme — the content has clearly become stale",
            "Segment the data by hiring cohort, hiring manager, business unit, and role level to identify whether the decline is uniform or concentrated — then conduct structured new hire interviews to understand which specific onboarding elements are failing and whether external factors such as role clarity, manager quality, or team dynamics are the real drivers",
            "Increase the length of the onboarding programme to provide more support",
            "Survey existing employees about their onboarding experience retrospectively"
          ],
          "correct": 1
        },
        {
          "id": "S4Q017",
          "type": "knowledge",
          "difficulty": "medium",
          "question": "What is the primary purpose of a salary band structure in compensation management?",
          "options": [
            "To limit the maximum salary the organisation will pay for any given role",
            "To create a framework that supports internal pay equity, ensures external competitiveness within a defined range, and provides a structure for pay progression that is transparent and consistently applied",
            "To make annual pay review administration more efficient",
            "To ensure compliance with national minimum wage legislation"
          ],
          "correct": 1
        },
        {
          "id": "S4Q018",
          "type": "sjt",
          "difficulty": "medium",
          "question": "A business leader wants to recognise an entire team with a special bonus for delivering a high-stakes project under pressure. The bonus would be outside the normal cycle and above the approved budget. How do you advise?",
          "options": [
            "Decline — out-of-cycle bonuses set a precedent and are outside policy",
            "Support the bonus — recognising team effort is important for culture",
            "Explore the recognition intent, advise on the right mechanism — whether a formal bonus, a non-monetary team recognition, or an accelerated in-cycle award — ensure proper approval authority is sought, and document the decision with clear criteria so it does not become an informal precedent",
            "Recommend individual performance letters as a non-monetary alternative"
          ],
          "correct": 2
        },
        {
          "id": "S4Q019",
          "type": "knowledge",
          "difficulty": "hard",
          "question": "What does skills-based talent management mean, and how does it differ from role-based talent management?",
          "options": [
            "Skills-based talent management focuses on technical skills; role-based focuses on leadership behaviours",
            "Skills-based talent management organises workforce planning, hiring, development, and deployment around specific skill sets rather than fixed job roles, enabling more fluid allocation of talent to work — as opposed to role-based management which anchors people to static job descriptions",
            "Skills-based talent management uses competency frameworks; role-based uses job families",
            "They are equivalent approaches with different terminology used in different industries"
          ],
          "correct": 1
        },
        {
          "id": "S4Q020",
          "type": "sjt",
          "difficulty": "hard",
          "question": "You are presenting talent review outcomes to the executive team. One executive asks why a candidate they personally sponsored for the high-potential list was not included. The candidate's data clearly shows they do not meet the criteria. How do you handle this?",
          "options": [
            "Add the candidate to the list — executive sponsorship is a valid talent indicator",
            "Agree to review the candidate again after the meeting",
            "Acknowledge the executive's view directly, present the specific evidence against the criteria transparently, offer to discuss what development would close the gap and what timeline is realistic — holding the data-based decision while treating the executive's input with respect",
            "Include the candidate in a separate emerging talent category to satisfy the executive without changing the high-potential criteria"
          ],
          "correct": 2
        },
        {
          "id": "S4Q021",
          "type": "knowledge",
          "difficulty": "easy",
          "question": "What does the term employee value proposition (EVP) describe?",
          "options": [
            "The total financial cost of an employee to the organisation",
            "The set of unique benefits, opportunities, and experiences an employer offers in exchange for an employee's skills, contributions, and commitment",
            "The contractual terms offered to a new hire during the offer stage",
            "The performance targets set for an employee during the annual review cycle"
          ],
          "correct": 1
        },
        {
          "id": "S4Q022",
          "type": "sjt",
          "difficulty": "medium",
          "question": "Employee engagement scores in one business unit are 12 points below the company average, but the unit is hitting all its commercial targets. The business unit leader dismisses the scores, saying the team performs well and engagement surveys are not meaningful. How do you respond?",
          "options": [
            "Agree with the leader — commercial performance is the ultimate measure of team health",
            "Accept the dismissal and monitor the situation next year",
            "Acknowledge the commercial performance but present the evidence that sustained low engagement is a leading indicator of higher attrition, knowledge loss, and performance risk — particularly for teams operating in high-skill domains — and recommend targeted action rather than a full engagement programme",
            "Escalate to the CHRO to put the business unit under formal focus"
          ],
          "correct": 2
        },
        {
          "id": "S4Q023",
          "type": "knowledge",
          "difficulty": "medium",
          "question": "What is the primary purpose of a total compensation statement provided to employees?",
          "options": [
            "To meet regulatory disclosure requirements in jurisdictions with pay transparency legislation",
            "To make the full value of the employment package visible to employees — including benefits, pension, insurance, and non-cash elements — improving perceived value of total remuneration and reducing attrition driven by incomplete salary comparisons",
            "To provide a basis for salary negotiations during the annual review",
            "To document the compensation package agreed at hire for legal purposes"
          ],
          "correct": 1
        },
        {
          "id": "S4Q024",
          "type": "sjt",
          "difficulty": "hard",
          "question": "Your organisation uses a forced distribution performance rating model where exactly 10% of employees must be rated at the bottom tier. A manager tells you they genuinely do not have any bottom-tier performers on their team and refuses to apply the distribution. What is your advice?",
          "options": [
            "Enforce the distribution — the model is company policy and must be applied consistently",
            "Agree with the manager — forced distribution is widely discredited and should not be applied if it misrepresents performance",
            "Acknowledge the tension, present the manager with the calibration evidence for their team relative to peers, advise on the company's official position, and — if the team's performance genuinely does not support bottom-tier ratings — escalate the concern about the model's application to HR leadership rather than asking the manager to falsify ratings",
            "Apply the distribution by rating the lowest performer on the team at the bottom tier regardless of their absolute performance level"
          ],
          "correct": 2
        },
        {
          "id": "S4Q025",
          "type": "knowledge",
          "difficulty": "medium",
          "question": "What is the primary risk of setting overly aggressive short-term performance metrics in a variable pay plan?",
          "options": [
            "Employees will feel the targets are unachievable and disengage from the plan",
            "Short-term metric pressure can incentivise behaviours that optimise for immediate results at the expense of longer-term value, risk management, customer relationships, and team development",
            "The plan will be too expensive to fund if all employees hit their targets",
            "Performance metrics become difficult to calibrate across different business units"
          ],
          "correct": 1
        },
        {
          "id": "S4Q026",
          "type": "sjt",
          "difficulty": "medium",
          "question": "Three of your top performers have recently been passed over for promotion and are now showing signs of disengagement. The business has a policy of minimum two years in role before promotion eligibility. How do you advise the business?",
          "options": [
            "Enforce the policy — exceptions undermine consistency and fairness",
            "Ignore the policy in this case — losing top performers is too costly",
            "Assess whether the two-year rule is creating a retention risk that outweighs the consistency benefit, work with the business to explore whether the policy has a legitimate rationale or is an administrative default, and recommend a structured exception process for demonstrably promotion-ready talent rather than either ignoring or blindly applying the rule",
            "Recommend retention bonuses as an alternative to promotion"
          ],
          "correct": 2
        },
        {
          "id": "S4Q027",
          "type": "knowledge",
          "difficulty": "hard",
          "question": "What does it mean to benchmark compensation at the 50th, 75th, or 90th percentile, and when would targeting each level be appropriate?",
          "options": [
            "These percentiles represent pay grades within a salary band; the choice depends on employee performance",
            "The percentile target indicates how the organisation's pay compares to the market distribution — 50th is median (pay to market), 75th is a premium strategy for talent attraction, 90th is reserved for highly competitive or scarce roles. The choice depends on the organisation's talent strategy, role criticality, and budget",
            "Targeting the 90th percentile is always best practice to attract top talent",
            "Percentile benchmarking only applies to base salary and is not relevant for total compensation"
          ],
          "correct": 1
        },
        {
          "id": "S4Q028",
          "type": "sjt",
          "difficulty": "hard",
          "question": "You are asked to design a retention strategy for a GCC that has been experiencing 28% annual attrition in its first year of operation. Initial exit interview data cites better compensation elsewhere as the primary reason. What is your diagnostic and design approach?",
          "options": [
            "Conduct a market compensation benchmarking study and adjust all salaries upward",
            "Treat compensation as one potential cause rather than the confirmed cause — analyse whether attrition is concentrated in specific roles, managers, or cohorts, cross-reference exit data with engagement and tenure data, validate whether compensation is genuinely non-competitive or whether other factors are driving exits and compensation is a socially safe reason to cite, then design a targeted multi-lever retention strategy",
            "Introduce a retention bonus scheme tied to 12-month service commitments",
            "Benchmark against local competitors and match the top quartile for all roles"
          ],
          "correct": 1
        },
        {
          "id": "S4Q029",
          "type": "knowledge",
          "difficulty": "medium",
          "question": "What is the primary purpose of an onboarding programme from a talent management perspective, beyond administrative induction?",
          "options": [
            "To ensure new hires complete all mandatory compliance training within their first week",
            "To accelerate time-to-productivity, build a sense of belonging and connection to the organisation's culture and purpose, and reduce early attrition by ensuring new hires have the relationships, clarity, and support to perform effectively from the start",
            "To provide new hires with a comprehensive overview of all HR policies and procedures",
            "To assess whether new hires are a cultural fit during their probationary period"
          ],
          "correct": 1
        },
        {
          "id": "S4Q030",
          "type": "sjt",
          "difficulty": "medium",
          "question": "A senior leader is lobbying to exclude their team from a company-wide salary freeze, arguing their team's roles are market-scarce and they will lose people. Every other business unit is subject to the freeze. What is your position?",
          "options": [
            "Support the exclusion — market scarcity is a valid business reason",
            "Refuse — policy exceptions undermine the integrity of the freeze",
            "Assess the market data for the specific roles claimed to be scarce, evaluate the attrition risk against the precedent risk of a visible exception, recommend a structured exception process through the right governance channel if the case is legitimate — and be consistent in applying the same standard to any other leader who requests an exception",
            "Recommend a non-monetary retention package instead of a pay exception"
          ],
          "correct": 2
        },
        {
          "id": "S4Q031",
          "type": "knowledge",
          "difficulty": "easy",
          "question": "What is the difference between a merit increase and a cost of living adjustment (COLA)?",
          "options": [
            "Merit increases are given annually; COLAs are given quarterly",
            "A merit increase rewards individual performance and contribution; a COLA adjusts pay to maintain purchasing power in line with inflation and is not linked to individual performance",
            "Merit increases apply to base salary; COLAs apply only to allowances and benefits",
            "They are equivalent terms used differently in different countries"
          ],
          "correct": 1
        },
        {
          "id": "S4Q032",
          "type": "sjt",
          "difficulty": "hard",
          "question": "Your organisation's learning and development function has historically focused on classroom training. You are asked to modernise the L&D strategy for a 5,000-person global workforce. What are the three most critical strategic shifts you would recommend?",
          "options": [
            "Move all training online, introduce a learning management system, and reduce L&D headcount",
            "Shift from scheduled event-based learning to embedded continuous learning; move from function-defined training catalogues to business-need-driven capability investments; and build manager capability as the primary vehicle for day-to-day development rather than relying on formal programmes",
            "Invest in a new LMS platform, create a mentoring programme, and introduce mandatory learning hours for all employees",
            "Partner with external universities to provide accredited programmes for all employees"
          ],
          "correct": 1
        },
        {
          "id": "S4Q033",
          "type": "knowledge",
          "difficulty": "medium",
          "question": "What is career pathing and why has its importance increased in the current talent market?",
          "options": [
            "A tool for planning individual training calendars — important because employees want more structured development",
            "A framework that makes visible the possible trajectories — vertical, lateral, and cross-functional — an employee might take within an organisation, and the capabilities required at each step; its importance has increased because employees in a tighter talent market increasingly choose organisations that offer visible growth and clear development stories over those that do not",
            "A succession planning method for identifying high-potential employees — important because leadership pipelines are thinning",
            "A compensation tool linking pay bands to career levels — important for pay equity compliance"
          ],
          "correct": 1
        },
        {
          "id": "S4Q034",
          "type": "sjt",
          "difficulty": "medium",
          "question": "You receive exit interview feedback from five departing employees in the same team all citing their manager as the primary reason for leaving. The manager is not aware. The manager's line manager says the exits are coincidental. How do you proceed?",
          "options": [
            "Accept the line manager's assessment — five departures may be coincidental",
            "Treat a cluster of five manager-attributed exits as a significant signal, present the anonymised pattern to the business unit leader and the manager's line manager with the data, recommend a structured diagnostic conversation with the manager, and if the pattern is confirmed, design a specific intervention rather than a generic management development programme",
            "Share the exit interview feedback directly with the manager",
            "Wait for the next engagement survey to see if the pattern is confirmed before acting"
          ],
          "correct": 1
        },
        {
          "id": "S4Q035",
          "type": "knowledge",
          "difficulty": "hard",
          "question": "What is the concept of return on human capital investment (ROHCI) and what are the challenges of measuring it?",
          "options": [
            "A ratio of HR department cost to total employee headcount; difficult to measure because HR cost allocation is inconsistent across organisations",
            "A framework for quantifying the business value generated by people investments — including learning, development, and capability building — relative to their cost; the challenge is attributing business outcomes to specific people interventions when many other variables simultaneously affect performance",
            "The relationship between employee tenure and productivity; difficult to measure because productivity definitions vary by role",
            "A metric tracking the ratio of internal promotions to external hires; challenging because internal mobility data is often incomplete"
          ],
          "correct": 1
        }
      ]
    },
    {
      "id": 5,
      "label": "Section 5",
      "questions": [
        {
          "id": "S5Q001",
          "type": "knowledge",
          "difficulty": "medium",
          "question": "Which of the following best describes the concept of employment at will in the United States?",
          "options": [
            "An employee can resign at any time without notice, but the employer must provide 30 days notice before termination",
            "Either the employer or the employee can terminate the employment relationship at any time for any reason, except for legally prohibited reasons such as discrimination or retaliation",
            "Employment continues indefinitely unless a formal performance management process has been completed",
            "Employers can only terminate employment at will during a probationary period"
          ],
          "correct": 1
        },
        {
          "id": "S5Q002",
          "type": "sjt",
          "difficulty": "hard",
          "question": "Your company is expanding into a new country for the first time. The business wants to hire five employees in that market within 60 days. HR has no existing knowledge of local employment law. What is your approach?",
          "options": [
            "Use the company's standard employment contract with a clause specifying the home country's law as governing law",
            "Engage local employment counsel to advise on mandatory employment law requirements, determine the appropriate legal entity or employer of record structure, ensure contracts, benefits, and processes are compliant with local law before any offer is made, and build a go-live checklist that covers payroll, data protection, and statutory obligations",
            "Mirror the employment terms used in the geographically closest country where the company already operates",
            "Hire the employees as independent contractors to avoid the complexity of local employment law"
          ],
          "correct": 1
        },
        {
          "id": "S5Q003",
          "type": "knowledge",
          "difficulty": "medium",
          "question": "What is the primary obligation of employers under GDPR in relation to employee personal data?",
          "options": [
            "To obtain explicit written consent from employees before processing any of their personal data",
            "To process employee personal data lawfully, fairly, and transparently; collect only what is necessary for specified purposes; retain it no longer than necessary; and protect it with appropriate security measures",
            "To store all employee data on servers located within the EU",
            "To provide employees with an annual data audit report"
          ],
          "correct": 1
        },
        {
          "id": "S5Q004",
          "type": "sjt",
          "difficulty": "hard",
          "question": "A manager wants to monitor employee productivity by installing software that captures screenshots of employees' screens every five minutes without their knowledge. The business operates in the EU. What is your advice?",
          "options": [
            "Approve the monitoring — the company owns the equipment and has a legitimate interest in productivity",
            "Advise that covert monitoring of this nature is likely unlawful under GDPR and potentially under national data protection law, recommend a transparent monitoring policy that is proportionate to the business need, requires employee notification, and is subject to a data protection impact assessment",
            "Allow the monitoring but limit it to working hours only",
            "Seek IT security clearance before responding to the manager"
          ],
          "correct": 1
        },
        {
          "id": "S5Q005",
          "type": "knowledge",
          "difficulty": "hard",
          "question": "What is the concept of joint employment and when is it most likely to create legal risk for a company?",
          "options": [
            "When two companies share the cost of employing a single employee across both organisations",
            "When a company exercises sufficient control over workers employed by a third party — such as a staffing agency or outsourced service provider — to be treated as a co-employer, creating exposure for employment law obligations including anti-discrimination, wage and hour, and collective bargaining",
            "When employees in a joint venture are employed by both parent companies simultaneously",
            "When a company acquires another and inherits its employment obligations"
          ],
          "correct": 1
        },
        {
          "id": "S5Q006",
          "type": "sjt",
          "difficulty": "medium",
          "question": "An employee in your APAC region reports that their manager has been accessing their private messages on the company messaging platform and sharing them with other team members. How do you respond?",
          "options": [
            "Advise the employee that company-owned platforms are subject to monitoring and the manager has not breached policy",
            "Investigate whether the monitoring was within the bounds of any existing monitoring policy, whether the employee was notified of potential monitoring, and whether the sharing of messages with third parties was justified — treating the manager's conduct as a potential data protection and privacy breach pending the outcome",
            "Escalate to IT to review the manager's access logs",
            "Advise the employee to stop using the company messaging platform for private communications"
          ],
          "correct": 1
        },
        {
          "id": "S5Q007",
          "type": "knowledge",
          "difficulty": "medium",
          "question": "What triggers an obligation for collective information and consultation with employee representatives under EU law in a restructuring context?",
          "options": [
            "Any restructuring that results in a change to an employee's reporting line",
            "Collective redundancies meeting defined thresholds (typically 10 or more redundancies within a 30-90 day period depending on jurisdiction), transfer of undertakings, or other major changes to working conditions, triggering mandatory consultation with recognised employee representatives",
            "Any restructuring affecting employees in more than one EU member state",
            "A restructuring that results in a reduction in overall headcount of more than 5%"
          ],
          "correct": 1
        },
        {
          "id": "S5Q008",
          "type": "sjt",
          "difficulty": "hard",
          "question": "The company is being acquired. As part of the due diligence process, the acquiring company requests a full data room of employee personal data including performance ratings, salaries, and HR records. How do you advise on the data sharing?",
          "options": [
            "Provide the full data room as requested — M&A due diligence is a legitimate business process",
            "Provide only aggregated, anonymised workforce data at due diligence stage, share identifiable personal data only when legally required and at the appropriate stage of the transaction under a data sharing agreement with appropriate confidentiality provisions, and conduct a data protection impact assessment before any personal data is transferred",
            "Refuse to share any employee data until the acquisition is legally completed",
            "Seek employee consent before sharing any personal data with the acquiring company"
          ],
          "correct": 1
        },
        {
          "id": "S5Q009",
          "type": "knowledge",
          "difficulty": "medium",
          "question": "What is TUPE (Transfer of Undertakings Protection of Employment) and what are the primary obligations it creates for the incoming employer?",
          "options": [
            "A UK and EU framework requiring employers to consult unions before any redundancy",
            "A framework that protects employees' terms and conditions when a business or service transfers to a new employer — the incoming employer inherits all existing employment contracts on their current terms, is prohibited from making TUPE-connected changes to terms, and must inform and consult employee representatives about the transfer",
            "A framework requiring the outgoing employer to make employees redundant before a transfer to avoid inheriting liabilities",
            "A voluntary best-practice standard for managing business acquisitions"
          ],
          "correct": 1
        },
        {
          "id": "S5Q010",
          "type": "sjt",
          "difficulty": "hard",
          "question": "Your organisation operates a global HR system that stores employee data from employees in 40 countries on servers in the US. Several of those countries are in the EU. What compliance risk does this create and how should it be addressed?",
          "options": [
            "No risk — US law applies to US-based servers regardless of where the data originates",
            "GDPR restricts transfers of EU personal data to third countries without adequate protections — this requires either binding corporate rules, standard contractual clauses, or adequacy decisions covering the transfer, and the organisation should ensure compliant transfer mechanisms are in place and documented",
            "The risk can be managed by anonymising all EU employee data before it is transferred to US servers",
            "Notify EU employees that their data is stored in the US and obtain their consent"
          ],
          "correct": 1
        },
        {
          "id": "S5Q011",
          "type": "knowledge",
          "difficulty": "hard",
          "question": "What is the concept of indirect discrimination in an employment context, and how does it differ from direct discrimination?",
          "options": [
            "Direct discrimination is intentional; indirect discrimination is unintentional. Both are unlawful",
            "Direct discrimination occurs when someone is treated less favourably because of a protected characteristic; indirect discrimination occurs when a seemingly neutral provision, criterion, or practice puts people sharing a protected characteristic at a particular disadvantage compared to others — and cannot be justified as a proportionate means of achieving a legitimate aim",
            "Indirect discrimination only applies to hiring decisions; direct discrimination applies to all employment decisions",
            "The distinction is primarily relevant in jurisdictions with equality legislation — it has no application in at-will employment states in the US"
          ],
          "correct": 1
        },
        {
          "id": "S5Q012",
          "type": "sjt",
          "difficulty": "medium",
          "question": "A line manager tells you they are planning to put a pregnant employee on a performance improvement plan because her productivity has declined. What is your immediate response?",
          "options": [
            "Support the PIP — performance standards apply equally to all employees regardless of pregnancy",
            "Advise the manager to wait until after maternity leave to begin any performance process",
            "Advise the manager to pause immediately, assess whether the productivity decline is related to the pregnancy or any associated health condition, explore whether reasonable adjustments are required, and seek legal advice before taking any formal performance action — given the significant risk of pregnancy discrimination claims",
            "Allow the PIP to proceed but document that HR advised caution"
          ],
          "correct": 2
        },
        {
          "id": "S5Q013",
          "type": "knowledge",
          "difficulty": "medium",
          "question": "What is the primary purpose of a non-compete clause in an employment contract, and what limits its enforceability?",
          "options": [
            "To prevent former employees from starting competing businesses; enforceability is limited by the size of the business",
            "To protect legitimate business interests such as trade secrets and client relationships by restricting the employee's activities after termination; enforceability is limited by requirements of reasonableness in scope, geography, and duration — with courts frequently striking down overly broad restrictions",
            "To prevent employees from soliciting colleagues after leaving; enforceability depends on seniority",
            "Non-compete clauses are not enforceable in most jurisdictions and serve only as a deterrent"
          ],
          "correct": 1
        },
        {
          "id": "S5Q014",
          "type": "sjt",
          "difficulty": "hard",
          "question": "Your company operates in a jurisdiction that has recently introduced mandatory pay gap reporting. Initial analysis shows a significant gender pay gap in two business units. The CFO wants to delay publication to allow time to address the underlying issues. What is your advice?",
          "options": [
            "Support the delay — addressing root causes before publication is better for the company's reputation",
            "Advise that where reporting is legally mandatory, delaying publication creates regulatory and reputational risk that exceeds the reputational risk of an honest gap — recommend publishing with a clear narrative explaining the causes and a credible, time-bound action plan",
            "Publish the report with the gap data removed from the two affected business units",
            "Seek legal advice on whether a delay is permissible before advising the CFO"
          ],
          "correct": 1
        },
        {
          "id": "S5Q015",
          "type": "knowledge",
          "difficulty": "medium",
          "question": "What is a settlement agreement and what must it include to be legally binding in most common law jurisdictions?",
          "options": [
            "A non-binding letter of intent between employer and employee to resolve a dispute informally",
            "A legally binding contract in which the employee agrees to waive specified employment claims in exchange for agreed compensation; to be valid it typically requires the employee to have received independent legal advice, the agreement to identify the claims being waived, and both parties to sign",
            "An agreement reached through ACAS or equivalent conciliation service — these are automatically binding without legal advice",
            "A document signed by the employee confirming they have no outstanding grievances at the point of resignation"
          ],
          "correct": 1
        },
        {
          "id": "S5Q016",
          "type": "sjt",
          "difficulty": "medium",
          "question": "A manager asks HR to conduct a reference check on a current employee without the employee's knowledge because they suspect the employee is job searching. What do you do?",
          "options": [
            "Conduct the reference check — the manager has a legitimate business interest in retention planning",
            "Decline — covertly investigating whether an employee is job searching is a privacy violation and could constitute a breach of trust that itself triggers a constructive dismissal risk, advise the manager to address any performance or engagement concerns directly with the employee",
            "Advise the manager to monitor the employee's activity on company systems instead",
            "Consult Legal before taking any action"
          ],
          "correct": 1
        },
        {
          "id": "S5Q017",
          "type": "knowledge",
          "difficulty": "hard",
          "question": "Under EU Working Time Directive principles, what is the most significant obligation on employers regarding rest periods and maximum working hours?",
          "options": [
            "Employees must not work more than 40 hours per week under any circumstances",
            "Workers are entitled to a minimum daily rest of 11 consecutive hours, a weekly rest of 24 hours, and in most cases a maximum average working week of 48 hours — though opt-outs are possible in some jurisdictions — and employers must maintain records to demonstrate compliance",
            "Overtime is prohibited for all employees unless explicitly agreed in the employment contract",
            "Rest period requirements apply only to manual and factory workers"
          ],
          "correct": 1
        },
        {
          "id": "S5Q018",
          "type": "sjt",
          "difficulty": "hard",
          "question": "An employee discloses to HR that they are experiencing domestic violence and that their abuser, who works at the same company, has been sending threatening messages through the internal communications platform. What is HR's responsibility?",
          "options": [
            "Advise the employee to report the matter to the police as it is a personal matter outside HR's remit",
            "Take the disclosure seriously as both a safeguarding and workplace safety matter — secure evidence from the platform, apply appropriate interim safety measures such as access controls or shift changes, engage Legal and if required law enforcement, provide access to employee support services, and manage the process with strict confidentiality to protect the disclosing employee",
            "Open a standard harassment investigation following the normal ER process",
            "Advise both employees to take annual leave until the situation is resolved"
          ],
          "correct": 1
        },
        {
          "id": "S5Q019",
          "type": "knowledge",
          "difficulty": "medium",
          "question": "What is the concept of reasonable adjustment in employment law, and when does the obligation to make adjustments typically arise?",
          "options": [
            "Any change to working conditions requested by an employee — the obligation arises when the employee submits a formal adjustment request",
            "Changes to working arrangements, tools, or processes that remove or reduce a substantial disadvantage experienced by a disabled employee — the obligation typically arises when the employer knows or should know the employee has a disability that puts them at a disadvantage, and it applies unless the adjustment would be disproportionately burdensome",
            "Flexible working arrangements available to all employees under flexible working legislation",
            "Adjustments required under health and safety law when a workplace risk assessment identifies a hazard"
          ],
          "correct": 1
        },
        {
          "id": "S5Q020",
          "type": "sjt",
          "difficulty": "hard",
          "question": "Your organisation has not updated its employment contracts for five years. A legal review finds several clauses that are either unenforceable or non-compliant with recent legislative changes in two jurisdictions. The business wants to re-paper all contracts simultaneously with a covering letter saying they are administrative updates. How do you advise?",
          "options": [
            "Support the approach — presenting contract changes as administrative is standard practice",
            "Advise that presenting substantive contractual changes as administrative updates is legally risky and potentially dishonest — employees have the right to understand what is changing; recommend a transparent communication that identifies changes clearly, provides a reasonable acceptance period, and offers access to HR for questions — with Legal advice obtained for the jurisdictions with compliance gaps before any contract is issued",
            "Re-paper only the non-compliant jurisdictions first and address the rest over time",
            "Seek employee consent through a mass digital signature process before reviewing the contract content"
          ],
          "correct": 1
        },
        {
          "id": "S5Q021",
          "type": "knowledge",
          "difficulty": "medium",
          "question": "What is the primary purpose of a data retention policy for HR records?",
          "options": [
            "To ensure employee records are accessible to managers at all times during employment",
            "To define how long different categories of HR data are retained after their primary purpose is fulfilled, ensuring compliance with data protection law by not retaining data longer than necessary and enabling systematic deletion of expired records",
            "To back up HR data in multiple locations for business continuity purposes",
            "To document which HR records require physical versus digital storage"
          ],
          "correct": 1
        },
        {
          "id": "S5Q022",
          "type": "sjt",
          "difficulty": "medium",
          "question": "An employee contacts you saying they were passed over for a promotion and believe it was because of their age. The successful candidate is 15 years younger. How do you handle this?",
          "options": [
            "Advise the employee there is no evidence of discrimination and close the matter",
            "Take the concern seriously as a potential age discrimination allegation, conduct a fact-find examining the selection process, criteria applied, documentation of the decision, and whether the selection panel received bias awareness training — and advise the employee of their right to raise a formal grievance",
            "Ask the hiring manager to explain their decision and pass the explanation to the employee",
            "Advise the employee to focus on their own development for future opportunities"
          ],
          "correct": 1
        },
        {
          "id": "S5Q023",
          "type": "knowledge",
          "difficulty": "hard",
          "question": "What is the doctrine of implied terms in an employment contract, and which implied term is most commonly invoked in constructive dismissal claims?",
          "options": [
            "Implied terms are terms that are not written into the contract but are imported by statute; the most commonly invoked is the implied term of equal pay",
            "Implied terms are terms that are treated as part of the contract even if not expressly written — because they are obvious, customary, or necessary to give the contract business efficacy; the most commonly invoked in constructive dismissal is the implied term of mutual trust and confidence",
            "Implied terms are verbal agreements made during the hiring process; the most common in dismissal claims is an implied promise of job security",
            "Implied terms apply only to senior employment contracts where parties have not addressed every eventuality"
          ],
          "correct": 1
        },
        {
          "id": "S5Q024",
          "type": "sjt",
          "difficulty": "hard",
          "question": "Your organisation acquires a business whose employees have significantly better employment terms than your own. Post-acquisition, the business wants to harmonise terms downward to reduce cost. What are the primary legal and people risks?",
          "options": [
            "Harmonisation is standard post-acquisition practice and carries limited risk if done transparently",
            "Downward harmonisation of terms protected by TUPE or equivalent legislation is prohibited for a specified period and may remain restricted beyond that period; even where legally permissible, it creates flight risk among the acquired workforce, potential constructive dismissal claims, and can undermine the cultural integration needed for the acquisition to succeed — recommend a phased, legally advised approach that distinguishes between what must be harmonised and what should be preserved",
            "Seek employee consent through a ballot — majority acceptance makes harmonisation legally safe",
            "Immediately harmonise pay and benefits to reduce the financial liability of the acquisition"
          ],
          "correct": 1
        },
        {
          "id": "S5Q025",
          "type": "knowledge",
          "difficulty": "medium",
          "question": "What is the primary purpose of a workplace health and safety risk assessment from an HR perspective?",
          "options": [
            "To comply with annual reporting requirements for occupational health incidents",
            "To systematically identify hazards in the workplace, evaluate the risk of harm, and implement controls to eliminate or mitigate those risks — with HR playing a role in ensuring people-related risks such as stress, violence, and ergonomic issues are addressed alongside physical hazards",
            "To provide a defence against personal injury claims",
            "To document the organisation's insurance coverage for workplace accidents"
          ],
          "correct": 1
        },
        {
          "id": "S5Q026",
          "type": "sjt",
          "difficulty": "hard",
          "question": "A business leader requests that HR screen job applicants by checking their social media profiles, including personal posts unrelated to work, before shortlisting. The company operates in the EU. What is your advice?",
          "options": [
            "Support the practice — social media is publicly available and provides useful insight into candidate character",
            "Advise that systematic social media screening of personal accounts creates significant GDPR risk — particularly where protected characteristics may be visible — and could constitute unlawful pre-employment discrimination; recommend a clearly scoped approach limited to professional profiles where directly relevant to the role, with a documented lawful basis and consistent application",
            "Allow the screening but instruct HR not to record what was found",
            "Conduct the screening after offer acceptance so it is a post-hire rather than selection activity"
          ],
          "correct": 1
        },
        {
          "id": "S5Q027",
          "type": "knowledge",
          "difficulty": "medium",
          "question": "What is the primary distinction between an employee and an independent contractor from an employment law perspective, and why does it matter?",
          "options": [
            "Employees work exclusively for one employer; contractors may work for multiple clients. The distinction affects tax treatment only",
            "The distinction turns on the degree of control, integration, and economic dependence — employees are entitled to employment rights including minimum wage, holiday pay, and unfair dismissal protection; misclassifying workers as contractors to avoid these obligations creates legal exposure and back-payment liability",
            "Contractors are always paid more than employees for equivalent work due to the absence of benefits",
            "The distinction only matters in jurisdictions with strong union representation"
          ],
          "correct": 1
        },
        {
          "id": "S5Q028",
          "type": "sjt",
          "difficulty": "medium",
          "question": "An employee returns from a 12-month maternity leave and is told her role no longer exists due to a restructure that happened during her absence. She is offered a different role at a lower grade. What is your advice to the business?",
          "options": [
            "Proceed with the role change — restructuring is a legitimate business reason that applies equally to employees on leave",
            "Advise that employees returning from maternity leave have a right to return to the same or an equivalent role — not a lesser one — and that offering a lower-grade role is likely to constitute maternity discrimination; recommend exploring whether a genuinely equivalent alternative is available and seek legal advice before making any offer",
            "Ask the employee to accept the lower role on a temporary basis while the business considers options",
            "Make the employee redundant and pay the statutory redundancy entitlement"
          ],
          "correct": 1
        },
        {
          "id": "S5Q029",
          "type": "knowledge",
          "difficulty": "hard",
          "question": "What is the concept of territorial jurisdiction in employment law, and why does it matter for globally mobile employees?",
          "options": [
            "It determines which courts have authority to hear employment disputes — relevant only when employees litigate",
            "It determines which country's employment law applies to a worker — relevant for globally mobile employees because their legal entitlements, protections, and the employer's obligations may be governed by the law of the country where work is performed, habitual residence, or contract governing law, and these may conflict — requiring careful analysis to avoid compliance gaps or unexpected liabilities",
            "It applies only to employees who hold a work visa in a foreign jurisdiction",
            "Territorial jurisdiction is always determined by the governing law clause in the employment contract"
          ],
          "correct": 1
        },
        {
          "id": "S5Q030",
          "type": "sjt",
          "difficulty": "hard",
          "question": "Your company has been asked by a government authority in one of your operating countries to provide personal data of specific employees as part of a law enforcement investigation. What is HR's role in responding?",
          "options": [
            "Provide the data immediately — government requests must be complied with",
            "Do not provide data and refuse to cooperate until the investigation is complete",
            "Engage Legal immediately, verify the legitimacy and legal basis of the request, assess whether a valid legal compulsion exists in the relevant jurisdiction, provide only the minimum data legally required, document the request and response, and notify employees only if legally permissible and advisable",
            "Refer the authority directly to the IT team to manage the data extraction"
          ],
          "correct": 2
        },
        {
          "id": "S5Q031",
          "type": "knowledge",
          "difficulty": "medium",
          "question": "What is the primary risk of failing to conduct adequate pre-employment background checks for roles in regulated industries?",
          "options": [
            "The organisation may hire employees who are poorly suited to the role's culture",
            "The organisation may be in breach of regulatory requirements that mandate fitness checks, creating legal liability, regulatory sanction, and reputational damage — as well as potential negligent hiring liability if the employee subsequently causes harm",
            "Background check failures primarily create onboarding delays rather than legal exposure",
            "The risk is primarily reputational and does not create legal liability"
          ],
          "correct": 1
        },
        {
          "id": "S5Q032",
          "type": "sjt",
          "difficulty": "medium",
          "question": "A manager tells you they have decided to change the working hours of all employees in their team from 9-5 to 7-3, starting next month, to better serve an Asian client base. The employees have standard contracts specifying 9-5. What is your advice?",
          "options": [
            "Support the change — business needs justify scheduling adjustments",
            "Advise the manager that unilaterally changing contractual working hours is a breach of contract that could give rise to constructive dismissal claims — recommend a transparent consultation with the team, an exploration of whether the change can be achieved through voluntary agreement, and if the change is business-critical, a proper variation process with reasonable notice and appropriate support",
            "Allow a trial period of two months before formalising the change",
            "Advise the manager to update the contracts after the change is implemented"
          ],
          "correct": 1
        },
        {
          "id": "S5Q033",
          "type": "knowledge",
          "difficulty": "hard",
          "question": "What is the concept of positive action in equality legislation and how does it differ from positive discrimination?",
          "options": [
            "They are the same concept with different names in different jurisdictions",
            "Positive action refers to targeted measures to enable underrepresented groups to compete on equal terms — such as targeted outreach, mentoring, or training — and is lawful; positive discrimination means selecting a less-qualified candidate solely because of a protected characteristic and is unlawful in most jurisdictions",
            "Positive action is lawful in the US but unlawful in the EU; positive discrimination is the reverse",
            "Positive action applies to hiring; positive discrimination applies to promotion and development decisions"
          ],
          "correct": 1
        },
        {
          "id": "S5Q034",
          "type": "sjt",
          "difficulty": "medium",
          "question": "A manager wants to give a long-serving employee a contractual commitment that they will not be made redundant as long as they continue to perform well. They want this in writing. What is your advice?",
          "options": [
            "Support the commitment — it will significantly improve employee loyalty and retention",
            "Advise the manager that no-redundancy commitments create significant legal and operational risk, are likely unenforceable if circumstances change, and could expose the organisation to breach of contract claims if a genuine redundancy situation subsequently arises — recommend an honest conversation about the employee's value and development rather than a commitment the organisation may not be able to honour",
            "Draft a letter of intent rather than a contractual commitment to reduce legal exposure",
            "Allow the commitment but include a force majeure clause to protect the company"
          ],
          "correct": 1
        },
        {
          "id": "S5Q035",
          "type": "knowledge",
          "difficulty": "medium",
          "question": "What does it mean for an employment contract to be void versus voidable?",
          "options": [
            "Void contracts are legally unenforceable from the outset; voidable contracts are valid until one party elects to rescind them on grounds such as misrepresentation, duress, or incapacity",
            "Void contracts can be renegotiated; voidable contracts must be terminated immediately",
            "The distinction only applies to executive-level employment contracts",
            "Voidable contracts require court approval to rescind; void contracts can be rescinded by HR"
          ],
          "correct": 0
        }
      ]
    },
    {
      "id": 6,
      "label": "Section 6",
      "questions": [
        {
          "id": "S6Q001",
          "type": "behavioural",
          "difficulty": "hard",
          "question": "You are in a senior leadership meeting and a decision is being made that you believe will significantly harm a large group of employees and carries material legal risk. You are the only HR voice in the room and the rest of the group is aligned on the decision. What do you do?",
          "options": [
            "Say nothing in the meeting — raise your concerns separately with the CHRO afterward",
            "Raise your concerns clearly in the meeting, name the specific risks with precision, make your position part of the record, and accept that your role is to give the best counsel available — not to control the outcome",
            "Agree in the meeting and then work to mitigate the decision's impact after implementation",
            "Ask for the decision to be deferred and exit the meeting to consult Legal"
          ],
          "correct": 1
        },
        {
          "id": "S6Q002",
          "type": "sjt",
          "difficulty": "hard",
          "question": "You have been asked to lead a company-wide culture transformation programme. The CEO is fully supportive but most of the senior leadership team see it as an HR initiative rather than a business priority and are giving it minimal airtime. What is your approach?",
          "options": [
            "Run the programme through HR channels and measure impact through engagement surveys",
            "Connect the culture programme to specific business outcomes each leader cares about, make leaders the face of the transformation rather than HR, build accountability into their performance objectives, and shift the narrative from culture as a value exercise to culture as a performance lever",
            "Escalate to the CEO to mandate senior leader participation",
            "Redesign the programme to require less senior leader involvement"
          ],
          "correct": 1
        },
        {
          "id": "S6Q003",
          "type": "knowledge",
          "difficulty": "medium",
          "question": "What is cognitive bias and how is it most likely to affect HR decision-making?",
          "options": [
            "A deliberate decision to favour certain employees — relevant in discrimination cases",
            "Systematic patterns in thinking that deviate from rational judgment — in HR contexts they affect hiring, performance assessment, and promotion decisions through biases such as affinity bias, confirmation bias, and the halo effect, often without the decision-maker being aware",
            "A legal concept related to unconscious discrimination — only relevant in employment tribunal proceedings",
            "The tendency for HR professionals to over-rely on qualitative data over quantitative analysis"
          ],
          "correct": 1
        },
        {
          "id": "S6Q004",
          "type": "behavioural",
          "difficulty": "medium",
          "question": "You receive a 360-degree feedback report that includes significant criticism of your communication style from multiple stakeholders. Some of the feedback is uncomfortable and contradicts your own self-perception. What is your response?",
          "options": [
            "Discount the feedback — 360 tools are imprecise and anonymous feedback often reflects personal conflicts",
            "Engage with the feedback seriously regardless of how uncomfortable it is, identify the specific patterns that appear across multiple raters, discuss the findings with a trusted mentor or coach, and design specific behavioural changes with observable measures rather than vague intentions",
            "Share the feedback with your manager to get their view on whether it is accurate",
            "Acknowledge the feedback in your development plan and revisit it at next year's review"
          ],
          "correct": 1
        },
        {
          "id": "S6Q005",
          "type": "sjt",
          "difficulty": "hard",
          "question": "You are an HR leader in an organisation that is preparing to announce significant layoffs. You have been asked to keep the information confidential until the day of announcement, but you know several employees are making major financial commitments — buying houses, taking on debt — that they would not be making if they knew. What is your ethical position?",
          "options": [
            "Maintain strict confidentiality — it is a business obligation and not your decision to override",
            "Leak the information selectively to the most affected employees",
            "Maintain confidentiality while acknowledging the ethical tension privately, consider whether there is any legitimate avenue to accelerate the announcement or reduce the window of exposure, and reflect this tension in any post-announcement review of how the process was handled",
            "Resign rather than be complicit in what you view as an ethical breach"
          ],
          "correct": 2
        },
        {
          "id": "S6Q006",
          "type": "knowledge",
          "difficulty": "medium",
          "question": "What is the difference between a manager's role and a leader's role in an organisational context?",
          "options": [
            "Managers are paid more than leaders",
            "Management focuses on organising, planning, and controlling processes and outputs; leadership focuses on setting direction, inspiring commitment, and driving change — effective organisations need both and they are not mutually exclusive",
            "Leaders operate at senior levels; managers operate at team level",
            "The distinction is semantic — both roles involve directing the work of others"
          ],
          "correct": 1
        },
        {
          "id": "S6Q007",
          "type": "sjt",
          "difficulty": "medium",
          "question": "You have been in your HR role for two years and feel you have plateaued. Your manager gives you satisfactory performance reviews but offers little development. What is your approach to your own growth?",
          "options": [
            "Wait for your manager to identify development opportunities — it is their responsibility",
            "Take ownership of your development plan, identify the specific capability gaps that matter for your next career step, seek stretch assignments and exposure proactively, build a network of mentors outside your direct reporting line, and initiate the development conversation with your manager rather than waiting for it",
            "Start looking for a new role externally — a plateau signals you have outgrown the organisation",
            "Raise the issue through the formal performance review process"
          ],
          "correct": 1
        },
        {
          "id": "S6Q008",
          "type": "knowledge",
          "difficulty": "hard",
          "question": "What is the concept of psychological contract and why is it important for HR practitioners to understand?",
          "options": [
            "A formal contract covering mental health support obligations — important for wellbeing programme design",
            "The unwritten set of mutual expectations between an employee and employer — covering perceived obligations around job security, development, recognition, and fair treatment — important because breaches of the psychological contract are a primary driver of disengagement and voluntary attrition even when formal terms are unchanged",
            "A legal concept used in constructive dismissal claims to describe implied terms",
            "The emotional contract between an HRBP and their business unit leader"
          ],
          "correct": 1
        },
        {
          "id": "S6Q009",
          "type": "behavioural",
          "difficulty": "hard",
          "question": "You are leading a team of six HR professionals. Two of your strongest performers tell you privately that a third team member is creating friction, missing deadlines, and being passive-aggressive in team interactions. The third team member has not been formally counselled. What is your approach?",
          "options": [
            "Have a direct, private conversation with the team member about the specific behaviours you have observed or had reliably reported to you, give clear feedback on the impact, listen to their perspective, agree specific changes, and set a clear follow-up timeline — not as a formal process but as a genuine and serious conversation",
            "Hold a team meeting to address the dynamics without singling out any individual",
            "Begin a formal performance improvement process immediately",
            "Monitor for further evidence before taking any action to avoid acting on secondhand feedback"
          ],
          "correct": 0
        },
        {
          "id": "S6Q010",
          "type": "sjt",
          "difficulty": "hard",
          "question": "You are presenting your HR function's annual performance to the executive team. Most of the metrics are positive, but attrition in one business unit is significantly above target and you did not identify or address it early enough. How do you handle this in the presentation?",
          "options": [
            "Omit the underperforming metric from the main presentation and include it in an appendix",
            "Present the full picture — including the attrition shortfall — with an honest account of what was missed and why, the lessons learned, and the specific actions now in place to address it",
            "Frame the metric as an industry-wide trend rather than an internal performance issue",
            "Attribute the attrition primarily to external market factors outside HR's control"
          ],
          "correct": 1
        },
        {
          "id": "S6Q011",
          "type": "knowledge",
          "difficulty": "medium",
          "question": "What is the difference between leading and lagging indicators in HR analytics?",
          "options": [
            "Leading indicators are reported to senior leadership; lagging indicators go to line managers",
          "Leading indicators measure inputs and early signals that predict future outcomes — such as engagement scores or manager effectiveness ratings; lagging indicators measure outcomes that have already occurred — such as attrition rates or time to fill — and are useful for assessing past performance but not for preventing future problems",
            "Lagging indicators are more accurate because they are based on actual events",
            "The distinction only applies to headcount and financial metrics, not people experience data"
          ],
          "correct": 1
        },
        {
          "id": "S6Q012",
          "type": "behavioural",
          "difficulty": "medium",
          "question": "A colleague challenges your recommendation in a senior leadership meeting with what you believe is an inaccurate and incomplete counter-argument. The room seems to be swaying toward their view. How do you respond?",
          "options": [
            "Back down to preserve the relationship and raise your concerns privately afterward",
            "Hold your position clearly and respectfully, provide the specific evidence or reasoning that supports your recommendation, acknowledge what is valid in the counter-argument, and invite the group to evaluate both positions on the merits",
            "Challenge the colleague directly on the inaccuracies in front of the group",
            "Defer to the group consensus — leadership teams should reach aligned decisions"
          ],
          "correct": 1
        },
        {
          "id": "S6Q013",
          "type": "knowledge",
          "difficulty": "hard",
          "question": "What is the concept of psychological safety at the team level, and what are its measurable indicators in an organisational context?",
          "options": [
            "The absence of workplace bullying — measured by the number of ER complaints per team",
            "The shared belief that the team is a safe environment for interpersonal risk-taking — measurable through willingness to voice concerns, frequency of candid feedback, error reporting rates, inclusion in decision-making, and team members' self-reported comfort raising difficult topics",
            "An individual employee's resilience and ability to manage stress — assessed through wellbeing surveys",
            "Compliance with the organisation's mental health and wellbeing policy"
          ],
          "correct": 1
        },
        {
          "id": "S6Q014",
          "type": "sjt",
          "difficulty": "hard",
          "question": "You are asked to build the business case for investing in a new HR technology platform. The investment is significant and the CFO is sceptical. What elements must your business case include to be credible?",
          "options": [
            "A vendor comparison and feature matrix showing why the selected platform is best in class",
            "A quantified problem statement with current-state cost and efficiency data, a clear articulation of the measurable outcomes the investment will deliver and by when, a total cost of ownership including implementation and change management, a risk-adjusted ROI analysis, and a change adoption plan with named accountabilities",
            "References from other companies that have implemented the same platform",
            "A pilot programme proposal with no financial commitment required upfront"
          ],
          "correct": 1
        },
        {
          "id": "S6Q015",
          "type": "behavioural",
          "difficulty": "medium",
          "question": "You are asked to deliver a training session on unconscious bias to a group of senior leaders who are openly sceptical of the topic. Several have said they do not believe bias affects their decisions. How do you approach the session?",
          "options": [
            "Start with the organisational data — demographic gaps in hiring, promotion, and retention — and let the evidence create the case for the topic rather than opening with theory or values-based arguments that the sceptical audience will dismiss",
            "Open with a direct challenge to the leaders' belief that they are free from bias",
            "Use external expert videos to make the case so the message comes from a credible third party",
            "Focus on legal compliance obligations rather than culture and behaviour to make the session more palatable"
          ],
          "correct": 0
        },
        {
          "id": "S6Q016",
          "type": "knowledge",
          "difficulty": "medium",
          "question": "What is servant leadership and how does it manifest in a people management context?",
          "options": [
            "A leadership style where the manager does whatever their team members request",
            "A leadership philosophy where the leader's primary role is to serve the growth, wellbeing, and effectiveness of their team — manifesting through active listening, removing obstacles, developing team members' capabilities, and sharing power rather than concentrating it",
            "A leadership style appropriate only for junior or entry-level teams",
            "A concept from HR theory that is rarely applicable in commercial business settings"
          ],
          "correct": 1
        },
        {
          "id": "S6Q017",
          "type": "sjt",
          "difficulty": "medium",
          "question": "You are new to an HR leadership role and have identified several significant process gaps in the team you have inherited. Your predecessor is still in the organisation in a different role and is well liked. How do you make changes without creating unnecessary conflict?",
          "options": [
            "Make changes quickly and decisively before others have time to resist",
            "Frame the changes around future needs and the team's development rather than past failures, acknowledge what the previous approach achieved in its context, involve the team in co-designing improvements, and manage the narrative so changes are attributed to growth and not to fixing what was broken",
            "Seek your predecessor's approval before making any significant changes",
            "Delay changes for six months until you have established your own credibility"
          ],
          "correct": 1
        },
        {
          "id": "S6Q018",
          "type": "knowledge",
          "difficulty": "hard",
          "question": "What is the concept of agency in an HR ethics context, and how should HR professionals navigate situations where business interests conflict with employee interests?",
          "options": [
            "HR professionals are agents of the employer and must always prioritise business interests over employee interests",
            "HR professionals hold a dual accountability — to the business and to the people within it — and must navigate conflicts through transparent counsel rather than silent compliance; where a business decision causes disproportionate or unjust harm to employees, HR's role is to name the conflict, advocate for a fair approach, and document their counsel even if the final decision rests elsewhere",
            "Agency conflicts in HR are always resolved through employment law, which defines the boundary",
            "The conflict between business and employee interests is a management issue, not an HR ethics issue"
          ],
          "correct": 1
        },
        {
          "id": "S6Q019",
          "type": "sjt",
          "difficulty": "hard",
          "question": "Your organisation is going through its third significant restructure in four years. Employee trust is low and change fatigue is high. You are asked to lead the people workstream of this restructure. What is your biggest risk and how do you address it?",
          "options": [
            "The biggest risk is legal exposure from three restructures in four years — address it through Legal review",
            "The biggest risk is change fatigue causing the restructure to fail in implementation — address it by reducing the scope of changes to minimise disruption",
            "The biggest risk is credibility — employees who have lived through repeated change cycles will be deeply sceptical of communications and commitments; address it by being radically transparent about what is known and unknown, honouring every commitment made, and acknowledging the organisation's recent track record honestly rather than treating this as a fresh start",
            "The biggest risk is senior leader alignment — address it by securing written commitment from all executives before any communication"
          ],
          "correct": 2
        },
        {
          "id": "S6Q020",
          "type": "behavioural",
          "difficulty": "hard",
          "question": "A CEO you greatly respect asks you to participate in a process that you believe crosses an ethical line — not illegal, but something you are not comfortable with. They frame it as necessary for the business and say they trust you to handle it with discretion. How do you respond?",
          "options": [
            "Comply — the CEO's authority and your trust in their judgment supersede your personal discomfort",
            "Decline and escalate to the board immediately",
            "Name your discomfort directly and specifically, explain your ethical concern without lecturing, explore whether there is an alternative approach that achieves the business objective without crossing the line you cannot step over, and accept that maintaining your integrity may mean disappointing someone you respect",
            "Comply but document your objection in writing to create a record"
          ],
          "correct": 2
        },
        {
          "id": "S6Q021",
          "type": "knowledge",
          "difficulty": "medium",
          "question": "What is the concept of influence without authority in an HR leadership context?",
          "options": [
            "Manipulating business leaders into accepting HR recommendations without their awareness",
            "The ability to shape decisions, behaviours, and outcomes through credibility, expertise, relationship quality, and persuasion — rather than through positional power or mandate; critical for HR leaders who must influence senior leaders who technically outrank them",
            "Using data and analytics to override business decisions that HR disagrees with",
            "Delegating authority to team members in the absence of formal approval processes"
          ],
          "correct": 1
        },
        {
          "id": "S6Q022",
          "type": "sjt",
          "difficulty": "medium",
          "question": "You are responsible for a team that has just delivered a difficult project under significant pressure. The team performed well but is visibly exhausted. The next project starts in two weeks. How do you manage this?",
          "options": [
            "Move directly to the next project — the team will recover naturally with the passage of time",
            "Formally acknowledge the team's effort in a meaningful way, create space for genuine rest and recovery before the next project begins, assess whether the resourcing model for the next project is sustainable, and have honest individual conversations about capacity and wellbeing before committing to the next timeline",
            "Reduce the scope of the next project to protect the team",
            "Bring in contract resource to carry the load for the first two weeks of the next project"
          ],
          "correct": 1
        },
        {
          "id": "S6Q023",
          "type": "knowledge",
          "difficulty": "hard",
          "question": "What is the primary limitation of personality assessments in a leadership development context?",
          "options": [
            "Personality assessments are expensive and time-consuming to administer at scale",
            "Personality assessments describe stable trait tendencies but do not reliably predict contextual leadership behaviour, can create fixed labels that limit growth mindset, may embed cultural and demographic bias in norm groups, and should be used as one input to development conversations rather than as definitive profiles",
            "Most personality assessments are not validated and therefore have no value in professional settings",
            "Personality assessments are only useful for identifying derailers, not development strengths"
          ],
          "correct": 1
        },
        {
          "id": "S6Q024",
          "type": "sjt",
          "difficulty": "hard",
          "question": "Your organisation is considering implementing an AI-powered HR decision-support tool that will recommend whether candidates should be shortlisted based on historical hiring data. You know the historical data reflects a workforce that has been predominantly male and from certain educational backgrounds. What risks do you surface before implementation?",
          "options": [
            "Data privacy risk — candidates' data will be processed by an AI tool",
            "Cost of implementation versus manual screening",
            "The model will likely perpetuate and amplify the demographic bias in the historical data, effectively automating discrimination — the tool requires an independent bias audit before use, transparent disclosure to candidates, human oversight of all shortlisting decisions, and regular bias monitoring after deployment; this is an HR ethics and legal compliance issue, not just a technical one",
            "Risk of candidates challenging decisions made by an automated system"
          ],
          "correct": 2
        },
        {
          "id": "S6Q025",
          "type": "behavioural",
          "difficulty": "medium",
          "question": "You have made a significant error in a process that has resulted in an employee receiving incorrect information about their entitlements. The error is yours and is now visible to senior stakeholders. What is your response?",
          "options": [
            "Identify how the error occurred and take steps to prevent recurrence before acknowledging it",
            "Own the error promptly and directly, correct the impact for the affected employee as a first priority, be transparent with relevant stakeholders about what happened and what you are doing to fix it, and use it as a learning input without excessive self-criticism",
            "Raise a process concern that contributed to the error to share accountability",
            "Correct the error quietly and only address it with stakeholders if they raise it"
          ],
          "correct": 1
        },
        {
          "id": "S6Q026",
          "type": "knowledge",
          "difficulty": "medium",
          "question": "What does it mean for an HR leader to demonstrate business acumen?",
          "options": [
            "Having a finance qualification and being able to read a P&L",
            "Understanding how the business makes money, what the key value drivers and risks are, how people decisions connect to commercial outcomes, and being able to frame HR interventions in terms of business impact rather than HR activity — enabling credible engagement with non-HR leaders",
            "Having prior experience working in a non-HR business role",
            "Participating in business planning cycles and attending commercial leadership meetings"
          ],
          "correct": 1
        },
        {
          "id": "S6Q027",
          "type": "sjt",
          "difficulty": "medium",
          "question": "You are asked to set the objectives for your HR team for the coming year. The CEO wants all objectives aligned to financial performance metrics. Most of your team's work affects financial outcomes indirectly through people outcomes. How do you design the objectives?",
          "options": [
            "Set purely financial objectives for all team members — this is what the CEO wants",
            "Set purely HR activity objectives — the team's work is people-focused and should be measured accordingly",
            "Design a balanced objective framework that includes leading HR indicators directly within the team's control, connects those indicators to the business outcomes they affect, and includes one or two business-level metrics where HR's contribution can be plausibly tracked — presenting the linkage clearly to the CEO",
            "Use industry-standard HR benchmarks as objectives regardless of the business context"
          ],
          "correct": 2
        },
        {
          "id": "S6Q028",
          "type": "knowledge",
          "difficulty": "hard",
          "question": "What is the concept of change saturation and what are its primary warning signs in an organisation?",
          "options": [
            "When an organisation has invested too much in change management consultants — warning signs include budget overruns and initiative proliferation",
            "When the volume and pace of change exceeds the organisation's capacity to absorb and adapt — warning signs include initiative abandonment, implementation fatigue, cynicism about new programmes, managers deprioritising change efforts, and increasing attrition among middle management who carry most of the implementation burden",
            "When employees have adapted so fully to change that new initiatives no longer create resistance — warning signs are a lack of engagement in change planning",
            "A risk that only affects organisations undergoing M&A activity"
          ],
          "correct": 1
        },
        {
          "id": "S6Q029",
          "type": "sjt",
          "difficulty": "hard",
          "question": "You are a newly appointed HR Director. In your first month you identify that the HR function is widely perceived as bureaucratic, reactive, and more focused on compliance than on adding value. The CHRO is aware but has not prioritised it. What do you do?",
          "options": [
            "Wait for a formal mandate from the CHRO before making any structural changes",
            "Accept the perception as historical and work to change it gradually through individual relationships",
            "Build a clear diagnosis of the perception gap using stakeholder data, design a credible repositioning plan that addresses root causes rather than symptoms, secure the CHRO's active sponsorship, and begin delivering visible value in the areas of highest business pain — so that the function's reputation changes through evidence rather than communication",
            "Present a new HR strategy to the executive team and use their response to build momentum"
          ],
          "correct": 2
        },
        {
          "id": "S6Q030",
          "type": "behavioural",
          "difficulty": "medium",
          "question": "You disagree with a decision made by your CHRO that you believe will negatively impact your team's credibility. The decision has already been communicated. What is your approach?",
          "options": [
            "Implement the decision fully and say nothing — it is not your place to second-guess the CHRO",
            "Privately brief your team that you disagreed with the decision to maintain your credibility with them",
            "Implement the decision professionally and completely, then seek a private conversation with the CHRO to share your concerns about the impact — framing it as information they should have rather than a challenge to their authority, and accepting their response",
            "Escalate your disagreement to the CEO to ensure your position is on the record"
          ],
          "correct": 2
        },
        {
          "id": "S6Q031",
          "type": "knowledge",
          "difficulty": "easy",
          "question": "What does the 70-20-10 learning and development model propose?",
          "options": [
            "70% of learning budget should go to formal training, 20% to coaching, 10% to self-directed learning",
            "Approximately 70% of effective learning comes from on-the-job experience, 20% from social learning and relationships, and 10% from formal structured training programmes",
            "70% of employees prefer digital learning, 20% prefer classroom learning, and 10% prefer coaching",
            "The model applies to leadership development only and does not apply to operational roles"
          ],
          "correct": 1
        },
        {
          "id": "S6Q032",
          "type": "sjt",
          "difficulty": "medium",
          "question": "A high-potential team member tells you they are considering leaving because they feel their potential is not being recognised and they have been passed over for stretch assignments. They are correct — you have not advocated strongly enough for them. What do you do?",
          "options": [
            "Acknowledge the situation but manage expectations — not every stretch opportunity can go to every high potential",
            "Own your part in the situation directly and without qualification, articulate specifically what you will do differently, take immediate action to create a visible stretch opportunity, and follow through with consistent advocacy — demonstrating that your commitment is behavioural, not rhetorical",
            "Conduct a career conversation and update their development plan",
            "Recommend they apply for an internal transfer to a team where more opportunities exist"
          ],
          "correct": 1
        },
        {
          "id": "S6Q033",
          "type": "knowledge",
          "difficulty": "medium",
          "question": "What is the primary risk of an HR function that measures its own performance only through activity metrics such as number of trainings delivered, cases closed, and policies updated?",
          "options": [
            "Activity metrics are difficult to collect consistently across different HR teams",
            "Activity metrics measure effort and volume rather than impact — an HR function that closes cases quickly, delivers many trainings, and updates many policies can still be failing to move the needle on the outcomes that matter: retention, capability, engagement, and organisational performance",
            "Activity metrics create perverse incentives for HR teams to prioritise quantity over quality",
            "Activity metrics do not translate well into financial reporting for board purposes"
          ],
          "correct": 1
        },
        {
          "id": "S6Q034",
          "type": "sjt",
          "difficulty": "hard",
          "question": "The board has asked the CHRO to present the people risk register at the next board meeting. You have been asked to prepare the content. What are the four people risks most likely to warrant board-level attention in a mid-sized global company?",
          "options": [
            "Employee satisfaction scores, HR headcount ratios, training completion rates, and grievance volumes",
            "Critical role vacancy risk, succession depth for the top 20 roles, skills obsolescence in strategically critical functions, and culture or conduct risks that could create regulatory, legal, or reputational exposure",
            "Payroll error rates, employment tribunal numbers, D&I metrics, and manager effectiveness scores",
            "Attrition rates, time to fill, cost per hire, and headcount versus budget variance"
          ],
          "correct": 1
        },
        {
          "id": "S6Q035",
          "type": "behavioural",
          "difficulty": "hard",
          "question": "You are leading an HR team of 12 people. One team member is consistently excellent but is working unsustainably long hours and showing early signs of burnout. They are reluctant to reduce their workload because they fear being seen as less committed. How do you address this?",
          "options": [
            "Respect their autonomy — they are an adult and can manage their own workload",
            "Have a direct and caring conversation that names what you are observing, challenge the belief that long hours equal commitment by reframing what sustainable high performance looks like, take specific steps to redistribute workload with their involvement, and model the behaviour yourself so the team culture does not reward unsustainable work",
            "Formally reduce their workload by removing responsibilities without discussion",
            "Recommend they take annual leave to recover before addressing the structural workload issue"
          ],
          "correct": 1
        }
      ]
    },
    {
      "id": 7,
      "label": "Section 7",
      "questions": [
        {
          "id": "S7Q001",
          "type": "knowledge",
          "difficulty": "medium",
          "question": "What is the primary difference between using AI as an automation tool versus using AI as a decision-support tool in HR?",
          "options": [
            "Automation tools are more expensive to implement than decision-support tools",
            "Automation tools replace human execution of defined, repeatable tasks; decision-support tools augment human judgment by providing data, patterns, or options — but the decision remains with the human; the distinction matters because conflating the two can lead to inappropriate automation of decisions that require human judgment and accountability",
            "Decision-support tools are used only at senior HR levels; automation tools are for operational HR teams",
            "There is no meaningful distinction — AI tools serve the same purpose regardless of how they are framed"
          ],
          "correct": 1
        },
        {
          "id": "S7Q002",
          "type": "sjt",
          "difficulty": "hard",
          "question": "An HR leader wants to implement an AI chatbot to handle all Tier 0 and Tier 1 HR queries. The vendor claims the chatbot can handle 85% of queries without human intervention. What are the critical questions you must answer before approving implementation?",
          "options": [
            "Which vendor has the highest market share and what is the implementation timeline?",
            "What data was the chatbot trained on and does it reflect your organisation's specific policies, what is the escalation path for queries the chatbot cannot handle, how will the tool manage emotionally sensitive queries, what governance exists if the chatbot gives incorrect information, and how will you measure quality rather than just volume resolution?",
            "What is the cost saving versus the current human team and when is break-even?",
            "Has the chatbot been implemented by comparable organisations and what are their satisfaction scores?"
          ],
          "correct": 1
        },
        {
          "id": "S7Q003",
          "type": "knowledge",
          "difficulty": "hard",
          "question": "What is algorithmic bias in the context of AI-powered HR tools, and why is it particularly difficult to detect?",
          "options": [
            "Intentional programming errors inserted by vendors to favour certain demographic groups — detected through independent code review",
            "Systematic patterns in AI outputs that disadvantage certain groups, typically arising from biased training data or proxy variables that correlate with protected characteristics — difficult to detect because the AI may appear to make neutral decisions while reproducing historical patterns of inequity, and standard accuracy metrics do not surface demographic disparities",
            "Technical errors in AI systems that produce incorrect outputs — detected through quality assurance testing",
            "Bias introduced by HR practitioners who override AI recommendations with their own preferences"
          ],
          "correct": 1
        },
        {
          "id": "S7Q004",
          "type": "sjt",
          "difficulty": "hard",
          "question": "Your organisation's AI-powered performance prediction tool has flagged 12 employees as flight risks with 78% confidence. A business leader wants to use this list to immediately begin managed exits for the highest-risk employees before they resign. What is your position?",
          "options": [
            "Support the approach — proactive talent management is better than reactive retention",
            "Reject the use of the tool for this purpose entirely — AI should not be used in HR",
            "Advise that acting on a predictive list to manage out employees who have not demonstrated performance issues conflates flight risk with performance risk, creates significant legal exposure, and undermines the trust and culture the tool was intended to protect — recommend using the predictions to trigger targeted retention conversations and development interventions instead",
            "Use the list to prioritise which employees receive additional development investment"
          ],
          "correct": 2
        },
        {
          "id": "S7Q005",
          "type": "knowledge",
          "difficulty": "medium",
          "question": "What does it mean to prompt engineer an AI language model, and why is this skill relevant for HR professionals?",
          "options": [
            "Writing the code that trains an AI model — relevant for HR tech teams building custom AI tools",
            "Crafting inputs to an AI model in a way that reliably produces high-quality, structured, and contextually appropriate outputs — relevant for HR professionals because well-engineered prompts dramatically increase the usefulness of AI tools for tasks like policy drafting, job description writing, communication design, and scenario testing",
            "Reviewing AI-generated HR content for accuracy — a basic quality assurance task",
            "Managing the vendor relationship for AI platforms used in HR"
          ],
          "correct": 1
        },
        {
          "id": "S7Q006",
          "type": "sjt",
          "difficulty": "hard",
          "question": "A product team has built an AI tool that analyses employee sentiment from internal communication channels including Slack messages and emails. The tool is ready to deploy but employees have not been informed it exists. The product lead says informing employees will compromise the data quality. What is your position?",
          "options": [
            "Support the covert deployment — the business interest in authentic data is legitimate",
            "Advise that covert sentiment analysis of private communications is almost certainly unlawful under data protection frameworks including GDPR, creates a profound breach of employee trust if discovered, and will cause significantly more harm to employee relations than transparent disclosure — recommend a lawful, transparent implementation or abandonment of the tool",
            "Allow a limited pilot with senior leaders only before making a final decision",
            "Consult Legal and implement whatever they advise without HR input"
          ],
          "correct": 1
        },
        {
          "id": "S7Q007",
          "type": "knowledge",
          "difficulty": "medium",
          "question": "What is a large language model (LLM) and how does it differ from a traditional rule-based HR system?",
          "options": [
            "An LLM is a cloud-hosted HR system; rule-based systems are on-premise",
            "An LLM is a type of AI trained on large amounts of text data that can generate human-like language, synthesise information, and respond flexibly to open-ended inputs — unlike rule-based systems which execute predefined logic and can only handle inputs within their programmed parameters",
            "LLMs replace HRIS systems for data storage and workforce analytics",
            "LLMs are used exclusively for chatbot and employee self-service applications"
          ],
          "correct": 1
        },
        {
          "id": "S7Q008",
          "type": "sjt",
          "difficulty": "medium",
          "question": "You are building the requirement specification for an AI tool that will generate first-draft job descriptions from a brief manager input. What are the three most important requirements you would include?",
          "options": [
            "Speed of generation, formatting consistency, and integration with the ATS",
            "That outputs are reviewed by HR before posting, that the tool is tested for gendered or exclusionary language in its outputs, and that it can be fine-tuned to reflect the organisation's EVP and language standards rather than producing generic descriptions",
            "That the tool generates descriptions in multiple languages, that it is mobile-compatible, and that it is integrated with LinkedIn",
            "That the tool is SOC 2 compliant, that it has a free trial period, and that it has positive reviews from other HR teams"
          ],
          "correct": 1
        },
        {
          "id": "S7Q009",
          "type": "knowledge",
          "difficulty": "hard",
          "question": "What is the concept of human-in-the-loop (HITL) in AI system design, and why is it particularly important in HR applications?",
          "options": [
            "A design principle where AI systems periodically request human feedback to improve their outputs over time",
            "A design principle ensuring that human judgment is maintained as an active checkpoint in AI-assisted decision processes — particularly important in HR because employment decisions affect people's livelihoods and rights, carry legal accountability that cannot be delegated to an algorithm, and involve contextual nuance that current AI systems cannot reliably handle",
            "A regulatory requirement mandating that all AI hiring tools be reviewed by a human HR professional",
            "A method for integrating AI recommendations into HRIS workflows without requiring retraining of HR staff"
          ],
          "correct": 1
        },
        {
          "id": "S7Q010",
          "type": "sjt",
          "difficulty": "hard",
          "question": "You are the HR leader responsible for evaluating an AI-powered psychometric tool that the talent team wants to use in the executive hiring process. The vendor claims 91% predictive validity. What is your evaluation approach?",
          "options": [
            "Accept the vendor's claim — 91% validity is statistically robust and the tool should be approved",
            "Request the underlying validation study, assess the sample characteristics and whether they are comparable to your own population, commission an independent bias audit for the demographic groups relevant to your hiring pipeline, evaluate whether the legal framework in your jurisdictions permits AI-assisted psychometric assessment in hiring, and pilot with human oversight before full deployment",
            "Ask other organisations using the tool for their experience before making a decision",
            "Approve a pilot with three to five executive hires and evaluate outcomes before committing"
          ],
          "correct": 1
        },
        {
          "id": "S7Q011",
          "type": "knowledge",
          "difficulty": "medium",
          "question": "What is an employer of record (EOR) and in what circumstances is it most relevant for an HR operations team?",
          "options": [
            "The legal entity that appears on an employee's payslip — relevant for all international employees",
            "A third-party organisation that acts as the legal employer for workers in a jurisdiction where the hiring company does not have a legal entity — most relevant when a company wants to hire in a new country quickly without the time and cost of setting up a local entity",
            "A regulatory body that maintains records of employer compliance with employment law",
            "An internal HR role responsible for maintaining accurate employee records across all jurisdictions"
          ],
          "correct": 1
        },
        {
          "id": "S7Q012",
          "type": "sjt",
          "difficulty": "hard",
          "question": "Your HR team is piloting an AI assistant that helps draft employee communications. A team member uses it to draft a sensitive redundancy communication. The output is factually accurate but emotionally tone-deaf and contains two policy inaccuracies. What does this incident tell you about your AI governance and what do you do?",
          "options": [
            "Stop using AI for sensitive communications entirely",
            "Continue using the tool but add a disclaimer to all AI-generated content",
            "The incident reveals that the team has not been trained on appropriate use cases for the tool, that there is no review protocol for sensitive outputs, and that the tool has not been fine-tuned for policy accuracy — implement a use case framework that identifies where AI assistance is appropriate, require human review for all sensitive communications, and retrain the tool on current policy content",
            "Report the incident to the vendor as a product quality failure"
          ],
          "correct": 2
        },
        {
          "id": "S7Q013",
          "type": "knowledge",
          "difficulty": "easy",
          "question": "What is the primary ethical concern with using AI tools that were trained predominantly on English-language data for HR processes in multilingual or non-Western cultural contexts?",
          "options": [
            "Translation quality — AI tools may produce inaccurate translations for non-English speakers",
            "Cultural and linguistic bias — models trained on English-dominant data encode Western cultural assumptions about communication style, professional norms, and appropriate behaviour, which may produce outputs that are inappropriate, inaccurate, or inequitable for employees in different cultural contexts",
            "Compliance risk — AI tools must be certified in each country before use",
            "There is no ethical concern provided the tool can generate outputs in the local language"
          ],
          "correct": 1
        },
        {
          "id": "S7Q014",
          "type": "sjt",
          "difficulty": "medium",
          "question": "A CEO asks you to explore whether AI can be used to screen CVs at scale to reduce time-to-hire. You know the company's historical hiring data has demographic gaps. What is your recommended approach?",
          "options": [
            "Implement AI CV screening using the historical data — speed and scale benefits outweigh risks",
            "Reject AI CV screening entirely — the demographic gap disqualifies it",
            "Explore AI screening using bias-corrected criteria rather than historical acceptance patterns, commission a pre-deployment bias audit across demographic groups, implement with mandatory human review for all rejected applications in the first six months, and build a monitoring framework to detect emerging bias patterns before they scale",
            "Use AI screening only for roles where the demographic gap is less severe"
          ],
          "correct": 2
        },
        {
          "id": "S7Q015",
          "type": "knowledge",
          "difficulty": "hard",
          "question": "What does it mean to fine-tune a large language model for an HR use case, and what is the primary risk of doing so with proprietary employee data?",
          "options": [
            "Fine-tuning means configuring the model's user interface for HR workflows — the primary risk is integration complexity",
            "Fine-tuning means continuing to train a pre-trained model on domain-specific data to improve its performance on targeted tasks — the primary risk is that proprietary employee data used for fine-tuning may be exposed through the model's outputs, violating data protection obligations if the data was not collected for this purpose and employees did not consent",
            "Fine-tuning is a vendor responsibility and not an HR concern",
            "The primary risk is the cost of fine-tuning relative to the performance improvement achieved"
          ],
          "correct": 1
        },
        {
          "id": "S7Q016",
          "type": "sjt",
          "difficulty": "hard",
          "question": "Your organisation wants to build an internal HR product that provides employees with an AI-powered career development coach. The product team asks you to specify what the tool should and should not do. What are your three non-negotiable requirements?",
          "options": [
            "It should be available 24/7, it should integrate with the LMS, and it should generate development plans automatically",
            "It must not store sensitive personal disclosures beyond the session without explicit consent, it must be transparent with users that they are interacting with AI rather than a human, and it must escalate clearly to a human HR contact when queries involve distress, performance management, or legal matters",
            "It should be mobile-compatible, available in multiple languages, and connected to the job posting system for internal mobility",
            "It should have gamification features to drive engagement, send weekly nudges, and benchmark users against anonymised peer groups"
          ],
          "correct": 1
        },
        {
          "id": "S7Q017",
          "type": "knowledge",
          "difficulty": "medium",
          "question": "What is the difference between AI replacing HR roles and AI augmenting HR roles, and which is more accurate in the current landscape?",
          "options": [
            "AI is replacing HR roles at all levels — the profession will shrink significantly in the next decade",
            "AI is primarily augmenting HR roles by automating high-volume, repeatable tasks and providing decision-support, freeing HR professionals to focus on judgment-intensive, relational, and strategic work — while creating new roles around AI governance, tool design, and data interpretation; the net effect is role transformation rather than elimination",
            "AI is replacing HR roles at the operational level but augmenting them at the strategic level",
            "The current landscape shows AI augmenting HR roles only in large enterprises — mid-sized companies are not yet affected"
          ],
          "correct": 1
        },
        {
          "id": "S7Q018",
          "type": "sjt",
          "difficulty": "hard",
          "question": "An HR tech startup pitches an AI tool that claims to detect employee burnout risk through passive monitoring of calendar density, email response times, and after-hours activity patterns. The product has impressive case study data. What questions must you answer before considering implementation?",
          "options": [
            "What is the price per seat and what is the minimum contract term?",
            "What is the legal basis for processing this behavioural data under applicable data protection law, how was the burnout correlation established and in what populations, what is the false positive rate and what happens to employees incorrectly flagged, how will employees be informed their activity is being monitored, what human response is triggered by a flag, and can the tool create more anxiety than it prevents by making employees feel surveilled?",
            "Which other large companies have implemented it and what were their results?",
            "Whether the tool integrates with your existing HRIS and what the implementation timeline is"
          ],
          "correct": 1
        },
        {
          "id": "S7Q019",
          "type": "knowledge",
          "difficulty": "medium",
          "question": "What is generative AI and how does it differ from predictive AI in an HR context?",
          "options": [
            "Generative AI produces images; predictive AI produces text",
            "Generative AI creates new content — text, structured outputs, scenarios — in response to a prompt; predictive AI analyses patterns in historical data to forecast future outcomes such as attrition, performance, or hiring success; in HR, both have applications but require different governance approaches — generative AI requires content quality and bias review, predictive AI requires statistical validity and fairness auditing",
            "Generative AI is more advanced than predictive AI and will replace it",
            "Predictive AI is used in HR; generative AI has no current HR application"
          ],
          "correct": 1
        },
        {
          "id": "S7Q020",
          "type": "sjt",
          "difficulty": "medium",
          "question": "A junior HR team member is using an AI writing tool to draft all their policy documents, communications, and case correspondence without reviewing the outputs. The quality is inconsistent and two drafts have contained factual errors. How do you address this?",
          "options": [
            "Ban the use of AI tools by junior team members",
            "Address it as both a quality and professional development issue — the team member needs to understand that AI tools require expert oversight rather than replacing it, that outputs must be reviewed with the same rigour as any self-authored work, and that over-reliance on AI without developing their own judgment will limit their professional growth",
            "Implement a review process where all AI-generated content is checked by a senior team member",
            "Update the team's AI usage policy to specify that all outputs must be reviewed"
          ],
          "correct": 1
        },
        {
          "id": "S7Q021",
          "type": "knowledge",
          "difficulty": "hard",
          "question": "What is the EU AI Act's classification of high-risk AI, and which HR use cases fall into this category?",
          "options": [
            "High-risk AI means any AI tool used by more than 1,000 employees — all major HRIS platforms qualify",
            "The EU AI Act classifies AI systems used in employment, worker management, and access to self-employment as high-risk — including CV screening, performance evaluation, promotion decisions, and task allocation — requiring conformity assessments, transparency obligations, human oversight mechanisms, and technical robustness standards before deployment",
            "High-risk AI only applies to AI used in public sector HR — private sector HR tools are exempt",
            "The EU AI Act has not yet classified any HR tools as high-risk pending further consultation"
          ],
          "correct": 1
        },
        {
          "id": "S7Q022",
          "type": "sjt",
          "difficulty": "hard",
          "question": "You are asked to lead the HR workstream of a company-wide AI adoption programme. Employees are anxious about job security and managers are uncertain how to lead teams that work alongside AI. What is HR's specific contribution to making this adoption successful?",
          "options": [
            "Communicating the business case for AI and managing employee resistance",
            "HR's contribution spans role redesign to clarify how human and AI work divides, capability building so employees can work effectively alongside AI, narrative management that is honest about impact rather than reassuring, updated performance management that recognises new ways of working, and creating channels for employees to raise AI-related concerns — positioning HR as a genuine partner in a complex human transition rather than an implementation function",
            "Training employees on how to use the specific AI tools being implemented",
            "Updating job descriptions and employment contracts to reflect AI-augmented roles"
          ],
          "correct": 1
        },
        {
          "id": "S7Q023",
          "type": "knowledge",
          "difficulty": "medium",
          "question": "What does it mean for an AI system to hallucinate, and why is this particularly risky in HR applications?",
          "options": [
            "When an AI system crashes or produces an error code — risky because it disrupts HR workflows",
            "When an AI system generates confident, plausible-sounding content that is factually incorrect or entirely fabricated — particularly risky in HR because outputs may be used in legal documents, policy guidance, or employee communications where an undetected error could create compliance failures, unfair decisions, or reputational damage",
            "When an AI system produces outputs that are culturally inappropriate — risky in global HR contexts",
            "A technical term for when an AI system processes too many requests simultaneously and degrades in quality"
          ],
          "correct": 1
        },
        {
          "id": "S7Q024",
          "type": "sjt",
          "difficulty": "hard",
          "question": "You are designing an AI governance framework for your HR function. What are the four pillars your framework must include to be credible and defensible?",
          "options": [
            "Budget control, vendor management, IT security review, and legal sign-off",
            "Use case approval with explicit scope and exclusions, bias auditing at deployment and on an ongoing basis, human oversight requirements for decisions affecting employees, and employee transparency obligations so workers know when AI is being used in processes that affect them",
            "Data quality standards, system integration requirements, change management plan, and user training",
            "Executive sponsorship, HR team capability assessment, pilot programme design, and success metrics"
          ],
          "correct": 1
        },
        {
          "id": "S7Q025",
          "type": "knowledge",
          "difficulty": "medium",
          "question": "What is the primary limitation of using natural language processing (NLP) to analyse open-text employee survey responses at scale?",
          "options": [
            "NLP tools are too slow to process large volumes of text data in real time",
            "NLP models may misclassify sentiment, miss irony, sarcasm, or culturally specific expressions, and can produce category labels that reflect the model's training data rather than the employees' actual meaning — creating false confidence in thematic analysis that requires human validation of a representative sample before decisions are made from it",
            "Open-text responses are too short for NLP models to generate meaningful analysis",
            "NLP tools cannot process responses in languages other than English"
          ],
          "correct": 1
        },
        {
          "id": "S7Q026",
          "type": "sjt",
          "difficulty": "medium",
          "question": "An HR team member asks you whether they should disclose to an employee that a first-draft response to their grievance was written using an AI tool before being reviewed and edited by HR. What is your advice?",
          "options": [
            "No disclosure needed — HR reviewed and owns the content regardless of the drafting tool",
            "Advise that while there is no universal legal requirement to disclose AI drafting assistance in this context, transparency with employees about how HR communicates with them builds trust — particularly in sensitive processes like grievances — and that if the employee directly asks, HR should answer honestly; consider developing a clear team standard on AI disclosure in sensitive employee communications",
            "Disclose in every communication that AI was used — employees have a right to know",
            "Only disclose if the employee specifically asks"
          ],
          "correct": 1
        },
        {
          "id": "S7Q027",
          "type": "knowledge",
          "difficulty": "hard",
          "question": "What is the concept of explainability in AI systems and why is it a compliance requirement in employment decision contexts?",
          "options": [
            "The ability of a vendor to explain their pricing model — required for procurement compliance",
            "The ability to articulate in human-understandable terms why an AI system reached a particular output or decision — required in employment contexts because employees have legal rights under GDPR and national law to meaningful information about solely automated decisions that affect them, and because unexplainable decisions expose the organisation to discrimination claims it cannot defend",
            "The ability to explain AI concepts to non-technical stakeholders — a communication best practice",
            "A technical documentation requirement for AI vendors operating in regulated industries"
          ],
          "correct": 1
        },
        {
          "id": "S7Q028",
          "type": "sjt",
          "difficulty": "hard",
          "question": "Your organisation wants to use an AI tool to automate scheduling of disciplinary hearings, including generating invitation letters, setting times, and sending reminders. Is this an appropriate use of AI in HR?",
          "options": [
            "No — AI should never be involved in disciplinary processes",
            "Yes — scheduling automation is fully appropriate for all HR administrative tasks regardless of context",
            "Scheduling and administrative logistics for disciplinary hearings is an appropriate use of automation for efficiency gains — with the critical caveat that the invitation letters must be human-reviewed for accuracy and tone before sending, that the process must never appear automated to the employee, and that any personalisation required for sensitive circumstances must be applied by a human",
            "Only appropriate if the employee consents to AI involvement in their disciplinary process"
          ],
          "correct": 2
        },
        {
          "id": "S7Q029",
          "type": "knowledge",
          "difficulty": "medium",
          "question": "What is the primary difference between supervised and unsupervised machine learning, and give one example of each in an HR context?",
          "options": [
            "Supervised learning requires human monitoring during operation; unsupervised learning runs autonomously. Example: supervised — chatbot responses; unsupervised — payroll processing",
            "Supervised learning trains a model on labelled data to predict defined outcomes — for example, training an attrition prediction model on historical data where outcomes are known; unsupervised learning finds hidden patterns in unlabelled data — for example, clustering employees by behaviour patterns to identify engagement segments without predefined categories",
            "Supervised learning is used for text analysis; unsupervised learning is used for image recognition",
            "The distinction is technical and not relevant to HR practitioners who use pre-built AI tools"
          ],
          "correct": 1
        },
        {
          "id": "S7Q030",
          "type": "sjt",
          "difficulty": "hard",
          "question": "An AI tool your HR team has been using for six months to help write performance review summaries is found to have a systematic pattern of using more achievement-oriented language for male employees and more relational language for female employees, even when the underlying performance evidence is equivalent. What do you do?",
          "options": [
            "Suspend use of the tool immediately for future reviews only — past reviews are already complete and cannot be changed",
            "Suspend the tool immediately, conduct a retrospective audit of all reviews generated using the tool to assess the scale of the bias, identify employees who may have been disadvantaged and take corrective action, report the finding to the vendor, and review your AI governance process to understand how the bias went undetected for six months",
            "Report the bias to the vendor and await their fix before resuming use",
            "Instruct HR reviewers to manually correct the language in all future outputs before distribution"
          ],
          "correct": 1
        },
        {
          "id": "S7Q031",
          "type": "knowledge",
          "difficulty": "easy",
          "question": "What does RAG stand for in AI development and why is it relevant for HR technology teams building internal AI tools?",
          "options": [
            "Regulated AI Governance — a compliance framework for organisations deploying AI in regulated industries",
            "Retrieval Augmented Generation — a technique where an AI model retrieves relevant information from a defined knowledge base before generating a response, rather than relying solely on its training data; relevant for HR because it allows AI tools to be grounded in the organisation's own policies, handbooks, and processes rather than generic internet training data",
            "Risk Assessment Guidance — an internal HR framework for evaluating new technology implementations",
            "Real-time Analytics Generation — a method for producing live HR dashboards from HRIS data"
          ],
          "correct": 1
        },
        {
          "id": "S7Q032",
          "type": "sjt",
          "difficulty": "medium",
          "question": "A senior business leader tells you that their team has started using AI tools to complete work tasks without HR or IT knowledge, including using public AI platforms to draft HR-related documents containing employee data. What is your response?",
          "options": [
            "Ban all use of consumer AI tools across the organisation",
            "Acknowledge that shadow AI adoption signals unmet productivity needs — respond by developing a clear organisational AI use policy with specific guidance on what data may and may not be input into public AI tools, provide approved alternatives for common use cases, educate rather than simply prohibit, and use the incident to accelerate the development of governed internal AI capabilities",
            "Report the data protection breach to the DPO and let them manage the response",
            "Advise the leader to instruct their team to stop and take no further action"
          ],
          "correct": 1
        },
        {
          "id": "S7Q033",
          "type": "knowledge",
          "difficulty": "hard",
          "question": "What is the concept of model drift in AI systems and why does it require ongoing monitoring in HR applications?",
          "options": [
            "When an AI model is updated by the vendor without notifying the organisation — requiring version control monitoring",
            "The gradual degradation in an AI model's accuracy or appropriateness over time as real-world data patterns shift away from the training data — requiring ongoing monitoring in HR because a model that was accurate and unbiased at deployment may become less accurate or more biased as the workforce, job market, or organisational context changes",
            "When employees find ways to manipulate AI-generated outputs to their advantage",
            "The tendency for AI models to produce increasingly conservative outputs over time as they process more data"
          ],
          "correct": 1
        },
        {
          "id": "S7Q034",
          "type": "sjt",
          "difficulty": "hard",
          "question": "You are evaluating two proposals for an AI-powered HR tool. Proposal A has better performance metrics and a lower cost but the vendor cannot explain how the model reaches its recommendations. Proposal B is 40% more expensive, performs slightly less well on benchmarks, but provides full explainability and audit logs. Which do you recommend and why?",
          "options": [
            "Proposal A — performance and cost are the primary evaluation criteria for technology investments",
            "Proposal B — in HR contexts where AI recommendations affect employees, explainability is not optional; the inability to explain how a recommendation was reached exposes the organisation to legal risk, prevents meaningful human oversight, and makes it impossible to detect or correct bias — the 40% premium is the cost of responsible deployment",
            "Commission a further procurement exercise to find a tool that combines the performance of A with the explainability of B",
            "Proposal A with a contractual requirement for the vendor to provide explainability within 12 months"
          ],
          "correct": 1
        },
        {
          "id": "S7Q035",
          "type": "behavioural",
          "difficulty": "hard",
          "question": "A colleague argues that HR professionals who are not technically skilled in AI and data science cannot meaningfully govern AI tools and should defer all AI decisions to IT and the product team. How do you respond?",
          "options": [
            "Agree — technical governance of AI should sit with IT and product teams",
            "Partially agree — HR should focus on policy and people impact while IT handles technical governance",
            "Disagree directly: HR's role in AI governance is not to make technical decisions but to define what outcomes are acceptable, identify which HR decisions must retain human accountability, evaluate tools for bias and fairness from a people expertise standpoint, and hold vendors and internal teams to ethical standards — this requires domain expertise in HR, not software engineering, and ceding it to IT produces AI deployments that are technically sound but ethically and legally compromised",
            "Agree in the short term but argue that HR professionals should upskill in data science to reclaim governance authority"
          ],
          "correct": 2
        }
      ]
    }
  ]
};

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
    console.error("DETAILED ERROR:", err.message, err.stack);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
