import { resolveQuestionId } from '../data/questions'
import type { AnswerHistory, BookmarkStore, MockExamSession, PracticeSession, Settings } from '../types'

const HISTORY_KEY = 'ap-study-history-v1'
const SETTINGS_KEY = 'ap-study-settings-v1'
const SESSION_KEY = 'ap-study-current-session-v1'
const BOOKMARKS_KEY = 'ap-study-bookmarks-v1'
const SECONDARY_SESSION_KEY = 'ap-study-current-session-v2'
const MOCK_EXAM_SESSION_KEY = 'ap-study-mock-exam-session-v1'
export const defaultSettings: Settings = { examDate: '2026-11-15', dailyMinutes: 30, afternoonFields: ['情報セキュリティ', 'ネットワーク'], theme: 'light' }
const practiceModes = new Set(['recommended', 'today-review', 'field', 'wrong', 'low-confidence', 'unanswered', 'random-10', 'mock-exam', 'bookmarked', 'single'])
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



const isMockExamSession = (value: unknown): value is MockExamSession => {
  if (!isRecord(value) || value.mode !== 'morning-mock' || !Array.isArray(value.questionIds) || !isRecord(value.answers)) return false
  const uniqueQuestionIds = new Set(value.questionIds)
  const answersAreValid = Object.entries(value.answers).every(([questionId, answer]) => uniqueQuestionIds.has(questionId)
    && isRecord(answer)
    && (answer.selectedAnswer === undefined || choiceKeys.has(String(answer.selectedAnswer)))
    && (answer.confidence === undefined || confidenceLevels.has(String(answer.confidence)))
    && (answer.answeredAt === undefined || typeof answer.answeredAt === 'string')
    && (answer.elapsedSeconds === undefined || isNonNegativeNumber(answer.elapsedSeconds))
    && (answer.marked === undefined || typeof answer.marked === 'boolean'))
  return typeof value.sessionId === 'string'
    && value.questionIds.length > 0
    && uniqueQuestionIds.size === value.questionIds.length
    && value.questionIds.every(id => typeof id === 'string' && Boolean(id))
    && Number.isInteger(value.currentIndex)
    && Number(value.currentIndex) >= 0
    && Number(value.currentIndex) < value.questionIds.length
    && typeof value.startedAt === 'string'
    && Number.isFinite(new Date(value.startedAt).getTime())
    && (value.finishedAt === null || (typeof value.finishedAt === 'string' && Number.isFinite(new Date(value.finishedAt).getTime())))
    && Number.isInteger(value.durationSeconds)
    && Number(value.durationSeconds) > 0
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

export const loadBookmarks = (): BookmarkStore => {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || '[]')
    return Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === 'string' && Boolean(id)).map(resolveQuestionId))] : []
  } catch {
    return []
  }
}

export const saveBookmarks = (value: BookmarkStore) => {
  try { localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(Array.isArray(value) ? value : [])) } catch { /* Storage may be unavailable or full. */ }
}

export const loadHistory = (): AnswerHistory[] => {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
    return Array.isArray(value) ? value.filter(isAnswerHistory).map(answer => ({ ...answer, questionId: resolveQuestionId(answer.questionId) })) : []
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
  try {
    localStorage.removeItem(SESSION_KEY)
    localStorage.removeItem(SECONDARY_SESSION_KEY)
  } catch { /* Storage may be unavailable in restricted browser contexts. */ }
}
export const loadSession = (): PracticeSession | null => {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null')
    if (value === null) return null
    if (isPracticeSession(value)) {
      return {
        ...value,
        questionIds: value.questionIds.map(resolveQuestionId),
        answers: value.answers.map(answer => ({ ...answer, questionId: resolveQuestionId(answer.questionId) })),
      }
    }
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
    localStorage.removeItem(BOOKMARKS_KEY)
  } catch { /* Storage may be unavailable in restricted browser contexts. */ }
  resetCurrentSession()
  resetMockExamSession()
}


export const loadMockExamSession = (): MockExamSession | null => {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(MOCK_EXAM_SESSION_KEY) || 'null')
    if (value === null) return null
    if (!isMockExamSession(value)) {
      localStorage.removeItem(MOCK_EXAM_SESSION_KEY)
      return null
    }
    return {
      ...value,
      questionIds: value.questionIds.map(resolveQuestionId),
      answers: Object.fromEntries(Object.entries(value.answers).map(([id, answer]) => [resolveQuestionId(id), answer])),
    }
  } catch {
    try { localStorage.removeItem(MOCK_EXAM_SESSION_KEY) } catch { /* Ignore cleanup errors. */ }
    return null
  }
}

export const saveMockExamSession = (value: MockExamSession | null) => {
  try {
    if (value && isMockExamSession(value)) localStorage.setItem(MOCK_EXAM_SESSION_KEY, JSON.stringify(value))
    else localStorage.removeItem(MOCK_EXAM_SESSION_KEY)
  } catch { /* Storage may be unavailable or full. */ }
}

export const resetMockExamSession = () => {
  try { localStorage.removeItem(MOCK_EXAM_SESSION_KEY) } catch { /* Storage may be unavailable in restricted browser contexts. */ }
}
