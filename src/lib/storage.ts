import type { AnswerHistory, PracticeSession, Settings } from '../types'

const HISTORY_KEY = 'ap-study-history-v1'
const SETTINGS_KEY = 'ap-study-settings-v1'
const SESSION_KEY = 'ap-study-current-session-v1'
const defaults: Settings = { examDate: '2026-11-15', dailyMinutes: 30, afternoonFields: ['情報セキュリティ', 'ネットワーク'], theme: 'light' }
const practiceModes = new Set(['recommended', 'field', 'wrong', 'low-confidence', 'unanswered', 'random-10', 'mock-exam'])
const choiceKeys = new Set(['ア', 'イ', 'ウ', 'エ'])
const confidenceLevels = new Set(['high', 'normal', 'low'])

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null
const isNonNegativeNumber = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0

const isPracticeSession = (value: unknown): value is PracticeSession => {
  if (!isRecord(value) || !Array.isArray(value.questionIds) || !Array.isArray(value.answers)) return false

  const questionIdsAreValid = value.questionIds.length > 0 && value.questionIds.every(id => typeof id === 'string')
  const currentIndexIsValid = Number.isInteger(value.currentIndex) && Number(value.currentIndex) >= 0 && Number(value.currentIndex) < value.questionIds.length
  const answersAreValid = value.answers.every(answer => isRecord(answer)
    && typeof answer.questionId === 'string'
    && choiceKeys.has(String(answer.selectedAnswer))
    && typeof answer.isCorrect === 'boolean'
    && confidenceLevels.has(String(answer.confidence))
    && isNonNegativeNumber(answer.elapsedSeconds))

  return typeof value.sessionId === 'string'
    && practiceModes.has(String(value.mode))
    && questionIdsAreValid
    && currentIndexIsValid
    && typeof value.startedAt === 'string'
    && (value.finishedAt === null || typeof value.finishedAt === 'string')
    && Number.isInteger(value.totalQuestions)
    && value.totalQuestions === value.questionIds.length
    && isNonNegativeNumber(value.correctCount)
    && isNonNegativeNumber(value.wrongCount)
    && isNonNegativeNumber(value.elapsedSeconds)
    && answersAreValid
}

export const loadHistory = (): AnswerHistory[] => { try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') } catch { return [] } }
export const saveHistory = (value: AnswerHistory[]) => localStorage.setItem(HISTORY_KEY, JSON.stringify(value))
export const loadSettings = (): Settings => { try { return { ...defaults, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') } } catch { return defaults } }
export const saveSettings = (value: Settings) => localStorage.setItem(SETTINGS_KEY, JSON.stringify(value))
export const resetCurrentSession = () => {
  try { localStorage.removeItem(SESSION_KEY) } catch { /* Storage may be unavailable in restricted browser contexts. */ }
}
export const loadSession = (): PracticeSession | null => {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null')
    if (value === null) return null
    if (isPracticeSession(value)) return value
  } catch {
    // Remove only the broken current session; history and settings stay untouched.
  }
  resetCurrentSession()
  return null
}
export const saveSession = (value: PracticeSession | null) => value ? localStorage.setItem(SESSION_KEY, JSON.stringify(value)) : resetCurrentSession()
export const resetData = () => { localStorage.removeItem(HISTORY_KEY); localStorage.removeItem(SETTINGS_KEY); resetCurrentSession() }
