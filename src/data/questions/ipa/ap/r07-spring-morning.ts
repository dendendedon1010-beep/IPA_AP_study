import { FIELDS } from '../../../fields.js'
import type { ChoiceKey, Question } from '../../../../types.js'

const questionPdfUrl = 'https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07h_ap_am_qs.pdf'
const choiceKeys: ChoiceKey[] = ['ア', 'イ', 'ウ', 'エ']

type Seed = {
  number: number
  field: Question['field']
  subField: string
  text: string
  choices: [string, string, string, string]
  answer: ChoiceKey
  reasons: [string, string, string, string]
  points: string[]
  keywords: string[]
}

const createQuestion = (seed: Seed): Question => ({
  id: `ap-r07-spring-am-q${String(seed.number).padStart(3, '0')}`,
  examYear: 2025,
  examSeason: '春期',
  examType: 'morning',
  questionNumber: seed.number,
  field: seed.field,
  subField: seed.subField,
  questionText: seed.text,
  choices: seed.choices.map((text, index) => ({ key: choiceKeys[index], text })),
  correctAnswer: seed.answer,
  officialAnswerText: `${seed.answer}：${seed.choices[choiceKeys.indexOf(seed.answer)]}`,
  sourceName: `情報処理推進機構（IPA） 応用情報技術者試験 令和7年度 春期 午前 問${seed.number}`,
  sourceUrl: questionPdfUrl,
  isQuoteFromIpa: true,
  explanation: {
    correctReason: seed.reasons[choiceKeys.indexOf(seed.answer)],
    wrongReasons: Object.fromEntries(choiceKeys.map((key, index) => [key, seed.reasons[index]])),
    points: seed.points,
    keywords: seed.keywords,
    isAiGenerated: false,
  },
})

