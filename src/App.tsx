import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BarChart3,
  Bookmark,
  BookOpen,
  Brain,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  Flame,
  Flag,
  Home,
  Lightbulb,
  ClipboardCheck,
  ListFilter,
  LockKeyhole,
  Play,
  RotateCcw,
  Search,
  Settings as SettingsIcon,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  X,
} from 'lucide-react'
import { ipaPastExamCatalog } from './data/ipaPastExams'
import { questions } from './data/questions'
import { buildLearningRoadmap, getTodayLearningPlan } from './lib/learningRoadmap'
import { createMorningMockExam, formatMockExamTime, getMockExamRemainingSeconds } from './lib/mockExam'
import { buildReviewSchedule, getDueReviewItems, getReviewDayDistance, getReviewPriorityForQuestion, getTodayDateString, getUpcomingReviewItems } from './lib/reviewSchedule'
import { clearMockExamResults, defaultSettings, deleteMockExamResult, loadBookmarks, loadHistory, loadMockExamResults, loadMockExamSession, loadSession, loadSettings, resetData, saveBookmarks, saveHistory, saveMockExamResults, saveMockExamSession, saveSession, saveSettings } from './lib/storage'
import type { AnswerHistory, BookmarkStore, ChoiceKey, Confidence, MistakeTag, MockExamAnswer, MockExamResult, MockExamSession, PracticeMode, PracticeSession, Question, ReviewPriority, ReviewScheduleItem, Settings, Tab } from './types'

const APP_VERSION = 'v2.5.0'
const nav: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'ホーム', icon: Home },
  { id: 'practice', label: '演習', icon: BookOpen },
  { id: 'review', label: '復習', icon: RotateCcw },
  { id: 'analytics', label: '分析', icon: BarChart3 },
  { id: 'settings', label: '設定', icon: SettingsIcon },
]
const fieldColor: Record<string, string> = {
  情報セキュリティ: 'bg-rose-50 text-rose-700',
  ネットワーク: 'bg-sky-50 text-sky-700',
  データベース: 'bg-violet-50 text-violet-700',
  システム開発: 'bg-indigo-50 text-indigo-700',
  プロジェクトマネジメント: 'bg-orange-50 text-orange-700',
  サービスマネジメント: 'bg-teal-50 text-teal-700',
  システム監査: 'bg-fuchsia-50 text-fuchsia-700',
  ストラテジ: 'bg-amber-50 text-amber-700',
  基礎理論: 'bg-cyan-50 text-cyan-700',
  コンピュータシステム: 'bg-emerald-50 text-emerald-700',
}

const allFields = [...new Set(questions.map(question => question.field))]
const mistakeTags: MistakeTag[] = ['用語理解不足', '問題文の読み落とし', '選択肢の比較ミス', '計算ミス', '暗記不足', '知識の取り違え']
const priorityLabel: Record<ReviewPriority, string> = { high: '高', medium: '中', low: '低' }
const priorityClass: Record<ReviewPriority, string> = {
  high: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  low: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300',
}
const todayKey = getTodayDateString
const answerDateKey = (value: string) => new Date(value).toLocaleDateString('sv-SE')

function getSafeHistory(history: unknown): AnswerHistory[] {
  if (!Array.isArray(history)) return []
  return history.flatMap(value => {
    if (!value || typeof value !== 'object') return []
    const answer = value as Partial<AnswerHistory>
    if (typeof answer.questionId !== 'string' || !answer.questionId) return []
    return [{
      id: typeof answer.id === 'string' ? answer.id : answer.questionId,
      questionId: answer.questionId,
      selectedAnswer: answer.selectedAnswer === 'ア' || answer.selectedAnswer === 'イ' || answer.selectedAnswer === 'ウ' || answer.selectedAnswer === 'エ' ? answer.selectedAnswer : 'ア',
      isCorrect: typeof answer.isCorrect === 'boolean' ? answer.isCorrect : false,
      confidence: answer.confidence === 'high' || answer.confidence === 'low' ? answer.confidence : 'normal',
      elapsedSeconds: typeof answer.elapsedSeconds === 'number' && Number.isFinite(answer.elapsedSeconds) && answer.elapsedSeconds >= 0 ? answer.elapsedSeconds : 0,
      answeredAt: typeof answer.answeredAt === 'string' ? answer.answeredAt : '',
      mistakeTag: mistakeTags.includes(answer.mistakeTag as MistakeTag) ? answer.mistakeTag : undefined,
    }]
  })
}

function getLatestAnswers(history: AnswerHistory[]) {
  const latest = new Map<string, AnswerHistory>()
  getSafeHistory(history).forEach(answer => latest.set(answer.questionId, answer))
  return latest
}

function getFieldStats(history: AnswerHistory[]) {
  const safeHistory = getSafeHistory(history)
  return allFields.map(field => {
    const questionIds = new Set(questions.filter(question => question.field === field).map(question => question.id))
    const answers = safeHistory.filter(answer => questionIds.has(answer.questionId))
    const correct = answers.filter(answer => answer.isCorrect).length
    const answeredQuestionIds = new Set(answers.map(answer => answer.questionId))
    const totalQuestions = questionIds.size
    return {
      field,
      count: answers.length,
      correct,
      incorrect: answers.length - correct,
      accuracy: answers.length ? Math.round((correct / answers.length) * 100) : 0,
      averageSeconds: answers.length ? Math.round(answers.reduce((sum, answer) => sum + answer.elapsedSeconds, 0) / answers.length) : 0,
      unanswered: totalQuestions - answeredQuestionIds.size,
    }
  })
}

function inferMistakeTag(question: Question, isCorrect: boolean, confidence: Confidence): MistakeTag | undefined {
  if (isCorrect) return confidence === 'low' ? '暗記不足' : undefined
  if (confidence === 'high') return '知識の取り違え'
  if (confidence === 'low') return '用語理解不足'
  if (/計算|求め|何%|時間|工数|稼働率|アドレス/.test(question.questionText)) return '計算ミス'
  if (/最も|適切|誤って|該当/.test(question.questionText)) return '問題文の読み落とし'
  return '選択肢の比較ミス'
}

function getAnswerMistakeTag(answer: Pick<AnswerHistory, 'questionId' | 'isCorrect' | 'confidence' | 'mistakeTag'>) {
  if (!answer || typeof answer.questionId !== 'string') return undefined
  const mistakeTag = mistakeTags.includes(answer.mistakeTag as MistakeTag) ? answer.mistakeTag : undefined
  if (mistakeTag) return mistakeTag
  const question = questions.find(item => item.id === answer.questionId)
  const confidence = answer.confidence === 'high' || answer.confidence === 'low' ? answer.confidence : 'normal'
  return question ? inferMistakeTag(question, answer.isCorrect === true, confidence) : undefined
}

function getReviewPriority(questionId: string, history: AnswerHistory[]): ReviewPriority | null {
  return getReviewPriorityForQuestion(questionId, history)
}

function formatReviewDate(dateString: string, today = todayKey()) {
  const distance = getReviewDayDistance(dateString, today)
  if (distance === 0) return '今日'
  if (distance === 1) return '明日'
  return dateString.replace(/-/g, '/')
}

function questionsForSchedule(items: ReviewScheduleItem[]) {
  return items.map(item => questions.find(question => question.id === item.questionId)).filter((question): question is Question => Boolean(question))
}

function getMistakeCounts(history: AnswerHistory[]) {
  const safeHistory = getSafeHistory(history)
  return mistakeTags.map(tag => ({ tag, count: safeHistory.filter(answer => getAnswerMistakeTag(answer) === tag).length }))
}

function getConsecutiveWrongField(history: AnswerHistory[]) {
  const recentWrong = getSafeHistory(history).slice(-2)
  if (recentWrong.length < 2 || recentWrong.some(answer => answer.isCorrect)) return null
  const fields = recentWrong.map(answer => questions.find(question => question.id === answer.questionId)?.field)
  return fields[0] && fields[0] === fields[1] ? fields[0] : null
}

function getRecommendation(history: AnswerHistory[]) {
  const safeHistory = getSafeHistory(history)
  const schedule = buildReviewSchedule(questions, safeHistory)
  const highPriority = questionsForSchedule(schedule.filter(item => item.priority === 'high'))
  if (highPriority.length) return { text: `復習優先度 高 の問題が${highPriority.length}問あります`, items: highPriority.slice(0, 5), mode: 'recommended' as PracticeMode }
  const consecutiveWrongField = getConsecutiveWrongField(safeHistory)
  if (consecutiveWrongField) {
    const items = questions.filter(question => question.field === consecutiveWrongField).slice(0, 5)
    return { text: `${consecutiveWrongField}でミスが増えています`, items, mode: 'recommended' as PracticeMode }
  }
  const latest = getLatestAnswers(safeHistory)
  const lowConfidence = questions.filter(question => latest.get(question.id)?.confidence === 'low')
  if (lowConfidence.length) return { text: `自信なし問題を${Math.min(5, lowConfidence.length)}問復習しましょう`, items: lowConfidence.slice(0, 5), mode: 'low-confidence' as PracticeMode }
  const stats = getFieldStats(safeHistory)
  const answeredStats = stats.filter(item => item.count > 0)
  const mostIncorrect = [...stats].sort((a, b) => b.incorrect - a.incorrect)[0]
  const lowAccuracy = [...answeredStats].sort((a, b) => a.accuracy - b.accuracy)[0]
  const mostUnanswered = [...stats].sort((a, b) => b.unanswered - a.unanswered)[0]
  if (mostIncorrect?.incorrect) {
    const items = questions.filter(question => question.field === mostIncorrect.field).slice(0, 5)
    return { text: `${mostIncorrect.field}を${items.length}問復習しましょう`, items, mode: 'recommended' as PracticeMode }
  }
  if (lowAccuracy && lowAccuracy.accuracy < 80) {
    const items = questions.filter(question => question.field === lowAccuracy.field).slice(0, 5)
    return { text: `${lowAccuracy.field}の正答率を高めましょう`, items, mode: 'recommended' as PracticeMode }
  }
  if (mostUnanswered?.unanswered) {
    const items = questions.filter(question => question.field === mostUnanswered.field && !latest.has(question.id)).slice(0, 10)
    return { text: `未回答問題を${items.length}問進めましょう`, items, mode: 'recommended' as PracticeMode }
  }
  const security = questions.filter(question => question.field === '情報セキュリティ').slice(0, 5)
  if (security.length) return { text: '情報セキュリティを確認しましょう', items: security, mode: 'recommended' as PracticeMode }
  return { text: 'ランダム10問に挑戦しましょう', items: shuffle(questions).slice(0, 10), mode: 'random-10' as PracticeMode }
}

function shuffle(items: Question[]) {
  return [...items].sort(() => Math.random() - 0.5)
}

function buildMockExamResult(session: MockExamSession): MockExamResult | null {
  if (!session.finishedAt) return null
  const sessionQuestions = session.questionIds.map(id => questions.find(question => question.id === id)).filter((question): question is Question => Boolean(question))
  if (!sessionQuestions.length || sessionQuestions.length !== session.questionIds.length) return null
  const wrongQuestionIds: string[] = []
  const unansweredQuestionIds: string[] = []
  const lowConfidenceQuestionIds: string[] = []
  const markedQuestionIds: string[] = []
  let correctCount = 0
  const fieldStats: MockExamResult['fieldStats'] = {}
  sessionQuestions.forEach(question => {
    const answer = session.answers[question.id]
    const stat = fieldStats[question.field] ?? { total: 0, correct: 0, accuracyRate: 0 }
    stat.total += 1
    if (!answer?.selectedAnswer) unansweredQuestionIds.push(question.id)
    else if (answer.selectedAnswer === question.correctAnswer) { correctCount += 1; stat.correct += 1 }
    else wrongQuestionIds.push(question.id)
    if (answer?.confidence === 'low') lowConfidenceQuestionIds.push(question.id)
    if (answer?.marked) markedQuestionIds.push(question.id)
    fieldStats[question.field] = stat
  })
  Object.values(fieldStats).forEach(stat => { stat.accuracyRate = stat.total ? Math.round((stat.correct / stat.total) * 1000) / 10 : 0 })
  const totalQuestions = session.questionIds.length
  const accuracyRate = Math.round((correctCount / totalQuestions) * 1000) / 10
  const startedAt = new Date(session.startedAt).getTime()
  const finishedAt = new Date(session.finishedAt).getTime()
  return {
    resultId: session.sessionId,
    startedAt: session.startedAt,
    finishedAt: session.finishedAt,
    totalQuestions,
    correctCount,
    wrongCount: wrongQuestionIds.length,
    unansweredCount: unansweredQuestionIds.length,
    accuracyRate,
    passed: accuracyRate >= 60,
    elapsedSeconds: Math.max(0, Math.round((finishedAt - startedAt) / 1000)),
    fieldStats,
    wrongQuestionIds,
    unansweredQuestionIds,
    lowConfidenceQuestionIds,
    markedQuestionIds,
  }
}

