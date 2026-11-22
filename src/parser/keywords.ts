/**
 * keywords.ts — keyword data for the register classifier.
 *
 * This file is DATA ONLY. No logic, no functions, no imports.
 * Add or extend keyword lists here; the classifier in classifyClause.ts
 * consumes this object without modification.
 *
 * Source: design.md §Parser Layer §2, REGISTERS.md keyword tables.
 */

import type { Register } from './types'

/**
 * Maps each Register to the list of keyword/pattern strings that signal it.
 * All strings are lower-case; the classifier will lower-case input before matching.
 */
export const KEYWORDS: Record<Register, readonly string[]> = {
  WHO: [
    'responsible',
    'contact',
    'maintained by',
    'owned by',
    'author',
    'support@',
    // email pattern hint — handled as substring
    '@',
    // bare organisation/person domain cue
    '.com',
    '.org',
    '.io',
    '.ai',
    '.dev',
  ],

  WHAT: [
    'converts',
    'runs on',
    'supports',
    'processes',
    'generates',
    'exports to',
    'export to',
    // version strings and OS/format names are detected via scanArtifacts,
    // but we also include common format names as keyword signals
    '.csv',
    '.json',
    '.pdf',
    '.parquet',
    'linux',
    'windows',
    'macos',
    'python',
    'node',
    'typescript',
    'javascript',
  ],

  PROOF: [
    'benchmark',
    'test',
    'dataset',
    'measured',
    'latency',
    'accuracy',
    'f1',
    'precision',
    'recall',
    '/results',
    '/report',
    '/paper',
    'results',
    'performance',
    'evaluation',
    'score',
    'metric',
    'measure',
  ],

  PRICE: [
    '$',
    '€',
    '£',
    'cost',
    'price',
    'pricing',
    'free',
    'per seat',
    'per request',
    'per token',
    'per month',
    'no charge',
    'tokens',
    'credits',
    'billing',
    'subscription',
    'plan',
    'tier',
  ],

  EDGES: [
    'not for',
    'only',
    'limited to',
    'up to',
    'requires',
    'minimum',
    'maximum',
    'english only',
    'no support for',
    'tested up to',
    'does not support',
    'exclusion',
    'limitation',
    'limit',
    'constraint',
    'restriction',
    'not supported',
    'retention',
    'real-time',
    'real time',
  ],

  RECHECK: [
    'run',
    'execute',
    'download',
    'clone',
    'git',
    'pip install',
    'npm install',
    'curl',
    'wget',
    'see',
    'verify',
    'reproduce',
    'http://',
    'https://',
  ],
}

/**
 * VAGUE — vocabulary that CLAIMS a register without evidencing it.
 *
 * This list exists because KEYWORDS above is artifact-adjacent by nature:
 * `converts`, `.csv`, `benchmark`, `support@` all tend to appear where an
 * artifact also appears. With only that list, a register was detected as
 * mentioned only when it was already evidenced, so COSTUME was unreachable
 * for WHO, WHAT, PROOF and RECHECK -- and a page making loud unbacked claims
 * was reported as silent rather than as costume.
 *
 * A mention test and an evidence test must not read the same signal. These
 * are the words that claim without carrying, kept deliberately to the stock
 * phrases of marketing prose rather than to anything a specific product says.
 *
 * DATA ONLY, like the list above.
 */
export const VAGUE: Record<Register, readonly string[]> = {
  WHO: [
    'our team', 'the team', 'our experts', 'experts', 'industry leaders',
    'we built', 'we are', 'we have', 'trusted partner', 'world-class team',
  ],

  WHAT: [
    'powerful', 'seamless', 'next-generation', 'next generation',
    'cutting-edge', 'cutting edge', 'state-of-the-art', 'revolutionary',
    'platform', 'solution', 'suite', 'innovative', 'robust', 'intuitive',
    'effortless', 'game-changing', 'end-to-end',
  ],

  PROOF: [
    'proven', 'trusted by', 'battle-tested', 'best in class',
    'best-in-class', 'industry-leading', 'industry leading',
    'thousands of customers', 'millions of users', 'award-winning',
    'validated', 'reliable', 'accurate',
  ],

  PRICE: [
    'affordable', 'cost-effective', 'cost effective', 'great value',
    'competitive pricing', 'flexible pricing', 'pricing', 'plans',
    'starts at', 'get started free', 'free trial',
  ],

  EDGES: [
    'some limitations', 'limitations may apply', 'certain conditions',
    'where applicable', 'in most cases', 'generally', 'typically',
    'may vary', 'results may vary',
  ],

  RECHECK: [
    'learn more', 'contact sales', 'request a demo', 'book a demo',
    'get in touch', 'find out more', 'see for yourself', 'talk to us',
    'schedule a call',
  ],
}
