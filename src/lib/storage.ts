import type { AnswerHistory, PracticeSession, Settings } from '../types'

const HISTORY_KEY = 'ap-study-history-v1'
const SETTINGS_KEY = 'ap-study-settings-v1'
const SESSION_KEY = 'ap-study-current-session-v1'
const SESSION_V2_KEY = 'ap-study-current-session-v2'
const defaults: Settings = { examDate: '2026-11-15', dailyMinutes: 30, afternoonFields: ['情報セキュリティ', 'ネットワーク'], theme: 'light' }

export const loadHistory = (): AnswerHistory[] => { try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') } catch { return [] } }
export const saveHistory = (value: AnswerHistory[]) => localStorage.setItem(HISTORY_KEY, JSON.stringify(value))
export const loadSettings = (): Settings => { try { return { ...defaults, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') } } catch { return defaults } }
export const saveSettings = (value: Settings) => localStorage.setItem(SETTINGS_KEY, JSON.stringify(value))
export const resetCurrentSession = () => {
  localStorage.removeItem(SESSION_KEY)
  localStorage.removeItem(SESSION_V2_KEY)
}
export const loadSession = (): PracticeSession | null => {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const session: unknown = JSON.parse(raw)
    if (!session || typeof session !== 'object') {
      resetCurrentSession()
      return null
    }

    const value = session as Record<string, unknown>
    const isValid =
      typeof value.sessionId === 'string' &&
      typeof value.mode === 'string' &&
      Array.isArray(value.questionIds) &&
      typeof value.currentIndex === 'number' &&
      typeof value.startedAt === 'string' &&
      (typeof value.finishedAt === 'string' || value.finishedAt === null) &&
      typeof value.totalQuestions === 'number' &&
      typeof value.correctCount === 'number' &&
      typeof value.wrongCount === 'number' &&
      typeof value.elapsedSeconds === 'number' &&
      Array.isArray(value.answers)

    if (!isValid) {
      resetCurrentSession()
      return null
    }
    return session as PracticeSession
  } catch {
    resetCurrentSession()
    return null
  }
}
export const saveSession = (value: PracticeSession | null) => value ? localStorage.setItem(SESSION_KEY, JSON.stringify(value)) : resetCurrentSession()
export const resetData = () => { localStorage.removeItem(HISTORY_KEY); localStorage.removeItem(SETTINGS_KEY); resetCurrentSession() }