function getMockWeakFields(results: MockExamResult[], limit = 3) {
  const totals = new Map<string, { total: number; correct: number; wrong: number }>()
  results.slice(-3).forEach(result => Object.entries(result.fieldStats).forEach(([field, stat]) => {
    const current = totals.get(field) ?? { total: 0, correct: 0, wrong: 0 }
    current.total += stat.total
    current.correct += stat.correct
    current.wrong += stat.total - stat.correct
    totals.set(field, current)
  }))
  return [...totals.entries()].map(([field, stat]) => ({
    field,
    accuracyRate: stat.total ? Math.round((stat.correct / stat.total) * 1000) / 10 : 0,
    wrong: stat.wrong,
  })).sort((a, b) => a.accuracyRate - b.accuracyRate || b.wrong - a.wrong).slice(0, limit)
}

function formatResultDate(value: string) {
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? date.toLocaleString('ja-JP', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '日時不明'
}

function formatElapsed(seconds: number) {
  const safe = Math.max(0, Math.round(seconds))
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  return hours ? `${hours}時間${minutes}分` : `${minutes}分`
}

function App() {
  const [tab, setTab] = useState<Tab>('home')
  const [history, setHistory] = useState<AnswerHistory[]>(loadHistory)
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const [bookmarks, setBookmarks] = useState<BookmarkStore>(loadBookmarks)
  const [session, setSession] = useState<PracticeSession | null>(loadSession)
  const [mockExam, setMockExam] = useState<MockExamSession | null>(loadMockExamSession)
  const [mockExamResults, setMockExamResults] = useState<MockExamResult[]>(loadMockExamResults)
  const [mockExamOpen, setMockExamOpen] = useState(false)
  const safeHistory = Array.isArray(history) ? history : []
  const safeSettings = settings ?? defaultSettings
  const safeBookmarks = Array.isArray(bookmarks) ? bookmarks : []
  const [selected, setSelected] = useState<ChoiceKey | null>(null)
  const [confidence, setConfidence] = useState<Confidence>('normal')
  const [result, setResult] = useState(false)
  const start = useRef(Date.now())
  const contentRef = useRef<HTMLElement>(null)
  const sessionQuestionIds = useMemo(() => Array.isArray(session?.questionIds) ? session.questionIds : [], [session?.questionIds])
  const sessionQuestions = useMemo(() => sessionQuestionIds.map(id => questions.find(question => question.id === id)).filter((question): question is Question => Boolean(question)), [sessionQuestionIds])
  const currentIndex = session && Number.isInteger(session.currentIndex) && session.currentIndex >= 0 && session.currentIndex < sessionQuestionIds.length ? session.currentIndex : 0
  const currentQuestion = questions.find(question => question.id === sessionQuestionIds[currentIndex])
  const currentQuestionId = currentQuestion?.id

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'auto' })
    contentRef.current?.scrollTo({ top: 0, behavior: 'auto' })
  }

  useEffect(() => saveHistory(safeHistory), [safeHistory])
  useEffect(() => saveBookmarks(safeBookmarks), [safeBookmarks])
  useEffect(() => saveSettings(safeSettings), [safeSettings])
  useEffect(() => saveSession(session), [session])
  useEffect(() => saveMockExamSession(mockExam), [mockExam])
  useEffect(() => {
    if (!mockExam?.finishedAt) return
    const savedResult = buildMockExamResult(mockExam)
    if (!savedResult) return
    setMockExamResults(current => {
      if (current.some(result => result.resultId === savedResult.resultId)) return current
      const next = [...current, savedResult]
      saveMockExamResults(next)
      return next
    })
  }, [mockExam])
  useEffect(() => { if (session) setTab('practice') }, [])
  useEffect(() => {
    const savedAnswer = session?.answers.find(answer => answer.questionId === currentQuestionId)
    if (savedAnswer) {
      setSelected(savedAnswer.selectedAnswer)
      setConfidence(savedAnswer.confidence)
      setResult(true)
    }
  }, [currentQuestionId, session?.answers])
  useEffect(scrollToTop, [tab])
  useEffect(scrollToTop, [currentQuestionId, session?.finishedAt])

  const toggleBookmark = (questionId: string) => {
    if (!questionId) return
    setBookmarks(current => {
      const safe = Array.isArray(current) ? current : []
      return safe.includes(questionId) ? safe.filter(id => id !== questionId) : [...safe, questionId]
    })
  }

  const startPractice = (items: Question[] = questions, mode: PracticeMode = 'field') => {
    if (!items.length) return
    const now = new Date().toISOString()
    setSession({
      sessionId: crypto.randomUUID(),
      mode,
      questionIds: items.map(question => question.id),
      currentIndex: 0,
      startedAt: now,
      finishedAt: null,
      totalQuestions: items.length,
      correctCount: 0,
      wrongCount: 0,
      elapsedSeconds: 0,
      answers: [],
    })
    setSelected(null)
    setConfidence('normal')
    setResult(false)
    start.current = Date.now()
    setTab('practice')
  }

  const answer = () => {
    if (!selected || !session || !currentQuestion) return
    const elapsedSeconds = Math.max(1, Math.round((Date.now() - start.current) / 1000))
    const isCorrect = selected === currentQuestion.correctAnswer
    const mistakeTag = inferMistakeTag(currentQuestion, isCorrect, confidence)
    const entry: AnswerHistory = {
      id: crypto.randomUUID(),
      questionId: currentQuestion.id,
      selectedAnswer: selected,
      isCorrect,
      confidence,
      elapsedSeconds,
      answeredAt: new Date().toISOString(),
      mistakeTag,
    }
    setHistory(current => [...(Array.isArray(current) ? current : []), entry])
    setSession(current => current && ({
      ...current,
      correctCount: current.correctCount + (isCorrect ? 1 : 0),
      wrongCount: current.wrongCount + (isCorrect ? 0 : 1),
      elapsedSeconds: current.elapsedSeconds + elapsedSeconds,
      answers: [...current.answers, { questionId: currentQuestion.id, selectedAnswer: selected, isCorrect, confidence, elapsedSeconds, mistakeTag }],
    }))
    setResult(true)
  }

  const next = () => {
    if (!session) return
    if (session.currentIndex >= session.totalQuestions - 1) {
      setSession(current => current && ({ ...current, finishedAt: new Date().toISOString() }))
      setSelected(null)
      setResult(false)
      return
    }
    setSession(current => current && ({ ...current, currentIndex: current.currentIndex + 1 }))
    setSelected(null)
    setResult(false)
    setConfidence('normal')
    start.current = Date.now()
  }

  const leaveSession = () => {
    setSession(null)
    setSelected(null)
    setResult(false)
  }

  const startMockExam = () => {
    const nextSession = createMorningMockExam(questions)
    if (!nextSession.questionIds.length) return
    setSession(null)
    setMockExam(nextSession)
    setMockExamOpen(true)
    setTab('practice')
  }

  function finishMockExam(automatic = false) {
    if (!mockExam || mockExam.finishedAt) return
    const unanswered = mockExam.questionIds.filter(id => !mockExam.answers[id]?.selectedAnswer).length
    if (!automatic && !window.confirm(`${unanswered ? `未回答が${unanswered}問あります。` : ''}採点しますか？
採点後は結果画面に進みます。`)) return
    const finishedAt = new Date().toISOString()
    const entries = mockExam.questionIds.flatMap(questionId => {
      const saved = mockExam.answers[questionId]
      const question = questions.find(item => item.id === questionId)
      if (!saved?.selectedAnswer || !question) return []
      const confidence = saved.confidence ?? 'normal'
      const isCorrect = saved.selectedAnswer === question.correctAnswer
      return [{
        id: crypto.randomUUID(),
        questionId,
        selectedAnswer: saved.selectedAnswer,
        isCorrect,
        confidence,
        elapsedSeconds: saved.elapsedSeconds ?? 0,
        answeredAt: saved.answeredAt ?? finishedAt,
        mistakeTag: inferMistakeTag(question, isCorrect, confidence),
      } satisfies AnswerHistory]
    })
    setHistory(current => [...(Array.isArray(current) ? current : []), ...entries])
    const finishedSession = { ...mockExam, finishedAt }
    const savedResult = buildMockExamResult(finishedSession)
    if (savedResult) setMockExamResults(current => {
      if (current.some(result => result.resultId === savedResult.resultId)) return current
      const next = [...current, savedResult]
      saveMockExamResults(next)
      return next
    })
    setMockExam(finishedSession)
    setMockExamOpen(true)
  }

  const startMockReview = (items: Question[], mode: PracticeMode) => {
    setMockExam(null)
    setMockExamOpen(false)
    startPractice(items, mode)
  }

  const startSavedMockReview = (questionIds: string[], mode: PracticeMode) => {
    const items = questionIds.map(id => questions.find(question => question.id === id)).filter((question): question is Question => Boolean(question))
    if (!items.length) { window.alert('対象問題はありません'); return }
    startPractice(items, mode)
  }

  const goTab = (id: Tab) => {
    setTab(id)
    if (id !== 'practice') { leaveSession(); setMockExamOpen(false) }
  }

  const title = mockExamOpen ? (mockExam?.finishedAt ? '午前模試 結果' : '午前模試モード') : session?.finishedAt ? '演習結果' : session ? (session.mode === 'mock-exam' ? '模擬試験モード' : session.mode === 'single' ? '問題詳細' : session.mode === 'today-review' ? '今日の復習' : '午前問題 演習') : nav.find(item => item.id === tab)?.label ?? ''

  return (
    <div className={safeSettings.theme === 'dark' ? 'dark bg-[#101713]' : ''}>
      <div className="app-shell mx-auto min-h-screen max-w-[480px] bg-paper shadow-2xl dark:bg-[#101713]">
        <header className="safe-top fixed left-1/2 top-0 z-40 flex h-[76px] w-full max-w-[480px] -translate-x-1/2 items-center justify-between border-b border-black/5 bg-paper/95 px-5 backdrop-blur dark:bg-[#101713]/95">
          <div className="flex items-center gap-3">
            {(session || mockExamOpen) && (
              <button aria-label={mockExamOpen ? '午前模試メニューへ戻る' : session?.mode === 'single' ? '問題一覧へ戻る' : '演習を終了'} onClick={mockExamOpen ? () => setMockExamOpen(false) : leaveSession} className="-ml-2 grid size-11 place-items-center rounded-full hover:bg-black/5">
                <ChevronLeft size={22} />
              </button>
            )}
            <div>
              <p className="text-[10px] font-bold tracking-[.18em] text-moss dark:text-lime">AP STUDY</p>
              <h1 className="text-[17px] font-bold tracking-tight">{title}</h1>
            </div>
          </div>
          {mockExamOpen && mockExam ? (
            <span className="tabular rounded-full bg-white px-3 py-1.5 text-xs font-bold shadow-sm dark:bg-white/10">{mockExam.finishedAt ? '完了' : `${mockExam.currentIndex + 1} / ${mockExam.questionIds.length}`}</span>
          ) : session ? (
            <span className="tabular rounded-full bg-white px-3 py-1.5 text-xs font-bold shadow-sm dark:bg-white/10">{session.finishedAt ? '完了' : `${session.currentIndex + 1} / ${session.totalQuestions}`}</span>
          ) : (
            <div className="relative grid size-10 place-items-center rounded-full bg-white shadow-sm dark:bg-white/10">
              <Flame size={19} className="text-orange-500" />
              <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-paper bg-lime" />
            </div>
          )}
        </header>

        <main ref={contentRef} className={`min-w-0 max-w-full overflow-x-hidden px-4 pt-[92px] ${session || mockExamOpen ? 'pb-[138px]' : 'pb-[104px]'}`}>
          {tab === 'home' && <HomeScreen history={safeHistory} mockExamResults={mockExamResults} onStart={startPractice} onStartMock={startMockExam} onReview={() => setTab('review')} onAnalytics={() => setTab('analytics')} />}
          {tab === 'practice' && (mockExamOpen && mockExam ? (
            <MockExamFlow
              session={mockExam}
              onChange={update => setMockExam(current => current ? update(current) : current)}
              onFinish={finishMockExam}
              onReview={startMockReview}
              onRestart={startMockExam}
              onAnalytics={() => { setMockExamOpen(false); setTab('analytics') }}
              onHome={() => { setMockExamOpen(false); setTab('home') }}
            />
          ) : session?.finishedAt ? (
            <ResultScreen
              session={session}
              questions={sessionQuestions}
              history={safeHistory}
              onStart={startPractice}
              onHome={() => { leaveSession(); setTab('home') }}
              onAnalytics={() => { leaveSession(); setTab('analytics') }}
            />
          ) : session && currentQuestion ? (
            <>
              {session.mode === 'mock-exam' && <div className="mb-3 flex items-center justify-between rounded-xl bg-white px-4 py-3 text-[11px] font-bold shadow-sm dark:bg-white/5"><span>回答済み {session.answers.length} / {session.totalQuestions}</span><span className="text-slate-400">正解 {session.correctCount}・不正解 {session.wrongCount}</span></div>}
              <QuestionScreen question={currentQuestion} selected={selected} setSelected={setSelected} result={result} confidence={confidence} setConfidence={setConfidence} bookmarked={safeBookmarks.includes(currentQuestion.id)} onToggleBookmark={() => toggleBookmark(currentQuestion.id)} />
            </>
          ) : <PracticeMenu history={safeHistory} bookmarks={safeBookmarks} mockExam={mockExam} onStart={startPractice} onStartMock={startMockExam} onResumeMock={() => setMockExamOpen(true)} onDiscardMock={() => setMockExam(null)} onToggleBookmark={toggleBookmark} />)}
          {tab === 'review' && <ReviewScreen history={safeHistory} bookmarks={safeBookmarks} onStart={startPractice} />}
          {tab === 'analytics' && <Analytics history={safeHistory} mockExamResults={mockExamResults} onStart={startPractice} onStartMock={startMockExam} onReview={startSavedMockReview} onDelete={resultId => setMockExamResults(deleteMockExamResult(resultId))} onClear={() => setMockExamResults(clearMockExamResults())} />}
          {tab === 'settings' && (
            <SettingsScreen
              value={safeSettings}
              onChange={setSettings}
              onReset={() => {
                resetData()
                setHistory([])
                setSettings(loadSettings())
                setBookmarks([])
                setMockExam(null)
                setMockExamResults([])
                setMockExamOpen(false)
              }}
            />
          )}
        </main>

        {mockExamOpen ? null : session && !session.finishedAt && tab === 'practice' ? (
          <div className="safe-bottom fixed bottom-0 left-1/2 z-50 w-full max-w-[480px] -translate-x-1/2 border-t border-black/5 bg-white/95 px-4 pt-3 backdrop-blur dark:bg-[#18211c]/95">
            {result ? (
              <button onClick={next} className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-ink font-bold text-white shadow-lg dark:bg-lime dark:text-ink">
                {session.currentIndex === session.totalQuestions - 1 ? '結果をみる' : '次の問題へ'}<ChevronRight size={20} />
              </button>
            ) : (
              <button disabled={!selected} onClick={answer} className="h-14 w-full rounded-2xl bg-ink font-bold text-white shadow-lg disabled:bg-slate-200 disabled:text-slate-400 dark:bg-lime dark:text-ink">
                解答する
              </button>
            )}
          </div>
        ) : (
          <nav className="safe-bottom fixed bottom-0 left-1/2 z-50 flex w-full max-w-[480px] -translate-x-1/2 justify-around border-t border-black/5 bg-white/95 px-1 pt-2 backdrop-blur dark:bg-[#18211c]/95">
            {nav.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => goTab(id)} className={`relative flex min-w-[62px] flex-col items-center gap-1 py-1 text-[10px] font-bold ${tab === id ? 'text-moss dark:text-lime' : 'text-slate-400'}`}>
                {tab === id && <span className="absolute -top-2 h-0.5 w-8 rounded-full bg-moss dark:bg-lime" />}
                <Icon size={21} strokeWidth={tab === id ? 2.6 : 2} />
                {label}
              </button>
            ))}
          </nav>
        )}
      </div>
    </div>
  )
}

