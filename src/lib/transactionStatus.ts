export const CANONICAL_TRANSACTION_STATUSES = ['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED'] as const;

export type CanonicalTransactionStatus = (typeof CANONICAL_TRANSACTION_STATUSES)[number];

export function normalizeTransactionStatus(status: string | null | undefined): CanonicalTransactionStatus | string {
  const normalized = String(status || '').trim().toUpperCase();
  if (normalized === 'PROCESSING') return 'PENDING';
  if (normalized === 'REJECTED') return 'FAILED';
  if (normalized === 'COMPLETED') return 'COMPLETED';
  if (normalized === 'FAILED') return 'FAILED';
  if (normalized === 'CANCELLED') return 'CANCELLED';
  if (normalized === 'PENDING') return 'PENDING';
  return normalized || 'PENDING';
}

export function isPendingReviewTransactionStatus(status: string | null | undefined) {
  const normalized = String(status || '').trim().toUpperCase();
  return normalized === 'PENDING' || normalized === 'PROCESSING';
}

export function isFailedTransactionStatus(status: string | null | undefined) {
  const normalized = String(status || '').trim().toUpperCase();
  return normalized === 'FAILED' || normalized === 'REJECTED';
}

export function isExcludedTransactionStatus(status: string | null | undefined) {
  const normalized = String(status || '').trim().toUpperCase();
  return normalized === 'FAILED' || normalized === 'REJECTED' || normalized === 'CANCELLED';
}

export function isCompletedTransactionStatus(status: string | null | undefined) {
  const normalized = String(status || '').trim().toUpperCase();
  return normalized === 'COMPLETED';
}
