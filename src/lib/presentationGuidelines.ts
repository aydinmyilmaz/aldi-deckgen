import type { PresentationConfig, SlideType } from '@/types';

/**
 * Returns a tailored guidelines string injected into slide-generation prompts.
 * Draws on McKinsey Pyramid Principle, Duarte, and Guy Kawasaki best practices.
 */
export function getPresentationGuidelines(config: PresentationConfig): string {
  const sections: string[] = [];

  // ── Universal best practices ─────────────────────────────────────────────
  sections.push(
    `UNIVERSAL PRESENTATION BEST PRACTICES:\n` +
    `• One idea per slide — if you need "and", split into two slides.\n` +
    `• Title = insight, not topic. "AI adoption broadens but value lags" beats "AI Adoption".\n` +
    `• Lead with the conclusion, then the evidence (Answer First / Pyramid Principle).\n` +
    `• Statistics must prove a point — never list stats for their own sake.\n` +
    `• If the source document is numbers-heavy, curate ruthlessly: pick the 1–2 most impactful numbers per slide, drop the rest.\n` +
    `• Never use "Label: long explanation" bullet format — write short declarative sentences.`
  );

  // ── Purpose-specific rules ────────────────────────────────────────────────
  const purposeRules: Record<string, string> = {
    inform: (
      `PURPOSE — INFORM:\n` +
      `• Organize content from most important to supporting detail (inverted pyramid).\n` +
      `• Each slide answers exactly one question clearly.\n` +
      `• Use data to support insights — never let raw numbers be the message.\n` +
      `• Avoid repeating the same statistic across multiple slides.\n` +
      `• Audience takeaway per slide: "I now know X, and X matters because Y."`
    ),
    align: (
      `PURPOSE — ALIGN:\n` +
      `• Frame every slide around "we" — shared goals, collective benefit.\n` +
      `• Minimize raw statistics — direction and consensus matter more than precision.\n` +
      `• Acknowledge trade-offs honestly; don't oversell one side.\n` +
      `• Each slide should answer: "Why does this matter to everyone in the room?"\n` +
      `• Avoid blame language. Focus on path forward, not past failures.`
    ),
    decide: (
      `PURPOSE — DECIDE:\n` +
      `• Name options explicitly in slide titles when presenting alternatives.\n` +
      `• Show decision criteria before presenting options.\n` +
      `• Your recommendation must be visible and direct — never bury it.\n` +
      `• Numbers are appropriate only when they directly inform a decision.\n` +
      `• Final slide must contain: Decision needed / Recommendation / Owner / Timeline.`
    ),
    sell: (
      `PURPOSE — SELL:\n` +
      `• Structure: Problem → Impact → Solution → Proof → Call to Action.\n` +
      `• Lead with the audience's problem — not your product or solution.\n` +
      `• Benefits over features: "saves 3 hours/week" beats "automated workflow engine".\n` +
      `• One powerful proof point beats five weak ones.\n` +
      `• Final slide CTA must be specific, concrete, and easy to say yes to.`
    ),
  };

  if (purposeRules[config.purpose]) {
    sections.push(purposeRules[config.purpose]);
  }

  // ── Tone-specific rules ───────────────────────────────────────────────────
  const toneRules: Record<string, string> = {
    Professional: (
      `TONE — PROFESSIONAL:\n` +
      `• Formal register — no contractions, no slang.\n` +
      `• Measured language: "data suggests" not "clearly proves".\n` +
      `• Passive constructions are acceptable for objectivity.`
    ),
    Casual: (
      `TONE — CASUAL:\n` +
      `• Conversational — contractions and first person are fine.\n` +
      `• Short punchy sentences preferred over formal constructions.\n` +
      `• Avoid corporate jargon and buzzwords.`
    ),
    Academic: (
      `TONE — ACADEMIC:\n` +
      `• Structured argumentation — claim, evidence, implication.\n` +
      `• Hedged language where appropriate: "evidence indicates", "findings suggest".\n` +
      `• Methodology can be referenced briefly when it strengthens credibility.`
    ),
    Standard: (
      `TONE — STANDARD:\n` +
      `• Balanced — neither stiffly formal nor overly casual.\n` +
      `• Clear, direct language. Active voice preferred.`
    ),
  };

  if (toneRules[config.tone]) {
    sections.push(toneRules[config.tone]);
  }

  // ── Audience hint ─────────────────────────────────────────────────────────
  if (config.audience) {
    const audienceLower = config.audience.toLowerCase();
    if (/exec|c-suite|ceo|cfo|cto|vp|director|leadership|board/i.test(audienceLower)) {
      sections.push(
        `AUDIENCE — EXECUTIVE:\n` +
        `• Assume 30 seconds per slide. Every bullet must stand alone.\n` +
        `• Lead with "so what" before evidence. Strategic implications only.\n` +
        `• No methodology, no process detail — just decisions and outcomes.`
      );
    } else if (/tech|engineer|developer|data|analyst|scientist/i.test(audienceLower)) {
      sections.push(
        `AUDIENCE — TECHNICAL:\n` +
        `• Precision is valued — specific metrics and methods are appropriate.\n` +
        `• Technical terminology is acceptable; avoid dumbing down.\n` +
        `• Show how conclusions were reached when relevant.`
      );
    } else if (/general|broad|mixed|all/i.test(audienceLower)) {
      sections.push(
        `AUDIENCE — GENERAL:\n` +
        `• No jargon — define acronyms on first use.\n` +
        `• Use analogies to make abstract concepts concrete.\n` +
        `• Err on the side of simpler language.`
      );
    }
  }

  return sections.join('\n\n');
}

