export type AddonField = {
  name: string
  label: string
  kind: 'text' | 'textarea' | 'number'
  required?: boolean
}

export type AddonManifest = {
  id: string
  name: string
  version: string
  description: string
  navLabel: string
  icon: string
  recordLabel: string
  fields: AddonField[]
  widget?: string
  source: 'catalog' | 'upload'
  installed: boolean
}

export type AddonRecord = {
  id: string
  attributes: Record<string, string | number>
  createdAt: string
}
