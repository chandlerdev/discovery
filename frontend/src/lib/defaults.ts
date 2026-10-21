import sectionsData from './data/sections.json';
import prefillData from './data/prefill.json';
import workstreamsData from './data/workstreams.json';
import themesData from './data/themes.json';

import type {
  Answers,
  AnswerValue,
  EstimateItem,
  Numeric,
  ProjectDoc,
  Question,
  Section,
  Status,
  Theme,
} from './types';

export const DEFAULT_SECTIONS = sectionsData as Section[];
export const PREFILL = prefillData as Answers;
export const WORKSTREAMS = workstreamsData as EstimateItem[];
export const THEMES = themesData as Theme[];

export const STATUS_LABELS: Record<Status, string> = {
  discovery: 'Discovery in progress — please complete the questionnaire',
  review: 'Under review by your DESSS consultant',
  assigned: 'Assigned to a developer',
  estimated: 'Estimate submitted — awaiting project approval',
  approved: 'Estimate approved — your proposal is being prepared',
  proposal: 'Proposal ready — please review and accept below',
  accepted: 'Proposal accepted — implementation in progress',
  rejected: 'Estimate returned for revision',
  handover: 'Handed over — awaiting your sign-off',
  signedoff: 'Project signed off · complete',
};

export const STAGES: { id: Status; label: string }[] = [
  { id: 'discovery', label: 'Discovery' },
  { id: 'review', label: 'Reviewed' },
  { id: 'assigned', label: 'Assigned' },
  { id: 'estimated', label: 'Estimated' },
  { id: 'approved', label: 'Approved' },
  { id: 'proposal', label: 'Proposal sent' },
  { id: 'accepted', label: 'Client accepted' },
  { id: 'handover', label: 'Handed over' },
  { id: 'signedoff', label: 'Signed off' },
];

export function freshDoc(company = 'FreshBytes'): ProjectDoc {
  return {
    meta: { customer: company, partner: 'DESSS', version: 2, updatedAt: null, updatedBy: null },
    answers: {},
    review: { notes: '', complete: false, by: null, at: null },
    workflow: {
      status: 'discovery',
      assignment: { developer: '', notes: '', by: null, at: null },
      estimate: { items: [], totalLow: 0, totalHigh: 0, notes: '', by: null, at: null },
      approval: { decision: null, comments: '', by: null, at: null },
      proposal: {
        published: false,
        rate: '',
        showPricing: false,
        type: 'tm',
        fixedPrice: '',
        theme: null,
        note: '',
        by: null,
        at: null,
        accepted: null,
        items: [],
        totalLow: 0,
        totalHigh: 0,
        investLow: 0,
        investHigh: 0,
        investMixed: false,
      },
      handover: { note: '', by: null, at: null },
      signoff: { name: '', comments: '', at: null },
    },
    activity: [],
  };
}

/**
 * Deep-merges a document read from the API over a fresh one, so a record saved by
 * an older version of the app still has every field the UI expects.
 */
export function normalizeDoc(raw: unknown, company?: string): ProjectDoc {
  const base = freshDoc(company);
  if (!raw || typeof raw !== 'object' || !('meta' in raw)) return base;

  const doc = raw as Partial<ProjectDoc>;
  const wf = doc.workflow ?? ({} as Partial<ProjectDoc['workflow']>);

  return {
    ...base,
    ...doc,
    meta: { ...base.meta, ...doc.meta },
    review: { ...base.review, ...doc.review },
    workflow: {
      ...base.workflow,
      ...wf,
      assignment: { ...base.workflow.assignment, ...wf.assignment },
      estimate: { ...base.workflow.estimate, ...wf.estimate },
      approval: { ...base.workflow.approval, ...wf.approval },
      proposal: { ...base.workflow.proposal, ...wf.proposal },
      handover: { ...base.workflow.handover, ...wf.handover },
      signoff: { ...base.workflow.signoff, ...wf.signoff },
    },
    answers: doc.answers ?? {},
    activity: doc.activity ?? [],
  };
}

export const isAnswered = (v: AnswerValue | undefined | null): boolean => {
  if (v == null) return false;
  if (Array.isArray(v)) {
    // checkbox (string[]) → any selection; table (string[][]) → any non-blank cell
    return v.some((cell) =>
      Array.isArray(cell)
        ? cell.some((c) => String(c).trim() !== '')
        : String(cell).trim() !== '',
    );
  }
  return String(v).trim() !== '';
};

/** Human-readable form of any answer (string, checkbox list, or table grid). */
export const answerText = (v: AnswerValue | undefined | null): string => {
  if (v == null) return '';
  if (Array.isArray(v)) {
    if (v.length && Array.isArray(v[0])) {
      return (v as string[][])
        .map((row) => row.map((c) => String(c ?? '').trim()).join(' | '))
        .filter((line) => line.replace(/\s*\|\s*/g, '').trim() !== '')
        .join('\n');
    }
    return (v as string[]).join(', ');
  }
  return String(v);
};

export const allQuestions = (sections: Section[]): Question[] =>
  sections.flatMap((s) => s.questions || []);

export const completion = (sections: Section[], answers?: Answers): number => {
  const qs = allQuestions(sections);
  if (!qs.length) return 0;
  const done = qs.filter((q) => isAnswered((answers || {})[q.id])).length;
  return Math.round((done / qs.length) * 100);
};

export const fmtDate = (iso?: string | null): string => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
};

export const money = (n: number): string => '$' + Math.round(n).toLocaleString('en-US');

/** Investment range = hours × rate, falling back to the proposal's default rate per line. */
export function computeInvest(
  items: EstimateItem[],
  defRate: Numeric,
): { low: number; high: number; mixed: boolean } {
  let low = 0;
  let high = 0;
  let mixed = false;

  (items || []).forEach((it) => {
    const lineRate = parseFloat(String(it.rate));
    const fallback = parseFloat(String(defRate)) || 0;
    const r = lineRate > 0 ? lineRate : fallback;
    if (lineRate > 0 && lineRate !== parseFloat(String(defRate))) mixed = true;
    low += (parseFloat(String(it.low)) || 0) * r;
    high += (parseFloat(String(it.high)) || 0) * r;
  });

  return { low, high, mixed };
}
