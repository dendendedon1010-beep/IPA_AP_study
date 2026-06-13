# Codex Automation 自動更新ポリシー

## 目的

Codex Automation が30分ごとに実行される場合でも、検証可能な小さな更新だけを独立したPull Requestとして作成するためのルールを定めます。

## ブランチとPull Request

- 既存のPull Requestブランチは再利用しません。
- 実行のたびにリモートの最新`main`を取得し、そのコミットから新しいブランチを作成します。
- 1回のPull Requestで追加する問題は10〜25問程度を目安とし、30問を超えて追加しません。
- 条件を満たさない場合、Pull Requestはopenのまま止め、自動マージしません。

## 追加できる問題

- IPA公式サイトで問題文と正答を確認できる午前問題だけを追加します。
- 問題ID、年度、期、問題番号、出典URLを公式資料と照合します。
- 図表画像が必要な問題は、対応する画像assetがリポジトリ内に配置済みの場合だけ追加できます。画像assetが未配置なら、その問題は追加禁止です。
- 推測、非公式転載、正答を公式確認できない問題は追加しません。

## 変更可能ファイル

自動更新で変更できるのは、作業内容に必要な次のファイルだけです。

- `src/data/questions.ts`
- `src/data/ipaPastExams.ts`
- `src/data/ipaFigureQuestionCandidates.ts`
- 配置済み画像を参照するために必要な既存の問題データ関連ファイル
- `docs/codex-automation-policy.md`
- 表示バージョン更新に限る`src/App.tsx`

## 変更禁止ファイル

次のファイルおよび領域は自動更新で追加・変更・削除しません。

- `.github/workflows/**`
- `vite.config.ts`
- `src/main.tsx`
- `package.json`
- `package-lock.json`
- 問題追加に不要なアプリケーションコード、設定ファイル、スクリプト
- 画像asset
- PDFファイル

## 必須検証

変更後はリポジトリルートで、次のコマンドを順番に実行します。

```sh
npm install
npm run verify:questions
npm run build
npm run verify:dist
```

4つのコマンドがすべて成功した場合のみPull Requestを作成します。1つでも失敗した場合はPull Requestを作成せず、変更内容と失敗結果を記録して停止します。

## 自動マージ条件

自動マージは、次の条件をすべて満たす場合だけ許可します。

- CIがすべて成功している
- workflowの追加・変更・削除がない
- `vite.config.ts`の変更がない
- `src/main.tsx`の変更がない
- `package.json`および`package-lock.json`の変更がない
- 問題IDの重複がない
- 追加問題数が30問以下である

いずれか1つでも満たさない場合は、自動マージせずPull Requestをopenのまま止め、人による確認を待ちます。
