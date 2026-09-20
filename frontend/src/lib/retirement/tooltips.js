// --- Tooltip & Tour Content Strings ---
// All user-facing help text lives here so it is easy to update without
// touching component files.

// --- Dashboard Tour Steps ---
export const TOUR_STEPS = [
  {
    targetId: 'tour-score-arc',
    title: 'Your Retirement Score',
    description:
      'This is your RetireSahi Score \u2014 a single number (0\u2013100) that tells you how ready you are for retirement. Green = great, red = needs work.',
  },
  {
    targetId: 'tour-projected-value',
    title: 'Projected Corpus',
    description:
      'The total NPS corpus you will accumulate by retirement, based on your current contribution, equity mix, and expected returns.',
  },
  {
    targetId: 'tour-annuity',
    title: 'Mandatory Annuity',
    description:
      'PFRDA requires 40% of your corpus to buy an annuity at retirement. This card shows that amount and the monthly pension it generates.',
  },
  {
    targetId: 'tour-corpus-gap',
    title: 'Corpus Gap Closer',
    description:
      'If your projected corpus falls short of what you need, this card shows the monthly shortfall. Zero gap means you are on track!',
  },
  {
    targetId: 'tour-quick-stats',
    title: 'Quick Stats',
    description:
      'A snapshot of your monthly contribution, total wealth, time to retirement, and inflation-adjusted future expenses \u2014 all in one row.',
  },
  {
    targetId: 'tour-scenarios',
    title: 'Decision Scenarios',
    description:
      'Each card shows how a single change (more contributions, step-up, later retirement) impacts your score. Click any to simulate it live.',
  },
  {
    targetId: 'tour-milestones',
    title: 'Wealth Milestones',
    description:
      'See at what age your NPS corpus crosses key milestones like 10L, 50L, 1Cr. Green checkmarks mean you have already passed them!',
  },
  {
    targetId: 'tour-teasers',
    title: 'Tax Shield & AI',
    description:
      'Explore your NPS tax savings across all three 80CCD sections, or ask our AI copilot anything about your retirement plan.',
  },
];

// --- Dashboard Tooltips ---
export const DASHBOARD_TIPS = {
  scoreArc:
    'Your score is calculated from projected corpus, required corpus, contribution rate, equity allocation, and time horizon. Tap the info icon on the arc to see all assumptions.',
  projectedValue:
    'Total NPS corpus at retirement after compounding your monthly contributions at the blended return rate (equity + corporate bonds + govt securities).',
  annuity:
    '40% of your final corpus must be used to purchase a lifetime annuity from an insurance provider. The pension shown assumes a 6% annuity rate.',
  corpusGap:
    'The difference between what you need (based on lifestyle x inflation) and what you will have. If this is zero, your current plan fully covers retirement.',
  monthlyPulse:
    'Your current monthly NPS contribution. Increasing this is usually the single most impactful lever to improve your score.',
  totalWealth:
    'Sum of your existing NPS corpus and any other savings/investments you have declared.',
  timeRemaining:
    'Years left until your target retirement age. More time = more compounding, which dramatically improves outcomes.',
  futureExpense:
    'What your current lifestyle will cost per month at retirement after accounting for 6% annual inflation.',
  scenarios:
    'Each scenario simulates one change to your plan and shows the point impact. Click to load it into the full simulator.',
  milestones:
    'Milestones are calculated by projecting your corpus forward year by year and finding when each target is crossed.',
};

// --- Dream Planner Tooltips ---
export const DREAM_PLANNER_TIPS = {
  lifestyleMultiplier:
    'The multiplier determines what percentage of your current CTC you need monthly in retirement. Essential = 40%, Comfortable = 60%, Premium = 80%.',
  inflationReality:
    'Inflation at 6% p.a. means one rupee today is worth less in the future. This section shows how much more your lifestyle will cost at retirement.',
  categoryHousing:
    'Housing & Utilities typically account for ~35% of retirement spending, including rent/EMI, electricity, water, and maintenance.',
  categoryFood:
    'Food & Dining covers groceries and eating out \u2014 estimated at ~20% of your monthly retirement spend.',
  categoryHealthcare:
    'Healthcare costs tend to increase with age. We allocate ~15% of spend here, but you may want more buffer if you have dependents.',
  categoryTravel:
    'Travel & Leisure \u2014 vacations, hobbies, entertainment \u2014 makes up ~15% of the comfortable/premium lifestyle.',
  categoryFamily:
    'Family gifts, education, and miscellaneous spends \u2014 approximately 10% of total.',
  categoryEmergency:
    'A 5% buffer for unexpected expenses \u2014 medical emergencies, home repairs, etc.',
  monthlyNeed:
    'The "today" number is your lifestyle cost now. The "retirement" number is that same cost inflated to your retirement year.',
};

// --- Tax Shield Tooltips ---
export const TAX_SHIELD_TIPS = {
  section80CCD1B:
    'Section 80CCD(1B) offers an additional 50,000 deduction exclusively for NPS contributions, over and above the 1.5L limit of Section 80C. Available only in the Old Regime.',
  section80CCD2:
    'Section 80CCD(2) allows your employer NPS contribution (up to 10% of basic salary, 14% for Govt.) to be deducted from taxable income. This works in BOTH tax regimes.',
  newRegime:
    'The New Tax Regime (default from FY 2025-26) has lower rates but almost no deductions. Standard deduction is 75,000. NPS 80CCD(2) still applies.',
  oldRegime:
    'The Old Tax Regime allows deductions under 80C, 80D, 80CCD(1B), HRA, etc. Higher base rates but potentially lower tax if you have significant deductions.',
  section80C:
    'Section 80C covers PPF, ELSS, life insurance premiums, tuition fees, and more \u2014 up to 1,50,000 per year. This is separate from the NPS 80CCD(1B) bonus.',
  nps80CCD1B:
    'This is the NPS-exclusive 50,000 bonus deduction. If you invest 50K in NPS beyond your regular contributions, you save extra tax in the Old Regime.',
  precisionTweak:
    'Add your other tax-saving investments to compare the Old Regime with deductions vs the New Regime. This helps you choose the better option.',
};

// --- Settings Tooltips ---
export const SETTINGS_TIPS = {
  equityAllocation:
    'PFRDA caps equity allocation based on age. Under 50: up to 75%. Between 50-60: linearly decreases. This affects your blended return rate and therefore your score.',
  basicSalaryPct:
    'Your basic salary as a percentage of CTC determines the 80CCD(2) employer contribution limit (10% of basic, or 14% for Govt). Typical range: 30-50% of CTC.',
  taxRegime:
    'Choose between New Regime (lower rates, almost no deductions) and Old Regime (higher rates, but 80C/80D/80CCD deductions apply). NPS 80CCD(2) works in both.',
};