function HomeScreen({ history, mockExamResults, onStart, onStartMock, onReview, onAnalytics }: { history: AnswerHistory[]; mockExamResults: MockExamResult[]; onStart: (items?: Question[], mode?: PracticeMode) => void; onStartMock: () => void; onReview: () => void; onAnalytics: () => void }) {
  const stats = useMemo(() => getFieldStats(history), [history])
  const accuracy = history.length ? Math.round((history.filter(answer => answer.isCorrect).length / history.length) * 100) : 0
  const todayAnswers = history.filter(answer => answerDateKey(answer.answeredAt) === todayKey()).length
  const schedule = useMemo(() => buildReviewSchedule(questions, history), [history])
  const roadmap = useMemo(() => buildLearningRoadmap(questions, history, mockExamResults, schedule), [history, mockExamResults, schedule])
  const todayPlan = useMemo(() => getTodayLearningPlan(roadmap, schedule, mockExamResults, history, questions), [roadmap, schedule, mockExamResults, history])
  const today = todayKey()
  const dueItems = useMemo(() => getDueReviewItems(schedule, today), [schedule, today])
  const highPriorityCount = dueItems.filter(item => item.priority === 'high').length
  const overdueCount = dueItems.filter(item => item.nextReviewDate < today).length
  const ranked = stats.filter(item => item.count > 0)
  const weak = [...ranked].sort((a, b) => a.accuracy - b.accuracy || b.incorrect - a.incorrect).slice(0, 3)
  const strong = [...ranked].sort((a, b) => b.accuracy - a.accuracy || b.count - a.count).slice(0, 3)
  const latestMock = mockExamResults[mockExamResults.length - 1]
  const mockWeakField = getMockWeakFields(mockExamResults, 1)[0]
  const mockPassTarget = latestMock ? Math.ceil(latestMock.totalQuestions * 0.6) : 0

  const startTodayPlan = () => {
    if (todayPlan.action.type === 'mock-exam') { onStartMock(); return }
    const items = todayPlan.action.questionIds.map(id => questions.find(question => question.id === id)).filter((question): question is Question => Boolean(question))
    onStart(items.length ? items : shuffle(questions).slice(0, 10), items.length ? todayPlan.mode : 'random-10')
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[28px] bg-ink p-5 text-white shadow-card">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-lime">今日の学習プラン</p>
            <h2 className="mt-2 text-xl font-bold leading-snug">{todayPlan.title}</h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-300">理由：{todayPlan.reason}</p>
          </div>
          <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/10"><Sparkles className="text-lime" /></div>
        </div>
        <button onClick={startTodayPlan} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-lime px-3 font-bold text-ink">
          <Play size={18} fill="currentColor" />{todayPlan.action.label}
        </button>
        <button onClick={onAnalytics} className="mt-2 flex h-10 w-full items-center justify-center gap-1 rounded-xl border border-white/20 text-xs font-bold text-white">学習ロードマップを見る<ChevronRight size={16} /></button>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <SummaryCard label="総回答数" value={`${history.length}問`} icon={BookOpen} />
        <SummaryCard label="全体正答率" value={`${accuracy}%`} icon={Target} />
        <SummaryCard label="今日の回答数" value={`${todayAnswers}問`} icon={Clock3} />
        <button onClick={onReview} className="rounded-2xl bg-white p-4 text-left shadow-sm dark:bg-white/5">
          <div className="flex items-center justify-between text-rose-500"><RotateCcw size={18} /><ChevronRight size={16} /></div>
          <p className="mt-3 text-[10px] font-bold text-slate-400">今日の復習</p>
          <p className="tabular mt-1 text-xl font-bold">{dueItems.length}問</p>
        </button>
      </section>
      <section className="grid grid-cols-2 gap-2 rounded-[20px] bg-white p-3 text-center shadow-sm dark:bg-white/5">
        <Metric label="優先度 高" value={`${highPriorityCount}問`} />
        <Metric label="期限切れ" value={`${overdueCount}問`} />
      </section>

      <section className="rounded-[24px] bg-white p-5 shadow-sm dark:bg-white/5">
        <div className="flex items-center gap-2 font-bold"><ClipboardCheck size={19} className="text-moss dark:text-lime" />午前模試サマリー</div>
        {latestMock ? <><div className="mt-4 grid grid-cols-2 gap-3"><Metric label="最新模試" value={`${latestMock.accuracyRate}%`} /><Metric label="合格目安まで" value={latestMock.passed ? 'クリア' : `あと${Math.max(0, mockPassTarget - latestMock.correctCount)}問`} /></div><p className="mt-4 rounded-xl bg-lime/30 p-3 text-xs font-bold leading-relaxed">次は{mockWeakField?.field ?? '不正解問題'}を復習しましょう</p></> : <p className="mt-4 text-xs leading-relaxed text-slate-500 dark:text-slate-300">午前模試を受けて実力を確認しましょう。</p>}
        <button onClick={onAnalytics} className="mt-4 flex h-11 w-full items-center justify-center gap-1 rounded-xl border border-moss text-xs font-bold text-moss dark:border-lime dark:text-lime">模試履歴を見る<ChevronRight size={16} /></button>
      </section>

      <section className="rounded-[24px] bg-white p-5 shadow-sm dark:bg-white/5">
        <div className="mb-4 flex items-center gap-2 font-bold"><TrendingUp size={19} className="text-moss dark:text-lime" />分野別コンディション</div>
        <div className="grid grid-cols-2 gap-4">
          <Ranking title="苦手分野 TOP3" items={weak} empty="回答すると表示されます" tone="text-rose-500" />
          <Ranking title="得意分野 TOP3" items={strong} empty="回答すると表示されます" tone="text-moss dark:text-lime" />
        </div>
      </section>
    </div>
  )
}

function SummaryCard({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Home }) {
  return <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-white/5"><Icon size={18} className="text-moss dark:text-lime" /><p className="mt-3 text-[10px] font-bold text-slate-400">{label}</p><p className="tabular mt-1 text-xl font-bold">{value}</p></div>
}

function Ranking({ title, items, empty, tone }: { title: string; items: ReturnType<typeof getFieldStats>; empty: string; tone: string }) {
  return (
    <div>
      <p className={`text-[11px] font-bold ${tone}`}>{title}</p>
      {items.length ? (
        <ol className="mt-3 space-y-2">
          {items.map((item, index) => <li key={item.field} className="flex items-start gap-2 text-[11px]"><span className="tabular font-bold text-slate-400">{index + 1}</span><span className="min-w-0 flex-1 leading-snug">{item.field}</span><span className="tabular font-bold">{item.accuracy}%</span></li>)}
        </ol>
      ) : <p className="mt-3 text-[10px] leading-relaxed text-slate-400">{empty}</p>}
    </div>
  )
}

