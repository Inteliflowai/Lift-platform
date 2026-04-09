export const FEATURES = {
  // Core — all tiers including trial
  CANDIDATE_SESSIONS:          'candidate_sessions',
  EVALUATOR_WORKSPACE:         'evaluator_workspace',
  INTERNAL_REPORT:             'internal_report',
  FAMILY_SUMMARY:              'family_summary',
  PLACEMENT_GUIDANCE:          'placement_guidance',
  AUDIT_LOG:                   'audit_log',

  // Professional tier
  PORTUGUESE_REPORTS:          'portuguese_reports',
  TRI_SCORE:                   'tri_score',
  LEARNING_SUPPORT_SIGNALS:    'learning_support_signals',
  VOICE_RESPONSE:              'voice_response',
  EVALUATOR_INTELLIGENCE:      'evaluator_intelligence',
  CORE_INTEGRATION:            'core_integration',
  PLACEMENT_SUPPORT_PLAN:      'placement_support_plan',
  REAPPLICATION_INTELLIGENCE:  'reapplication_intelligence',
  DEMO_MODE:                   'demo_mode',

  // Enterprise tier
  BENCHMARKING_NETWORK:        'benchmarking_network',
  OUTCOME_TRACKING:            'outcome_tracking',
  WAITLIST_INTELLIGENCE:       'waitlist_intelligence',
  SIS_INTEGRATIONS:            'sis_integrations',
  WHITE_LABEL:                 'white_label',
  THERAPEUTIC_MODULE:          'therapeutic_module',
  STAFF_PLACEMENT:             'staff_placement',
  CUSTOM_BRANDING:             'custom_branding',
  PRIORITY_SUPPORT:            'priority_support',
} as const;

export type Feature = (typeof FEATURES)[keyof typeof FEATURES];

const ESSENTIALS_FEATURES: Feature[] = [
  FEATURES.CANDIDATE_SESSIONS,
  FEATURES.EVALUATOR_WORKSPACE,
  FEATURES.INTERNAL_REPORT,
  FEATURES.FAMILY_SUMMARY,
  FEATURES.PLACEMENT_GUIDANCE,
  FEATURES.AUDIT_LOG,
];

const PROFESSIONAL_FEATURES: Feature[] = [
  ...ESSENTIALS_FEATURES,
  FEATURES.PORTUGUESE_REPORTS,
  FEATURES.TRI_SCORE,
  FEATURES.LEARNING_SUPPORT_SIGNALS,
  FEATURES.VOICE_RESPONSE,
  FEATURES.EVALUATOR_INTELLIGENCE,
  FEATURES.CORE_INTEGRATION,
  FEATURES.PLACEMENT_SUPPORT_PLAN,
  FEATURES.REAPPLICATION_INTELLIGENCE,
  FEATURES.DEMO_MODE,
];

const ENTERPRISE_FEATURES: Feature[] = [
  ...PROFESSIONAL_FEATURES,
  FEATURES.BENCHMARKING_NETWORK,
  FEATURES.OUTCOME_TRACKING,
  FEATURES.WAITLIST_INTELLIGENCE,
  FEATURES.SIS_INTEGRATIONS,
  FEATURES.WHITE_LABEL,
  FEATURES.THERAPEUTIC_MODULE,
  FEATURES.STAFF_PLACEMENT,
  FEATURES.CUSTOM_BRANDING,
  FEATURES.PRIORITY_SUPPORT,
];

// Trial gets Enterprise features minus white-label/branding
const TRIAL_FEATURES: Feature[] = ENTERPRISE_FEATURES.filter(
  (f) => f !== FEATURES.WHITE_LABEL && f !== FEATURES.CUSTOM_BRANDING
);

export const TIER_FEATURES: Record<string, Feature[]> = {
  trial: TRIAL_FEATURES,
  essentials: ESSENTIALS_FEATURES,
  professional: PROFESSIONAL_FEATURES,
  enterprise: ENTERPRISE_FEATURES,
};

export const TIER_LIMITS = {
  trial:        { sessions_per_year: 25,   evaluator_seats: 3,    admin_seats: 1 },
  essentials:   { sessions_per_year: 150,  evaluator_seats: 2,    admin_seats: 1 },
  professional: { sessions_per_year: 400,  evaluator_seats: 5,    admin_seats: 2 },
  enterprise:   { sessions_per_year: null, evaluator_seats: null, admin_seats: null },
} as const;

export const TIER_PRICING = {
  essentials:   { annual: 4800,  label: 'Essentials' },
  professional: { annual: 9600,  label: 'Professional' },
  enterprise:   { annual: 18000, label: 'Enterprise' },
} as const;