const seeds: Seed[] = [
  {
    number: 3, field: FIELDS.basicTheory, subField: '機械学習',
    text: 'AIにおける機械学習の過程において，過学習と疑われたときの解消方法として，最も適切なものはどれか。',
    choices: ['訓練した時と同じ精度を出すために，訓練データをテストデータとして使用する。', '精度を高めるために，元の訓練データに加工を施し，訓練データの量を増やす。', '予測した結果に近づけるために，モデルをより複雑にする。', 'より多くの未知のデータに対して予測できるように，汎化性能を下げる。'], answer: 'イ',
    reasons: ['訓練データで評価すると未知データへの汎化性能を確認できず，過学習の解消にならない。', 'データ拡張によって訓練データの多様性と量を増やすことは，過学習を抑える方法になる。', 'モデルを複雑にすると訓練データへ過度に適合し，過学習を強めるおそれがある。', '必要なのは汎化性能を高めることであり，下げることではない。'],
    points: ['過学習対策にはデータ拡張，正則化，モデルの単純化などがある。'], keywords: ['過学習', 'データ拡張', '汎化性能'],
  },
  {
    number: 4, field: FIELDS.computerSystems, subField: 'リアルタイムシステム',
    text: 'リアルタイム性が求められる組込みシステムにおいて，システムへの入力に対するリアルタイムな応答の方法として，最も適切なものはどれか。',
    choices: ['OSを使用しないで応答する。', '定められた制限時間内に応答する。', '入力された順序を守って応答する。', '入力時刻を記録して応答する。'], answer: 'イ',
    reasons: ['OSを使うかどうかではなく，期限内に処理を完了できることがリアルタイム性の要点である。', 'リアルタイムシステムでは，入力に対して定められた制限時間内に応答することが求められる。', '入力順を守るだけでは，各処理の応答期限を保証できない。', '入力時刻の記録だけでは期限内の応答を保証できない。'],
    points: ['リアルタイム性は処理速度の速さだけでなく，応答期限を満たすことを意味する。'], keywords: ['リアルタイムシステム', '応答時間', 'デッドライン'],
  },
  {
    number: 7, field: FIELDS.basicTheory, subField: '再帰アルゴリズム',
    text: 'fact(n)は，非負の整数nに対してnの階乗を返す。fact(n)の再帰的な定義はどれか。',
    choices: ['if n=0 then return 0 else return n×fact(n−1)', 'if n=0 then return 0 else return n×fact(n＋1)', 'if n=0 then return 1 else return n×fact(n−1)', 'if n=0 then return 1 else return n×fact(n＋1)'], answer: 'ウ',
    reasons: ['0の階乗は1なので，基底条件が誤っている。', '基底条件が誤り，かつnを増やす再帰では停止しない。', '0!=1を基底条件とし，n>0ではn×(n−1)!とする正しい再帰定義である。', 'nを増やす再帰では0の基底条件へ近づかず，停止しない。'],
    points: ['再帰処理には正しい基底条件と，基底条件へ近づく再帰呼出しが必要である。'], keywords: ['再帰', '階乗', '基底条件'],
  },
  {
    number: 8, field: FIELDS.computerSystems, subField: 'CPU性能',
    text: '同じ命令セットをもつコンピュータAとBとがある。CPUクロック周期はAが1ナノ秒，Bが4ナノ秒であり，あるプログラムを実行したときのCPIはAが4.0，Bが0.5である。そのプログラムを実行したとき，コンピュータAの処理時間は，コンピュータBの処理時間の何倍になるか。',
    choices: ['1/32', '1/2', '2', '8'], answer: 'ウ',
    reasons: ['命令数が同じなら処理時間はクロック周期×CPIに比例し，1/32にはならない。', 'Aの1命令当たり時間は4ナノ秒，Bは2ナノ秒なので，Aの方が短くはない。', 'Aは1×4.0=4ナノ秒，Bは4×0.5=2ナノ秒であり，AはBの2倍である。', 'クロック周期だけ又はCPIだけを不適切に比較した値である。'],
    points: ['CPU処理時間は命令数×CPI×クロック周期で比較する。'], keywords: ['CPI', 'クロック周期', 'CPU性能'],
  },
  {
    number: 9, field: FIELDS.computerSystems, subField: '入出力制御',
    text: 'DMAコントローラの説明として，適切なものはどれか。',
    choices: ['MPUでは時間が掛かる積和演算を，高速に行う。', '仮想メモリ機能，メモリ保護機能などのメモリ管理機能を提供する。', '動作クロックに合わせてカウントするカウントレジスタをもち，それによって時間の経過を保持する。', 'メモリと入出力装置，又はメモリとメモリとの間のデータ転送を，MPUを介さずに行う。'], answer: 'エ',
    reasons: ['積和演算を高速化するのはDSPなどの役割である。', '仮想記憶やメモリ保護を担うのはMMUである。', 'クロックに基づく時間管理はタイマの説明である。', 'DMAはMPUを介さずにメモリと入出力装置などの間でデータを転送する。'],
    points: ['DMAによってCPUはデータ転送処理から解放される。'], keywords: ['DMA', '入出力制御', 'データ転送'],
  },
  {
    number: 10, field: FIELDS.computerSystems, subField: 'ストレージ',
    text: 'オブジェクトストレージの特徴として，適切なものはどれか。',
    choices: ['オブジェクトにはユニークな識別子が割り当てられ，識別子を使ってアクセスする。', 'オブジェクトの内容を更新する際，上書き更新をする。', '広域分散を実現するためには，遠隔地のストレージと静止点を設けて同期を行う必要がある。', 'ストレージはディレクトリの概念を使った階層構造である。'], answer: 'ア',
    reasons: ['オブジェクトストレージではデータを一意な識別子で管理し，その識別子でアクセスする。', '一般にオブジェクト全体を単位として扱い，ファイルのような部分上書きを前提としない。', '特定の静止点を設けることはオブジェクトストレージ固有の必須条件ではない。', 'ディレクトリによる階層構造はファイルストレージの特徴である。'],
    points: ['オブジェクトはデータ，メタデータ，一意な識別子から構成される。'], keywords: ['オブジェクトストレージ', '識別子', 'メタデータ'],
  },
  {
    number: 11, field: FIELDS.computerSystems, subField: '並列処理',
    text: 'マルチプロセッサによる並列処理で得られる高速化率Eを，E=1/(1−r＋r/n)によって評価する。r=0.9のアプリケーションの高速化率がr=0.3のものの3倍となるのは，プロセッサが何台のときか。ここで，nはプロセッサの台数，rは対象とする処理のうち並列化が可能な部分の割合とし，並列化に伴うオーバーヘッドは考慮しない。',
    choices: ['3', '4', '5', '6'], answer: 'エ',
    reasons: ['n=3では高速化率の比は3倍にならない。', 'n=4では高速化率の比は3倍にならない。', 'n=5では高速化率の比は3倍にならない。', 'n=6ではr=0.9のEは4，r=0.3のEは4/3となり，比が3倍になる。'],
    points: ['並列化できない部分が高速化率の上限を決める。'], keywords: ['アムダールの法則', '並列処理', '高速化率'],
  },
  {
    number: 12, field: FIELDS.computerSystems, subField: '信頼性設計',
    text: '二つのシステムA，Bの稼働率をそれぞれαA（0<αA<1），αB（0<αB<1），MTBFをそれぞれMTBFA，MTBFB，MTTRをそれぞれMTTRA，MTTRBとしたとき，これらの関係として，常に成り立つものはどれか。',
    choices: ['αA=αBならば，MTBFA=MTBFBであり，かつMTTRA=MTTRBである。', 'αA=αBならば，MTTRA/MTBFA=MTTRB/MTBFBである。', 'αA>αBならば，MTBFA>MTBFBであり，かつMTTRA>MTTRBである。', 'αA>αBならば，MTTRA/MTBFA>MTTRB/MTBFBである。'], answer: 'イ',
    reasons: ['同じ稼働率でもMTBFとMTTRの絶対値がそれぞれ等しいとは限らない。', '稼働率α=MTBF/(MTBF+MTTR)=1/(1+MTTR/MTBF)なので，同じ稼働率なら両者のMTTR/MTBFは等しい。', '稼働率の大小だけからMTBFとMTTRそれぞれの大小は決められない。', '稼働率が高いほどMTTR/MTBFは小さくなるので，不等号が逆である。'],
    points: ['稼働率はMTBFとMTTRの比で決まる。'], keywords: ['稼働率', 'MTBF', 'MTTR'],
  },
  {
    number: 14, field: FIELDS.computerSystems, subField: 'OS',
    text: 'リアルタイムOSにおいて，実行中のタスクがプリエンプションによって遷移する状態はどれか。',
    choices: ['休止状態', '実行可能状態', '終了状態', '待ち状態'], answer: 'イ',
    reasons: ['休止状態はタスクが実行対象になっていない状態である。', 'プリエンプションでは実行権を奪われるだけで，実行条件は満たしているので実行可能状態へ遷移する。', '処理を完了したわけではないので終了状態にはならない。', '入出力完了などの事象を待つ理由がないので待ち状態にはならない。'],
    points: ['プリエンプションは優先度などにより実行中タスクからCPUを取り上げる動作である。'], keywords: ['リアルタイムOS', 'プリエンプション', 'タスク状態'],
  },
  {
    number: 15, field: FIELDS.computerSystems, subField: '仮想記憶',
    text: '仮想記憶管理におけるページ置換えアルゴリズムとしてLRU方式を採用する。主記憶のページ枠が，4000，5000，6000，7000番地（いずれも16進数）の4ページ分で，プログラムが参照するページ番号の順が，1→2→3→4→2→5→3→1→6→5→4のとき，最後の参照ページ4は何番地にページインされているか。ここで，最初の1→2→3→4の参照で，それぞれのページは4000，5000，6000，7000番地にページインされるものとする。',
    choices: ['4000', '5000', '6000', '7000'], answer: 'ウ',
    reasons: ['参照系列をLRUで追跡すると，最後のページ4は4000番地には入らない。', '参照系列をLRUで追跡すると，最後のページ4は5000番地には入らない。', 'LRUで置換えを追跡すると，ページ4は最後に6000番地へページインされる。', '7000番地には別のページが残るため，最後のページ4の格納先ではない。'],
    points: ['LRUは最後に参照されてから最も長い時間が経過したページを置き換える。'], keywords: ['LRU', 'ページ置換え', '仮想記憶'],
  },
  {
    number: 17, field: FIELDS.systemDevelopment, subField: 'API開発',
    text: 'OpenAPI Specificationに従ったAPIの定義・開発を支援する機能を提供するOSSはどれか。',
    choices: ['curl', 'OpenAM', 'Serverspec', 'Swagger'], answer: 'エ',
    reasons: ['curlはURLを用いてデータ転送を行うコマンドラインツールである。', 'OpenAMはアクセス管理や認証・認可を提供するソフトウェアである。', 'Serverspecはサーバの構成をテストするためのツールである。', 'SwaggerはOpenAPI Specificationに基づくAPIの設計，文書化，開発を支援する。'],
    points: ['OpenAPIはREST APIを機械可読な形式で記述する仕様である。'], keywords: ['OpenAPI', 'Swagger', 'API'],
  },
  {
    number: 18, field: FIELDS.computerSystems, subField: '組込みシステム',
    text: '8ビットD/A変換器を使って負でない電圧を発生させる。使用するD/A変換器は，最下位の1ビットの変化で出力が10ミリV変化する。データに0を与えたときの出力は0ミリVである。データに16進数で82を与えたときの出力は何ミリVか。',
    choices: ['820', '1,024', '1,300', '1,312'], answer: 'ウ',
    reasons: ['16進数82を10進数の82として扱った値である。', '8ビットの段階数を基にした値であり，入力値82₁₆を反映していない。', '82₁₆は130なので，130×10ミリV=1,300ミリVである。', '入力値の換算又は1LSB当たりの電圧の適用が誤っている。'],
    points: ['16進数82は10進数で8×16+2=130である。'], keywords: ['D/A変換', '16進数', 'LSB'],
  },
  {
    number: 19, field: FIELDS.computerSystems, subField: '制御システム',
    text: '産業機器の制御装置として使われるPLCの説明として，適切なものはどれか。',
    choices: ['自動制御であり，偏差の比例，積分及び微分の3要素で制御する。', '主としてラダー図を用いたシーケンスプログラムによって制御する。', '電圧及び電流のアナログ信号をデジタル信号に変換する。', 'リレーシーケンス回路のハードウェアによって制御する。'], answer: 'イ',
    reasons: ['比例・積分・微分の3要素による制御はPID制御の説明である。', 'PLCはプログラマブルロジックコントローラであり，主にラダー図によるシーケンス制御に用いる。', 'アナログ信号をデジタル信号へ変換するのはA/D変換器である。', 'PLCはリレー回路の動作をプログラムで実現する装置であり，固定的なリレー回路そのものではない。'],
    points: ['PLCは工場設備などのシーケンス制御に広く使われる。'], keywords: ['PLC', 'ラダー図', 'シーケンス制御'],
  },
  {
    number: 20, field: FIELDS.computerSystems, subField: '論理回路',
    text: 'FPGAなどに実装するデジタル回路を記述し，論理合成するために使用される言語はどれか。',
    choices: ['DDL', 'HDL', 'UML', 'XML'], answer: 'イ',
    reasons: ['DDLはデータベースの構造を定義するデータ定義言語である。', 'HDLはデジタル回路の構造や動作を記述し，論理合成に用いるハードウェア記述言語である。', 'UMLはソフトウェアなどの構造や振る舞いをモデル化するための表記法である。', 'XMLは構造化データを記述するためのマークアップ言語である。'],
    points: ['代表的なHDLにはVHDLやVerilog HDLがある。'], keywords: ['FPGA', 'HDL', '論理合成'],
  },
  {
    number: 22, field: FIELDS.systemDevelopment, subField: 'ユーザビリティ',
    text: 'ユーザーインタフェースのユーザビリティを評価する手法には，利用者が参加するものと専門家だけで実施するものとがある。利用者が参加する手法と専門家だけで実施する手法との適切な組合せはどれか。',
    choices: ['利用者が参加：アンケート／専門家だけ：回顧法', '利用者が参加：回顧法／専門家だけ：思考発話法', '利用者が参加：思考発話法／専門家だけ：ヒューリスティック評価法', '利用者が参加：認知的ウォークスルー法／専門家だけ：ヒューリスティック評価法'], answer: 'ウ',
    reasons: ['回顧法は利用者が操作後に振り返る手法なので，専門家だけで実施する手法ではない。', '思考発話法は利用者に考えていることを発話してもらうため，専門家だけでは実施できない。', '思考発話法には利用者が参加し，ヒューリスティック評価法は専門家が経験則に基づいて評価する。', '認知的ウォークスルー法は通常，専門家が利用者の認知過程を想定して評価する。'],
    points: ['ユーザテスト系の手法と専門家レビュー系の手法を区別する。'], keywords: ['ユーザビリティ', '思考発話法', 'ヒューリスティック評価'],
  },
  {
    number: 23, field: FIELDS.systemDevelopment, subField: 'Web技術',
    text: 'W3Cで仕様が定義され，矩形や円，直線，文字列などの図形オブジェクトをXML形式で記述し，Webページでの図形描画にも使うことができる画像フォーマットはどれか。',
    choices: ['OpenGL', 'PNG', 'SVG', 'TIFF'], answer: 'ウ',
    reasons: ['OpenGLは画像フォーマットではなく，2D・3Dグラフィックス用のAPIである。', 'PNGはラスター画像形式であり，図形をXML形式で記述しない。', 'SVGはW3Cが標準化したXMLベースのベクター画像形式である。', 'TIFFはラスター画像形式であり，XMLによる図形記述形式ではない。'],
    points: ['SVGは拡大しても劣化しにくいベクター形式である。'], keywords: ['SVG', 'XML', 'ベクター画像'],
  },
  {
    number: 24, field: FIELDS.database, subField: 'NoSQL',
    text: '大量のIoTデバイスから送信される大量で，かつ様々な形式のデータを格納可能なデータモデルのうち，行ごとに任意の列数をもち，かつ列ごとに複数の値をもつことによって，柔軟なデータ格納を実現しているデータモデルはどれか。',
    choices: ['グラフ', 'ドキュメント', 'リレーショナル', 'ワイドカラム'], answer: 'エ',
    reasons: ['グラフ型はノードとエッジでデータ間の関係を表現する。', 'ドキュメント型はJSONなどの文書単位で柔軟な構造を格納する。', 'リレーショナル型は表の行が原則として同じ列構造をもつ。', 'ワイドカラム型は行ごとに異なる列をもち，列ファミリなどを用いて大規模で柔軟なデータを格納できる。'],
    points: ['ワイドカラム型は大規模な分散データ処理に適したNoSQLモデルの一つである。'], keywords: ['ワイドカラム', 'NoSQL', 'IoT'],
  },
  {
    number: 26, field: FIELDS.database, subField: '正規化',
    text: '関係を第2正規形から第3正規形に変換する手順はどれか。',
    choices: ['候補キー以外の属性から，候補キーの一部の属性に対して関数従属性がある場合，その関係を分解する。', '候補キー以外の属性間に関数従属性がある場合，その関係を分解する。', '候補キーの一部の属性から，候補キー以外の属性への関数従属性がある場合，その関係を分解する。', '一つの属性に複数の値が入っている場合，単一の値になるように分解する。'], answer: 'イ',
    reasons: ['非キー属性から候補キーの一部への関数従属性を除くことは，第3正規形への一般的な変換手順ではない。', '第3正規形では非キー属性間の推移的関数従属性を除くため，その関係を分解する。', '候補キーの一部から非キー属性への部分関数従属を除くのは，第1正規形から第2正規形への変換である。', '属性値を原子値にするのは非正規形から第1正規形への変換である。'],
    points: ['第2正規形は部分関数従属を，第3正規形は推移的関数従属を排除する。'], keywords: ['第3正規形', '関数従属性', '正規化'],
  },
  {
    number: 27, field: FIELDS.database, subField: 'SQL',
    text: 'SQL文に示す参照制約が存在する“商品”表と“受注”表とがある。“商品”表の行を削除したとき，削除した行の商品コードと同じ値の商品コードをもつ“受注”表の行を自動的に削除するSQL文として，ON DELETEの後に入れる字句はどれか。',
    choices: ['CASCADE', 'RESTRICT', 'SET DEFAULT', 'SET NULL'], answer: 'ア',
    reasons: ['ON DELETE CASCADEは親表の行を削除したとき，参照する子表の行も自動削除する。', 'RESTRICTは参照する子行がある場合に親行の削除を拒否する。', 'SET DEFAULTは外部キーを既定値に変更し，子行を削除しない。', 'SET NULLは外部キーをNULLに変更し，子行を削除しない。'],
    points: ['参照整合性制約の削除時動作を区別する。'], keywords: ['SQL', '外部キー', 'CASCADE'],
  },
  {
    number: 29, field: FIELDS.network, subField: 'LAN',
    text: '無線LANのアクセスポイントやIP電話機などに，LANケーブルを利用して給電も行う仕組みはどれか。',
    choices: ['PLC', 'PoE', 'UPS', 'USB'], answer: 'イ',
    reasons: ['PLCは電力線を通信回線として利用する技術である。', 'PoEはEthernetのLANケーブルを通じて通信と給電を同時に行う。', 'UPSは停電時などに一時的な電力を供給する無停電電源装置である。', 'USBは周辺機器接続規格であり，LANケーブルによる給電方式ではない。'],
    points: ['PoEはPower over Ethernetの略である。'], keywords: ['PoE', 'Ethernet', '給電'],
  },
]

export const r07SpringMorningQuestions: Question[] = seeds.map(createQuestion)
