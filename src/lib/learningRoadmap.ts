import type { AnswerHistory, LearningRoadmapStep, MockExamResult, Question, ReviewScheduleItem, TodayLearningPlan } from '../types'

const DAY_MS = 24 * 60 * 60 * 1000

const stepDefinitions: Array<Pick<LearningRoadmapStep, 'id' | 'name' | 'fields'>> = [
  { id: 1, name: '基礎固め', fields: ['基礎理論', 'アルゴリズム', 'コンピュータ構成要素', 'ソフトウェア'] },
  { id: 2, name: '頻出テクノロジ', fields: ['情報セキュリティ', 'ネットワーク', 'データベース', 'システム開発'] },
  { id: 3, name: 'マネジメント', fields: ['プロジェクトマネジメント', 'サービスマネジメント', 'システム監査'] },
  { id: 4, name: 'ストラテジ', fields: ['ストラテジ', '経営戦略', '法務'] },
  { id: 5, name: '午前模試', fields: ['午前模試80問', '正答率60%以上', '苦手分野復習'] },
  { id: 6, name: '午後対策準備', fields: ['セキュリティ重点復習', 'ネットワーク/DB/システム開発の弱点確認', '午後問題対策への導線'] },
]

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object'
const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(Number.isFinite(value) ? value : 0)))

const safeQuestions = (value: unknown): Question[] => Array.isArray(value)
  ? value.filter((item): item is Question => isRecord(item) && typeof item.id === 'string' && typeof item.field === 'string')
  : []

const safeHistory = (value: unknown): AnswerHistory[] => Array.isArray(value)
  ? value.filter((item): item is AnswerHistory => isRecord(item) && typeof item.questionId === 'string' && typeof item.isCorrect === 'boolean')
  : []

const safeMockResults = (value: unknown): MockExamResult[] => Array.isArray(value)
  ? value.filter((item): item is MockExamResult => isRecord(item)
    && typeof item.resultId === 'string'
    && typeof item.accuracyRate === 'number' && Number.isFinite(item.accuracyRate)
    && typeof item.totalQuestions === 'number' && Number.isFinite(item.totalQuestions)
    && typeof item.correctCount === 'number' && Number.isFinite(item.correctCount)
    && typeof item.finishedAt === 'string')
  : []

const safeSchedule = (value: unknown): ReviewScheduleItem[] => Array.isArray(value)
  ? value.filter((item): item is ReviewScheduleItem => isRecord(item) && typeof item.questionId === 'string' && typeof item.nextReviewDate === 'string')
  : []

const matchesField = (question: Question, label: string) => {
  const text = `${question.field} ${question.subField ?? ''}`
  if (label === 'コンピュータ構成要素' || label === 'ソフトウェア') return question.field === 'コンピュータシステム' || text.includes(label)
  if (label === 'アルゴリズム') return question.field === '基礎理論' && /アルゴリズム|データ構造|プログラム/.test(text)
  if (label === '経営戦略' || label === '法務') return question.field === 'ストラテジ' || text.includes(label)
  return question.field === label || text.includes(label)
}

const questionsForFields = (questions: Question[], fields: string[]) => questions.filter(question => fields.some(field => matchesField(question, field)))

const getFieldAccuracy = (field: string, questions: Question[], history: AnswerHistory[]) => {
  const ids = new Set(questionsForFields(questions, [field]).map(question => question.id))
  const answers = history.filter(answer => ids.has(answer.questionId))
  return { count: answers.length, accuracy: answers.length ? Math.round((answers.filter(answer => answer.isCorrect).length / answers.length) * 100) : 0 }
}

const getMockFieldAccuracy = (field: string, mockResults: MockExamResult[]) => {
  const totals = mockResults.slice(-3).reduce((result, mock) => {
    if (!isRecord(mock.fieldStats)) return result
    Object.entries(mock.fieldStats).forEach(([mockField, value]) => {
      if (!matchesField({ field: mockField, subField: '', id: '' } as Question, field) || !isRecord(value)) return
      const total = typeof value.total === 'number' && Number.isFinite(value.total) ? value.total : 0
      const correct = typeof value.correct === 'number' && Number.isFinite(value.correct) ? value.correct : 0
      result.total += Math.max(0, total)
      result.correct += Math.max(0, correct)
    })
    return result
  }, { total: 0, correct: 0 })
  return { count: totals.total, accuracy: totals.total ? Math.round((totals.correct / totals.total) * 100) : 0 }
}

const getStepProgress = (stepId: number, targetQuestions: Question[], history: AnswerHistory[], mockResults: MockExamResult[], schedule: ReviewScheduleItem[]) => {
  if (stepId === 5) {
    const latest = mockResults[mockResults.length - 1]
    const passCount = mockResults.filter(result => result.accuracyRate >= 60 || result.passed).length
    return clamp((latest?.accuracyRate ?? 0) * 0.7 + Math.min(passCount, 3) * 10)
  }
  if (!targetQuestions.length) return 0
  const ids = new Set(targetQuestions.map(question => question.id))
  const answers = history.filter(answer => ids.has(answer.questionId))
  const answered = new Set(answers.map(answer => answer.questionId)).size
  const coverage = answered / targetQuestions.length
  const accuracy = answers.length ? answers.filter(answer => answer.isCorrect).length / answers.length : 0
  const pendingReviews = schedule.filter(item => ids.has(item.questionId)).length
  const reviewReadiness = answered ? Math.max(0, 1 - pendingReviews / answered) : 0
  return clamp(coverage * 45 + accuracy * 40 + reviewReadiness * 15)
}

