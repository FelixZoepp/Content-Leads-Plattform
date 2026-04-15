export type PipelineType = 'cold';

// Simplified pipeline stages (cold outreach)
export const PIPELINE_STAGES = [
  'Lead',
  'Hat Seite geöffnet',
  'Heißer Lead - Anrufen',
  'Setting',
  'Closing',
  'Abgeschlossen',
  'Verloren'
] as const;

// Call activity outcomes (used in PowerDialer, not as pipeline stages)
export const CALL_OUTCOMES = [
  'Nicht erreicht',
  '2× nicht erreicht',
  '3× nicht erreicht',
  'Entscheider nicht erreichbar',
  'Im Urlaub',
  'Kein Interesse',
  'Kein Bedarf',
  'Setting No Show',
  'Setting Follow Up',
  'Closing No Show',
  'Closing Follow Up',
  'Rückruf vereinbart'
] as const;

export type PipelineStage = typeof PIPELINE_STAGES[number];
export type CallOutcome = typeof CALL_OUTCOMES[number];

export const getStageColor = (stage: string): string => {
  switch (stage) {
    case 'Lead':
      return 'bg-muted text-muted-foreground border border-border';
    case 'Hat Seite geöffnet':
      return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
    case 'Heißer Lead - Anrufen':
      return 'bg-orange-500/20 text-orange-400 border border-orange-500/30';
    case 'Setting':
      return 'bg-purple-500/20 text-purple-400 border border-purple-500/30';
    case 'Closing':
      return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
    case 'Abgeschlossen':
      return 'bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]';
    case 'Verloren':
      return 'bg-[hsl(var(--danger))] text-[hsl(var(--danger-foreground))]';
    default:
      return 'bg-secondary text-secondary-foreground';
  }
};

export const getCallOutcomeColor = (outcome: string): string => {
  if (outcome.includes('nicht erreicht') || outcome === 'Entscheider nicht erreichbar') {
    return 'bg-muted text-muted-foreground';
  }
  if (outcome.includes('No Show')) {
    return 'bg-red-500/20 text-red-400 border border-red-500/30';
  }
  if (outcome.includes('Follow Up') || outcome === 'Rückruf vereinbart' || outcome === 'Im Urlaub') {
    return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
  }
  if (outcome === 'Kein Interesse' || outcome === 'Kein Bedarf') {
    return 'bg-[hsl(var(--danger))] text-[hsl(var(--danger-foreground))]';
  }
  return 'bg-muted text-muted-foreground';
};

export const getPipelineStages = (_pipeline?: PipelineType) => {
  return PIPELINE_STAGES;
};
