import type { MockExamSession, Question } from '../types'

export const MOCK_EXAM_DURATION_SECONDS = 150 * 60
export const MOCK_EXAM_MAX_QUESTIONS = 80

const shuffle = <T,>(items: T[]) => {
  const copy = [...items]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1))
    ;[copy[index], copy[target]] = [copy[target], copy[index]]
  }
  return copy
}

export const createMorningMockExam = (questions: Question[]): MockExamSession => {
  const questionIds = shuffle(questions.filter(question => question.examType === 'morning'))
    .slice(0, MOCK_EXAM_MAX_QUESTIONS)
    .map(question => question.id)

  return {
    sessionId: crypto.randomUUID(),
    mode: 'morning-mock',
    questionIds,
    currentIndex: 0,
    answers: {},
    startedAt: new Date().toISOString(),
    finishedAt: null,
    durationSeconds: MOCK_EXAM_DURATION_SECONDS,
  }
}

export const getMockExamRemainingSeconds = (session: MockExamSession, now = Date.now()) => {
  if (session.finishedAt) return 0
  const startedAt = new Date(session.startedAt).getTime()
  if (!Number.isFinite(startedAt)) return 0
  return Math.max(0, session.durationSeconds - Math.floor((now - startedAt) / 1000))
}

export const formatMockExamTime = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(safeSeconds / 60)
  return `${minutes}:${String(safeSeconds % 60).padStart(2, '0')}`
}
