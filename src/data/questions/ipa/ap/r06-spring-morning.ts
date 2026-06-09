import { FIELDS } from '../../../fields.js'
import type { ChoiceKey, Question } from '../../../../types.js'

const choiceKeys: ChoiceKey[] = ['ア', 'イ', 'ウ', 'エ']

type Seed = { number: number; field: Question['field']; subField: string; text: string; choices: [string, string, string, string]; answer: ChoiceKey; reasons: [string, string, string, string]; points: string[]; keywords: string[] }

const questionPdfUrl = 'https://www.ipa.go.jp/shiken/mondai-kaiotu/m42obm000000afqx-att/2024r06h_ap_am_qs.pdf'

const seeds: Seed[] = [
  {
    number: 36, field: FIELDS.security, subField: 'DNSセキュリティ',
    text: '企業のDMZ上で1台のDNSサーバを，インターネット公開用と，社内のPC及びサーバからの名前解決の問合せに対応する社内用とで共用している。このDNSサーバが，DNSキャッシュポイズニングの被害を受けた結果，直接引き起こされ得る現象はどれか。',
    choices: ['DNSサーバのハードディスク上に定義されているDNSサーバ名が書き換わり，インターネットからDNSサーバに接続できなくなる。', 'DNSサーバのメモリ上にワームが常駐し，DNS参照元に対して不正プログラムを送り込む。', '社内の利用者が，インターネット上の特定のWebサーバにアクセスしようとすると，本来とは異なるWebサーバに誘導される。', '社内の利用者間の電子メールについて，宛先メールアドレスが書き換えられ，送信ができなくなる。'], answer: 'ウ',
    reasons: ['DNSサーバ名そのものを書き換える攻撃ではない。', 'ワームを常駐させる攻撃ではない。', '偽の名前解決情報がキャッシュされると，利用者は本来と異なるIPアドレスへ誘導される。', 'メールアドレス自体を書き換える攻撃ではない。'],
    points: ['DNSキャッシュのドメイン名とIPアドレスの対応が汚染される。'], keywords: ['DNS', 'キャッシュポイズニング'],
  },
  {
    number: 37, field: FIELDS.security, subField: 'DNSセキュリティ',
    text: 'DNSSECで実現できることはどれか。',
    choices: ['DNSキャッシュサーバが得た応答の中のリソースレコードが，権威DNSサーバで管理されているものであり，改ざんされていないことの検証', '権威DNSサーバとDNSキャッシュサーバとの通信を暗号化することによる，ゾーン情報の漏えいの防止', '長音“ー”と漢数字“一”などの似た文字をドメイン名に用いて，正規サイトのように見せかける攻撃の防止', '利用者のURLの入力誤りを悪用して，偽サイトに誘導する攻撃の検知'], answer: 'ア',
    reasons: ['DNSSECのデジタル署名で応答の出所と完全性を検証できる。', 'DNSSECはDNS通信を暗号化する仕組みではない。', '類似文字を使うドメイン名の登録や利用を防止する仕組みではない。', 'URL入力誤りを利用するタイポスクワッティングの検知機能ではない。'],
    points: ['DNSSECは機密性ではなく真正性と完全性を支える。'], keywords: ['DNSSEC', 'デジタル署名'],
  },
  {
    number: 38, field: FIELDS.security, subField: '公開鍵暗号',
    text: '公開鍵暗号方式を使った暗号通信をn人が相互に行う場合，全体で何個の異なる鍵が必要になるか。ここで，一組の公開鍵と秘密鍵は2個と数える。',
    choices: ['n＋1', '2n', 'n(n－1)/2', 'log₂n'], answer: 'イ',
    reasons: ['各利用者に公開鍵と秘密鍵の2個が必要なのでn＋1ではない。', 'n人がそれぞれ公開鍵と秘密鍵を1個ずつ持つので合計は2n個である。', 'n(n－1)/2は共通鍵暗号で2人ごとに鍵を共有する場合の個数である。', '鍵数は利用者数の対数にはならない。'],
    points: ['公開鍵暗号は利用者ごとに鍵ペアを用意する。'], keywords: ['公開鍵暗号', '鍵管理'],
  },
  {
    number: 39, field: FIELDS.security, subField: 'セキュリティ組織',
    text: '自社製品の脆弱性に起因するリスクに対応するための社内機能として，最も適切なものはどれか。',
    choices: ['CSIRT', 'PSIRT', 'SOC', 'WHOISデータベースの技術連絡担当'], answer: 'イ',
    reasons: ['CSIRTは主に組織内のインシデント対応を担う。', 'PSIRTは自社製品の脆弱性受付，評価，修正，情報公開を担う。', 'SOCはシステムやネットワークの監視・分析を担う。', 'WHOISの技術連絡担当はドメインの技術的連絡先である。'],
    points: ['Product Security Incident Response Teamの対象は自社製品である。'], keywords: ['PSIRT', '脆弱性対応'],
  },
  {
    number: 40, field: FIELDS.security, subField: 'リスクマネジメント',
    text: 'JIS Q 31000:2019(リスクマネジメント－指針)において，リスク特定で考慮することが望ましいとされている事項はどれか。',
    choices: ['結果の性質及び大きさ', '残留リスクが許容可能かどうかの判断', '資産及び組織の資源の性質及び価値', '事象の起こりやすさ及び結果'], answer: 'ウ',
    reasons: ['結果の性質や大きさは主にリスク分析で扱う。', '残留リスクの許容判断はリスク対応後の評価に関係する。', '資産及び組織資源の性質と価値はリスク特定で考慮する事項である。', '起こりやすさと結果の組合せは主にリスク分析で扱う。'],
    points: ['リスク特定ではリスク源，資産，脆弱性，状況変化などを洗い出す。'], keywords: ['JIS Q 31000', 'リスク特定'],
  },
  {
    number: 41, field: FIELDS.security, subField: 'Webセキュリティ',
    text: 'WAFによる防御が有効な攻撃として，最も適切なものはどれか。',
    choices: ['DNSサーバに対するDNSキャッシュポイズニング', 'REST APIサービスに対するAPIの脆弱性を狙った攻撃', 'SMTPサーバの第三者不正中継の脆弱性を悪用したフィッシングメールの配信', '電子メールサービスに対する大量，かつ，サイズの大きな電子メールの配信'], answer: 'イ',
    reasons: ['DNSへの攻撃はWAFの保護対象ではない。', 'REST APIはHTTP(S)を利用するWebアプリケーションであり，WAFで不正リクエストを検査できる。', 'SMTPの不正中継はメールサーバの設定で対策する。', '大量メールはメール基盤側で対策する。'],
    points: ['WAFはHTTP(S)の内容を検査しWebアプリケーションを保護する。'], keywords: ['WAF', 'REST API'],
  },
  {
    number: 42, field: FIELDS.network, subField: '通信プロトコル',
    text: 'PCからサーバに対し，IPv6を利用した通信を行う場合，ネットワーク層で暗号化を行うのに利用するものはどれか。',
    choices: ['IPsec', 'PPP', 'SSH', 'TLS'], answer: 'ア',
    reasons: ['IPsecはIP層で認証や暗号化を提供する。', 'PPPは主にデータリンク層の通信プロトコルである。', 'SSHはアプリケーション層で安全な遠隔操作などを提供する。', 'TLSはトランスポート層とアプリケーション層の間で通信を保護する。'],
    points: ['ネットワーク層の暗号化はIPsec。'], keywords: ['IPv6', 'IPsec'],
  },
  {
    number: 43, field: FIELDS.security, subField: '電子メールセキュリティ',
    text: 'SPF(Sender Policy Framework)の仕組みはどれか。',
    choices: ['電子メールを受信するサーバが，電子メールに付与されているデジタル署名を使って，送信元ドメインの詐称がないことを確認する。', '電子メールを受信するサーバが，電子メールの送信元のドメイン情報と，電子メールを送信したサーバのIPアドレスから，送信元ドメインの詐称がないことを確認する。', '電子メールを送信するサーバが，電子メールの宛先のドメインや送信者のメールアドレスを問わず，全ての電子メールをアーカイブする。', '電子メールを送信するサーバが，電子メールの送信者の上司からの承認が得られるまで，一時的に電子メールの送信を保留する。'], answer: 'イ',
    reasons: ['デジタル署名を検証する方式はDKIMである。', 'SPFは送信元ドメインのDNS情報と実際の送信サーバのIPアドレスを照合する。', 'メールアーカイブはSPFの機能ではない。', '承認ワークフローはSPFの機能ではない。'],
    points: ['SPFレコードには正当な送信サーバの情報を登録する。'], keywords: ['SPF', '送信ドメイン認証'],
  },
  {
    number: 44, field: FIELDS.security, subField: '耐タンパ性',
    text: 'ICカードの耐タンパ性を高める対策はどれか。',
    choices: ['ICカードとICカードリーダーとが非接触の状態で利用者を認証して，利用者の利便性を高めるようにする。', '故障に備えてあらかじめ作成した予備のICカードを保管し，故障時に直ちに予備カードに交換して利用者がICカードを使い続けられるようにする。', '信号の読出し用プローブの取付けを検出するとICチップ内の保存情報を消去する回路を設けて，ICチップ内の情報を容易には解析できないようにする。', '利用者認証にICカードを利用している業務システムにおいて，退職者のICカードは業務システム側で利用を停止して，他の利用者が利用できないようにする。'], answer: 'ウ',
    reasons: ['非接触化は利便性の対策である。', '予備カードは可用性の対策である。', '物理的な解析を検知して秘密情報を消去する仕組みは耐タンパ性を高める。', '退職者カードの停止はアクセス管理の対策である。'],
    points: ['耐タンパ性は物理的な解析や改ざんへの耐性である。'], keywords: ['ICカード', '耐タンパ性'],
  },
  {
    number: 45, field: FIELDS.systemDevelopment, subField: 'オブジェクト指向',
    text: 'オブジェクト指向におけるクラス間の関係のうち，適切なものはどれか。',
    choices: ['クラス間の関連は，二つのクラス間でだけ定義できる。', 'サブクラスではスーパークラスの操作を再定義することができる。', 'サブクラスのインスタンスが，スーパークラスで定義されている操作を実行するときは，スーパークラスのインスタンスに操作を依頼する。', '二つのクラスに集約の関係があるときには，集約オブジェクトは部品オブジェクトと，属性及び操作を共有する。'], answer: 'イ',
    reasons: ['関連は複数のクラス間にも定義できる。', '継承した操作をサブクラスで再定義することをオーバーライドという。', '継承した操作はサブクラスのインスタンス自身が利用できる。', '集約は全体と部分の関係であり属性や操作の共有を意味しない。'],
    points: ['オーバーライドとオーバーロードを区別する。'], keywords: ['オブジェクト指向', 'オーバーライド'],
  },
  {
    number: 46, field: FIELDS.systemDevelopment, subField: 'モジュール設計',
    text: 'モジュール結合度に関する記述のうち，適切なものはどれか。',
    choices: ['あるモジュールがCALL命令を使用せずにJUMP命令でほかのモジュールを呼び出すとき，このモジュール間の関係は，外部結合である。', '実行する機能や論理を決定するために引数を受け渡すとき，このモジュール間の関係は，内容結合である。', '大域的な単一のデータ項目を参照するモジュール間の関係は，制御結合である。', '大域的なデータを参照するモジュール間の関係は，共通結合である。'], answer: 'エ',
    reasons: ['他モジュール内部へ直接分岐する関係は内容結合である。', '機能を決める制御情報を渡す関係は制御結合である。', '大域的な単一データ項目の共有は外部結合である。', '大域的なデータ領域を複数モジュールで共有する関係は共通結合である。'],
    points: ['結合度はデータ結合が弱く，内容結合が強い。'], keywords: ['モジュール結合度', '共通結合'],
  },
]

const createQuestion = (seed: Seed): Question => ({
  id: `ap-r06-spring-am-q${String(seed.number).padStart(3, '0')}`,
  examYear: 2024, examSeason: '春期', examType: 'morning', questionNumber: seed.number,
  field: seed.field, subField: seed.subField, questionText: seed.text,
  choices: seed.choices.map((text, index) => ({ key: choiceKeys[index], text })),
  correctAnswer: seed.answer,
  officialAnswerText: `${seed.answer}：${seed.choices[choiceKeys.indexOf(seed.answer)]}`,
  sourceName: `情報処理推進機構（IPA） 応用情報技術者試験 令和6年度 春期 午前 問${seed.number}`,
  sourceUrl: questionPdfUrl, isQuoteFromIpa: true,
  explanation: { correctReason: seed.reasons[choiceKeys.indexOf(seed.answer)], wrongReasons: Object.fromEntries(choiceKeys.map((key, index) => [key, seed.reasons[index]])), points: seed.points, keywords: seed.keywords, isAiGenerated: false },
})

export const r06SpringMorningQuestions: Question[] = seeds.map(createQuestion)
