export type ChoiceKey = 'ア' | 'イ' | 'ウ' | 'エ'
export type Confidence = 'high' | 'normal' | 'low'
export type Tab = 'home' | 'practice' | 'review' | 'analytics' | 'settings'
export type PracticeMode = 'recommended' | 'field' | 'wrong' | 'low-confidence' | 'unanswered' | 'random-10' | 'mock-exam'

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
  examYear: number
  examSeason: '春期' | '秋期'
  examType: 'morning' | 'afternoon'
  questionNumber: number
  field: string
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

export interface AnswerHistory {
  id: string
  questionId: string
  selectedAnswer: ChoiceKey
  isCorrect: boolean
  confidence: Confidence
  elapsedSeconds: number
  answeredAt: string
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
