import type { AnswerHistory, PracticeSession, Settings } from '../types'

const HISTORY_KEY = 'ap-study-history-v1'
const SETTINGS_KEY = 'ap-study-settings-v1'
const SESSION_KEY = 'ap-study-current-session-v1'
const defaults: Settings = { examDate: '2026-11-15', dailyMinutes: 30, afternoonFields: ['情報セキュリティ', 'ネットワーク'], theme: 'light' }

export const loadHistory = (): AnswerHistory[] => { try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') } catch { return [] } }
export const saveHistory = (value: AnswerHistory[]) => localStorage.setItem(HISTORY_KEY, JSON.stringify(value))
export const loadSettings = (): Settings => { try { return { ...defaults, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') } } catch { return defaults } }
export const saveSettings = (value: Settings) => localStorage.setItem(SETTINGS_KEY, JSON.stringify(value))
export const loadSession = (): PracticeSession | null => { try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null') } catch { return null } }
export const saveSession = (value: PracticeSession | null) => value ? localStorage.setItem(SESSION_KEY, JSON.stringify(value)) : localStorage.removeItem(SESSION_KEY)
export const resetData = () => { localStorage.removeItem(HISTORY_KEY); localStorage.removeItem(SETTINGS_KEY); localStorage.removeItem(SESSION_KEY) }
