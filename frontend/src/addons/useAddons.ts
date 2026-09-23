import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '../api/client'
import { installAddon, listAddons, removeAddon, uploadAddon } from './api'
import type { AddonManifest } from './types'

export function useAddons(enabled: boolean) {
  const [addons, setAddons] = useState<AddonManifest[]>([])
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    try {
      const payload = await listAddons()
      setAddons(payload.addons)
      setError('')
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'فهرست ماژول‌ها خوانده نشد.')
    } finally {
      setReady(true)
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    void refresh()
  }, [enabled, refresh])

  async function install(id: string) {
    const payload = await installAddon(id)
    setAddons((current) => current.map((addon) => addon.id === payload.addon.id ? payload.addon : addon))
  }

  async function remove(id: string) {
    await removeAddon(id)
    setAddons((current) => current.map((addon) => addon.id === id ? { ...addon, installed: false } : addon))
  }

  async function upload(file: File) {
    const payload = await uploadAddon(file)
    setAddons((current) => {
      const rest = current.filter((addon) => addon.id !== payload.addon.id)
      return [...rest, payload.addon]
    })
  }

  return { addons, ready, error, install, remove, upload }
}
