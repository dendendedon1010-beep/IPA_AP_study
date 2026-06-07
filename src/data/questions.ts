import { FIELDS } from './fields.js'
import type { FieldName } from './fields.js'
import type { Choice, ChoiceKey, Question } from '../types'

const ipaPastQuestionUrl = 'https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06a_ap_am_qs.pdf'
const syllabusUrl = 'https://www.ipa.go.jp/shiken/syllabus/gaiyou.html'

interface QuestionSeed {
  id: string
  legacyId?: string
  questionNumber: number
  field: FieldName
  subField: string
  questionText: string
  choices: [string, string, string, string]
  correctAnswer: ChoiceKey
  correctReason: string
  wrongReasons: Partial<Record<ChoiceKey, string>>
  points: string[]
  keywords: string[]
  quoted?: boolean
}

const keys: ChoiceKey[] = ['ア', 'イ', 'ウ', 'エ']

const createQuestion = (seed: QuestionSeed): Question => {
  const choices: Choice[] = seed.choices.map((text, index) => ({ key: keys[index], text }))
  const correctChoice = choices.find(choice => choice.key === seed.correctAnswer)
  return {
    id: seed.id,
    legacyIds: seed.legacyId ? [seed.legacyId] : undefined,
    examYear: seed.quoted ? 2024 : 2026,
    examSeason: seed.quoted ? '秋期' : '春期',
    examType: 'morning',
    questionNumber: seed.questionNumber,
    field: seed.field,
    subField: seed.subField,
    questionText: seed.questionText,
    choices,
    correctAnswer: seed.correctAnswer,
    officialAnswerText: `${seed.correctAnswer}：${correctChoice?.text ?? ''}`,
    sourceName: seed.quoted ? '情報処理推進機構（IPA）令和6年度秋期 午前問題' : 'AP Study オリジナル問題（IPA APシラバス準拠）',
    sourceUrl: seed.quoted ? ipaPastQuestionUrl : syllabusUrl,
    isQuoteFromIpa: Boolean(seed.quoted),
    explanation: {
      correctReason: seed.correctReason,
      wrongReasons: seed.wrongReasons,
      points: seed.points,
      keywords: seed.keywords,
      isAiGenerated: false,
    },
  }
}

