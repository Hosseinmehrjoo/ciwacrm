export type ModuleLink = {
  link: string
  label: string
  suite: string
  title: 'name' | 'person'
}

export const activityLinks: ModuleLink[] = [
  { link: 'tasks', label: 'وظایف', suite: 'Tasks', title: 'name' },
  { link: 'meetings', label: 'قرارها', suite: 'Meetings', title: 'name' },
  { link: 'calls', label: 'تماس‌ها', suite: 'Calls', title: 'name' },
  { link: 'notes', label: 'یادداشت‌ها', suite: 'Notes', title: 'name' },
  { link: 'emails', label: 'ایمیل‌ها', suite: 'Emails', title: 'name' },
]

export const documentLink: ModuleLink = {
  link: 'documents',
  label: 'اسناد',
  suite: 'Documents',
  title: 'name',
}
