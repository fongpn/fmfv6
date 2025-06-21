import { type ClassValue, clsx } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function generateMemberID(): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `FMF${timestamp}${random}`;
}

export function calculateMembershipEndDate(startDate: Date, durationMonths: number): Date {
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + durationMonths);
  return endDate;
}

export function getMembershipStatus(endDate: string, gracePeriodDays: number = 7): {
  status: 'ACTIVE' | 'GRACE_PERIOD' | 'EXPIRED';
  daysRemaining: number;
} {
  const today = new Date();
  const membershipEnd = new Date(endDate);
  const gracePeriodEnd = new Date(membershipEnd);
  gracePeriodEnd.setDate(gracePeriodEnd.getDate() + gracePeriodDays);

  const diffTime = membershipEnd.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays >= 0) {
    return { status: 'ACTIVE', daysRemaining: diffDays };
  } else if (today <= gracePeriodEnd) {
    const graceDaysRemaining = Math.ceil((gracePeriodEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return { status: 'GRACE_PERIOD', daysRemaining: graceDaysRemaining };
  } else {
    return { status: 'EXPIRED', daysRemaining: diffDays };
  }
}