function MockExamFlow({ session, onChange, onFinish, onReview, onRestart, onAnalytics, onHome }: { session: MockExamSession; onChange: (updater: (current: MockExamSession) => MockExamSession) => void; onFinish: (automatic?: boolean) => void; onReview: (items: Question[], mode: PracticeMode) => void; onRestart: () => void; onAnalytics: () => void; onHome: () => void }) {
  const [showOverview, setShowOverview] = useState(false)
  const [remainingSeconds, setRemainingSeconds] = useState(() => getMockExamRemainingSeconds(session))
  const questionStartedAt = useRef(Date.now())
  const sessionQuestions = session.questionIds.map(id => questions.find(question => question.id === id)).filter((question): question is Question => Boolean(question))
  const currentQuestion = sessionQuestions[session.currentIndex]
  const currentAnswer = currentQuestion ? session.answers[currentQuestion.id] ?? {} : {}
  const answeredCount = session.questionIds.filter(id => Boolean(session.answers[id]?.selectedAnswer)).length
  const unansweredCount = session.questionIds.length - answeredCount
  const markedCount = session.questionIds.filter(id => session.answers[id]?.marked).length

  useEffect(() => {
    if (session.finishedAt) return
    const updateRemaining = () => {
      const remaining = getMockExamRemainingSeconds(session)
      setRemainingSeconds(remaining)
      if (remaining === 0) onFinish(true)
    }
    updateRemaining()
    const timer = window.setInterval(updateRemaining, 1000)
    return () => window.clearInterval(timer)
  }, [session.sessionId, session.startedAt, session.finishedAt, onFinish])

  useEffect(() => { questionStartedAt.current = Date.now() }, [session.currentIndex])

  const updateAnswer = (patch: Partial<MockExamAnswer>) => {
    if (!currentQuestion) return
    onChange(current => ({
      ...current,
      answers: {
        ...current.answers,
        [currentQuestion.id]: {
          ...current.answers[currentQuestion.id],
          ...patch,
          elapsedSeconds: Math.max(current.answers[currentQuestion.id]?.elapsedSeconds ?? 0, Math.round((Date.now() - questionStartedAt.current) / 1000)),
        },
      },
    }))
  }

  const goToQuestion = (index: number) => {
    onChange(current => ({ ...current, currentIndex: Math.max(0, Math.min(index, current.questionIds.length - 1)) }))
    setShowOverview(false)
  }

  if (session.finishedAt) {
    const answered = session.questionIds.flatMap(id => {
      const question = questions.find(item => item.id === id)
      const answer = session.answers[id]
      return question && answer?.selectedAnswer ? [{ question, answer }] : []
    })
    const correctCount = answered.filter(({ question, answer }) => answer.selectedAnswer === question.correctAnswer).length
    const wrongQuestions = answered.filter(({ question, answer }) => answer.selectedAnswer !== question.correctAnswer).map(({ question }) => question)
    const unansweredQuestions = sessionQuestions.filter(question => !session.answers[question.id]?.selectedAnswer)
    const lowConfidenceQuestions = sessionQuestions.filter(question => session.answers[question.id]?.confidence === 'low')
    const markedQuestions = sessionQuestions.filter(question => session.answers[question.id]?.marked)
    const accuracy = session.questionIds.length ? Math.round((correctCount / session.questionIds.length) * 100) : 0
    const passTarget = Math.ceil(session.questionIds.length * 0.6)
    const fields = [...new Set(sessionQuestions.map(question => question.field))].map(field => {
      const fieldQuestions = sessionQuestions.filter(question => question.field === field)
      const fieldCorrect = fieldQuestions.filter(question => session.answers[question.id]?.selectedAnswer === question.correctAnswer).length
      return { field, correct: fieldCorrect, total: fieldQuestions.length, accuracy: Math.round((fieldCorrect / fieldQuestions.length) * 100) }
    })
    const recommendation = wrongQuestions.length ? `不正解${wrongQuestions.length}問を優先し、分野別正答率が低い領域から復習しましょう。` : unansweredQuestions.length ? '未回答問題を解き直し、時間配分を確認しましょう。' : lowConfidenceQuestions.length ? '自信なし問題を復習して、知識を確実にしましょう。' : '合格目安をクリアしました。復習スケジュールに沿って定着を維持しましょう。'
    return (
      <div className="space-y-4">
        <section className="rounded-[28px] bg-ink p-5 text-white"><p className="text-[11px] font-bold text-lime">MORNING MOCK RESULT</p><div className="mt-3 flex items-end justify-between"><div><p className="text-4xl font-bold tabular">{accuracy}<span className="text-lg">%</span></p><p className="mt-1 text-xs text-white/60">正答率</p></div><p className={`rounded-full px-3 py-2 text-xs font-bold ${accuracy >= 60 ? 'bg-lime text-ink' : 'bg-rose-500 text-white'}`}>{accuracy >= 60 ? '合格目安クリア' : `合格目安まであと${Math.max(0, passTarget - correctCount)}問`}</p></div><div className="mt-5 grid grid-cols-3 gap-2"><ResultMetric label="正解" value={`${correctCount}問`} /><ResultMetric label="不正解" value={`${wrongQuestions.length}問`} /><ResultMetric label="未回答" value={`${unansweredQuestions.length}問`} /></div><p className="mt-4 text-[10px] text-white/60">{session.questionIds.length}問中{passTarget}問以上（60%以上）で合格目安クリア</p></section>
        <section className="rounded-[24px] bg-white p-5 shadow-sm dark:bg-white/5"><h3 className="font-bold">分野別正答率</h3><div className="mt-4 space-y-3">{fields.map(item => <div key={item.field}><div className="flex justify-between text-xs"><span className="font-bold">{item.field}</span><span className="tabular font-bold">{item.correct}/{item.total}・{item.accuracy}%</span></div><div className="mt-2 h-1.5 rounded-full bg-slate-100 dark:bg-white/10"><div className="h-full rounded-full bg-moss dark:bg-lime" style={{ width: `${item.accuracy}%` }} /></div></div>)}</div></section>
        <ResultQuestionList title="間違えた問題一覧" items={wrongQuestions} empty="不正解はありません" />
        <ResultQuestionList title="未回答問題一覧" items={unansweredQuestions} empty="未回答はありません" />
        <ResultQuestionList title="自信なし問題一覧" items={lowConfidenceQuestions} empty="自信なし問題はありません" />
        <ResultQuestionList title="見直しマーク問題一覧" items={markedQuestions} empty="見直しマーク問題はありません" />
        <section className="rounded-[22px] bg-lime/30 p-4"><p className="flex items-center gap-2 text-xs font-bold text-moss dark:text-lime"><Sparkles size={17} />復習おすすめ</p><p className="mt-2 text-sm font-bold leading-relaxed">{recommendation}</p></section>
        <div className="space-y-2">
          <button disabled={!wrongQuestions.length} onClick={() => onReview(wrongQuestions, 'wrong')} className="h-12 w-full rounded-xl bg-ink text-sm font-bold text-white disabled:bg-slate-200 disabled:text-slate-400 dark:bg-lime dark:text-ink">間違えた問題だけ復習</button>
          <button disabled={!unansweredQuestions.length} onClick={() => onReview(unansweredQuestions, 'unanswered')} className="h-12 w-full rounded-xl border border-ink text-sm font-bold disabled:border-slate-200 disabled:text-slate-400 dark:border-lime">未回答問題だけ復習</button>
          <button disabled={!lowConfidenceQuestions.length} onClick={() => onReview(lowConfidenceQuestions, 'low-confidence')} className="h-12 w-full rounded-xl border border-ink text-sm font-bold disabled:border-slate-200 disabled:text-slate-400 dark:border-lime">自信なし問題だけ復習</button>
          <button disabled={!markedQuestions.length} onClick={() => onReview(markedQuestions, 'recommended')} className="h-12 w-full rounded-xl border border-ink text-sm font-bold disabled:border-slate-200 disabled:text-slate-400 dark:border-lime">見直しマーク問題を復習</button>
          <button onClick={onRestart} className="h-12 w-full rounded-xl bg-white text-sm font-bold shadow-sm dark:bg-white/5">もう一度午前模試</button>
          <div className="grid grid-cols-2 gap-2"><button onClick={onAnalytics} className="h-12 rounded-xl bg-white text-sm font-bold shadow-sm dark:bg-white/5">分析を見る</button><button onClick={onHome} className="h-12 rounded-xl bg-white text-sm font-bold shadow-sm dark:bg-white/5">ホームへ戻る</button></div>
        </div>
      </div>
    )
  }

  if (showOverview) {
    return (
      <div className="space-y-4"><section className="rounded-[24px] bg-white p-5 shadow-sm dark:bg-white/5"><div className="flex items-center justify-between"><h2 className="font-bold">回答一覧</h2><span className="tabular text-sm font-bold text-moss dark:text-lime">残り {formatMockExamTime(remainingSeconds)}</span></div><div className="mt-4 grid grid-cols-2 gap-2 text-center"><div className="rounded-xl bg-slate-50 p-3 dark:bg-white/5"><p className="text-[10px] text-slate-400">未回答</p><p className="mt-1 font-bold">{unansweredCount}問</p></div><div className="rounded-xl bg-slate-50 p-3 dark:bg-white/5"><p className="text-[10px] text-slate-400">見直し</p><p className="mt-1 font-bold">{markedCount}問</p></div></div><div className="mt-5 grid grid-cols-5 gap-2">{session.questionIds.map((id, index) => { const answer = session.answers[id]; return <button key={id} onClick={() => goToQuestion(index)} className={`relative aspect-square rounded-xl text-xs font-bold ${answer?.selectedAnswer ? 'bg-moss text-white dark:bg-lime dark:text-ink' : 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300'}`}>{index + 1}{answer?.marked && <Flag size={10} fill="currentColor" className="absolute right-1 top-1" />}</button> })}</div></section><div className="safe-bottom fixed bottom-0 left-1/2 z-50 grid w-full max-w-[480px] -translate-x-1/2 grid-cols-2 gap-2 border-t border-black/5 bg-white/95 px-4 pt-3 backdrop-blur dark:bg-[#18211c]/95"><button onClick={() => setShowOverview(false)} className="h-12 rounded-xl border border-ink text-xs font-bold dark:border-lime">問題へ戻る</button><button onClick={() => onFinish(false)} className="h-12 rounded-xl bg-rose-500 text-xs font-bold text-white">模試を終了して採点</button></div></div>
    )
  }

  if (!currentQuestion) return <p className="rounded-xl bg-white p-4 text-sm dark:bg-white/5">問題を読み込めませんでした。</p>
  return (
    <div className="space-y-4">
      <section className="rounded-xl bg-white px-4 py-3 shadow-sm dark:bg-white/5"><div className="flex items-center justify-between text-xs font-bold"><span>問題番号：{session.currentIndex + 1} / {session.questionIds.length}</span><span className="tabular text-moss dark:text-lime">残り {formatMockExamTime(remainingSeconds)}</span></div><div className="mt-2 flex justify-between text-[10px] text-slate-500 dark:text-slate-300"><span>未回答 {unansweredCount}問</span><span>見直し {markedCount}問</span></div></section>
      <section className="rounded-[24px] bg-white p-5 shadow-card dark:bg-white/5"><div className="flex items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${fieldColor[currentQuestion.field] ?? 'bg-slate-100 text-slate-600'}`}>{currentQuestion.field}</span><span className="text-[10px] text-slate-400">{currentQuestion.subField}</span><button onClick={() => updateAnswer({ marked: !currentAnswer.marked })} className={`ml-auto flex h-10 items-center gap-1 rounded-xl px-3 text-[10px] font-bold ${currentAnswer.marked ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300' : 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300'}`}><Flag size={15} fill={currentAnswer.marked ? 'currentColor' : 'none'} />後で見直す</button></div><p className="mt-5 whitespace-pre-wrap text-[15px] font-medium leading-7">{currentQuestion.questionText}</p><div className="mt-5 space-y-3">{currentQuestion.choices.map(choice => <button key={choice.key} onClick={() => updateAnswer({ selectedAnswer: choice.key, confidence: currentAnswer.confidence ?? 'normal', answeredAt: new Date().toISOString() })} className={`flex min-h-14 w-full items-start gap-3 rounded-2xl border p-3 text-left text-sm leading-6 ${currentAnswer.selectedAnswer === choice.key ? 'border-moss bg-emerald-50/50 dark:border-lime dark:bg-white/5' : 'border-slate-200 dark:border-white/10'}`}><span className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold ${currentAnswer.selectedAnswer === choice.key ? 'bg-moss text-white dark:bg-lime dark:text-ink' : 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300'}`}>{choice.key}</span><span>{choice.text}</span></button>)}</div></section>
      <section className="rounded-[20px] border border-slate-200 p-4 dark:border-white/10"><p className="text-xs font-bold">この解答への自信</p><div className="mt-3 grid grid-cols-3 gap-2">{([['high', '自信あり'], ['normal', 'ふつう'], ['low', '自信なし']] as [Confidence, string][]).map(([value, label]) => <button key={value} onClick={() => updateAnswer({ confidence: value })} className={`h-11 rounded-xl text-[11px] font-bold ${currentAnswer.confidence === value || (!currentAnswer.confidence && value === 'normal') ? 'bg-moss text-white dark:bg-lime dark:text-ink' : 'bg-white text-slate-500 dark:bg-white/5 dark:text-slate-300'}`}>{label}</button>)}</div></section>
      <div className="safe-bottom fixed bottom-0 left-1/2 z-50 w-full max-w-[480px] -translate-x-1/2 border-t border-black/5 bg-white/95 px-4 pt-3 backdrop-blur dark:bg-[#18211c]/95"><div className="grid grid-cols-3 gap-2"><button disabled={session.currentIndex === 0} onClick={() => goToQuestion(session.currentIndex - 1)} className="flex h-12 items-center justify-center rounded-xl border border-slate-200 text-xs font-bold disabled:opacity-30 dark:border-white/10"><ChevronLeft size={17} />前へ</button><button onClick={() => setShowOverview(true)} className="h-12 rounded-xl border border-ink text-[11px] font-bold dark:border-lime">回答一覧へ</button>{session.currentIndex < session.questionIds.length - 1 ? <button onClick={() => goToQuestion(session.currentIndex + 1)} className="flex h-12 items-center justify-center rounded-xl bg-ink text-xs font-bold text-white dark:bg-lime dark:text-ink">次へ<ChevronRight size={17} /></button> : <button onClick={() => onFinish(false)} className="h-12 rounded-xl bg-rose-500 text-[11px] font-bold text-white">終了・採点</button>}</div></div>
    </div>
  )
}

