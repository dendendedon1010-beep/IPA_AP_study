import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'

const root = new URL('../', import.meta.url)
const temporaryDirectory = await mkdtemp(join(tmpdir(), 'ap-study-questions-'))
const choiceKeys = ['ア', 'イ', 'ウ', 'エ']
const ipaIdPattern = /^ap-r\d{2}-(spring|autumn)-(am|pm)-q\d{3}$/
const originalIdPattern = /^ap-original-am-[a-z0-9]+(?:-[a-z0-9]+)*-q\d{3}$/
const errors = []

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
  await writeFile(join(temporaryDirectory, outputName), result.outputText)
}

try {
  await transpile('src/data/fields.ts', 'fields.js')
  await transpile('src/data/questions.ts', 'questions.js')
  const [{ FIELD_NAMES }, { questions }] = await Promise.all([
    import(pathToFileURL(join(temporaryDirectory, 'fields.js')).href),
    import(pathToFileURL(join(temporaryDirectory, 'questions.js')).href),
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
    const isIpaId = ipaIdPattern.test(question?.id ?? '')
    const isOriginalId = originalIdPattern.test(question?.id ?? '')
    if (!isIpaId && !isOriginalId) errors.push(`${label}: id は ap-r05-autumn-am-q001 又は ap-original-am-security-q001 形式にしてください。`)
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

    if (!Array.isArray(question?.choices) || question.choices.length !== 4) {
      errors.push(`${label}: choices は4つ必要です。`)
    } else {
      const actualKeys = question.choices.map(choice => choice?.key)
      if (!choiceKeys.every(key => actualKeys.includes(key)) || new Set(actualKeys).size !== 4) errors.push(`${label}: choices は ア・イ・ウ・エ を一つずつ持つ必要があります。`)
      question.choices.forEach((choice, choiceIndex) => requireText(`choices[${choiceIndex}].text`, choice?.text))
    }
    if (!choiceKeys.includes(question?.correctAnswer)) errors.push(`${label}: correctAnswer は ア・イ・ウ・エ のいずれかにしてください。`)

    requireText('sourceName', question?.sourceName)
    requireText('sourceUrl', question?.sourceUrl)
    if (typeof question?.isQuoteFromIpa !== 'boolean') errors.push(`${label}: isQuoteFromIpa は boolean にしてください。`)
    if (!question?.explanation || typeof question.explanation !== 'object') {
      errors.push(`${label}: explanation がありません。`)
    } else {
      requireText('explanation.correctReason', question.explanation.correctReason)
      if (!question.explanation.wrongReasons || typeof question.explanation.wrongReasons !== 'object' || Array.isArray(question.explanation.wrongReasons)) errors.push(`${label}: explanation.wrongReasons がありません。`)
      if (!Array.isArray(question.explanation.points)) errors.push(`${label}: explanation.points は配列にしてください。`)
      if (!Array.isArray(question.explanation.keywords)) errors.push(`${label}: explanation.keywords は配列にしてください。`)
    }

    if (Number.isInteger(question?.examYear) && Number.isInteger(question?.questionNumber)) {
      const reiwaYear = String(question.examYear - 2018).padStart(2, '0')
      const season = question.examSeason === '春期' ? 'spring' : 'autumn'
      const examType = question.examType === 'morning' ? 'am' : 'pm'
      const expectedId = `ap-r${reiwaYear}-${season}-${examType}-q${String(question.questionNumber).padStart(3, '0')}`
      if (isIpaId && question.id !== expectedId) errors.push(`${label}: メタデータから期待されるIDは ${expectedId} です。`)
    }
  }

  if (errors.length > 0) {
    console.error(`問題データ検証で ${errors.length} 件のエラーが見つかりました。`)
    errors.forEach(error => console.error(`- ${error}`))
    process.exitCode = 1
  } else {
    console.log(`問題データ検証成功: ${questions.length}問、${allowedFields.size}分野`)
  }
} catch (error) {
  console.error('問題データを読み込めませんでした。', error)
  process.exitCode = 1
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true })
}
