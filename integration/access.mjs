/** Modules that only system admins may touch at all (including list). */
export const ADMIN_ONLY_MODULES = new Set([
  'ACLRoles',
  'SecurityGroups',
  'AOW_WorkFlow',
  'AOW_Processed',
  'AOBH_BusinessHours',
  'Schedulers',
  'OutboundEmailAccounts',
  'InboundEmail',
  'OAuth2Clients',
  'OAuth2Tokens',
  'ExternalOAuthProvider',
  'ExternalOAuthConnection',
  'CalendarAccount',
])

/** Modules non-admins may read (for relates) but never mutate. */
export const ADMIN_WRITE_MODULES = new Set([
  'Users',
  'Employees',
])

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

/**
 * Resolve SuiteCRM module name from a /V8/... path and optional JSON:API body.
 */
export function resolveCrmModule(pathname, method, rawBody) {
  const path = String(pathname || '')
  const createMatch = path.match(/^\/V8\/module\/?$/)
  if (createMatch && method === 'POST') {
    try {
      const parsed = rawBody ? JSON.parse(String(rawBody)) : null
      const type = parsed?.data?.type
      if (typeof type === 'string' && type.trim()) return type.trim()
    } catch {
      return null
    }
    return null
  }

  const moduleMatch = path.match(/^\/V8\/module\/([^/]+)/)
  if (moduleMatch) return decodeURIComponent(moduleMatch[1])

  return null
}

export function isAdminUser(attributes) {
  const flag = attributes?.is_admin
  return flag === true || flag === 1 || flag === '1'
}

/**
 * Returns a Persian error message when the caller must be blocked, else null.
 */
export function adminGateMessage({ module, method, isAdmin }) {
  if (!module || isAdmin) return null
  const mutating = MUTATING.has(String(method || 'GET').toUpperCase())

  if (ADMIN_WRITE_MODULES.has(module)) {
    if (mutating) {
      return 'فقط مدیر سیستم می‌تواند کاربران و کارمندان را ایجاد، ویرایش یا حذف کند.'
    }
    // Allow read so relate pickers keep working; UI still hides these modules.
    return null
  }

  if (ADMIN_ONLY_MODULES.has(module)) {
    return 'این بخش فقط برای مدیر سیستم در دسترس است.'
  }

  return null
}
