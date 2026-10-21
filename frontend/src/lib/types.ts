// ─────────────────────────────────────────────────────────────────────────────
//  Domain model, shared in shape with the admin app. The public site only ever
//  reads/writes a single client's project document, so the admin-only TabProps
//  contract is not repeated here.
// ─────────────────────────────────────────────────────────────────────────────

export type Status =
  | 'discovery'
  | 'review'
  | 'assigned'
  | 'estimated'
  | 'approved'
  | 'proposal'
  | 'accepted'
  | 'rejected'
  | 'handover'
  | 'signedoff';

// ── Questionnaire definition ─────────────────────────────────────────────────

export type QuestionType =
  | 'text'
  | 'textarea'
  | 'date'
  | 'radio'
  | 'checkbox'
  | 'scale'
  | 'table';

export interface Question {
  id: string;
  type: QuestionType;
  label: string;
  hint?: string;
  /** Radio/checkbox/scale options — and, for `table`, the column headers. */
  options?: string[];
  required?: boolean;
  /** Scale questions only: the [low, high] captions under the choices. */
  ends?: [string, string];
}

export interface Section {
  id: string;
  title: string;
  questions: Question[];
}

export interface QuestionnaireDef {
  version: number;
  updatedAt?: string;
  updatedBy?: string;
  sections: Section[];
}

// ── Answers ──────────────────────────────────────────────────────────────────

/**
 * Checkbox questions store a string[]; `table` questions store a string[][] (rows × cols);
 * every other type stores a string.
 */
export type AnswerValue = string | string[] | string[][];
export type Answers = Record<string, AnswerValue>;

// ── Clients ──────────────────────────────────────────────────────────────────

/** What the public questionnaire page can see without the team passcode. */
export interface ClientPublic {
  id: string;
  company: string;
}

// ── Project document ─────────────────────────────────────────────────────────

/**
 * Hours and rates are held as strings while a row is being edited (an empty
 * input is `''`, not `0`) and coerced with parseFloat at read time.
 */
export type Numeric = number | string;

export interface EstimateItem {
  task: string;
  detail?: string;
  low: Numeric;
  high: Numeric;
  /** Proposal lines only — overrides the proposal's default rate. */
  rate?: Numeric;
}

export interface Theme {
  name?: string;
  primary: string;
  accent: string;
}

export interface DocMeta {
  customer: string;
  partner: string;
  version: number;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface Review {
  notes: string;
  complete: boolean;
  by: string | null;
  at: string | null;
}

export interface Assignment {
  developer: string;
  notes: string;
  by: string | null;
  at: string | null;
}

export interface Estimate {
  items: EstimateItem[];
  totalLow: number;
  totalHigh: number;
  notes: string;
  by: string | null;
  at: string | null;
}

export interface Approval {
  decision: 'approved' | 'rejected' | null;
  comments: string;
  by: string | null;
  at: string | null;
}

/** Client's acceptance of the proposal. */
export interface Acceptance {
  name: string;
  comments: string;
  at: string;
}

export interface Proposal {
  published: boolean;
  rate: Numeric;
  showPricing: boolean;
  type: 'tm' | 'fixed';
  fixedPrice: Numeric;
  theme: Theme | null;
  note: string;
  by: string | null;
  at: string | null;
  accepted: Acceptance | null;
  items: EstimateItem[];
  totalLow: number;
  totalHigh: number;
  investLow: number;
  investHigh: number;
  investMixed: boolean;
}

export interface Handover {
  note: string;
  by: string | null;
  at: string | null;
}

export interface Signoff {
  name: string;
  comments: string;
  at: string | null;
}

export interface Workflow {
  status: Status;
  assignment: Assignment;
  estimate: Estimate;
  approval: Approval;
  proposal: Proposal;
  handover: Handover;
  signoff: Signoff;
}

export interface ActivityEntry {
  at: string;
  who: string;
  action: string;
}

export interface ProjectDoc {
  meta: DocMeta;
  answers: Answers;
  review: Review;
  workflow: Workflow;
  activity: ActivityEntry[];
}
