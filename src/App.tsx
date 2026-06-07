import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BarChart3,
  BookOpen,
  Brain,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  Flame,
  Home,
  Lightbulb,
  ClipboardCheck,
  ListFilter,
  LockKeyhole,
  Play,
  RotateCcw,
  Settings as SettingsIcon,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  X,
} from 'lucide-react'
import { questions } from './data/questions'
import { loadHistory, loadSession, loadSettings, resetCurrentSession, resetData, saveHistory, saveSession, saveSettings } from './lib/storage'
import type { AnswerHistory, ChoiceKey, Confidence, PracticeMode, PracticeSession, Question, Settings, Tab } from './types'

const APP_VERSION = 'v1.3.3'
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
const todayKey = () => new Date().toLocaleDateString('sv-SE')
const answerDateKey = (value: string) => new Date(value).toLocaleDateString('sv-SE')

function getLatestAnswers(history: AnswerHistory[]) {
  const latest = new Map<string, AnswerHistory>()
  history.forEach(answer => latest.set(answer.questionId, answer))
  return latest
}

function getFieldStats(history: AnswerHistory[]) {
  return allFields.map(field => {
    const questionIds = new Set(questions.filter(question => question.field === field).map(question => question.id))
    const answers = history.filter(answer => questionIds.has(answer.questionId))
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

function getRecommendation(history: AnswerHistory[]) {
  const stats = getFieldStats(history)
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
    const latest = getLatestAnswers(history)
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

function App() {
  const [tab, setTab] = useState<Tab>('home')
  const [history, setHistory] = useState<AnswerHistory[]>(loadHistory)
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const [session, setSession] = useState<PracticeSession | null>(loadSession)
  const [selected, setSelected] = useState<ChoiceKey | null>(null)
  const [confidence, setConfidence] = useState<Confidence>('normal')
  const [result, setResult] = useState(false)
  const start = useRef(Date.now())
  const contentRef = useRef<HTMLElement>(null)
  const sessionQuestionIds = Array.isArray(session?.questionIds) ? session.questionIds : []
  const sessionQuestions = useMemo(() => sessionQuestionIds.map(id => questions.find(question => question.id === id)).filter((question): question is Question => Boolean(question)), [sessionQuestionIds])
  const currentQuestion = sessionQuestions[session?.currentIndex ?? 0]
  const currentQuestionId = currentQuestion?.id

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'auto' })
    contentRef.current?.scrollTo({ top: 0, behavior: 'auto' })
  }

  useEffect(() => saveHistory(history), [history])
  useEffect(() => saveSettings(settings), [settings])
  useEffect(() => saveSession(session), [session])
  useEffect(() => { if (session) setTab('practice') }, [])
  useEffect(() => {
    if (!session) return
    if (sessionQuestions.length === 0 || sessionQuestions.length !== sessionQuestionIds.length || !Number.isInteger(session.currentIndex) || session.currentIndex < 0 || session.currentIndex >= sessionQuestions.length) {
      resetCurrentSession()
      setSession(null)
      setSelected(null)
      setResult(false)
      setTab('practice')
    }
  }, [session, sessionQuestionIds.length, sessionQuestions.length])
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
    const entry: AnswerHistory = {
      id: crypto.randomUUID(),
      questionId: currentQuestion.id,
      selectedAnswer: selected,
      isCorrect,
      confidence,
      elapsedSeconds,
      answeredAt: new Date().toISOString(),
    }
    setHistory(current => [...current, entry])
    setSession(current => current && ({
      ...current,
      correctCount: current.correctCount + (isCorrect ? 1 : 0),
      wrongCount: current.wrongCount + (isCorrect ? 0 : 1),
      elapsedSeconds: current.elapsedSeconds + elapsedSeconds,
      answers: [...current.answers, { questionId: currentQuestion.id, selectedAnswer: selected, isCorrect, confidence, elapsedSeconds }],
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

  const goTab = (id: Tab) => {
    setTab(id)
    if (id !== 'practice') leaveSession()
  }

  const title = session?.finishedAt ? '演習結果' : session ? (session.mode === 'mock-exam' ? '模擬試験モード' : '午前問題 演習') : nav.find(item => item.id === tab)?.label ?? ''

  return (
    <div className={settings.theme === 'dark' ? 'dark bg-[#101713]' : ''}>
      <div className="mx-auto min-h-screen max-w-[480px] bg-paper shadow-2xl dark:bg-[#101713] dark:text-white">
        <header className="safe-top fixed left-1/2 top-0 z-40 flex h-[76px] w-full max-w-[480px] -translate-x-1/2 items-center justify-between border-b border-black/5 bg-paper/95 px-5 backdrop-blur dark:bg-[#101713]/95">
          <div className="flex items-center gap-3">
            {session && (
              <button aria-label="演習を終了" onClick={leaveSession} className="-ml-2 grid size-11 place-items-center rounded-full hover:bg-black/5">
                <ChevronLeft size={22} />
              </button>
            )}
            <div>
              <p className="text-[10px] font-bold tracking-[.18em] text-moss dark:text-lime">AP STUDY</p>
              <h1 className="text-[17px] font-bold tracking-tight">{title}</h1>
            </div>
          </div>
          {session ? (
            <span className="tabular rounded-full bg-white px-3 py-1.5 text-xs font-bold shadow-sm dark:bg-white/10">{session.finishedAt ? '完了' : `${session.currentIndex + 1} / ${session.totalQuestions}`}</span>
          ) : (
            <div className="relative grid size-10 place-items-center rounded-full bg-white shadow-sm dark:bg-white/10">
              <Flame size={19} className="text-orange-500" />
              <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-paper bg-lime" />
            </div>
          )}
        </header>

        <main ref={contentRef} className={`min-w-0 max-w-full overflow-x-hidden px-4 pt-[92px] ${session ? 'pb-[138px]' : 'pb-[104px]'}`}>
          {tab === 'home' && <HomeScreen history={history} onStart={startPractice} onReview={() => setTab('review')} />}
          {tab === 'practice' && (session?.finishedAt ? (
            <ResultScreen
              session={session}
              questions={sessionQuestions}
              onStart={startPractice}
              onHome={() => { leaveSession(); setTab('home') }}
              onAnalytics={() => { leaveSession(); setTab('analytics') }}
            />
          ) : session && currentQuestion ? (
            <>
              {session.mode === 'mock-exam' && <div className="mb-3 flex items-center justify-between rounded-xl bg-white px-4 py-3 text-[11px] font-bold shadow-sm dark:bg-white/5"><span>回答済み {session.answers.length} / {session.totalQuestions}</span><span className="text-slate-400">正解 {session.correctCount}・不正解 {session.wrongCount}</span></div>}
              <QuestionScreen question={currentQuestion} selected={selected} setSelected={setSelected} result={result} confidence={confidence} setConfidence={setConfidence} />
            </>
          ) : <PracticeMenu history={history} onStart={startPractice} />)}
          {tab === 'review' && <ReviewScreen history={history} onStart={startPractice} />}
          {tab === 'analytics' && <Analytics history={history} />}
          {tab === 'settings' && (
            <SettingsScreen
              value={settings}
              onChange={setSettings}
              onReset={() => {
                resetData()
                setHistory([])
                setSettings(loadSettings())
              }}
            />
          )}
        </main>

        {session && !session.finishedAt && tab === 'practice' ? (
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

function HomeScreen({ history, onStart, onReview }: { history: AnswerHistory[]; onStart: (items?: Question[], mode?: PracticeMode) => void; onReview: () => void }) {
  const stats = useMemo(() => getFieldStats(history), [history])
  const latest = useMemo(() => getLatestAnswers(history), [history])
  const accuracy = history.length ? Math.round((history.filter(answer => answer.isCorrect).length / history.length) * 100) : 0
  const todayAnswers = history.filter(answer => answerDateKey(answer.answeredAt) === todayKey()).length
  const reviewQuestions = questions.filter(question => {
    const answer = latest.get(question.id)
    return answer && (!answer.isCorrect || answer.confidence === 'low')
  })
  const ranked = stats.filter(item => item.count > 0)
  const weak = [...ranked].sort((a, b) => a.accuracy - b.accuracy || b.incorrect - a.incorrect).slice(0, 3)
  const strong = [...ranked].sort((a, b) => b.accuracy - a.accuracy || b.count - a.count).slice(0, 3)
  const recommendation = useMemo(() => getRecommendation(history), [history])

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[28px] bg-ink p-5 text-white shadow-card">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-bold text-lime">今日のおすすめ学習</p>
            <h2 className="mt-2 max-w-[280px] text-xl font-bold leading-snug">{recommendation.text}</h2>
          </div>
          <div className="grid size-12 place-items-center rounded-2xl bg-white/10"><Sparkles className="text-lime" /></div>
        </div>
        <button onClick={() => onStart(recommendation.items, recommendation.mode)} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-lime font-bold text-ink">
          <Play size={18} fill="currentColor" />おすすめ演習を始める
        </button>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <SummaryCard label="総回答数" value={`${history.length}問`} icon={BookOpen} />
        <SummaryCard label="全体正答率" value={`${accuracy}%`} icon={Target} />
        <SummaryCard label="今日の回答数" value={`${todayAnswers}問`} icon={Clock3} />
        <button onClick={onReview} className="rounded-2xl bg-white p-4 text-left shadow-sm dark:bg-white/5">
          <div className="flex items-center justify-between text-rose-500"><RotateCcw size={18} /><ChevronRight size={16} /></div>
          <p className="mt-3 text-[10px] font-bold text-slate-400">復習待ち</p>
          <p className="tabular mt-1 text-xl font-bold">{reviewQuestions.length}問</p>
        </button>
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

function PracticeMenu({ history, onStart }: { history: AnswerHistory[]; onStart: (items?: Question[], mode?: PracticeMode) => void }) {
  const latest = useMemo(() => getLatestAnswers(history), [history])
  const recommendation = useMemo(() => getRecommendation(history), [history])
  const wrong = questions.filter(question => latest.get(question.id)?.isCorrect === false)
  const lowConfidence = questions.filter(question => latest.get(question.id)?.confidence === 'low')
  const unanswered = questions.filter(question => !latest.has(question.id))
  const morningQuestions = questions.filter(question => question.examType === 'morning')
  const modes = [
    { title: '今日のおすすめ', description: recommendation.text, icon: Sparkles, items: recommendation.items, mode: recommendation.mode, color: 'bg-lime text-ink' },
    { title: '不正解復習', description: '直近で間違えた問題', icon: X, items: wrong, mode: 'wrong' as PracticeMode, color: 'bg-rose-50 text-rose-600' },
    { title: '自信なし復習', description: '自信なしで回答した問題', icon: CircleHelp, items: lowConfidence, mode: 'low-confidence' as PracticeMode, color: 'bg-amber-50 text-amber-600' },
    { title: '未回答問題', description: 'まだ解いていない問題', icon: Lightbulb, items: unanswered, mode: 'unanswered' as PracticeMode, color: 'bg-sky-50 text-sky-600' },
    { title: 'ランダム10問', description: '全分野からランダムに出題', icon: RotateCcw, items: shuffle(questions).slice(0, 10), mode: 'random-10' as PracticeMode, color: 'bg-violet-50 text-violet-600' },
    { title: '模擬試験モード', description: `午前問題から${Math.min(10, morningQuestions.length)}問`, icon: ClipboardCheck, items: shuffle(morningQuestions).slice(0, 10), mode: 'mock-exam' as PracticeMode, color: 'bg-emerald-50 text-emerald-600' },
  ]
  return (
    <div className="space-y-4">
      <section className="rounded-[28px] bg-ink p-5 text-white">
        <p className="text-[11px] font-bold text-lime">PRACTICE MODE</p>
        <h2 className="mt-2 text-xl font-bold">目的に合わせて演習</h2>
        <p className="mt-2 text-xs leading-relaxed text-white/60">復習状況や学習ペースに合う問題セットを選べます。</p>
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

function ResultScreen({ session, questions: sessionQuestions, onStart, onHome, onAnalytics }: { session: PracticeSession; questions: Question[]; onStart: (items: Question[], mode: PracticeMode) => void; onHome: () => void; onAnalytics: () => void }) {
  const accuracy = session.totalQuestions ? Math.round((session.correctCount / session.totalQuestions) * 100) : 0
  const wrongIds = new Set(session.answers.filter(answer => !answer.isCorrect).map(answer => answer.questionId))
  const lowConfidenceIds = new Set(session.answers.filter(answer => answer.confidence === 'low').map(answer => answer.questionId))
  const wrongQuestions = sessionQuestions.filter(question => wrongIds.has(question.id))
  const lowConfidenceQuestions = sessionQuestions.filter(question => lowConfidenceIds.has(question.id))
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
      <section className="rounded-[22px] bg-lime/30 p-4"><p className="flex items-center gap-2 text-xs font-bold text-moss dark:text-lime"><Sparkles size={17} />復習おすすめ</p><p className="mt-2 text-sm font-bold leading-relaxed">{recommendation}</p></section>
      <div className="space-y-2">
        <button disabled={!wrongQuestions.length} onClick={() => onStart(wrongQuestions, 'wrong')} className="h-12 w-full rounded-xl bg-ink text-sm font-bold text-white disabled:bg-slate-200 disabled:text-slate-400 dark:bg-lime dark:text-ink">間違えた問題だけ復習</button>
        <button disabled={!lowConfidenceQuestions.length} onClick={() => onStart(lowConfidenceQuestions, 'low-confidence')} className="h-12 w-full rounded-xl border border-ink text-sm font-bold disabled:border-slate-200 disabled:text-slate-400 dark:border-lime">自信なし問題だけ復習</button>
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

function QuestionScreen({ question, selected, setSelected, result, confidence, setConfidence }: { question: Question; selected: ChoiceKey | null; setSelected: (key: ChoiceKey) => void; result: boolean; confidence: Confidence; setConfidence: (value: Confidence) => void }) {
  const selectedChoice = question.choices.find(choice => choice.key === selected)
  const correctChoice = question.choices.find(choice => choice.key === question.correctAnswer)
  return (
    <div className="space-y-4">
      <section className="rounded-[24px] bg-white p-5 shadow-card dark:bg-white/5">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${fieldColor[question.field] ?? 'bg-slate-100 text-slate-600'}`}>{question.field}</span>
          <span className="text-[10px] font-medium text-slate-400">{question.subField}</span>
          <span className="ml-auto text-[10px] text-slate-400">問{question.questionNumber}</span>
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
            <p className="font-bold text-slate-500 dark:text-slate-300">出典</p>
            <a href={question.sourceUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-moss underline dark:text-lime">{question.sourceName}</a>
            <p className="mt-2">{question.isQuoteFromIpa ? '問題文・選択肢はIPA公開問題からの引用です。解説はAP Studyによる独自作成です。' : '問題文・選択肢・解説はAP Studyによる独自作成です。IPAシラバスを出題範囲の参考にしています。'}</p>
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

function ReviewScreen({ history, onStart }: { history: AnswerHistory[]; onStart: (items: Question[], mode?: PracticeMode) => void }) {
  const latest = useMemo(() => getLatestAnswers(history), [history])
  const stats = useMemo(() => getFieldStats(history), [history])
  const weakFields = new Set(stats.filter(item => item.count > 0 && item.accuracy < 60).map(item => item.field))
  const filters = [
    { title: '不正解のみ', mode: 'wrong' as PracticeMode, description: '最後の解答が不正解だった問題', icon: X, items: questions.filter(question => latest.get(question.id)?.isCorrect === false), color: 'bg-rose-50 text-rose-600' },
    { title: '自信なしのみ', mode: 'low-confidence' as PracticeMode, description: '自信なしで回答した問題', icon: CircleHelp, items: questions.filter(question => latest.get(question.id)?.confidence === 'low'), color: 'bg-amber-50 text-amber-600' },
    { title: '苦手分野のみ', mode: 'field' as PracticeMode, description: '正答率60%未満の分野', icon: TrendingUp, items: questions.filter(question => weakFields.has(question.field)), color: 'bg-violet-50 text-violet-600' },
    { title: '未回答のみ', mode: 'unanswered' as PracticeMode, description: 'まだ一度も解いていない問題', icon: Sparkles, items: questions.filter(question => !latest.has(question.id)), color: 'bg-sky-50 text-sky-600' },
  ]

  return (
    <div className="space-y-4">
      <section className="rounded-[24px] bg-ink p-5 text-white">
        <div className="flex items-center gap-3"><div className="grid size-11 place-items-center rounded-xl bg-lime text-ink"><RotateCcw size={22} /></div><div><p className="text-[10px] font-bold text-lime">REVIEW</p><h2 className="font-bold">復習対象を絞り込む</h2></div></div>
        <p className="mt-4 text-xs leading-relaxed text-white/60">直近の解答結果と自信度から、今取り組む問題を選べます。</p>
      </section>
      {filters.map(({ title, description, icon: Icon, items, mode, color }) => (
        <section key={title} className="rounded-[22px] bg-white p-4 shadow-sm dark:bg-white/5">
          <div className="flex items-center gap-3"><div className={`grid size-10 place-items-center rounded-xl ${color}`}><Icon size={19} /></div><div className="min-w-0 flex-1"><h3 className="text-sm font-bold">{title}</h3><p className="mt-0.5 text-[10px] text-slate-400">{description}</p></div><span className="tabular text-sm font-bold">{items.length}問</span></div>
          <button disabled={!items.length} onClick={() => onStart(items, mode)} className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-ink text-xs font-bold text-white disabled:bg-slate-100 disabled:text-slate-400 dark:bg-lime dark:text-ink dark:disabled:bg-white/10 dark:disabled:text-slate-500">この条件で演習する<ChevronRight size={16} /></button>
        </section>
      ))}
    </div>
  )
}

function Analytics({ history }: { history: AnswerHistory[] }) {
  const data = useMemo(() => getFieldStats(history), [history])
  const studyDays = new Set(history.map(answer => answerDateKey(answer.answeredAt))).size
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3"><SummaryCard icon={Flame} label="学習日数" value={`${studyDays}日`} /><SummaryCard icon={BookOpen} label="総回答数" value={`${history.length}問`} /></div>
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
      <div className="rounded-[24px] bg-white p-5 dark:bg-white/5">
        <div className="flex items-center gap-2 font-bold"><LockKeyhole size={18} className="text-moss dark:text-lime" />データ管理</div>
        <p className="mt-2 text-[11px] leading-relaxed text-slate-400">学習データはこの端末のブラウザ内に保存されています。</p>
        {confirm ? <div className="mt-4 rounded-xl bg-rose-50 p-3"><p className="text-xs font-bold text-rose-600">本当にすべて削除しますか？</p><div className="mt-3 flex gap-2"><button onClick={() => setConfirm(false)} className="h-10 flex-1 rounded-lg bg-white text-xs font-bold">キャンセル</button><button onClick={() => { onReset(); setConfirm(false) }} className="h-10 flex-1 rounded-lg bg-rose-500 text-xs font-bold text-white">削除する</button></div></div> : <button onClick={() => setConfirm(true)} className="mt-4 h-11 w-full rounded-xl border border-rose-200 text-xs font-bold text-rose-500">学習データをリセット</button>}
      </div>
      <div className="pb-3 text-center"><p className="text-xs font-bold text-slate-500">AP Study {APP_VERSION}</p><p className="mt-1 text-[10px] text-slate-400">Local data only</p></div>
    </div>
  )
}

function SettingCard({ title, icon: Icon, children }: { title: string; icon: typeof Home; children: React.ReactNode }) {
  return <section className="min-w-0 max-w-full overflow-hidden rounded-[24px] bg-white p-5 shadow-sm dark:bg-white/5"><div className="mb-5 flex items-center gap-2 font-bold"><Icon size={18} className="text-moss dark:text-lime" />{title}</div>{children}</section>
}

export default App