/**
 * Per-slide-type content rules injected into the slideWriter per slide.
 * Overrides general bullet rules for special slide types.
 */
export function getSlideTypeRules(slideType: SlideType): string {
  const rules: Record<SlideType, string> = {
    title: (
      `SLIDE TYPE — TITLE:\n` +
      `bullets = presentation subtitle or tagline (1 item), then: author/presenter name, organization, date. Max 4 bullets. Short phrases, no full sentences. No statistics.\n` +
      `keyMessage = the core promise or framing of the entire presentation (≤12 words).`
    ),
    agenda: (
      `SLIDE TYPE — AGENDA:\n` +
      `bullets = section headings only — 4–7 short topic labels. No sub-bullets, no explanations.\n` +
      `Keep each label ≤ 5 words. This is a navigation slide, not a content slide.\n` +
      `keyMessage = brief framing of the deck's journey (e.g. "From context to recommendation").`
    ),
    background: (
      `SLIDE TYPE — BACKGROUND / CONTEXT:\n` +
      `bullets = 3–4 context statements explaining why this topic matters now.\n` +
      `Answer: "What is the situation? Why does it matter? What has changed?"\n` +
      `No recommendations yet. Set the stage only.`
    ),
    problem: (
      `SLIDE TYPE — PROBLEM STATEMENT:\n` +
      `bullets = 3–4 items: the core problem, its cause, its impact. Lead with the most critical pain point.\n` +
      `Include 1–2 key data points that quantify the problem's scale or urgency.\n` +
      `keyMessage = the problem in one sentence — make the audience feel it.`
    ),
    objectives: (
      `SLIDE TYPE — OBJECTIVES / GOALS:\n` +
      `bullets = 3–5 clear, measurable goals starting with an infinitive verb (Increase, Reduce, Achieve, Build).\n` +
      `Include a metric or target where possible (e.g. "Reduce onboarding time by 30%").\n` +
      `keyMessage = what success looks like in one sentence.`
    ),
    method: (
      `SLIDE TYPE — METHOD / APPROACH:\n` +
      `bullets = 3–5 steps or components of the approach/methodology in logical order.\n` +
      `Focus on HOW, not WHAT. Name frameworks, tools, or processes used.\n` +
      `No statistics — this is about process, not outcomes.`
    ),
    findings: (
      `SLIDE TYPE — FINDINGS / ANALYSIS:\n` +
      `bullets = 3–5 key insights from data. Each bullet = ONE insight + supporting fact.\n` +
      `Lead with the insight, follow with the number (e.g. "Scaling remains rare — only 7% report full deployment").\n` +
      `Max 2 statistics per slide. Every number must prove the insight, not just state a fact.`
    ),
    solution: (
      `SLIDE TYPE — PROPOSED SOLUTION / RECOMMENDATION:\n` +
      `bullets = 3–5 concrete elements of the proposal. What specifically will be done differently?\n` +
      `Be direct and specific — avoid vague language like "improve processes".\n` +
      `keyMessage = the recommendation in one sentence.`
    ),
    implementation: (
      `SLIDE TYPE — IMPLEMENTATION PLAN:\n` +
      `bullets = 3–5 action steps. Each starts with a verb + noun (e.g. "Deploy pilot in Q1 2026").\n` +
      `Include timing, owner, or resource where available. Sequential structure preferred.\n` +
      `visualSuggestion = a timeline or Gantt-style layout.`
    ),
    benefits: (
      `SLIDE TYPE — BENEFITS / EXPECTED RESULTS:\n` +
      `bullets = 3–5 specific outcomes framed from the audience's perspective.\n` +
      `Quantify where possible. Frame as benefits, not features (what changes for them).\n` +
      `keyMessage = the single most compelling ROI or outcome (≤12 words).`
    ),
    conclusion: (
      `SLIDE TYPE — CONCLUSION / SUMMARY:\n` +
      `bullets = 3–5 synthesized cross-deck insights starting with action verbs.\n` +
      `Reinforce the main message. Do not introduce new information.\n` +
      `keyMessage = the one thing the audience must remember. Make it memorable.`
    ),
    qna: (
      `SLIDE TYPE — Q&A:\n` +
      `bullets = 0 items, OR 1–2 items maximum (e.g. contact info, follow-up link).\n` +
      `keyMessage = an inviting, open closing statement (e.g. "Questions welcome — let's discuss").\n` +
      `speakerNotes = remind presenter to thank the audience and invite questions.\n` +
      `visualSuggestion = simple graphic or single large question mark.`
    ),
    references: (
      `SLIDE TYPE — REFERENCES / SOURCES:\n` +
      `bullets = citation entries. Include source name, date, URL or publication.\n` +
      `Academic or standard citation format acceptable. No word limit per bullet.\n` +
      `keyMessage = empty or "Sources & Further Reading".`
    ),
    content: (
      `SLIDE TYPE — CONTENT (GENERIC):\n` +
      `Apply standard rules: 3–5 bullets, ≤12 words each, plain text, lead with insight.`
    ),
  };

  return rules[slideType] ?? rules['content'];
}

/**
 * Returns numeric density threshold for the reviewer.
 * Sell and align decks should have fewer numbers than inform/decide.
 */
export function getNumericDensityThreshold(config: PresentationConfig): number {
  if (config.purpose === 'align' || config.purpose === 'sell') return config.slideCount * 1.0;
  return config.slideCount * 1.5; // inform and decide allow more
}
