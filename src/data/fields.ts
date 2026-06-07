export const FIELDS = {
  basicTheory: '基礎理論',
  computerSystems: 'コンピュータシステム',
  security: '情報セキュリティ',
  network: 'ネットワーク',
  database: 'データベース',
  systemDevelopment: 'システム開発',
  projectManagement: 'プロジェクトマネジメント',
  serviceManagement: 'サービスマネジメント',
  systemAudit: 'システム監査',
  strategy: 'ストラテジ',
} as const

export const FIELD_NAMES = Object.values(FIELDS)

export type FieldName = typeof FIELD_NAMES[number]
