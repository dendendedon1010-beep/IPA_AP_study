import type { AnswerHistory, PracticeSession, Settings } from '../types'

const HISTORY_KEY = 'ap-study-history-v1'
const SETTINGS_KEY = 'ap-study-settings-v1'
const SESSION_KEY = 'ap-study-current-session-v1'
export const defaultSettings: Settings = { examDate: '2026-11-15', dailyMinutes: 30, afternoonFields: ['情報セキュリティ', 'ネットワーク'], theme: 'light' }
const practiceModes = new Set(['recommended', 'field', 'wrong', 'low-confidence', 'unanswered', 'random-10', 'mock-exam'])
const choiceKeys = new Set(['ア', 'イ', 'ウ', 'エ'])
const confidenceLevels = new Set(['high', 'normal', 'low'])
const mistakeTags = new Set(['用語理解不足', '問題文の読み落とし', '選択肢の比較ミス', '計算ミス', '暗記不足', '知識の取り違え'])

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
    && isNonNegativeNumber(answer.elapsedSeconds)
    && (answer.mistakeTag === undefined || mistakeTags.has(String(answer.mistakeTag))))

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

const isAnswerHistory = (value: unknown): value is AnswerHistory => isRecord(value)
  && typeof value.id === 'string'
  && typeof value.questionId === 'string'
  && choiceKeys.has(String(value.selectedAnswer))
  && typeof value.isCorrect === 'boolean'
  && confidenceLevels.has(String(value.confidence))
  && isNonNegativeNumber(value.elapsedSeconds)
  && typeof value.answeredAt === 'string'
  && (value.mistakeTag === undefined || mistakeTags.has(String(value.mistakeTag)))

export const loadHistory = (): AnswerHistory[] => {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
    return Array.isArray(value) ? value.filter(isAnswerHistory) : []
  } catch {
    return []
  }
}

export const saveHistory = (value: AnswerHistory[]) => {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(value)) } catch { /* Storage may be unavailable or full. */ }
}

export const loadSettings = (): Settings => {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')
    if (!isRecord(value)) return { ...defaultSettings, afternoonFields: [...defaultSettings.afternoonFields] }
    return {
      examDate: typeof value.examDate === 'string' ? value.examDate : defaultSettings.examDate,
      dailyMinutes: typeof value.dailyMinutes === 'number' && Number.isFinite(value.dailyMinutes) ? value.dailyMinutes : defaultSettings.dailyMinutes,
      afternoonFields: Array.isArray(value.afternoonFields) && value.afternoonFields.every(field => typeof field === 'string') ? value.afternoonFields : [...defaultSettings.afternoonFields],
      theme: value.theme === 'light' || value.theme === 'dark' ? value.theme : defaultSettings.theme,
    }
  } catch {
    return { ...defaultSettings, afternoonFields: [...defaultSettings.afternoonFields] }
  }
}

export const saveSettings = (value: Settings) => {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(value)) } catch { /* Storage may be unavailable or full. */ }
}
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
export const saveSession = (value: PracticeSession | null) => {
  if (!value) {
    resetCurrentSession()
    return
  }
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(value)) } catch { /* Storage may be unavailable or full. */ }
}
export const resetData = () => {
  try {
    localStorage.removeItem(HISTORY_KEY)
    localStorage.removeItem(SETTINGS_KEY)
  } catch { /* Storage may be unavailable in restricted browser contexts. */ }
  resetCurrentSession()
}
