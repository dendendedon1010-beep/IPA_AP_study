# AP Study

IPA（情報処理推進機構）が公開する応用情報技術者試験の過去問題を使った、スマホファーストの学習Webアプリです。

## MVPで実装済み

- 午前四択問題の演習、正誤判定、自信度記録
- 正解・不正解理由、暗記ポイント、関連キーワード、AI補足の注意書き
- 不正解問題の一覧・分野フィルタ・再挑戦
- 分野別正答率、平均解答時間、学習日数・問題数
- 合格可能性、午前正答率、おすすめ学習、復習待ち数のホームサマリー
- 試験予定日、目標時間、午後候補、テーマ、データリセットの設定
- `localStorage` による学習履歴・設定の永続化
- 固定ヘッダー、固定ボトムナビ、セーフエリア対応

## セットアップ

```bash
npm install
npm run dev
```

## ビルド

```bash
npm run build
```

## データ構成

- 問題: `src/data/questions.ts`
- 型定義: `src/types.ts`
- 永続化アダプター: `src/lib/storage.ts`

永続化処理はUIから分離しているため、将来SupabaseやFirebaseのRepository実装へ置き換えやすい構成です。

## 出典

収録問題の出典は、IPA「令和6年度 秋期 応用情報技術者試験 午前 問題冊子」です。各問題画面からIPA公式PDFを確認できます。解説は本アプリが作成したもので、IPA公式解説ではありません。

## GitHub Pages の設定

GitHub Settings → Pages → Source は **GitHub Actions** に設定してください。`Deploy from a branch` を選ぶと、ViteでビルドされていないHTMLが配信され、「読み込み中です」のまま止まる可能性があります。

公開ページのHTMLに `/src/main.tsx` が見えている場合は設定ミスの可能性が高く、正常なビルド済みHTMLでは `/IPA_AP_STUDY/assets/...` のJavaScriptやCSSが読み込まれます。
