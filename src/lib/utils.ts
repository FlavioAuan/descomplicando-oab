import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '-'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '-'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function formatPercent(value: number | null | undefined, decimals = 1): string {
  if (value == null) return '-'
  return `${(value * 100).toFixed(decimals)}%`
}

export function formatScore(score: number | null | undefined): string {
  if (score == null) return '-'
  return `${score.toFixed(1)}`
}

export function calculateXpForLevel(level: number): number {
  return Math.floor(100 * Math.pow(1.5, level - 1))
}

export function calculateLevel(xp: number): number {
  let level = 1
  let accumulated = 0
  while (accumulated + calculateXpForLevel(level) <= xp) {
    accumulated += calculateXpForLevel(level)
    level++
  }
  return level
}

export function getAccuracyColor(accuracy: number): string {
  if (accuracy >= 0.7) return 'text-green-600'
  if (accuracy >= 0.5) return 'text-yellow-600'
  return 'text-red-600'
}

export function getTrendIcon(trend: string): string {
  if (trend === 'growing') return '↑'
  if (trend === 'declining') return '↓'
  return '→'
}

export function getTrendColor(trend: string): string {
  if (trend === 'growing') return 'text-green-600'
  if (trend === 'declining') return 'text-red-600'
  return 'text-gray-600'
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function generateCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase()
}

export function calculateNextReview(
  reviewCount: number,
  correct: boolean
): Date {
  const intervals = [1, 3, 7, 14, 30, 60, 90]
  const intervalDays = correct
    ? intervals[Math.min(reviewCount, intervals.length - 1)]
    : 1

  const next = new Date()
  next.setDate(next.getDate() + intervalDays)
  return next
}

export function estimateApprovalRate(
  accuracy: number,
  subjectsCovered: number,
  totalSubjects: number
): number {
  const accuracyFactor = Math.min(accuracy / 0.6, 1)
  const coverageFactor = subjectsCovered / totalSubjects
  return Math.min(accuracyFactor * 0.7 + coverageFactor * 0.3, 1)
}
