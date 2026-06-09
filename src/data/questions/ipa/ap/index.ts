import { r07AutumnMorningQuestions } from './r07-autumn-morning.js'
import type { Question } from '../../../../types'

/** 年度・期別モジュールを追加した際に、この配列へ明示的に登録する。 */
export const ipaApQuestionSets: readonly (readonly Question[])[] = [r07AutumnMorningQuestions]