export function buildLearningRoadmap(questionsValue: unknown, historyValue: unknown, mockResultsValue: unknown, reviewScheduleValue: unknown): LearningRoadmapStep[] {
  const questions = safeQuestions(questionsValue)
  const history = safeHistory(historyValue).filter(answer => questions.some(question => question.id === answer.questionId))
  const mockResults = safeMockResults(mockResultsValue)
  const schedule = safeSchedule(reviewScheduleValue).filter(item => questions.some(question => question.id === item.questionId))

  return stepDefinitions.map(definition => {
    const targetFields = definition.id === 6 ? ['情報セキュリティ', 'ネットワーク', 'データベース', 'システム開発'] : definition.fields
    const targetQuestions = definition.id === 5 ? [] : questionsForFields(questions, targetFields)
    const weakFields = targetFields.filter(field => {
      const historyStat = getFieldAccuracy(field, questions, history)
      const mockStat = getMockFieldAccuracy(field, mockResults)
      return (mockStat.count > 0 && mockStat.accuracy < 60) || (mockStat.count === 0 && historyStat.count > 0 && historyStat.accuracy < 60)
    })
    const progress = getStepProgress(definition.id, targetQuestions, history, mockResults, schedule)
    const latestMock = mockResults[mockResults.length - 1]
    const remainingToPass = latestMock ? Math.max(0, Math.ceil(latestMock.totalQuestions * 0.6) - latestMock.correctCount) : null
    const state = definition.id === 5
      ? latestMock ? (remainingToPass === 0 ? '合格目安を達成' : `合格目安まであと${remainingToPass}問`) : '模試未受験'
      : progress >= 80 ? '順調です' : weakFields.length ? `弱点：${weakFields.slice(0, 2).join('、')}` : progress > 0 ? '演習を継続中' : 'これから着手'
    const focusField = weakFields[0] ?? targetFields.find(field => questionsForFields(questions, [field]).length > 0)
    const questionIds = focusField ? questionsForFields(questions, [focusField]).slice(0, 10).map(question => question.id) : []
    return {
      ...definition,
      progress,
      state,
      nextAction: definition.id === 5 ? (latestMock ? '苦手分野を復習して再挑戦' : '午前模試で現在地を確認')
        : definition.id === 6 ? '重点3分野の弱点を確認'
          : focusField ? `${focusField}を10問演習` : '対象分野の教材を確認',
      action: definition.id === 5 ? { type: 'mock-exam', label: '午前模試を受ける', questionIds: [] }
        : { type: 'questions', label: focusField ? `${focusField}を演習` : '演習を始める', questionIds },
      weakFields,
    }
  })
}

export function getWeakFieldsFromRoadmap(roadmapValue: unknown) {
  if (!Array.isArray(roadmapValue)) return []
  return [...new Set(roadmapValue.flatMap(item => isRecord(item) && Array.isArray(item.weakFields) ? item.weakFields.filter((field): field is string => typeof field === 'string') : []))]
}

export function getTodayLearningPlan(roadmapValue: unknown, reviewScheduleValue: unknown, mockResultsValue: unknown, historyValue: unknown, questionsValue: unknown): TodayLearningPlan {
  const questions = safeQuestions(questionsValue)
  const history = safeHistory(historyValue)
  const schedule = safeSchedule(reviewScheduleValue)
  const mockResults = safeMockResults(mockResultsValue)
  const today = new Date().toLocaleDateString('sv-SE')
  const validIds = new Set(questions.map(question => question.id))
  const dueIds = schedule.filter(item => item.nextReviewDate <= today && validIds.has(item.questionId)).map(item => item.questionId).slice(0, 10)
  if (dueIds.length) return { title: `今日の復習を${dueIds.length}問進める`, reason: '今日が期限、または期限切れの復習があります', action: { type: 'questions', label: '今日の復習を始める', questionIds: dueIds }, mode: 'today-review' }

  const weakFields = getWeakFieldsFromRoadmap(roadmapValue)
  const weakField = weakFields.find(field => questionsForFields(questions, [field]).length > 0)
  if (weakField) return { title: `${weakField}を10問復習`, reason: '回答履歴・模試結果から正答率が低めです', action: { type: 'questions', label: '弱点分野を演習', questionIds: questionsForFields(questions, [weakField]).slice(0, 10).map(question => question.id) }, mode: 'recommended' }

  const latestMockTime = mockResults.length ? new Date(mockResults[mockResults.length - 1].finishedAt).getTime() : 0
  if (!latestMockTime || !Number.isFinite(latestMockTime) || Date.now() - latestMockTime > 14 * DAY_MS) {
    return { title: '午前模試で現在地を確認', reason: mockResults.length ? '前回の模試から2週間以上たっています' : 'まだ模試履歴がありません', action: { type: 'mock-exam', label: '午前模試を受ける', questionIds: [] }, mode: 'mock-exam' }
  }

  const answeredIds = new Set(history.map(answer => answer.questionId))
  const unansweredIds = questions.filter(question => !answeredIds.has(question.id)).slice(0, 10).map(question => question.id)
  if (unansweredIds.length) return { title: `未回答問題を${unansweredIds.length}問進める`, reason: 'まだ取り組んでいない問題があります', action: { type: 'questions', label: '未回答問題を解く', questionIds: unansweredIds }, mode: 'unanswered' }

  return { title: 'ランダム10問で知識を維持', reason: '復習・弱点対策は順調です', action: { type: 'questions', label: 'ランダム10問', questionIds: questions.slice(0, 10).map(question => question.id) }, mode: 'random-10' }
}
