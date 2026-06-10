import { access, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'

const root = new URL('../', import.meta.url)
const temporaryDirectory = await mkdtemp(join(tmpdir(), 'ap-study-questions-'))
const choiceKeys = ['ア', 'イ', 'ウ', 'エ']
const ipaMorningIdPattern = /^ap-r\d{2}-(spring|autumn)-am-q\d{3}$/
const ipaAfternoonIdPattern = /^ap-r\d{2}-(spring|autumn)-pm-q\d{2}(?:-sub\d{2})?$/
const originalIdPattern = /^ap-original-am-[a-z0-9]+(?:-[a-z0-9]+)*-q\d{3}$/
const errors = []
const warnings = []
const allowedImageExtensions = /\.(?:webp|png|jpe?g|svg)$/i
const imageWarningSize = 500 * 1024
const imageErrorSize = 1024 * 1024

const transpile = async (sourcePath, outputName) => {
  const source = await readFile(new URL(sourcePath, root), 'utf8')
  const result = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    fileName: sourcePath,
    reportDiagnostics: true,
  })
  for (const diagnostic of result.diagnostics ?? []) {
    errors.push(`${sourcePath}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`)
  }
  const outputPath = join(temporaryDirectory, outputName)
  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, result.outputText)
}

try {
  await transpile('src/data/fields.ts', 'fields.js')
  await transpile('src/data/questions/ipa/ap/r07-autumn-morning.ts', 'questions/ipa/ap/r07-autumn-morning.js')
  await transpile('src/data/questions/ipa/ap/r07-spring-morning.ts', 'questions/ipa/ap/r07-spring-morning.js')
  await transpile('src/data/questions/ipa/ap/r06-autumn-morning.ts', 'questions/ipa/ap/r06-autumn-morning.js')
  await transpile('src/data/questions/ipa/ap/r06-spring-morning.ts', 'questions/ipa/ap/r06-spring-morning.js')
  await transpile('src/data/questions/ipa/ap/r05-autumn-morning.ts', 'questions/ipa/ap/r05-autumn-morning.js')
  await transpile('src/data/questions/ipa/ap/r05-spring-morning.ts', 'questions/ipa/ap/r05-spring-morning.js')
  await transpile('src/data/questions/ipa/ap/r04-autumn-morning.ts', 'questions/ipa/ap/r04-autumn-morning.js')
  await transpile('src/data/questions/ipa/ap/r04-spring-morning.ts', 'questions/ipa/ap/r04-spring-morning.js')
  await transpile('src/data/questions.ts', 'questions.js')
  await transpile('src/data/ipaPastExams.ts', 'ipaPastExams.js')
  const [{ FIELD_NAMES }, { questions }, { ipaPastExamCatalog }] = await Promise.all([
    import(pathToFileURL(join(temporaryDirectory, 'fields.js')).href),
    import(pathToFileURL(join(temporaryDirectory, 'questions.js')).href),
    import(pathToFileURL(join(temporaryDirectory, 'ipaPastExams.js')).href),
  ])
  const allowedFields = new Set(FIELD_NAMES)
  const ids = new Set()
  const legacyIds = new Set()

  if (!Array.isArray(questions) || questions.length === 0) errors.push('questions: 1問以上の配列が必要です。')

  for (const [index, question] of (questions ?? []).entries()) {
    const label = question?.id || `questions[${index}]`
    const requireText = (key, value) => {
      if (typeof value !== 'string' || value.trim() === '') errors.push(`${label}: ${key} がありません。`)
    }

    requireText('id', question?.id)
    if (ids.has(question?.id)) errors.push(`${label}: id が重複しています。`)
    ids.add(question?.id)
    const isIpaMorningId = ipaMorningIdPattern.test(question?.id ?? '')
    const isIpaAfternoonId = ipaAfternoonIdPattern.test(question?.id ?? '')
    const isIpaId = isIpaMorningId || isIpaAfternoonId
    const isOriginalId = originalIdPattern.test(question?.id ?? '')
    if (!isIpaId && !isOriginalId) errors.push(`${label}: id は ap-r05-autumn-am-q001、ap-r05-autumn-pm-q01 又は ap-original-am-security-q001 形式にしてください。`)
    if (question?.isQuoteFromIpa === true && !isIpaId) errors.push(`${label}: IPA引用問題には年度・期・問番号を含むIDが必要です。`)
    if (question?.isQuoteFromIpa === false && !isOriginalId && !question?.legacyIds?.length) errors.push(`${label}: オリジナル問題には ap-original-am-... 形式のIDが必要です。`)

    for (const legacyId of question?.legacyIds ?? []) {
      requireText('legacyIds[]', legacyId)
      if (legacyIds.has(legacyId) || ids.has(legacyId)) errors.push(`${label}: 旧ID ${legacyId} が重複しています。`)
      legacyIds.add(legacyId)
    }

    if (!Number.isInteger(question?.examYear)) errors.push(`${label}: examYear がありません。`)
    if (!['春期', '秋期'].includes(question?.examSeason)) errors.push(`${label}: examSeason は 春期 または 秋期 にしてください。`)
    if (!['morning', 'afternoon'].includes(question?.examType)) errors.push(`${label}: examType は morning または afternoon にしてください。`)
    if (!Number.isInteger(question?.questionNumber) || question.questionNumber < 1) errors.push(`${label}: questionNumber がありません。`)
    requireText('field', question?.field)
    if (!allowedFields.has(question?.field)) errors.push(`${label}: field「${question?.field}」は許可されていません。`)
    requireText('subField', question?.subField)
    requireText('questionText', question?.questionText)

    if (question?.assets !== undefined) {
      if (!Array.isArray(question.assets)) {
        errors.push(`${label}: assets は配列にしてください。`)
      } else {
        for (const [assetIndex, asset] of question.assets.entries()) {
          const assetLabel = `assets[${assetIndex}]`
          if (!asset || typeof asset !== 'object' || Array.isArray(asset)) {
            errors.push(`${label}: ${assetLabel} はオブジェクトにしてください。`)
            continue
          }
          if (asset.type !== 'image') errors.push(`${label}: ${assetLabel}.type は image にしてください。`)
          requireText(`${assetLabel}.src`, asset.src)
          requireText(`${assetLabel}.alt`, asset.alt)
          for (const key of ['caption', 'sourceName', 'sourceUrl']) {
            if (asset[key] !== undefined && typeof asset[key] !== 'string') errors.push(`${label}: ${assetLabel}.${key} は文字列にしてください。`)
          }
          if (typeof asset.src === 'string' && asset.src.trim() !== '') {
            if (!asset.src.startsWith('/IPA_AP_STUDY/assets/ipa/ap/')) {
              errors.push(`${label}: ${assetLabel}.src は /IPA_AP_STUDY/assets/ipa/ap/ で始めてください。`)
            } else if (!allowedImageExtensions.test(asset.src)) {
              errors.push(`${label}: ${assetLabel}.src の拡張子は .webp、.png、.jpg、.jpeg、.svg のいずれかにしてください。`)
            } else {
              const publicAssetUrl = new URL(`public${asset.src.slice('/IPA_AP_STUDY'.length)}`, root)
              try {
                await access(publicAssetUrl)
                const { size } = await stat(publicAssetUrl)
                if (size > imageErrorSize) {
                  errors.push(`${label}: ${assetLabel}.src の画像サイズが1MBを超えています（${size} bytes）。`)
                } else if (size > imageWarningSize) {
                  warnings.push(`${label}: ${assetLabel}.src の画像サイズが500KBを超えています（${size} bytes）。`)
                }
              } catch {
                errors.push(`${label}: ${assetLabel}.src に対応するファイルが public/assets/ipa/ap/ にありません（${asset.src}）。`)
              }
            }
          }
        }
      }
    }

    if (question?.tables !== undefined) {
      if (!Array.isArray(question.tables)) {
        errors.push(`${label}: tables は配列にしてください。`)
      } else {
        for (const [tableIndex, table] of question.tables.entries()) {
          const tableLabel = `tables[${tableIndex}]`
          if (!table || typeof table !== 'object' || Array.isArray(table)) {
            errors.push(`${label}: ${tableLabel} はオブジェクトにしてください。`)
            continue
          }
          for (const key of ['caption', 'sourceName', 'sourceUrl']) {
            if (table[key] !== undefined && typeof table[key] !== 'string') errors.push(`${label}: ${tableLabel}.${key} は文字列にしてください。`)
          }
          if (!Array.isArray(table.headers) || table.headers.length === 0) {
            errors.push(`${label}: ${tableLabel}.headers は1列以上必要です。`)
          } else {
            table.headers.forEach((header, headerIndex) => {
              if (typeof header !== 'string') errors.push(`${label}: ${tableLabel}.headers[${headerIndex}] は文字列にしてください。`)
            })
          }
          if (!Array.isArray(table.rows) || table.rows.length === 0) {
            errors.push(`${label}: ${tableLabel}.rows は1行以上必要です。`)
          } else {
            table.rows.forEach((row, rowIndex) => {
              if (!Array.isArray(row)) {
                errors.push(`${label}: ${tableLabel}.rows[${rowIndex}] は配列にしてください。`)
                return
              }
              if (Array.isArray(table.headers) && row.length !== table.headers.length) errors.push(`${label}: ${tableLabel}.rows[${rowIndex}] の列数を headers と一致させてください。`)
              row.forEach((cell, cellIndex) => {
                if (typeof cell !== 'string') errors.push(`${label}: ${tableLabel}.rows[${rowIndex}][${cellIndex}] は文字列にしてください。`)
              })
            })
          }
        }
      }
    }

    if (!Array.isArray(question?.choices) || question.choices.length !== 4) {
      errors.push(`${label}: choices は4つ必要です。`)
    } else {
      const actualKeys = question.choices.map(choice => choice?.key)
      if (!choiceKeys.every(key => actualKeys.includes(key)) || new Set(actualKeys).size !== 4) errors.push(`${label}: choices は ア・イ・ウ・エ を一つずつ持つ必要があります。`)
      question.choices.forEach((choice, choiceIndex) => requireText(`choices[${choiceIndex}].text`, choice?.text))
    }
    if (!choiceKeys.includes(question?.correctAnswer)) errors.push(`${label}: correctAnswer は ア・イ・ウ・エ のいずれかにしてください。`)

    requireText('officialAnswerText', question?.officialAnswerText)
    const correctChoice = question?.choices?.find(choice => choice?.key === question?.correctAnswer)
    if (correctChoice && question?.officialAnswerText !== `${question.correctAnswer}：${correctChoice.text}`) errors.push(`${label}: officialAnswerText は正解記号と正解選択肢に一致させてください。`)
    requireText('sourceName', question?.sourceName)
    requireText('sourceUrl', question?.sourceUrl)
    if (typeof question?.isQuoteFromIpa !== 'boolean') errors.push(`${label}: isQuoteFromIpa は boolean にしてください。`)
    if (question?.isQuoteFromIpa === true) {
      if (!String(question.sourceName ?? '').includes('情報処理推進機構（IPA）')) errors.push(`${label}: IPA引用問題の sourceName には情報処理推進機構（IPA）を明記してください。`)
      if (!/^https:\/\//.test(question.sourceUrl ?? '')) errors.push(`${label}: IPA引用問題の sourceUrl には確認済みのHTTPS URLが必要です。`)
    }
    if (question?.isQuoteFromIpa === false && !String(question.sourceName ?? '').startsWith('AP Study')) errors.push(`${label}: オリジナル問題の sourceName は AP Study から始めてください。`)
    if (!question?.explanation || typeof question.explanation !== 'object') {
      errors.push(`${label}: explanation がありません。`)
    } else {
      requireText('explanation.correctReason', question.explanation.correctReason)
      if (!question.explanation.wrongReasons || typeof question.explanation.wrongReasons !== 'object' || Array.isArray(question.explanation.wrongReasons)) {
        errors.push(`${label}: explanation.wrongReasons がありません。`)
      } else if (question?.isQuoteFromIpa === true) {
        choiceKeys.filter(key => key !== question.correctAnswer).forEach(key => requireText(`explanation.wrongReasons.${key}`, question.explanation.wrongReasons[key]))
      }
      if (!Array.isArray(question.explanation.points)) errors.push(`${label}: explanation.points は配列にしてください。`)
      if (!Array.isArray(question.explanation.keywords)) errors.push(`${label}: explanation.keywords は配列にしてください。`)
    }

    if (Number.isInteger(question?.examYear) && Number.isInteger(question?.questionNumber)) {
      const reiwaYear = String(question.examYear - 2018).padStart(2, '0')
      const season = question.examSeason === '春期' ? 'spring' : 'autumn'
      const examType = question.examType === 'morning' ? 'am' : 'pm'
      const questionNumber = String(question.questionNumber).padStart(question.examType === 'morning' ? 3 : 2, '0')
      const expectedId = `ap-r${reiwaYear}-${season}-${examType}-q${questionNumber}`
      if (isIpaId && question.id !== expectedId) errors.push(`${label}: メタデータから期待されるIDは ${expectedId} です。`)
    }
  }

  const catalogIds = new Set()
  if (!Array.isArray(ipaPastExamCatalog) || ipaPastExamCatalog.length === 0) errors.push('ipaPastExamCatalog: 1件以上の配列が必要です。')
  for (const [index, item] of (ipaPastExamCatalog ?? []).entries()) {
    const label = item?.id || `ipaPastExamCatalog[${index}]`
    const requireText = (key, value) => {
      if (typeof value !== 'string' || value.trim() === '') errors.push(`${label}: ${key} がありません。`)
    }
    requireText('id', item?.id)
    if (catalogIds.has(item?.id)) errors.push(`${label}: カタログIDが重複しています。`)
    catalogIds.add(item?.id)
    if (item?.category !== 'AP') errors.push(`${label}: category は AP にしてください。`)
    if (!Number.isInteger(item?.period?.year)) errors.push(`${label}: period.year がありません。`)
    requireText('period.eraLabel', item?.period?.eraLabel)
    if (!['spring', 'autumn', 'special', 'unknown'].includes(item?.period?.season)) errors.push(`${label}: period.season が不正です。`)
    requireText('period.seasonLabel', item?.period?.seasonLabel)
    if (!['morning', 'afternoon'].includes(item?.paperType)) errors.push(`${label}: paperType が不正です。`)
    requireText('title', item?.title)
    if (typeof item?.isReadyForImport !== 'boolean') errors.push(`${label}: isReadyForImport は boolean にしてください。`)
    if (item?.importStatus !== undefined && !['not-imported', 'partial', 'imported'].includes(item.importStatus)) errors.push(`${label}: importStatus が不正です。`)
    if (item?.importedQuestionCount !== undefined && (!Number.isInteger(item.importedQuestionCount) || item.importedQuestionCount < 0)) errors.push(`${label}: importedQuestionCount は0以上の整数にしてください。`)
    if (item?.importStatus === 'imported') {
      if (!Number.isInteger(item.importedQuestionCount) || item.importedQuestionCount < 1) errors.push(`${label}: imported の場合は importedQuestionCount が必要です。`)
      const seasonLabel = item.period?.season === 'spring' ? '春期' : item.period?.season === 'autumn' ? '秋期' : undefined
      const actualCount = (questions ?? []).filter(question => question.examYear === item.period?.year && question.examSeason === seasonLabel && question.examType === item.paperType && question.isQuoteFromIpa === true).length
      if (actualCount !== item.importedQuestionCount) errors.push(`${label}: importedQuestionCount は実データ${actualCount}問と一致させてください。`)
    }
    for (const key of ['questionPdfUrl', 'answerPdfUrl', 'commentaryPdfUrl', 'sourcePageUrl']) {
      const value = item?.[key]
      if (value !== undefined && (typeof value !== 'string' || value.trim() === '' || !/^https:\/\//.test(value))) errors.push(`${label}: ${key} は未確認なら省略し、設定する場合はHTTPS URLにしてください。`)
    }
  }

  if (warnings.length > 0) {
    console.warn(`問題データ検証で ${warnings.length} 件の警告が見つかりました。`)
    warnings.forEach(warning => console.warn(`- ${warning}`))
  }
  if (errors.length > 0) {
    console.error(`問題データ検証で ${errors.length} 件のエラーが見つかりました。`)
    errors.forEach(error => console.error(`- ${error}`))
    process.exitCode = 1
  } else {
    console.log(`問題データ検証成功: ${questions.length}問、${allowedFields.size}分野、過去問カタログ${ipaPastExamCatalog.length}件`)
  }
} catch (error) {
  console.error('問題データを読み込めませんでした。', error)
  process.exitCode = 1
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true })
}