export const questions: Question[] = [
  createQuestion({
    id: 'ap-r06-autumn-am-q006', legacyId: 'r6a-06', questionNumber: 6, field: FIELDS.basicTheory, subField: 'アルゴリズム', quoted: true,
    questionText: '自然数をキーとするデータを、ハッシュ表を用いて管理する。キー n をハッシュ関数 h(n) = n mod m で変換した値を格納位置とするとき、衝突するキーの組合せはどれか。ここで、m はハッシュ表の大きさである。',
    choices: ['n と n＋1', 'n と n＋m', 'n と n×m', 'n と m－n'], correctAnswer: 'イ',
    correctReason: 'n と n＋m をmで割った余りは同じなので、同じ格納位置に変換されます。',
    wrongReasons: { ア: '連続する二つの数は通常、余りが1ずれます。', ウ: 'n×mの余りは常に0で、nの余りとは一般に一致しません。', エ: 'm－nの余りはnと一般に一致しません。' },
    points: ['剰余法では、二つのキーの差が表サイズmの倍数なら衝突する。'], keywords: ['ハッシュ法', '剰余', 'シノニム'],
  }),
  createQuestion({
    id: 'ap-r06-autumn-am-q007', legacyId: 'r6a-07', questionNumber: 7, field: FIELDS.systemDevelopment, subField: 'プログラム言語', quoted: true,
    questionText: '統計解析や機械学習で広く利用され、ベクトルや行列を扱う機能、豊富な統計関数及びグラフ作成機能を備えるオープンソースのプログラム言語はどれか。',
    choices: ['Go', 'Kotlin', 'R', 'Scala'], correctAnswer: 'ウ',
    correctReason: 'Rは統計計算とグラフィックスのために設計され、データ分析で広く使われる言語です。',
    wrongReasons: { ア: 'Goは並行処理やサーバ開発に強い汎用言語です。', イ: 'KotlinはJVM上で動作し、Android開発などに使われます。', エ: 'Scalaはオブジェクト指向と関数型を統合したJVM言語です。' },
    points: ['統計解析・可視化・豊富なパッケージといえばR。'], keywords: ['R言語', '統計解析', 'オープンソース'],
  }),
  createQuestion({
    id: 'ap-r06-autumn-am-q020', legacyId: 'r6a-20', questionNumber: 20, field: FIELDS.computerSystems, subField: 'システム構成', quoted: true,
    questionText: 'システムの信頼性を高めるために、現用系と待機系の二つの系統を用意し、現用系に障害が発生したときに待機系へ切り替える構成はどれか。',
    choices: ['デュアルシステム', 'デュプレックスシステム', 'スタンバイシステム', 'マルチプロセッサシステム'], correctAnswer: 'ウ',
    correctReason: '現用系と待機系を用意して障害時に切り替える構成はスタンバイシステムです。',
    wrongReasons: { ア: 'デュアルシステムは二系統で同じ処理を行い、結果を照合します。', イ: 'デュプレックスは二重化の総称で、設問の特徴を直接示すのはスタンバイです。', エ: '複数CPUで処理する構成であり、現用・待機の切替を表しません。' },
    points: ['現用系＋待機系＝スタンバイ、両系同時処理・照合＝デュアル。'], keywords: ['信頼性', '冗長化', 'フェールオーバー'],
  }),
  createQuestion({
    id: 'ap-r06-autumn-am-q029', legacyId: 'r6a-29', questionNumber: 29, field: FIELDS.database, subField: 'トランザクション', quoted: true,
    questionText: 'データベースのトランザクションが備えるべきACID特性のうち、一連の処理が全て実行されるか、全く実行されないかのいずれかになることを示す特性はどれか。',
    choices: ['一貫性（Consistency）', '原子性（Atomicity）', '分離性（Isolation）', '永続性（Durability）'], correctAnswer: 'イ',
    correctReason: '原子性はトランザクションを不可分な単位として扱い、全て成功するか全て取り消すかを保証します。',
    wrongReasons: { ア: '一貫性は処理前後で整合性制約が保たれる性質です。', ウ: '分離性は同時実行するトランザクションが互いに影響しない性質です。', エ: '永続性はコミット後の結果が障害後も失われない性質です。' },
    points: ['All or NothingはAtomicity（原子性）。'], keywords: ['ACID', 'トランザクション', 'ロールバック'],
  }),
  createQuestion({
    id: 'ap-r06-autumn-am-q035', legacyId: 'r6a-35', questionNumber: 35, field: FIELDS.network, subField: 'TCP/IP', quoted: true,
    questionText: 'IPv4ネットワークにおいて、IPアドレスからMACアドレスを得るために使用するプロトコルはどれか。',
    choices: ['DHCP', 'DNS', 'ICMP', 'ARP'], correctAnswer: 'エ',
    correctReason: 'ARPは同一ネットワーク上のIPv4アドレスに対応するMACアドレスを問い合わせるプロトコルです。',
    wrongReasons: { ア: 'DHCPはIPアドレスなどの設定を自動配布します。', イ: 'DNSはホスト名とIPアドレスを対応付けます。', ウ: 'ICMPはエラー通知や到達確認などに使われます。' },
    points: ['IPv4→MACはARP、ホスト名→IPはDNS。'], keywords: ['ARP', 'MACアドレス', 'IPv4'],
  }),
  createQuestion({
    id: 'ap-r06-autumn-am-q042', legacyId: 'r6a-42', questionNumber: 42, field: FIELDS.security, subField: '暗号・認証', quoted: true,
    questionText: 'ディジタル署名を利用する主な目的として、適切なものはどれか。',
    choices: ['通信内容を第三者に読まれないようにする', '送信者の真正性とデータの改ざん有無を確認する', '通信経路上の伝送速度を高める', 'データを圧縮して保存容量を減らす'], correctAnswer: 'イ',
    correctReason: 'ディジタル署名は署名者の真正性とデータの完全性を検証できます。',
    wrongReasons: { ア: '秘匿性の確保は主に暗号化の役割です。', ウ: '署名は伝送速度を高める仕組みではありません。', エ: '署名は圧縮を目的としません。' },
    points: ['署名＝真正性・完全性・否認防止、暗号化＝機密性。'], keywords: ['ディジタル署名', '公開鍵暗号', 'ハッシュ'],
  }),
  createQuestion({
    id: 'ap-r06-autumn-am-q053', legacyId: 'r6a-53', questionNumber: 53, field: FIELDS.projectManagement, subField: '進捗管理', quoted: true,
    questionText: 'プロジェクトの進捗管理にEVMを用いる。計画価値PVが100万円、出来高EVが80万円、実コストACが90万円のとき、コスト効率指数CPIは幾らか。',
    choices: ['0.89', '0.90', '1.11', '1.13'], correctAnswer: 'ア',
    correctReason: 'CPIはEV÷ACなので、80÷90＝約0.89です。1未満はコスト超過を示します。',
    wrongReasons: { イ: 'PVとACを使った比率であり、CPIではありません。', ウ: 'AC÷EVと逆に計算しています。', エ: 'CPIの式EV÷ACから得られない値です。' },
    points: ['CPI＝EV÷AC、SPI＝EV÷PV。1以上なら効率良好。'], keywords: ['EVM', 'CPI', 'コスト管理'],
  }),
  createQuestion({
    id: 'ap-r06-autumn-am-q065', legacyId: 'r6a-65', questionNumber: 65, field: FIELDS.strategy, subField: '経営分析', quoted: true,
    questionText: '企業の内部環境における強みと弱み、外部環境における機会と脅威を整理して戦略を検討する手法はどれか。',
    choices: ['PPM', 'バリューチェーン分析', 'SWOT分析', 'ファイブフォース分析'], correctAnswer: 'ウ',
    correctReason: 'SWOT分析はStrengths、Weaknesses、Opportunities、Threatsの四視点で環境を整理します。',
    wrongReasons: { ア: 'PPMは市場成長率と相対的市場占有率で事業を分析します。', イ: 'バリューチェーン分析は企業活動を分けて価値の源泉を分析します。', エ: 'ファイブフォース分析は業界の競争要因を五つの力で分析します。' },
    points: ['内部＝S/W、外部＝O/T。'], keywords: ['SWOT', '経営戦略', '環境分析'],
  }),
  createQuestion({
    id: 'ap-r08-spring-am-q101', legacyId: 'v110-sec-01', questionNumber: 101, field: FIELDS.security, subField: 'アクセス制御',
    questionText: '利用者に業務上必要な最小限の権限だけを付与する考え方はどれか。',
    choices: ['最小権限の原則', '職務分離の原則', '多層防御', 'フェールセーフ'], correctAnswer: 'ア',
    correctReason: '最小権限の原則は、業務に必要な範囲だけ権限を与えて被害範囲を抑える考え方です。',
    wrongReasons: { イ: '職務分離は重要な作業を複数人・複数職務に分ける考え方です。', ウ: '多層防御は複数の防御策を組み合わせます。', エ: 'フェールセーフは障害時に安全側へ移行させる設計です。' },
    points: ['権限は必要最小限にし、不要になったら速やかに剥奪する。'], keywords: ['最小権限', 'アクセス制御', '権限管理'],
  }),
  createQuestion({
    id: 'ap-r08-spring-am-q102', legacyId: 'v110-sec-02', questionNumber: 102, field: FIELDS.security, subField: '攻撃手法',
    questionText: 'Webアプリケーションで、入力値をSQL文の一部として不正に解釈させる攻撃はどれか。',
    choices: ['クロスサイトスクリプティング', 'SQLインジェクション', 'CSRF', 'DNSキャッシュポイズニング'], correctAnswer: 'イ',
    correctReason: 'SQLインジェクションは入力欄などからSQL構文を混入させ、DBを不正操作する攻撃です。',
    wrongReasons: { ア: 'XSSはブラウザ上で不正スクリプトを実行させます。', ウ: 'CSRFはログイン済み利用者に意図しない操作を実行させます。', エ: 'DNSキャッシュポイズニングはDNS情報を偽装します。' },
    points: ['対策の基本はプレースホルダを用いたパラメータ化クエリ。'], keywords: ['SQLインジェクション', 'プレースホルダ', '入力検証'],
  }),
  createQuestion({
    id: 'ap-r08-spring-am-q103', legacyId: 'v110-sec-03', questionNumber: 103, field: FIELDS.security, subField: '認証',
    questionText: 'パスワードに加えて、スマートフォンに表示されたワンタイムコードを使う認証はどれか。',
    choices: ['シングルサインオン', '多要素認証', '生体認証', 'リスクベース認証'], correctAnswer: 'イ',
    correctReason: '知識情報のパスワードと、所持情報の端末を組み合わせるので多要素認証です。',
    wrongReasons: { ア: 'SSOは一度の認証で複数サービスを利用する仕組みです。', ウ: '生体認証は指紋など身体的特徴を使います。', エ: 'リスクベース認証は状況に応じて認証強度を変えます。' },
    points: ['二段階でも同じ要素だけなら多要素とは限らない。'], keywords: ['多要素認証', '知識情報', '所持情報'],
  }),
  createQuestion({
    id: 'ap-r08-spring-am-q104', legacyId: 'v110-net-01', questionNumber: 104, field: FIELDS.network, subField: 'IPアドレス',
    questionText: 'IPv4アドレス192.168.10.0/24のネットワークで、通常ホストに割り当てられるアドレス数は幾つか。',
    choices: ['254', '255', '256', '510'], correctAnswer: 'ア',
    correctReason: '/24ではホスト部が8ビットなので256個あり、ネットワークアドレスとブロードキャストアドレスを除くと254個です。',
    wrongReasons: { イ: '予約される2アドレスのうち一方しか除いていません。', ウ: '全アドレス数であり、予約アドレスを含みます。', エ: '/23の場合に近い値です。' },
    points: ['通常の利用可能ホスト数は2のホスト部ビット数乗－2。'], keywords: ['CIDR', 'サブネット', 'IPv4'],
  }),
  createQuestion({
    id: 'ap-r08-spring-am-q105', legacyId: 'v110-net-02', questionNumber: 105, field: FIELDS.network, subField: 'プロトコル',
    questionText: 'HTTPSで、Webサーバとブラウザ間の通信を暗号化するために主に利用されるプロトコルはどれか。',
    choices: ['FTP', 'TLS', 'SNMP', 'NTP'], correctAnswer: 'イ',
    correctReason: 'HTTPSはHTTPをTLSで保護し、通信の機密性と完全性を確保します。',
    wrongReasons: { ア: 'FTPはファイル転送用です。', ウ: 'SNMPはネットワーク機器の監視・管理用です。', エ: 'NTPは時刻同期用です。' },
    points: ['HTTPS＝HTTP over TLS。'], keywords: ['HTTPS', 'TLS', 'サーバ証明書'],
  }),
  createQuestion({
    id: 'ap-r08-spring-am-q106', legacyId: 'v110-db-01', questionNumber: 106, field: FIELDS.database, subField: '正規化',
    questionText: '関係データベースの第1正規形で排除されるものはどれか。',
    choices: ['部分関数従属', '推移的関数従属', '繰返し項目', '外部キー'], correctAnswer: 'ウ',
    correctReason: '第1正規形では各属性を単一値にし、繰返し項目や配列的な値を排除します。',
    wrongReasons: { ア: '部分関数従属の排除は第2正規形です。', イ: '推移的関数従属の排除は第3正規形です。', エ: '外部キーは表間の参照関係に使われます。' },
    points: ['第1＝繰返し、第2＝部分従属、第3＝推移従属を排除。'], keywords: ['正規化', '第1正規形', '関数従属'],
  }),
  createQuestion({
    id: 'ap-r08-spring-am-q107', legacyId: 'v110-db-02', questionNumber: 107, field: FIELDS.database, subField: 'SQL',
    questionText: 'SQLで、重複する行を除いて検索結果を返すためにSELECT句で指定する語はどれか。',
    choices: ['UNIQUE KEY', 'DISTINCT', 'GROUP ONLY', 'EXCEPT'], correctAnswer: 'イ',
    correctReason: 'SELECT DISTINCT 列名とすると、指定列の値が重複する行をまとめて返します。',
    wrongReasons: { ア: 'UNIQUEは主に制約や索引で重複を防ぐために使います。', ウ: 'GROUP ONLYというSQL句はありません。', エ: 'EXCEPTは二つの検索結果の差集合を求めます。' },
    points: ['結果の重複排除はDISTINCT。'], keywords: ['SQL', 'DISTINCT', 'SELECT'],
  }),
  createQuestion({
    id: 'ap-r08-spring-am-q108', legacyId: 'v110-dev-01', questionNumber: 108, field: FIELDS.systemDevelopment, subField: 'テスト',
    questionText: 'プログラム内部の分岐や命令の実行経路を考慮してテストケースを設計する手法はどれか。',
    choices: ['ブラックボックステスト', 'ホワイトボックステスト', '受入テスト', '回帰テスト'], correctAnswer: 'イ',
    correctReason: 'ホワイトボックステストは内部構造を見て、命令網羅や分岐網羅などを確認します。',
    wrongReasons: { ア: 'ブラックボックステストは入出力仕様に着目します。', ウ: '受入テストは利用者側が要求を満たすか確認します。', エ: '回帰テストは変更による既存機能への影響を確認します。' },
    points: ['内部構造＝ホワイト、仕様上の入出力＝ブラック。'], keywords: ['ホワイトボックス', '分岐網羅', 'テスト'],
  }),
  createQuestion({
    id: 'ap-r08-spring-am-q109', legacyId: 'v110-dev-02', questionNumber: 109, field: FIELDS.systemDevelopment, subField: '開発手法',
    questionText: '短い期間で反復的に開発し、利用者のフィードバックを取り込みながら価値を届ける考え方はどれか。',
    choices: ['ウォーターフォール開発', 'アジャイル開発', 'リバースエンジニアリング', 'リエンジニアリング'], correctAnswer: 'イ',
    correctReason: 'アジャイル開発は短い反復単位で動く成果を作り、変化やフィードバックへ適応します。',
    wrongReasons: { ア: 'ウォーターフォールは工程を順に進める考え方です。', ウ: 'リバースエンジニアリングは既存成果物から仕様などを分析します。', エ: 'リエンジニアリングは既存システムを再構築・改善します。' },
    points: ['反復・継続的な価値提供・変化への適応がアジャイルの要点。'], keywords: ['アジャイル', 'イテレーション', 'フィードバック'],
  }),
  createQuestion({
    id: 'ap-r08-spring-am-q110', legacyId: 'v110-pm-01', questionNumber: 110, field: FIELDS.projectManagement, subField: 'スケジュール',
    questionText: 'プロジェクトの全体所要期間を決め、遅延すると完了日へ直接影響する作業経路はどれか。',
    choices: ['クリティカルパス', 'マイルストーン', 'ベースライン', 'スプリント'], correctAnswer: 'ア',
    correctReason: 'クリティカルパスは余裕時間が最小で、遅延がプロジェクト完了日に直結する経路です。',
    wrongReasons: { イ: 'マイルストーンは重要な節目です。', ウ: 'ベースラインは承認済み計画の基準です。', エ: 'スプリントはアジャイル開発の短い反復期間です。' },
    points: ['クリティカルパス上の作業は通常、トータルフロートが0。'], keywords: ['クリティカルパス', 'PERT', '余裕時間'],
  }),
  createQuestion({
    id: 'ap-r08-spring-am-q111', legacyId: 'v110-pm-02', questionNumber: 111, field: FIELDS.projectManagement, subField: 'リスク',
    questionText: '発生確率は低いが影響が非常に大きいリスクに備えて、対応手順を事前に用意する活動はどれか。',
    choices: ['リスクの受容', 'コンティンジェンシ計画', '品質監査', 'スコープ検証'], correctAnswer: 'イ',
    correctReason: 'コンティンジェンシ計画は、リスクが顕在化した場合に実行する対応をあらかじめ定めます。',
    wrongReasons: { ア: '受容は積極的な対応を取らず監視する選択も含みます。', ウ: '品質監査は品質活動や手順の適切性を確認します。', エ: 'スコープ検証は成果物の受入れを確認します。' },
    points: ['予備対応計画は、発動条件と責任者も決めておく。'], keywords: ['リスク対応', 'コンティンジェンシ', 'トリガー'],
  }),
  createQuestion({
    id: 'ap-r08-spring-am-q112', legacyId: 'v110-sm-01', questionNumber: 112, field: FIELDS.serviceManagement, subField: 'インシデント管理',
    questionText: 'サービス停止が発生したとき、通常のサービス運用をできるだけ早く回復させることを主目的とする管理プロセスはどれか。',
    choices: ['問題管理', '変更実現', 'インシデント管理', '構成管理'], correctAnswer: 'ウ',
    correctReason: 'インシデント管理の主目的は、サービスを迅速に復旧し事業への影響を最小化することです。',
    wrongReasons: { ア: '問題管理は根本原因の特定と再発防止を扱います。', イ: '変更実現は変更のリスクを評価して管理します。', エ: '構成管理は構成アイテムと関係を管理します。' },
    points: ['早期復旧＝インシデント、根本原因＝問題管理。'], keywords: ['インシデント管理', '復旧', 'サービスデスク'],
  }),
  createQuestion({
    id: 'ap-r08-spring-am-q113', legacyId: 'v110-sm-02', questionNumber: 113, field: FIELDS.serviceManagement, subField: 'SLA',
    questionText: 'サービス提供者と顧客の間で、可用性や応答時間などのサービス目標を合意した文書はどれか。',
    choices: ['SLA', 'RFP', 'WBS', 'NDA'], correctAnswer: 'ア',
    correctReason: 'SLAはサービスレベル合意であり、測定可能なサービス目標と責任範囲を定めます。',
    wrongReasons: { イ: 'RFPは提案依頼書です。', ウ: 'WBSは作業を階層的に分解したものです。', エ: 'NDAは秘密保持契約です。' },
    points: ['SLAは測定指標、目標値、報告方法を明確にする。'], keywords: ['SLA', 'サービスレベル', '可用性'],
  }),
  createQuestion({
    id: 'ap-r08-spring-am-q114', legacyId: 'v110-audit-01', questionNumber: 114, field: FIELDS.systemAudit, subField: '監査証拠',
    questionText: 'システム監査人が監査意見を裏付けるために収集する記録や資料を何というか。',
    choices: ['監査証拠', '監査調書', '改善計画', '統制目標'], correctAnswer: 'ア',
    correctReason: '監査証拠は監査意見や結論の基礎となる、十分かつ適切な情報です。',
    wrongReasons: { イ: '監査調書は監査手続や証拠、判断を記録した文書です。', ウ: '改善計画は指摘への対応内容を定めます。', エ: '統制目標は内部統制が達成すべき目標です。' },
    points: ['監査証拠には十分性（量）と適切性（質）が必要。'], keywords: ['システム監査', '監査証拠', '十分性'],
  }),
  createQuestion({
    id: 'ap-r08-spring-am-q115', legacyId: 'v110-audit-02', questionNumber: 115, field: FIELDS.systemAudit, subField: '独立性',
    questionText: 'システム監査人の客観性を確保するために最も重要な考え方はどれか。',
    choices: ['監査対象部門の責任者を兼任する', '監査対象から独立した立場を保つ', '監査手続を対象部門だけで決める', '改善策を監査人自身が実装する'], correctAnswer: 'イ',
    correctReason: '監査対象から組織上・精神上独立することで、偏りのない評価と意見表明ができます。',
    wrongReasons: { ア: '自己監査となり客観性が損なわれます。', ウ: '監査手続は監査目的とリスクに基づいて監査側が設計します。', エ: '実装責任を負うと、その後の監査で独立性が損なわれます。' },
    points: ['監査人は評価・助言を行うが、業務執行の責任は負わない。'], keywords: ['独立性', '客観性', 'システム監査'],
  }),
  createQuestion({
    id: 'ap-r08-spring-am-q116', legacyId: 'v110-st-01', questionNumber: 116, field: FIELDS.strategy, subField: 'マーケティング',
    questionText: '市場を年齢や購買行動などで分け、自社が狙う顧客層を選び、提供価値を明確にする一連の考え方はどれか。',
    choices: ['STP', 'PDCA', 'BSC', 'SCM'], correctAnswer: 'ア',
    correctReason: 'STPはSegmentation、Targeting、Positioningの順で市場と提供価値を整理します。',
    wrongReasons: { イ: 'PDCAは継続的改善のサイクルです。', ウ: 'BSCは複数視点で戦略を管理する手法です。', エ: 'SCMは供給連鎖全体を最適化します。' },
    points: ['市場細分化→標的市場選定→位置付けがSTP。'], keywords: ['STP', 'セグメンテーション', 'ポジショニング'],
  }),
  createQuestion({
    id: 'ap-r08-spring-am-q117', legacyId: 'v110-st-02', questionNumber: 117, field: FIELDS.strategy, subField: '法務',
    questionText: '企業が秘密として管理し、有用で、公然と知られていない技術上又は営業上の情報に該当するものはどれか。',
    choices: ['営業秘密', '著作者人格権', 'パブリックドメイン', 'オープンデータ'], correctAnswer: 'ア',
    correctReason: '営業秘密には秘密管理性、有用性、非公知性の三要件が必要です。',
    wrongReasons: { イ: '著作者人格権は著作者の人格的利益を保護します。', ウ: 'パブリックドメインは知的財産権による制約がない状態です。', エ: 'オープンデータは利用しやすい形で公開されたデータです。' },
    points: ['営業秘密の三要件＝秘密管理性・有用性・非公知性。'], keywords: ['営業秘密', '不正競争防止法', '秘密管理性'],
  }),
]

const questionIdAliases = new Map(questions.flatMap(question => (question.legacyIds ?? []).map(legacyId => [legacyId, question.id] as const)))

export const resolveQuestionId = (id: string) => questionIdAliases.get(id) ?? id
