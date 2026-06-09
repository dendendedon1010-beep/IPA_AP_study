import { FIELDS } from '../../../fields.js'
import type { ChoiceKey, Question } from '../../../../types.js'

const choiceKeys: ChoiceKey[] = ['ア', 'イ', 'ウ', 'エ']
type Seed = { number: number; field: Question['field']; subField: string; text: string; choices: [string, string, string, string]; answer: ChoiceKey; reasons: [string, string, string, string]; points: string[]; keywords: string[]; tables?: Question['tables'] }
const questionPdfUrl = 'https://www.ipa.go.jp/shiken/mondai-kaiotu/gmcbt80000008smf-att/2022r04a_ap_am_qs.pdf'

const seeds: Seed[] = [
  {
    number: 58, field: FIELDS.systemAudit, subField: 'ISMS内部監査',
    text: 'JIS Q 27001:2014（情報セキュリティマネジメントシステム－要求事項）に基づいてISMS内部監査を行った結果として判明した状況のうち，監査人が，指摘事項として監査報告書に記載すべきものはどれか。',
    choices: ['USBメモリの使用を，定められた手順に従って許可していた。', '個人情報の誤廃棄事故を主務官庁などに，規定されたとおりに報告していた。', 'マルウェアスキャンでスパイウェアが検知され，駆除されていた。', 'リスクアセスメントを実施した後に，リスク受容基準を決めていた。'], answer: 'エ',
    reasons: ['定めた手順に従った許可であり，不適合を示さない。', '規定どおりの事故報告であり，不適合を示さない。', '検知したマルウェアを駆除しており，管理策が機能している。', 'リスク受容基準はリスクアセスメント実施前に確立すべきであり，順序が不適切である。'],
    points: ['監査では要求事項や組織の手順への不適合を指摘する。'], keywords: ['ISMS', '内部監査', 'リスク受容基準'],
  },
  {
    number: 59, field: FIELDS.systemAudit, subField: '監査手続',
    text: 'システム監査における“監査手続”として，最も適切なものはどれか。',
    choices: ['監査計画の立案や監査業務の進捗管理を行うための手順', '監査結果を受けて，監査報告書に監査人の結論や指摘事項を記述する手順', '監査項目について，十分かつ適切な証拠を入手するための手順', '監査テーマに合わせて，監査チームを編成する手順'], answer: 'ウ',
    reasons: ['監査計画・進捗管理の説明であり，証拠を得る監査手続そのものではない。', '監査報告の作成手順である。', '監査手続は監査証拠を入手するために実施する具体的な手順である。', '監査体制を整える手順である。'],
    points: ['監査手続の目的は十分かつ適切な監査証拠の入手である。'], keywords: ['監査手続', '監査証拠'],
  },
  {
    number: 60, field: FIELDS.systemAudit, subField: 'システム監査基準',
    text: 'システム監査基準の意義はどれか。',
    choices: ['システム監査業務の品質を確保し，有効かつ効率的な監査を実現するためのシステム監査人の行為規範となるもの', 'システム監査の信頼性を保つために，システム監査人が保持すべき情報システム及びシステム監査に関する専門的知識・技能の水準を定めたもの', '情報システムのガバナンス，マネジメント，コントロールを点検・評価・検証する際の判断の尺度となるもの', 'どのような組織体においても情報システムの管理において共通して留意すべき基本事項を体系化・一般化したもの'], answer: 'ア',
    reasons: ['システム監査基準は監査の品質と有効性・効率性を確保するための監査人の行為規範である。', '監査人の知識・技能だけの水準を定めるものではない。', '監査対象の判断尺度を示す説明はシステム管理基準に近い。', '情報システム管理の共通事項を体系化したものはシステム管理基準である。'],
    points: ['システム監査基準は監査人が守るべき行為規範である。'], keywords: ['システム監査基準', '行為規範'],
  },
  {
    number: 61, field: FIELDS.strategy, subField: '事業継続',
    text: 'BCPの説明はどれか。',
    choices: ['企業の戦略を実現するために，財務，顧客，内部ビジネスプロセス，学習と成長という四つの視点から戦略を検討したもの', '企業の目標を達成するために，業務内容や業務の流れを可視化し，一定のサイクルをもって継続的に業務プロセスを改善するもの', '業務効率の向上，業務コストの削減を目的に，業務プロセスを対象としてアウトソースを実施するもの', '事業の中断・阻害に対応し，事業を復旧し，再開し，あらかじめ定められたレベルに回復するように組織を導く手順を文書化したもの'], answer: 'エ',
    reasons: ['四つの視点を用いるのはバランススコアカードである。', '業務プロセスを継続的に改善する説明であり，BCPではない。', '業務プロセスの外部委託を示すBPOの説明である。', 'BCPは中断時の復旧・再開と目標水準への回復手順を定める。'],
    points: ['BCPは事業中断への備えと復旧手順を文書化する。'], keywords: ['BCP', '事業継続計画'],
  },
  {
    number: 62, field: FIELDS.strategy, subField: 'DX推進',
    text: '経済産業省が取りまとめた“デジタル経営改革のための評価指標（DX推進指標）”によれば，DXを実現する上で基盤となるITシステムの構築に関する指標において，“ITシステムに求められる要素”について経営者が確認すべき事項はどれか。',
    choices: ['ITシステムの全体設計や協働できるベンダーの選定などを行える人材を育成・確保できているか。', '環境変化に迅速に対応し，求められるデリバリースピードに対応できるITシステムとなっているか。', 'データ処理において，リアルタイム性よりも，ビッグデータの蓄積と事後の分析が重視されているか。', 'データを迅速に活用するために，全体最適よりも，個別最適を志向したITシステムとなっているか。'], answer: 'イ',
    reasons: ['人材の育成・確保に関する確認事項であり，ITシステム自体に求める要素ではない。', '変化と必要なデリバリースピードへ迅速に対応できることが求められる。', '事後分析だけを優先するのではなく，必要に応じた迅速なデータ活用が重要である。', '個別最適ではなく全体最適を志向する必要がある。'],
    points: ['DX基盤には変化への迅速な追従性が必要である。'], keywords: ['DX推進指標', 'デリバリースピード'],
  },
  {
    number: 63, field: FIELDS.strategy, subField: 'エンタープライズアーキテクチャ',
    text: 'エンタープライズアーキテクチャ（EA）を説明したものはどれか。',
    choices: ['オブジェクト指向設計を支援する様々な手法を統一して標準化したものであり，クラス図などの構造図と，ユースケース図などの振る舞い図によって，システムの分析や設計を行うものである。', '概念データモデルを，エンティティとリレーションシップとで表現することによって，データ構造やデータ項目間の関係を明らかにするものである。', '各業務や情報システムなどを，ビジネスアーキテクチャ，データアーキテクチャ，アプリケーションアーキテクチャ，テクノロジアーキテクチャの四つの体系で分析し，全体最適化の観点から見直すものである。', '企業のビジネスプロセスを，データフロー，プロセス，ファイル，データ源泉／データ吸収の四つの基本要素で抽象化して表現するものである。'], answer: 'ウ',
    reasons: ['UMLの説明である。', 'ERモデルの説明である。', 'EAは業務・データ・アプリケーション・テクノロジの体系で全体最適を図る。', 'DFDの説明である。'],
    points: ['EAは組織全体を複数のアーキテクチャ体系で整理する。'], keywords: ['EA', '全体最適', 'アーキテクチャ'],
  },
  {
    number: 64, field: FIELDS.strategy, subField: '投資評価',
    text: '投資効果を正味現在価値法で評価するとき，最も投資効果が大きい（又は最も損失が小さい）シナリオはどれか。ここで，期間は3年間，割引率は5%とし，各シナリオのキャッシュフローは表のとおりとする。',
    choices: ['A', 'B', 'C', '投資をしない'], answer: 'イ',
    reasons: ['回収額が後半に偏るので，同じ総回収額でも現在価値はBより小さくなる。', '各案の投資額と総回収額は同じだが，Bは回収額が早い時期に多く，割引後の現在価値が最大になる。', '回収額が毎年均等なので，早期回収が多いBより現在価値は小さくなる。', 'Bの正味現在価値は正であり，投資をしない場合の正味現在価値0より大きい。'],
    points: ['同額のキャッシュフローは，受取り時期が早いほど現在価値が大きい。'], keywords: ['正味現在価値法', 'NPV', 'キャッシュフロー', '割引率'],
    tables: [{
      caption: 'シナリオ別キャッシュフロー（単位：万円）',
      headers: ['シナリオ', '投資額', '回収額 1年目', '回収額 2年目', '回収額 3年目'],
      rows: [['A', '220', '40', '80', '120'], ['B', '220', '120', '80', '40'], ['C', '220', '80', '80', '80'], ['投資をしない', '0', '0', '0', '0']],
      sourceName: '情報処理推進機構（IPA） 応用情報技術者試験 令和4年度 秋期 午前 問64',
      sourceUrl: questionPdfUrl,
    }],
  },
  {
    number: 65, field: FIELDS.strategy, subField: 'リスク対応',
    text: '組込み機器のハードウェアの製造を外部に委託する場合のコンティンジェンシープランの記述として，適切なものはどれか。',
    choices: ['実績のある外注先の利用によって，リスクの発生確率を低減する。', '製造品質が担保されていることを確認できるように委託先と契約する。', '複数の会社の見積りを比較検討して，委託先を選定する。', '部品調達のリスクが顕在化したときに備えて，対処するための計画を策定する。'], answer: 'エ',
    reasons: ['リスク発生確率を下げる予防策であり，発生後の対応計画ではない。', '品質を確保する契約上の管理策である。', '調達先選定の手続である。', 'リスクが顕在化した場合の具体的な対処計画がコンティンジェンシープランである。'],
    points: ['コンティンジェンシープランはリスク発生後の代替・復旧対応を定める。'], keywords: ['コンティンジェンシープラン', 'リスク対応'],
  },
]

const createQuestion = (seed: Seed): Question => ({
  id: `ap-r04-autumn-am-q${String(seed.number).padStart(3, '0')}`,
  examYear: 2022, examSeason: '秋期', examType: 'morning', questionNumber: seed.number,
  field: seed.field, subField: seed.subField, questionText: seed.text,
  tables: seed.tables,
  choices: seed.choices.map((text, index) => ({ key: choiceKeys[index], text })),
  correctAnswer: seed.answer,
  officialAnswerText: `${seed.answer}：${seed.choices[choiceKeys.indexOf(seed.answer)]}`,
  sourceName: `情報処理推進機構（IPA） 応用情報技術者試験 令和4年度 秋期 午前 問${seed.number}`,
  sourceUrl: questionPdfUrl, isQuoteFromIpa: true,
  explanation: { correctReason: seed.reasons[choiceKeys.indexOf(seed.answer)], wrongReasons: Object.fromEntries(choiceKeys.map((key, index) => [key, seed.reasons[index]])), points: seed.points, keywords: seed.keywords, isAiGenerated: false },
})

export const r04AutumnMorningQuestions: Question[] = seeds.map(createQuestion)
