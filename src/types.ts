import type { FieldName } from './data/fields'

export type ChoiceKey = 'ア' | 'イ' | 'ウ' | 'エ'
export type Confidence = 'high' | 'normal' | 'low'
export type MistakeTag = '用語理解不足' | '問題文の読み落とし' | '選択肢の比較ミス' | '計算ミス' | '暗記不足' | '知識の取り違え'
export type ReviewPriority = 'high' | 'medium' | 'low'
export type Tab = 'home' | 'practice' | 'review' | 'analytics' | 'settings'
export type PracticeMode = 'recommended' | 'field' | 'wrong' | 'low-confidence' | 'unanswered' | 'random-10' | 'mock-exam' | 'bookmarked' | 'single'

export interface Choice {
  key: ChoiceKey
  text: string
}

export interface Explanation {
  correctReason: string
  wrongReasons: Partial<Record<ChoiceKey, string>>
  points: string[]
  keywords: string[]
  isAiGenerated: boolean
}

export interface Question {
  id: string
  legacyIds?: string[]
  examYear: number
  examSeason: '春期' | '秋期'
  examType: 'morning' | 'afternoon'
  questionNumber: number
  field: FieldName
  subField: string
  questionText: string
  choices: Choice[]
  correctAnswer: ChoiceKey
  officialAnswerText: string
  sourceName: string
  sourceUrl: string
  isQuoteFromIpa: boolean
  explanation: Explanation
}

export type BookmarkStore = string[]

export interface AnswerHistory {
  id: string
  questionId: string
  selectedAnswer: ChoiceKey
  isCorrect: boolean
  confidence: Confidence
  elapsedSeconds: number
  answeredAt: string
  mistakeTag?: MistakeTag
}

export interface Settings {
  examDate: string
  dailyMinutes: number
  afternoonFields: string[]
  theme: 'light' | 'dark'
}


export interface SessionAnswer {
  questionId: string
  selectedAnswer: ChoiceKey
  isCorrect: boolean
  confidence: Confidence
  elapsedSeconds: number
  mistakeTag?: MistakeTag
}

export interface PracticeSession {
  sessionId: string
  mode: PracticeMode
  questionIds: string[]
  currentIndex: number
  startedAt: string
  finishedAt: string | null
  totalQuestions: number
  correctCount: number
  wrongCount: number
  elapsedSeconds: number
  answers: SessionAnswer[]
}