function PracticeMenu({ history, bookmarks, mockExam, onStart, onStartMock, onResumeMock, onDiscardMock, onToggleBookmark }: { history: AnswerHistory[]; bookmarks: BookmarkStore; mockExam: MockExamSession | null; onStart: (items?: Question[], mode?: PracticeMode) => void; onStartMock: () => void; onResumeMock: () => void; onDiscardMock: () => void; onToggleBookmark: (questionId: string) => void }) {
  const latest = useMemo(() => getLatestAnswers(history), [history])
  const recommendation = useMemo(() => getRecommendation(history), [history])
  const dueQuestions = useMemo(() => questionsForSchedule(getDueReviewItems(buildReviewSchedule(questions, history))), [history])
  const wrong = questions.filter(question => latest.get(question.id)?.isCorrect === false)
  const lowConfidence = questions.filter(question => latest.get(question.id)?.confidence === 'low')
  const unanswered = questions.filter(question => !latest.has(question.id))
  const morningQuestions = questions.filter(question => question.examType === 'morning')
  const bookmarked = questions.filter(question => bookmarks.includes(question.id))
  const modes = [
    { title: '今日の復習', description: dueQuestions.length ? '期限切れを含む復習対象' : '今日の復習対象はありません', icon: RotateCcw, items: dueQuestions, mode: 'today-review' as PracticeMode, color: 'bg-lime text-ink' },
    { title: 'ランダム10問', description: '全分野からランダムに出題', icon: RotateCcw, items: shuffle(questions).slice(0, 10), mode: 'random-10' as PracticeMode, color: 'bg-violet-50 text-violet-600' },
    { title: 'ブックマーク復習', description: bookmarked.length ? '保存した問題だけを出題' : 'ブックマークされた問題はありません', icon: Bookmark, items: bookmarked, mode: 'bookmarked' as PracticeMode, color: 'bg-yellow-50 text-yellow-600' },
    { title: '不正解復習', description: '直近で間違えた問題', icon: X, items: wrong, mode: 'wrong' as PracticeMode, color: 'bg-rose-50 text-rose-600' },
    { title: '自信なし復習', description: '自信なしで回答した問題', icon: CircleHelp, items: lowConfidence, mode: 'low-confidence' as PracticeMode, color: 'bg-amber-50 text-amber-600' },
    { title: '未回答問題', description: 'まだ解いていない問題', icon: Lightbulb, items: unanswered, mode: 'unanswered' as PracticeMode, color: 'bg-sky-50 text-sky-600' },
    { title: '今日のおすすめ', description: recommendation.text, icon: Sparkles, items: recommendation.items, mode: recommendation.mode, color: 'bg-lime text-ink' },
  ]
  return (
    <div className="space-y-4">
      <section className="rounded-[28px] bg-ink p-5 text-white">
        <p className="text-[11px] font-bold text-lime">PRACTICE MODE</p>
        <h2 className="mt-2 text-xl font-bold">目的に合わせて演習</h2>
        <p className="mt-2 text-xs leading-relaxed text-white/60">復習状況や学習ペースに合う問題セットを選べます。</p>
      </section>
      <section className="rounded-[24px] border-2 border-moss bg-white p-5 shadow-sm dark:border-lime dark:bg-white/5">
        <div className="flex items-start gap-3"><span className="grid size-12 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"><ClipboardCheck size={22} /></span><div><p className="text-[10px] font-bold text-moss dark:text-lime">本番形式で開始</p><h3 className="mt-1 font-bold">午前模試 {Math.min(80, morningQuestions.length)}問</h3><p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-300">制限時間150分・最後に一括採点</p></div></div>
        {mockExam && !mockExam.finishedAt ? <div className="mt-4 rounded-xl bg-lime/30 p-3"><p className="text-xs font-bold">途中の午前模試があります</p><div className="mt-3 grid grid-cols-2 gap-2"><button onClick={onResumeMock} className="h-11 rounded-xl bg-ink text-xs font-bold text-white dark:bg-lime dark:text-ink">続きから再開</button><button onClick={onDiscardMock} className="h-11 rounded-xl bg-white text-xs font-bold text-rose-600 shadow-sm dark:bg-white/10">破棄して新しく開始</button></div></div> : mockExam?.finishedAt ? <button onClick={onResumeMock} className="mt-4 h-12 w-full rounded-xl bg-ink text-sm font-bold text-white dark:bg-lime dark:text-ink">前回の模試結果を見る</button> : <button onClick={onStartMock} disabled={!morningQuestions.length} className="mt-4 h-12 w-full rounded-xl bg-ink text-sm font-bold text-white disabled:opacity-50 dark:bg-lime dark:text-ink">午前模試を開始</button>}
        {mockExam && !mockExam.finishedAt && <button onClick={() => { onDiscardMock(); onStartMock() }} className="mt-2 h-10 w-full text-xs font-bold text-slate-500 dark:text-slate-300">破棄して新しく開始</button>}
      </section>
      <section className="space-y-2">
        {modes.map(({ title, description, icon: Icon, items, mode, color }) => (
          <button key={title} disabled={!items.length} onClick={() => onStart(items, mode)} className="flex min-h-[72px] w-full items-center gap-3 rounded-[20px] bg-white p-4 text-left shadow-sm disabled:opacity-50 dark:bg-white/5">
            <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${color}`}><Icon size={20} /></span>
            <span className="min-w-0 flex-1"><span className="block text-sm font-bold">{title}</span><span className="mt-1 block text-[10px] leading-relaxed text-slate-400">{description}</span></span>
            <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-slate-400">{items.length}問<ChevronRight size={16} /></span>
          </button>
        ))}
      </section>
      <QuestionList history={history} bookmarks={bookmarks} onStart={onStart} onToggleBookmark={onToggleBookmark} />
      <section className="rounded-[24px] bg-white p-5 dark:bg-white/5">
        <div className="mb-4 flex items-center gap-2 font-bold"><ListFilter size={19} className="text-moss dark:text-lime" />分野別演習</div>
        <div className="space-y-2">
          {allFields.map(field => {
            const items = questions.filter(question => question.field === field)
            return <button key={field} onClick={() => onStart(items, 'field')} className="flex min-h-12 w-full items-center justify-between rounded-xl bg-slate-50 px-4 text-left text-xs font-bold dark:bg-white/5"><span>{field}</span><span className="flex items-center gap-1 text-slate-400">{items.length}問<ChevronRight size={16} /></span></button>
          })}
        </div>
      </section>
    </div>
  )
}


type QuestionListFilter = 'all' | 'unanswered' | 'wrong' | 'low-confidence' | 'bookmarked'

const questionListFilters: { label: string; value: QuestionListFilter }[] = [
  { label: '全て', value: 'all' },
  { label: '未回答のみ', value: 'unanswered' },
  { label: '不正解のみ', value: 'wrong' },
  { label: '自信なしのみ', value: 'low-confidence' },
  { label: 'ブックマークのみ', value: 'bookmarked' },
]
const questionListFilterValues = new Set<QuestionListFilter>(questionListFilters.map(filter => filter.value))
const getSafeQuestionListFilter = (value: unknown): QuestionListFilter => questionListFilterValues.has(value as QuestionListFilter) ? value as QuestionListFilter : 'all'

function QuestionList({ history, bookmarks, onStart, onToggleBookmark }: { history: AnswerHistory[]; bookmarks: BookmarkStore; onStart: (items?: Question[], mode?: PracticeMode) => void; onToggleBookmark: (questionId: string) => void }) {
  const [searchKeyword, setSearchKeyword] = useState('')
  const [selectedField, setSelectedField] = useState('')
  const [selectedFilter, setSelectedFilter] = useState<QuestionListFilter>('all')
  const [isOpen, setIsOpen] = useState(false)
  const [visibleCount, setVisibleCount] = useState(20)
  const latest = useMemo(() => getLatestAnswers(history), [history])
  const bookmarkSet = useMemo(() => new Set(Array.isArray(bookmarks) ? bookmarks : []), [bookmarks])
  const scheduleByQuestion = useMemo(() => new Map(buildReviewSchedule(questions, history).map(item => [item.questionId, item])), [history])
  const keyword = String(searchKeyword ?? '').trim().toLocaleLowerCase('ja')
  const field = String(selectedField ?? '')
  const filter = getSafeQuestionListFilter(selectedFilter)
  const filtered = questions.filter(question => {
    const answer = latest.get(question.id)
    const searchable = [
      question.questionText,
      ...question.choices.map(choice => choice.text),
      question.field,
      question.subField,
      ...question.explanation.keywords,
    ].join(' ').toLocaleLowerCase('ja')
    if (keyword && !searchable.includes(keyword)) return false
    if (field && question.field !== field) return false
    if (filter === 'unanswered' && answer) return false
    if (filter === 'wrong' && answer?.isCorrect !== false) return false
    if (filter === 'low-confidence' && answer?.confidence !== 'low') return false
    if (filter === 'bookmarked' && !bookmarkSet.has(question.id)) return false
    return true
  })
  useEffect(() => setVisibleCount(20), [keyword, field, filter])
  const visibleQuestions = filtered.slice(0, visibleCount)
  const formatExam = (question: Question) => {
    const year = question.examYear >= 2019 ? `R${question.examYear - 2018}` : String(question.examYear)
    return `${year}${question.examSeason === '春期' ? '春' : '秋'} ${question.examType === 'morning' ? '午前' : '午後'} 問${question.questionNumber}`
  }
  return (
    <section className="rounded-[24px] bg-white p-4 shadow-sm dark:bg-white/5">
      <button type="button" aria-expanded={isOpen} onClick={() => setIsOpen(current => !current)} className="flex w-full items-center gap-3 text-left">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-slate-100 text-moss dark:bg-white/10 dark:text-lime"><Search size={19} /></span>
        <span className="min-w-0 flex-1"><span className="block font-bold">問題一覧を{isOpen ? '閉じる' : '開く'}</span><span className="mt-1 block text-[10px] text-slate-400">全{questions.length}問から検索・ブックマークできます</span></span>
        <ChevronRight size={18} className={`shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
      </button>
      {isOpen && <>
      <div className="mt-4 flex items-center justify-between gap-3"><div className="flex items-center gap-2 text-sm font-bold"><ListFilter size={17} className="text-moss dark:text-lime" />検索・フィルタ</div><span className="tabular text-xs font-bold text-slate-400">{filtered.length}問</span></div>
      <label className="relative mt-3 block">
        <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={searchKeyword ?? ''} onChange={event => setSearchKeyword(event.target.value)} placeholder="問題文・選択肢・キーワードを検索" className="h-12 w-full rounded-xl border-0 bg-slate-100 pl-10 pr-3 text-sm outline-none ring-moss focus:ring-2 dark:bg-white/10" />
      </label>
      <select aria-label="分野フィルタ" value={selectedField ?? ''} onChange={event => setSelectedField(event.target.value)} className="mt-2 h-12 w-full rounded-xl border-0 bg-slate-100 px-3 text-sm font-bold dark:bg-white/10">
        <option value="">すべての分野</option>
        {allFields.map(item => <option key={item} value={item}>{item}</option>)}
      </select>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {questionListFilters.map(option => <button type="button" key={option.value} aria-pressed={filter === option.value} onClick={() => setSelectedFilter(getSafeQuestionListFilter(option.value))} className={`min-h-11 rounded-xl px-2 text-[11px] font-bold ${filter === option.value ? 'bg-moss text-white dark:bg-lime dark:text-ink' : 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300'}`}>{option.label}</button>)}
      </div>
      {filtered.length ? (
        <ul className="mt-4 space-y-2">
          {visibleQuestions.map(question => {
            const answer = latest.get(question.id)
            const bookmarked = bookmarkSet.has(question.id)
            const review = scheduleByQuestion.get(question.id)
            return (
              <li key={question.id} className="flex min-w-0 items-stretch gap-2 rounded-2xl bg-slate-50 p-2 dark:bg-white/5">
                <button type="button" onClick={() => onStart([question], 'single')} className="min-w-0 flex-1 rounded-xl p-2 text-left">
                  <span className="block text-xs font-bold">{formatExam(question)}</span>
                  <span className="mt-1 block text-[11px] font-bold text-moss dark:text-lime">{question.field} / {question.subField}</span>
                  <span className="mt-1 block text-[10px] text-slate-500 dark:text-slate-300">{answer ? `回答済み：${answer.isCorrect ? '正解' : '不正解'}${answer.confidence === 'low' ? '・自信なし' : ''}` : '未回答'}{bookmarked ? '・ブックマーク済み' : ''}</span>
                  {review && <span className="mt-1 block text-[10px] font-bold text-slate-500 dark:text-slate-300">次回復習：{formatReviewDate(review.nextReviewDate)}・優先度 {priorityLabel[review.priority]}・理由：{review.reason}</span>}
                  <span className="mt-2 block line-clamp-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{question.questionText}</span>
                </button>
                <button type="button" aria-label={bookmarked ? `${formatExam(question)}のブックマークを解除` : `${formatExam(question)}をブックマーク`} aria-pressed={bookmarked} onClick={() => onToggleBookmark(question.id)} className={`grid w-12 shrink-0 place-items-center rounded-xl ${bookmarked ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-300' : 'bg-white text-slate-400 dark:bg-white/10'}`}><Bookmark size={19} fill={bookmarked ? 'currentColor' : 'none'} /></button>
              </li>
            )
          })}
        </ul>
      ) : <p className="mt-4 rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-400 dark:bg-white/5">条件に一致する問題がありません</p>}
      {visibleCount < filtered.length && <button type="button" onClick={() => setVisibleCount(count => count + 20)} className="mt-4 h-12 w-full rounded-xl border border-slate-200 text-xs font-bold text-moss dark:border-white/10 dark:text-lime">さらに表示</button>}
      </>}
    </section>
  )
}

function ResultScreen({ session, questions: sessionQuestions, history, onStart, onHome, onAnalytics }: { session: PracticeSession; questions: Question[]; history: AnswerHistory[]; onStart: (items: Question[], mode: PracticeMode) => void; onHome: () => void; onAnalytics: () => void }) {
  const accuracy = session.totalQuestions ? Math.round((session.correctCount / session.totalQuestions) * 100) : 0
  const wrongIds = new Set(session.answers.filter(answer => !answer.isCorrect).map(answer => answer.questionId))
  const lowConfidenceIds = new Set(session.answers.filter(answer => answer.confidence === 'low').map(answer => answer.questionId))
  const wrongQuestions = sessionQuestions.filter(question => wrongIds.has(question.id))
  const lowConfidenceQuestions = sessionQuestions.filter(question => lowConfidenceIds.has(question.id))
  const highPriorityQuestions = sessionQuestions.filter(question => getReviewPriority(question.id, history) === 'high')
  const topMistakes = mistakeTags.map(tag => ({ tag, count: session.answers.filter(answer => getAnswerMistakeTag(answer) === tag).length })).filter(item => item.count).sort((a, b) => b.count - a.count).slice(0, 3)
  const fieldResults = allFields.map(field => {
    const ids = new Set(sessionQuestions.filter(question => question.field === field).map(question => question.id))
    const answers = session.answers.filter(answer => ids.has(answer.questionId))
    return { field, count: answers.length, accuracy: answers.length ? Math.round((answers.filter(answer => answer.isCorrect).length / answers.length) * 100) : 0 }
  }).filter(item => item.count)
  const weakest = [...fieldResults].sort((a, b) => a.accuracy - b.accuracy)[0]
  const recommendation = wrongQuestions.length
    ? `${wrongQuestions.length}問の不正解を復習しましょう`
    : weakest && weakest.accuracy < 80
      ? `${weakest.field}の正答率が低めです。復習をおすすめします`
      : `${fieldResults[0]?.field ?? '今回の範囲'}は安定しています`
  return (
    <div className="space-y-4">
      <section className="rounded-[28px] bg-ink p-5 text-white">
        <p className="text-[11px] font-bold text-lime">SESSION COMPLETE</p>
        <div className="mt-3 flex items-end justify-between"><div><p className="text-xs text-white/60">正答率</p><p className="tabular text-4xl font-bold">{accuracy}%</p></div><ClipboardCheck size={42} className="text-lime" /></div>
        <div className="mt-5 grid grid-cols-3 gap-2"><ResultMetric label="正解" value={`${session.correctCount}問`} /><ResultMetric label="不正解" value={`${session.wrongCount}問`} /><ResultMetric label="回答時間" value={`${Math.floor(session.elapsedSeconds / 60)}分${session.elapsedSeconds % 60}秒`} /></div>
      </section>
      <section className="rounded-[24px] bg-white p-5 shadow-sm dark:bg-white/5">
        <h3 className="font-bold">分野別の正答率</h3>
        <div className="mt-4 space-y-3">{fieldResults.map(item => <div key={item.field}><div className="flex justify-between text-xs"><span className="font-bold">{item.field}</span><span className="tabular font-bold">{item.accuracy}%</span></div><div className="mt-2 h-1.5 rounded-full bg-slate-100 dark:bg-white/10"><div className="h-full rounded-full bg-moss dark:bg-lime" style={{ width: `${item.accuracy}%` }} /></div></div>)}</div>
      </section>
      <ResultQuestionList title="間違えた問題" items={wrongQuestions} empty="今回の不正解はありません" />
      <ResultQuestionList title="自信なし問題" items={lowConfidenceQuestions} empty="自信なし問題はありません" />
      <section className="rounded-[24px] bg-white p-5 shadow-sm dark:bg-white/5">
        <div className="flex items-center justify-between"><h3 className="font-bold">次の復習ポイント</h3><span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-700 dark:bg-rose-500/20 dark:text-rose-300">優先度 高 {highPriorityQuestions.length}問</span></div>
        <p className="mt-4 text-xs font-bold text-slate-500 dark:text-slate-300">ミス傾向 TOP3</p>
        {topMistakes.length ? <div className="mt-2 flex flex-wrap gap-2">{topMistakes.map(item => <span key={item.tag} className="rounded-full bg-slate-100 px-3 py-2 text-[10px] font-bold dark:bg-white/10">{item.tag}：{item.count}件</span>)}</div> : <p className="mt-2 text-xs text-slate-400">今回のミス傾向はありません</p>}
      </section>
      <section className="rounded-[22px] bg-lime/30 p-4"><p className="flex items-center gap-2 text-xs font-bold text-moss dark:text-lime"><Sparkles size={17} />復習おすすめ</p><p className="mt-2 text-sm font-bold leading-relaxed">{recommendation}</p></section>
      <div className="space-y-2">
        <button disabled={!highPriorityQuestions.length} onClick={() => onStart(highPriorityQuestions, 'recommended')} className="h-12 w-full rounded-xl bg-ink text-sm font-bold text-white disabled:bg-slate-200 disabled:text-slate-400 dark:bg-lime dark:text-ink">優先度 高 だけ復習</button>
        <button disabled={!wrongQuestions.length} onClick={() => onStart(wrongQuestions, 'wrong')} className="h-12 w-full rounded-xl border border-ink text-sm font-bold disabled:border-slate-200 disabled:text-slate-400 dark:border-lime">今回間違えた問題を復習</button>
        <button disabled={!lowConfidenceQuestions.length} onClick={() => onStart(lowConfidenceQuestions, 'low-confidence')} className="h-12 w-full rounded-xl border border-ink text-sm font-bold disabled:border-slate-200 disabled:text-slate-400 dark:border-lime">自信なし問題を復習</button>
        <button onClick={() => onStart(session.mode === 'random-10' ? shuffle(questions).slice(0, 10) : session.mode === 'mock-exam' ? shuffle(questions.filter(question => question.examType === 'morning')).slice(0, 10) : sessionQuestions, session.mode)} className="h-12 w-full rounded-xl bg-white text-sm font-bold shadow-sm dark:bg-white/5">同じ条件でもう一度</button>
        <div className="grid grid-cols-2 gap-2"><button onClick={onHome} className="h-12 rounded-xl bg-white text-sm font-bold shadow-sm dark:bg-white/5">ホームへ戻る</button><button onClick={onAnalytics} className="h-12 rounded-xl bg-white text-sm font-bold shadow-sm dark:bg-white/5">分析を見る</button></div>
      </div>
    </div>
  )
}

function ResultMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-white/10 p-2 text-center"><p className="text-[9px] text-white/60">{label}</p><p className="tabular mt-1 text-xs font-bold">{value}</p></div>
}

function ResultQuestionList({ title, items, empty }: { title: string; items: Question[]; empty: string }) {
  return <section className="rounded-[24px] bg-white p-5 shadow-sm dark:bg-white/5"><div className="flex items-center justify-between"><h3 className="font-bold">{title}</h3><span className="tabular text-xs font-bold text-slate-400">{items.length}問</span></div>{items.length ? <ul className="mt-3 space-y-2">{items.map(question => <li key={question.id} className="rounded-xl bg-slate-50 p-3 text-xs dark:bg-white/5"><span className={`mr-2 rounded-full px-2 py-1 text-[9px] font-bold ${fieldColor[question.field] ?? 'bg-slate-100'}`}>{question.field}</span><span className="leading-relaxed">問{question.questionNumber} {question.questionText}</span></li>)}</ul> : <p className="mt-3 text-xs text-slate-400">{empty}</p>}</section>
}

function QuestionScreen({ question, selected, setSelected, result, confidence, setConfidence, bookmarked, onToggleBookmark }: { question: Question; selected: ChoiceKey | null; setSelected: (key: ChoiceKey) => void; result: boolean; confidence: Confidence; setConfidence: (value: Confidence) => void; bookmarked: boolean; onToggleBookmark: () => void }) {
  const selectedChoice = question.choices.find(choice => choice.key === selected)
  const correctChoice = question.choices.find(choice => choice.key === question.correctAnswer)
  const mistakeTag = selected ? inferMistakeTag(question, selected === question.correctAnswer, confidence) : undefined
  return (
    <div className="space-y-4">
      <section className="rounded-[24px] bg-white p-5 shadow-card dark:bg-white/5">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${fieldColor[question.field] ?? 'bg-slate-100 text-slate-600'}`}>{question.field}</span>
          <span className="text-[10px] font-medium text-slate-400">{question.subField}</span>
          <button type="button" aria-label={bookmarked ? 'ブックマークを解除' : 'ブックマークに追加'} aria-pressed={bookmarked} onClick={onToggleBookmark} className={`ml-auto grid size-10 place-items-center rounded-full ${bookmarked ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-300' : 'bg-slate-100 text-slate-400 dark:bg-white/10'}`}><Bookmark size={19} fill={bookmarked ? 'currentColor' : 'none'} /></button>
          <span className="text-[10px] text-slate-400">問{question.questionNumber}</span>
        </div>
        <p className="mt-5 whitespace-pre-wrap text-[15px] font-medium leading-7">{question.questionText}</p>
        <div className="mt-5 space-y-3">
          {question.choices.map(choice => {
            const active = selected === choice.key
            const correct = result && choice.key === question.correctAnswer
            const wrong = result && active && !correct
            return (
              <button key={choice.key} disabled={result} onClick={() => setSelected(choice.key)} className={`flex min-h-14 w-full items-start gap-3 rounded-2xl border p-3 text-left text-sm leading-6 transition ${correct ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-500/10' : wrong ? 'border-rose-400 bg-rose-50 dark:bg-rose-500/10' : active ? 'border-moss bg-emerald-50/50 dark:border-lime dark:bg-white/5' : 'border-slate-200 dark:border-white/10'}`}>
                <span className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold ${correct ? 'bg-emerald-500 text-white' : wrong ? 'bg-rose-500 text-white' : active ? 'bg-moss text-white dark:bg-lime dark:text-ink' : 'bg-slate-100 text-slate-500 dark:bg-white/10'}`}>{correct ? <Check size={15} /> : wrong ? <X size={15} /> : choice.key}</span>
                <span>{choice.text}</span>
              </button>
            )
          })}
        </div>
      </section>

      {!result && (
        <section className="rounded-[20px] border border-slate-200 p-4 dark:border-white/10">
          <p className="text-xs font-bold">この解答への自信</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {([['high', '自信あり'], ['normal', 'ふつう'], ['low', '自信なし']] as [Confidence, string][]).map(([value, label]) => (
              <button key={value} onClick={() => setConfidence(value)} className={`h-11 rounded-xl text-[11px] font-bold ${confidence === value ? 'bg-moss text-white dark:bg-lime dark:text-ink' : 'bg-white text-slate-500 dark:bg-white/5'}`}>{label}</button>
            ))}
          </div>
        </section>
      )}

      {result && selected && (
        <section className="space-y-4 rounded-[24px] bg-white p-5 shadow-card dark:bg-white/5">
          <div className={`flex items-center gap-3 rounded-2xl p-4 ${selected === question.correctAnswer ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'}`}>
            {selected === question.correctAnswer ? <Check /> : <X />}
            <div><p className="text-[10px] font-bold">判定</p><p className="font-bold">{selected === question.correctAnswer ? '正解です' : '不正解です'}</p></div>
          </div>
          <AnswerRow label="あなたの解答" value={`${selected}：${selectedChoice?.text ?? ''}`} />
          <AnswerRow label="正解" value={`${question.correctAnswer}：${correctChoice?.text ?? ''}`} emphasis />
          {mistakeTag && <div className="rounded-xl bg-amber-50 p-3 dark:bg-amber-500/10"><p className="text-[10px] font-bold text-amber-600 dark:text-amber-300">ミス傾向</p><p className="mt-1 text-sm font-bold">{mistakeTag}</p></div>}
          {selected !== question.correctAnswer && (
            <ExplanationBlock title="なぜ選んだ選択肢が違うか" icon={CircleHelp} text={question.explanation.wrongReasons[selected] ?? 'この選択肢は設問の条件を満たしません。正解の考え方と対比して整理しましょう。'} tone="text-rose-500" />
          )}
          <ExplanationBlock title="なぜ正解が正しいか" icon={Lightbulb} text={question.explanation.correctReason} tone="text-moss dark:text-lime" />
          <div>
            <p className="flex items-center gap-2 text-xs font-bold"><Brain size={17} className="text-moss dark:text-lime" />覚えるポイント</p>
            <ul className="mt-2 space-y-2">{question.explanation.points.map(point => <li key={point} className="flex gap-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300"><span className="text-moss dark:text-lime">●</span>{point}</li>)}</ul>
          </div>
          <div><p className="text-xs font-bold">関連キーワード</p><div className="mt-2 flex flex-wrap gap-2">{question.explanation.keywords.map(keyword => <span key={keyword} className="rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">{keyword}</span>)}</div></div>
          <div className="border-t border-slate-100 pt-4 text-[10px] leading-relaxed text-slate-400 dark:border-white/10">
            <p className="font-bold text-slate-500 dark:text-slate-300">出典：{question.sourceName}</p>
            {question.isQuoteFromIpa && <a href={question.sourceUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-moss underline dark:text-lime">IPA公式資料を開く</a>}
            <p className="mt-2">{question.isQuoteFromIpa ? '問題文・選択肢はIPA公開資料より引用' : '問題文・選択肢はAP Studyのオリジナル問題'}</p>
            <p>解説はAP Studyが作成</p>
          </div>
        </section>
      )}
    </div>
  )
}

function AnswerRow({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/5"><p className="text-[10px] font-bold text-slate-400">{label}</p><p className={`mt-1 text-xs leading-relaxed ${emphasis ? 'font-bold text-emerald-600 dark:text-emerald-300' : 'font-medium'}`}>{value}</p></div>
}

function ExplanationBlock({ title, icon: Icon, text, tone }: { title: string; icon: typeof Home; text: string; tone: string }) {
  return <div><p className="flex items-center gap-2 text-xs font-bold"><Icon size={17} className={tone} />{title}</p><p className="mt-2 text-xs leading-6 text-slate-600 dark:text-slate-300">{text}</p></div>
}

function ReviewScreen({ history, bookmarks, onStart }: { history: AnswerHistory[]; bookmarks: BookmarkStore; onStart: (items: Question[], mode?: PracticeMode) => void }) {
  const latest = useMemo(() => getLatestAnswers(history), [history])
  const schedule = useMemo(() => buildReviewSchedule(questions, history), [history])
  const scheduleByQuestion = useMemo(() => new Map(schedule.map(item => [item.questionId, item])), [schedule])
  const today = todayKey()
  const [filter, setFilter] = useState<'today' | 'overdue' | 'upcoming' | 'high' | 'medium-up' | 'wrong' | 'low-confidence' | 'unanswered' | 'field' | 'mistake' | 'bookmarked'>('today')
  const [field, setField] = useState<string>(allFields[0] ?? '')
  const [mistakeTag, setMistakeTag] = useState<MistakeTag>(mistakeTags[0])
  const dueItems = getDueReviewItems(schedule, today)
  const upcomingItems = getUpcomingReviewItems(schedule, today)
  const orderedItems = filter === 'today' ? dueItems : filter === 'overdue' ? dueItems.filter(item => item.nextReviewDate < today) : filter === 'upcoming' ? upcomingItems : schedule
  const candidateQuestions = filter === 'unanswered' ? questions : questionsForSchedule(orderedItems)
  const filtered = candidateQuestions.filter(question => {
    const answer = latest.get(question.id)
    const item = scheduleByQuestion.get(question.id)
    if (filter === 'today' || filter === 'overdue' || filter === 'upcoming') return true
    if (filter === 'high') return item?.priority === 'high'
    if (filter === 'medium-up') return item?.priority === 'high' || item?.priority === 'medium'
    if (filter === 'wrong') return answer?.isCorrect === false
    if (filter === 'low-confidence') return answer?.confidence === 'low'
    if (filter === 'unanswered') return !answer
    if (filter === 'field') return question.field === field && Boolean(item)
    if (filter === 'bookmarked') return bookmarks.includes(question.id)
    return Boolean(answer && getAnswerMistakeTag(answer) === mistakeTag)
  })
  const filters = [
    ['today', '今日の復習'], ['overdue', '期限切れ'], ['upcoming', '7日以内'], ['high', '優先度：高'], ['medium-up', '優先度：中以上'],
    ['wrong', '不正解のみ'], ['low-confidence', '自信なしのみ'], ['unanswered', '未回答のみ'], ['field', '分野別'], ['mistake', 'ミス傾向別'], ['bookmarked', 'ブックマークのみ'],
  ] as const

  return (
    <div className="space-y-4">
      <section className="rounded-[24px] bg-ink p-5 text-white">
        <div className="flex items-center gap-3"><div className="grid size-11 place-items-center rounded-xl bg-lime text-ink"><RotateCcw size={22} /></div><div><p className="text-[10px] font-bold text-lime">REVIEW</p><h2 className="font-bold">復習対象を絞り込む</h2></div></div>
        <p className="mt-4 text-xs leading-relaxed text-white/60">次回復習日・優先度・ミス傾向から復習問題を整理します。</p>
      </section>
      <section className="rounded-[22px] bg-white p-4 shadow-sm dark:bg-white/5">
        <div className="flex flex-wrap gap-2">{filters.map(([value, label]) => <button key={value} onClick={() => setFilter(value)} className={`min-h-11 rounded-full px-3 text-[11px] font-bold ${filter === value ? 'bg-moss text-white dark:bg-lime dark:text-ink' : 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300'}`}>{label}</button>)}</div>
        {filter === 'field' && <select aria-label="分野" value={field} onChange={event => setField(event.target.value)} className="mt-3 h-12 w-full rounded-xl border-0 bg-slate-100 px-3 text-xs font-bold dark:bg-white/10">{allFields.map(item => <option key={item}>{item}</option>)}</select>}
        {filter === 'mistake' && <select aria-label="ミス傾向" value={mistakeTag} onChange={event => setMistakeTag(event.target.value as MistakeTag)} className="mt-3 h-12 w-full rounded-xl border-0 bg-slate-100 px-3 text-xs font-bold dark:bg-white/10">{mistakeTags.map(item => <option key={item}>{item}</option>)}</select>}
      </section>
      <section className="rounded-[22px] bg-white p-4 shadow-sm dark:bg-white/5">
        <div className="flex items-center justify-between"><h3 className="font-bold">復習問題一覧</h3><span className="tabular text-sm font-bold">{filtered.length}問</span></div>
        {filtered.length ? <ul className="mt-3 space-y-2">{filtered.map(question => { const item = scheduleByQuestion.get(question.id); const answer = latest.get(question.id); const tag = answer && getAnswerMistakeTag(answer); return <li key={question.id} className="rounded-xl bg-slate-50 p-3 dark:bg-white/5"><div className="flex flex-wrap items-center gap-2">{item && <span className={`rounded-full px-2 py-1 text-[9px] font-bold ${priorityClass[item.priority]}`}>復習優先度：{priorityLabel[item.priority]}</span>}<span className={`rounded-full px-2 py-1 text-[9px] font-bold ${fieldColor[question.field] ?? 'bg-slate-100'}`}>{question.field}</span>{tag && <span className="text-[9px] font-bold text-slate-400">{tag}</span>}</div>{item && <p className="mt-2 text-[10px] font-bold text-slate-500 dark:text-slate-300">次回復習：{formatReviewDate(item.nextReviewDate, today)}・理由：{item.reason}</p>}<p className="mt-2 line-clamp-2 text-xs leading-relaxed">問{question.questionNumber} {question.questionText}</p></li> })}</ul> : <p className="mt-4 text-xs text-slate-400">{filter === 'today' ? '今日の復習対象はありません。' : 'この条件に該当する問題はありません。'}</p>}
        <button disabled={!filtered.length} onClick={() => onStart(filtered, filter === 'today' || filter === 'overdue' ? 'today-review' : filter === 'wrong' ? 'wrong' : filter === 'low-confidence' ? 'low-confidence' : filter === 'unanswered' ? 'unanswered' : filter === 'field' ? 'field' : filter === 'bookmarked' ? 'bookmarked' : 'recommended')} className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-ink text-xs font-bold text-white disabled:bg-slate-100 disabled:text-slate-400 dark:bg-lime dark:text-ink dark:disabled:bg-white/10 dark:disabled:text-slate-500">この条件で演習する<ChevronRight size={16} /></button>
      </section>
    </div>
  )
}
function MockExamHistory({ results, onReview, onDelete, onClear }: { results: MockExamResult[]; onReview: (questionIds: string[], mode: PracticeMode) => void; onDelete: (resultId: string) => void; onClear: () => void }) {
  const ordered = [...results].sort((a, b) => new Date(a.finishedAt).getTime() - new Date(b.finishedAt).getTime())
  const latest = ordered[ordered.length - 1]
  const displayed = ordered.slice(-10).reverse()
  const average = ordered.length ? Math.round((ordered.reduce((sum, result) => sum + result.accuracyRate, 0) / ordered.length) * 10) / 10 : 0
  const best = ordered.length ? Math.max(...ordered.map(result => result.accuracyRate)) : 0
  const weakFields = getMockWeakFields(ordered)
  const latestWeakFields = latest ? Object.entries(latest.fieldStats).sort(([, a], [, b]) => a.accuracyRate - b.accuracyRate || (b.total - b.correct) - (a.total - a.correct)).slice(0, 3) : []
  return (
    <section className="rounded-[24px] bg-white p-4 shadow-card dark:bg-white/5">
      <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2 font-bold"><ClipboardCheck size={19} className="text-moss dark:text-lime" />模試履歴</div>{ordered.length > 0 && <button onClick={() => { if (window.confirm('模試履歴をすべて削除しますか？')) onClear() }} className="text-[10px] font-bold text-rose-500">全件削除</button>}</div>
      {latest ? <>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3"><Metric label="模試回数" value={`${ordered.length}回`} /><Metric label="最新" value={`${latest.accuracyRate}%`} /><Metric label="最高" value={`${best}%`} /><Metric label="平均" value={`${average}%`} /><Metric label="合格目安クリア" value={`${ordered.filter(result => result.passed).length}回`} /><Metric label="直近3回" value={ordered.slice(-3).map(result => `${result.accuracyRate}%`).join(' / ')} /></div>
        <div className="mt-5"><p className="text-xs font-bold">成績推移（最新10回）</p><div className="mt-3 flex h-32 items-end gap-2 rounded-xl bg-slate-50 p-3 dark:bg-white/5">{ordered.slice(-10).map((result, index) => <div key={result.resultId} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"><span className="tabular text-[9px] font-bold">{result.accuracyRate}%</span><div className={`w-full rounded-t-md ${result.passed ? 'bg-moss dark:bg-lime' : 'bg-rose-400'}`} style={{ height: `${Math.max(8, result.accuracyRate)}%` }} /><span className="text-[8px] text-slate-400">{Math.max(1, ordered.length - Math.min(10, ordered.length) + index + 1)}回</span></div>)}</div></div>
        <div className="mt-5"><p className="text-xs font-bold">最新模試の弱点分野 TOP3</p><div className="mt-2 flex flex-wrap gap-2">{latestWeakFields.map(([field, stat]) => <span key={field} className="rounded-full bg-rose-50 px-3 py-2 text-[10px] font-bold text-rose-700 dark:bg-rose-500/20 dark:text-rose-200">{field} {stat.accuracyRate}%</span>)}</div></div>
        <div className="mt-5 rounded-xl bg-lime/20 p-3"><p className="text-xs font-bold">履歴から見た復習おすすめ</p>{weakFields.map(field => <p key={field.field} className="mt-2 text-[11px] text-slate-600 dark:text-slate-300">{field.field}：平均正答率 {field.accuracyRate}%{field.accuracyRate < 60 ? '・重点復習がおすすめ' : ''}</p>)}</div>
        <div className="mt-5 space-y-3">{displayed.map(result => {
          const cardWeak = Object.entries(result.fieldStats).sort(([, a], [, b]) => a.accuracyRate - b.accuracyRate).slice(0, 3)
          return <article key={result.resultId} className="rounded-2xl border border-slate-100 p-4 dark:border-white/10"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold">{formatResultDate(result.finishedAt)}</p><p className="tabular mt-1 text-2xl font-bold">{result.accuracyRate}%</p></div><div className="flex items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${result.passed ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200' : 'bg-rose-50 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200'}`}>{result.passed ? '合格目安クリア' : '未達'}</span><button aria-label="この模試履歴を削除" onClick={() => { if (window.confirm('この模試履歴を削除しますか？')) onDelete(result.resultId) }} className="grid size-9 place-items-center rounded-lg text-rose-500"><Trash2 size={16} /></button></div></div><div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-500 dark:text-slate-300"><span>正解 {result.correctCount} / {result.totalQuestions}問</span><span>所要時間 {formatElapsed(result.elapsedSeconds)}</span></div><div className="mt-3 flex flex-wrap gap-1.5">{cardWeak.map(([field, stat]) => <span key={field} className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">{field} {stat.accuracyRate}%</span>)}</div><div className="mt-4 grid grid-cols-2 gap-2"><HistoryReviewButton label="間違い" count={result.wrongQuestionIds.length} onClick={() => onReview(result.wrongQuestionIds, 'wrong')} /><HistoryReviewButton label="未回答" count={result.unansweredQuestionIds.length} onClick={() => onReview(result.unansweredQuestionIds, 'unanswered')} /><HistoryReviewButton label="自信なし" count={result.lowConfidenceQuestionIds.length} onClick={() => onReview(result.lowConfidenceQuestionIds, 'low-confidence')} /><HistoryReviewButton label="見直し" count={result.markedQuestionIds.length} onClick={() => onReview(result.markedQuestionIds, 'recommended')} /></div></article>
        })}</div>
        {ordered.length > displayed.length && <p className="mt-3 text-center text-[10px] text-slate-400">最新10件を表示しています</p>}
      </> : <p className="mt-4 text-xs leading-relaxed text-slate-500 dark:text-slate-300">まだ模試履歴はありません。午前模試を受けると、成績推移と弱点分野が表示されます。</p>}
    </section>
  )
}

function HistoryReviewButton({ label, count, onClick }: { label: string; count: number; onClick: () => void }) {
  return <button onClick={onClick} className="min-h-11 rounded-xl border border-slate-200 px-2 text-[10px] font-bold dark:border-white/10">{label}を復習（{count}問）</button>
}

function Analytics({ history, mockExamResults, onStart, onStartMock, onReview, onDelete, onClear }: { history: AnswerHistory[]; mockExamResults: MockExamResult[]; onStart: (items?: Question[], mode?: PracticeMode) => void; onStartMock: () => void; onReview: (questionIds: string[], mode: PracticeMode) => void; onDelete: (resultId: string) => void; onClear: () => void }) {
  const data = useMemo(() => getFieldStats(history), [history])
  const mistakeCounts = useMemo(() => getMistakeCounts(history), [history])
  const schedule = useMemo(() => buildReviewSchedule(questions, history), [history])
  const today = todayKey()
  const dueItems = useMemo(() => getDueReviewItems(schedule, today), [schedule, today])
  const upcomingItems = useMemo(() => getUpcomingReviewItems(schedule, today), [schedule, today])
  const fieldReviewCounts = allFields.map(field => ({ field, count: schedule.filter(item => questions.find(question => question.id === item.questionId)?.field === field).length })).filter(item => item.count)
  const topMistake = [...mistakeCounts].sort((a, b) => b.count - a.count)[0]
  const studyDays = new Set(history.map(answer => answerDateKey(answer.answeredAt))).size
  const roadmap = useMemo(() => buildLearningRoadmap(questions, history, mockExamResults, schedule), [history, mockExamResults, schedule])
  const startRoadmapAction = (step: (typeof roadmap)[number]) => {
    if (step.action.type === 'mock-exam') { onStartMock(); return }
    const items = step.action.questionIds.map(id => questions.find(question => question.id === id)).filter((question): question is Question => Boolean(question))
    onStart(items.length ? items : shuffle(questions).slice(0, 10), items.length ? 'recommended' : 'random-10')
  }
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3"><SummaryCard icon={Flame} label="学習日数" value={`${studyDays}日`} /><SummaryCard icon={BookOpen} label="総回答数" value={`${history.length}問`} /></div>
      <section className="rounded-[24px] bg-white p-4 shadow-card dark:bg-white/5">
        <div className="flex items-center gap-2 font-bold"><Target size={19} className="text-moss dark:text-lime" />学習ロードマップ</div>
        <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-300">回答・復習・模試の記録から、合格までの現在地を自動計算します。</p>
        <div className="mt-4 space-y-3">
          {roadmap.map(step => <article key={step.id} className="rounded-2xl border border-slate-100 p-4 dark:border-white/10">
            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-bold text-moss dark:text-lime">STEP {step.id}</p><h3 className="mt-1 text-sm font-bold">{step.name}</h3></div><span className="tabular shrink-0 text-lg font-bold">{step.progress}%</span></div>
            <div className="mt-3 h-2 rounded-full bg-slate-100 dark:bg-white/10"><div className="h-full rounded-full bg-moss dark:bg-lime" style={{ width: `${step.progress}%` }} /></div>
            <div className="mt-3 flex flex-wrap gap-1.5">{step.fields.map(field => <span key={field} className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">{field}</span>)}</div>
            <p className="mt-3 text-xs font-bold">現在：{step.state}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-300">次にやること：{step.nextAction}</p>
            <button onClick={() => startRoadmapAction(step)} className="mt-3 flex h-10 w-full items-center justify-center gap-1 rounded-xl bg-moss text-xs font-bold text-white dark:bg-lime dark:text-ink">{step.action.label}<ChevronRight size={15} /></button>
          </article>)}
        </div>
      </section>
      <MockExamHistory results={mockExamResults} onReview={onReview} onDelete={onDelete} onClear={onClear} />
      <section className="rounded-[24px] bg-white p-4 shadow-card dark:bg-white/5">
        <div className="mb-4 flex items-center gap-2 font-bold"><RotateCcw size={19} className="text-moss dark:text-lime" />復習スケジュール</div>
        <div className="grid grid-cols-2 gap-2"><Metric label="今日" value={`${dueItems.length}問`} /><Metric label="期限切れ" value={`${dueItems.filter(item => item.nextReviewDate < today).length}問`} /><Metric label="7日以内" value={`${upcomingItems.length}問`} /><Metric label="優先度 高" value={`${schedule.filter(item => item.priority === 'high').length}問`} /></div>
        {fieldReviewCounts.length ? <div className="mt-4 flex flex-wrap gap-2">{fieldReviewCounts.map(item => <span key={item.field} className="rounded-full bg-slate-100 px-3 py-2 text-[10px] font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">{item.field}：{item.count}問</span>)}</div> : <p className="mt-4 text-xs text-slate-400">回答すると分野別の復習予定が表示されます。</p>}
      </section>
      <section className="rounded-[24px] bg-white p-4 shadow-card dark:bg-white/5">
        <div className="mb-4 flex items-center gap-2 font-bold"><Brain size={19} className="text-moss dark:text-lime" />ミス傾向サマリー</div>
        <div className="grid grid-cols-2 gap-2">{mistakeCounts.map(item => <div key={item.tag} className="rounded-xl bg-slate-50 p-3 dark:bg-white/5"><p className="text-[10px] font-bold text-slate-500 dark:text-slate-300">{item.tag}</p><p className="tabular mt-1 text-lg font-bold">{item.count}<span className="ml-1 text-[10px] text-slate-400">件</span></p></div>)}</div>
        {topMistake?.count ? <p className="mt-4 rounded-xl bg-lime/30 p-3 text-xs font-bold leading-relaxed">{topMistake.tag === '用語理解不足' ? '用語理解不足が多めです。まずは用語の意味を整理しましょう' : topMistake.tag === '選択肢の比較ミス' ? '選択肢の比較ミスが多めです。消去法を意識しましょう' : `${topMistake.tag}が多めです。解説を確認して復習しましょう`}</p> : <p className="mt-4 text-xs text-slate-400">回答するとミス傾向が表示されます。</p>}
      </section>
      <section className="rounded-[24px] bg-white p-4 shadow-card dark:bg-white/5">
        <div className="mb-4 flex items-center gap-2 font-bold"><BarChart3 size={19} className="text-moss dark:text-lime" />分野別分析</div>
        <div className="space-y-3">
          {data.map(item => {
            const status = item.count === 0 ? '未演習' : item.accuracy >= 80 ? '得意' : item.accuracy >= 60 ? '普通' : '苦手'
            const statusClass = status === '得意' ? 'bg-emerald-50 text-emerald-600' : status === '普通' ? 'bg-amber-50 text-amber-600' : status === '苦手' ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-500'
            return (
              <div key={item.field} className="rounded-2xl border border-slate-100 p-4 dark:border-white/10">
                <div className="flex items-start justify-between gap-3"><p className="text-sm font-bold">{item.field}</p><span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${statusClass}`}>{status}</span></div>
                <div className="mt-3 grid grid-cols-4 gap-2 text-center"><Metric label="回答" value={`${item.count}`} /><Metric label="正解" value={`${item.correct}`} /><Metric label="正答率" value={item.count ? `${item.accuracy}%` : '—'} /><Metric label="平均" value={item.count ? `${item.averageSeconds}秒` : '—'} /></div>
                <div className="mt-3 h-1.5 rounded-full bg-slate-100 dark:bg-white/10"><div className={`h-full rounded-full ${item.accuracy >= 80 ? 'bg-emerald-500' : item.accuracy >= 60 ? 'bg-amber-400' : 'bg-rose-400'}`} style={{ width: `${item.count ? Math.max(4, item.accuracy) : 0}%` }} /></div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[9px] font-bold text-slate-400">{label}</p><p className="tabular mt-1 text-xs font-bold">{value}</p></div>
}

function SettingsScreen({ value, onChange, onReset }: { value: Settings; onChange: (settings: Settings) => void; onReset: () => void }) {
  const [confirm, setConfirm] = useState(false)
  const options = ['情報セキュリティ', 'ネットワーク', 'データベース', 'システム開発', 'プロジェクトマネジメント']
  return (
    <div className="min-w-0 max-w-full space-y-4 overflow-x-hidden">
      <SettingCard title="学習目標" icon={Target}>
        <label className="block min-w-0 max-w-full text-xs font-bold text-slate-500">試験予定日<input type="date" value={value.examDate} onChange={event => onChange({ ...value, examDate: event.target.value })} className="exam-date-input mt-2 h-12 w-full min-w-0 max-w-full rounded-xl border-0 bg-slate-100 px-3 font-medium text-ink outline-none dark:bg-white/10 dark:text-white" /></label>
        <label className="mt-4 block min-w-0 max-w-full text-xs font-bold text-slate-500">1日の目標学習時間<div className="mt-2 flex min-w-0 flex-wrap gap-2">{[15, 30, 45, 60].map(minutes => <button key={minutes} onClick={() => onChange({ ...value, dailyMinutes: minutes })} className={`h-11 min-w-[64px] flex-1 rounded-xl text-xs font-bold ${value.dailyMinutes === minutes ? 'bg-moss text-white' : 'bg-slate-100 text-slate-500 dark:bg-white/10'}`}>{minutes}分</button>)}</div></label>
      </SettingCard>
      <SettingCard title="午後の選択候補" icon={BookOpen}><div className="flex flex-wrap gap-2">{options.map(option => { const active = value.afternoonFields.includes(option); return <button key={option} onClick={() => onChange({ ...value, afternoonFields: active ? value.afternoonFields.filter(field => field !== option) : [...value.afternoonFields, option] })} className={`rounded-full px-3 py-2 text-xs font-bold ${active ? 'bg-moss text-white' : 'bg-slate-100 text-slate-500 dark:bg-white/10'}`}>{active && '✓ '}{option}</button> })}</div></SettingCard>
      <SettingCard title="表示テーマ" icon={Sparkles}><div className="grid grid-cols-2 gap-2">{(['light', 'dark'] as const).map(theme => <button key={theme} onClick={() => onChange({ ...value, theme })} className={`h-12 rounded-xl text-xs font-bold ${value.theme === theme ? 'bg-ink text-white ring-2 ring-lime ring-offset-2' : 'bg-slate-100 text-slate-500 dark:bg-white/10'}`}>{theme === 'light' ? 'ライト' : 'ダーク'}</button>)}</div></SettingCard>
      <SettingCard title="IPA過去問カタログ" icon={ClipboardCheck}>
        <p className="mb-3 text-[11px] leading-relaxed text-slate-500 dark:text-slate-300">今後の年度別取り込み対象です。公式資料を確認できた項目だけリンクを表示します。</p>
        <div className="divide-y divide-slate-100 dark:divide-white/10">
          {ipaPastExamCatalog.map(item => {
            const officialUrl = item.sourcePageUrl || item.questionPdfUrl
            return (
              <div key={item.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold">{item.period.eraLabel} {item.period.seasonLabel} {item.paperType === 'morning' ? '午前' : '午後'}</p>
                    <p className="mt-1 text-[10px] text-slate-400">{item.note ?? '今後取り込み予定'}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-bold ${item.isReadyForImport ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'}`}>{item.importStatus === 'imported' ? `${item.importedQuestionCount ?? 0}問取り込み済み` : item.isReadyForImport ? '投入準備済み' : '未取り込み'}</span>
                </div>
                {officialUrl && <a href={officialUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-[10px] font-bold text-moss underline dark:text-lime">公式資料を開く</a>}
              </div>
            )
          })}
        </div>
      </SettingCard>
      <div className="rounded-[24px] bg-white p-5 dark:bg-white/5">
        <div className="flex items-center gap-2 font-bold"><LockKeyhole size={18} className="text-moss dark:text-lime" />データ管理</div>
        <p className="mt-2 text-[11px] leading-relaxed text-slate-400">学習データはこの端末のブラウザ内に保存されています。</p>
        {confirm ? <div className="mt-4 rounded-xl bg-rose-50 p-3"><p className="text-xs font-bold text-rose-600">本当にすべて削除しますか？</p><div className="mt-3 flex gap-2"><button onClick={() => setConfirm(false)} className="h-10 flex-1 rounded-lg bg-white text-xs font-bold">キャンセル</button><button onClick={() => { onReset(); setConfirm(false) }} className="h-10 flex-1 rounded-lg bg-rose-500 text-xs font-bold text-white">削除する</button></div></div> : <button onClick={() => setConfirm(true)} className="mt-4 h-11 w-full rounded-xl border border-rose-200 text-xs font-bold text-rose-500">学習データをリセット</button>}
      </div>
      <div className="pb-3 text-center"><p className="text-xs font-bold text-slate-500">AP Study {APP_VERSION}</p><p className="mt-1 text-[10px] text-slate-400">Boot guard enabled</p></div>
    </div>
  )
}

function SettingCard({ title, icon: Icon, children }: { title: string; icon: typeof Home; children: React.ReactNode }) {
  return <section className="min-w-0 max-w-full overflow-hidden rounded-[24px] bg-white p-5 shadow-sm dark:bg-white/5"><div className="mb-5 flex items-center gap-2 font-bold"><Icon size={18} className="text-moss dark:text-lime" />{title}</div>{children}</section>
}

export default App
