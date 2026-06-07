import type { AnswerHistory, PracticeSession, Settings } from '../types'

const HISTORY_KEY = 'ap-study-history-v1'
const SETTINGS_KEY = 'ap-study-settings-v1'
const SESSION_KEY = 'ap-study-current-session-v1'
const defaults: Settings = { examDate: '2026-11-15', dailyMinutes: 30, afternoonFields: ['情報セキュリティ', 'ネットワーク'], theme: 'light' }

export const loadHistory = (): AnswerHistory[] => { try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') } catch { return [] } }
export const saveHistory = (value: AnswerHistory[]) => localStorage.setItem(HISTORY_KEY, JSON.stringify(value))
export const loadSettings = (): Settings => { try { return { ...defaults, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') } } catch { return defaults } }
export const saveSettings = (value: Settings) => localStorage.setItem(SETTINGS_KEY, JSON.stringify(value))
export const loadSession = (): PracticeSession | null => {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') {
      resetSession()
      return null
    }

    const session = parsed as Record<string, unknown>
    const questionIds = session.questionIds
    const answers = session.answers
    const isValid =
      typeof session.sessionId === 'string' &&
      typeof session.mode === 'string' &&
      Array.isArray(questionIds) &&
      questionIds.every(id => typeof id === 'string') &&
      typeof session.currentIndex === 'number' &&
      typeof session.startedAt === 'string' &&
      (typeof session.finishedAt === 'string' || session.finishedAt === null) &&
      typeof session.totalQuestions === 'number' &&
      typeof session.correctCount === 'number' &&
      typeof session.wrongCount === 'number' &&
      typeof session.elapsedSeconds === 'number' &&
      Array.isArray(answers) &&
      answers.every(answer => answer !== null && typeof answer === 'object')

    if (!isValid) {
      resetSession()
      return null
    }
    return parsed as PracticeSession
  } catch {
    resetSession()
    return null
  }
}
export const saveSession = (value: PracticeSession | null) => value ? localStorage.setItem(SESSION_KEY, JSON.stringify(value)) : resetSession()
export const resetSession = () => localStorage.removeItem(SESSION_KEY)
export const resetData = () => { localStorage.removeItem(HISTORY_KEY); localStorage.removeItem(SETTINGS_KEY); localStorage.removeItem(SESSION_KEY) }
