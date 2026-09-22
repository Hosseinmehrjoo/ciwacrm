export type FieldKind = 'text' | 'textarea' | 'email' | 'tel' | 'number' | 'date' | 'datetime' | 'select'

export type FieldDef = {
  name: string
  label: string
  kind?: FieldKind
  required?: boolean
  options?: { value: string; label: string }[]
  list?: boolean
  search?: boolean
}

export type ModuleDef = {
  id: string
  suite: string
  label: string
  singular: string
  group: string
  fields: FieldDef[]
}

const stageProbability: Record<string, string> = {
  Prospecting: '10',
  Qualification: '20',
  'Needs Analysis': '25',
  'Value Proposition': '30',
  'Id. Decision Makers': '40',
  'Perception Analysis': '50',
  'Proposal/Price Quote': '65',
  'Negotiation/Review': '80',
  'Closed Won': '100',
  'Closed Lost': '0',
}

export function probabilityForStage(stage: string) {
  return stageProbability[stage] || ''
}

const salesStages = [
  ['Prospecting', 'شناسایی'],
  ['Qualification', 'ارزیابی'],
  ['Needs Analysis', 'تحلیل نیاز'],
  ['Value Proposition', 'پیشنهاد ارزش'],
  ['Id. Decision Makers', 'شناسایی تصمیم‌گیران'],
  ['Perception Analysis', 'تحلیل برداشت'],
  ['Proposal/Price Quote', 'پیشنهاد قیمت'],
  ['Negotiation/Review', 'مذاکره'],
  ['Closed Won', 'موفق'],
  ['Closed Lost', 'ناموفق'],
] as const

const taskStatus = [
  ['Not Started', 'شروع نشده'],
  ['In Progress', 'در حال انجام'],
  ['Completed', 'انجام شده'],
  ['Pending Input', 'منتظر ورودی'],
  ['Deferred', 'به تعویق افتاده'],
] as const

const priority = [
  ['High', 'بالا'],
  ['Medium', 'متوسط'],
  ['Low', 'پایین'],
] as const

const activityStatus = [
  ['Planned', 'برنامه‌ریزی شده'],
  ['Held', 'برگزار شده'],
  ['Not Held', 'برگزار نشده'],
] as const

const caseStatus = [
  ['Open_New', 'جدید'],
  ['Open_Assigned', 'واگذار شده'],
  ['Open_Pending Input', 'منتظر ورودی'],
  ['Closed_Closed', 'بسته'],
  ['Closed_Rejected', 'رد شده'],
  ['Closed_Duplicate', 'تکراری'],
] as const

const casePriority = [
  ['P1', 'بالا'],
  ['P2', 'متوسط'],
  ['P3', 'پایین'],
] as const

const campaignStatus = [
  ['Planning', 'برنامه‌ریزی'],
  ['Active', 'فعال'],
  ['Inactive', 'غیرفعال'],
  ['Complete', 'تمام شده'],
] as const

const campaignType = [
  ['Email', 'ایمیل'],
  ['NewsLetter', 'خبرنامه'],
  ['Telesales', 'فروش تلفنی'],
  ['Mail', 'پست'],
  ['Web', 'وب'],
  ['Survey', 'نظرسنجی'],
  ['Print', 'چاپی'],
  ['Radio', 'رادیو'],
  ['Television', 'تلویزیون'],
] as const

const leadStatus = [
  ['New', 'جدید'],
  ['Assigned', 'واگذار شده'],
  ['In Process', 'در حال پیگیری'],
  ['Converted', 'تبدیل شده'],
  ['Recycled', 'بازگشتی'],
  ['Dead', 'بسته'],
] as const

const invoiceStatus = [
  ['Unpaid', 'پرداخت نشده'],
  ['Paid', 'پرداخت شده'],
  ['Cancelled', 'لغو شده'],
] as const

const quoteStage = [
  ['Draft', 'پیش‌نویس'],
  ['Negotiation', 'مذاکره'],
  ['Delivered', 'تحویل شده'],
  ['On Hold', 'معلق'],
  ['Confirmed', 'تأیید شده'],
  ['Closed Accepted', 'پذیرفته'],
  ['Closed Lost', 'از دست رفته'],
  ['Closed Dead', 'بسته'],
] as const

const contractStatus = [
  ['Not Started', 'شروع نشده'],
  ['In Progress', 'در جریان'],
  ['Signed', 'امضا شده'],
] as const

const reportModules = [
  ['Contacts', 'مخاطبین'],
  ['Accounts', 'مشتریان'],
  ['Leads', 'سرنخ‌ها'],
  ['Opportunities', 'فرصت‌های فروش'],
  ['Cases', 'تیکت‌ها'],
  ['Campaigns', 'کمپین‌ها'],
  ['AOS_Invoices', 'فاکتورها'],
  ['AOS_Quotes', 'پیش‌فاکتورها'],
  ['Tasks', 'وظایف'],
  ['Meetings', 'قرارها'],
] as const

function options(pairs: readonly (readonly [string, string])[]) {
  return pairs.map(([value, label]) => ({ value, label }))
}

export const modules: ModuleDef[] = [
  {
    id: 'contacts',
    suite: 'Contacts',
    label: 'مخاطبین',
    singular: 'مخاطب',
    group: 'people',
    fields: [
      { name: 'first_name', label: 'نام', list: true, search: true },
      { name: 'last_name', label: 'نام خانوادگی', required: true, list: true, search: true },
      { name: 'title', label: 'سمت', list: true },
      { name: 'department', label: 'دپارتمان' },
      { name: 'phone_mobile', label: 'موبایل', kind: 'tel', list: true },
      { name: 'phone_work', label: 'تلفن', kind: 'tel' },
      { name: 'email1', label: 'ایمیل', kind: 'email', list: true },
    ],
  },
  {
    id: 'accounts',
    suite: 'Accounts',
    label: 'مشتریان',
    singular: 'مشتری',
    group: 'people',
    fields: [
      { name: 'name', label: 'نام سازمان', required: true, list: true, search: true },
      { name: 'phone_office', label: 'تلفن', kind: 'tel', list: true },
      { name: 'email1', label: 'ایمیل', kind: 'email', list: true },
      { name: 'website', label: 'وب‌سایت', list: true },
      { name: 'billing_address_city', label: 'شهر' },
      { name: 'description', label: 'توضیح', kind: 'textarea' },
    ],
  },
  {
    id: 'leads',
    suite: 'Leads',
    label: 'سرنخ‌ها',
    singular: 'سرنخ',
    group: 'marketing',
    fields: [
      { name: 'first_name', label: 'نام', list: true, search: true },
      { name: 'last_name', label: 'نام خانوادگی', required: true, list: true, search: true },
      { name: 'status', label: 'وضعیت', kind: 'select', options: options(leadStatus), list: true },
      { name: 'title', label: 'سمت' },
      { name: 'phone_mobile', label: 'موبایل', kind: 'tel', list: true },
      { name: 'email1', label: 'ایمیل', kind: 'email', list: true },
      { name: 'account_name', label: 'سازمان', search: true },
    ],
  },
  {
    id: 'prospects',
    suite: 'Prospects',
    label: 'مخاطبان هدف',
    singular: 'مخاطب هدف',
    group: 'marketing',
    fields: [
      { name: 'first_name', label: 'نام', list: true, search: true },
      { name: 'last_name', label: 'نام خانوادگی', required: true, list: true, search: true },
      { name: 'title', label: 'سمت', list: true },
      { name: 'phone_mobile', label: 'موبایل', kind: 'tel', list: true },
      { name: 'email1', label: 'ایمیل', kind: 'email', list: true },
    ],
  },
  {
    id: 'opportunities',
    suite: 'Opportunities',
    label: 'فرصت‌های فروش',
    singular: 'فرصت فروش',
    group: 'sales',
    fields: [
      { name: 'name', label: 'عنوان', required: true, list: true, search: true },
      { name: 'amount', label: 'مبلغ', kind: 'number', required: true, list: true },
      { name: 'sales_stage', label: 'مرحله', kind: 'select', required: true, options: options(salesStages), list: true },
      { name: 'probability', label: 'احتمال (درصد)', kind: 'number', list: true },
      { name: 'date_closed', label: 'تاریخ بستن', kind: 'date', required: true },
      { name: 'next_step', label: 'گام بعدی' },
      { name: 'description', label: 'توضیح', kind: 'textarea' },
    ],
  },
  {
    id: 'quotes',
    suite: 'AOS_Quotes',
    label: 'پیش‌فاکتورها',
    singular: 'پیش‌فاکتور',
    group: 'finance',
    fields: [
      { name: 'name', label: 'عنوان', required: true, list: true, search: true },
      { name: 'stage', label: 'مرحله', kind: 'select', options: options(quoteStage), list: true },
      { name: 'total_amount', label: 'مبلغ', kind: 'number', list: true },
      { name: 'expiration', label: 'اعتبار تا', kind: 'date' },
    ],
  },
  {
    id: 'cases',
    suite: 'Cases',
    label: 'تیکت‌ها',
    singular: 'تیکت',
    group: 'support',
    fields: [
      { name: 'name', label: 'موضوع', required: true, list: true, search: true },
      { name: 'status', label: 'وضعیت', kind: 'select', required: true, options: options(caseStatus), list: true },
      { name: 'priority', label: 'اولویت', kind: 'select', options: options(casePriority), list: true },
      { name: 'description', label: 'شرح', kind: 'textarea' },
    ],
  },
  {
    id: 'campaigns',
    suite: 'Campaigns',
    label: 'کمپین‌ها',
    singular: 'کمپین',
    group: 'marketing',
    fields: [
      { name: 'name', label: 'نام', required: true, list: true, search: true },
      { name: 'status', label: 'وضعیت', kind: 'select', options: options(campaignStatus), list: true },
      { name: 'campaign_type', label: 'نوع', kind: 'select', options: options(campaignType), list: true },
      { name: 'end_date', label: 'تاریخ پایان', kind: 'date' },
      { name: 'budget', label: 'بودجه', kind: 'number', list: true },
    ],
  },
  {
    id: 'tasks',
    suite: 'Tasks',
    label: 'وظایف',
    singular: 'وظیفه',
    group: 'activity',
    fields: [
      { name: 'name', label: 'عنوان', required: true, list: true, search: true },
      { name: 'status', label: 'وضعیت', kind: 'select', required: true, options: options(taskStatus), list: true },
      { name: 'priority', label: 'اولویت', kind: 'select', options: options(priority), list: true },
      { name: 'date_due', label: 'موعد', kind: 'datetime', list: true },
      { name: 'description', label: 'شرح', kind: 'textarea' },
    ],
  },
  {
    id: 'meetings',
    suite: 'Meetings',
    label: 'قرارها',
    singular: 'قرار',
    group: 'activity',
    fields: [
      { name: 'name', label: 'عنوان', required: true, list: true, search: true },
      { name: 'status', label: 'وضعیت', kind: 'select', options: options(activityStatus), list: true },
      { name: 'date_start', label: 'شروع', kind: 'datetime', required: true, list: true },
      { name: 'location', label: 'مکان', list: true },
      { name: 'description', label: 'شرح', kind: 'textarea' },
    ],
  },
  {
    id: 'calls',
    suite: 'Calls',
    label: 'تماس‌ها',
    singular: 'تماس',
    group: 'activity',
    fields: [
      { name: 'name', label: 'موضوع', required: true, list: true, search: true },
      { name: 'direction', label: 'جهت', kind: 'select', options: options([['Outbound', 'خروجی'], ['Inbound', 'ورودی']]), list: true },
      { name: 'status', label: 'وضعیت', kind: 'select', options: options(activityStatus), list: true },
      { name: 'date_start', label: 'زمان', kind: 'datetime', required: true, list: true },
      { name: 'description', label: 'شرح', kind: 'textarea' },
    ],
  },
  {
    id: 'notes',
    suite: 'Notes',
    label: 'یادداشت‌ها',
    singular: 'یادداشت',
    group: 'activity',
    fields: [
      { name: 'name', label: 'موضوع', required: true, list: true, search: true },
      { name: 'description', label: 'متن', kind: 'textarea', list: true },
    ],
  },
  {
    id: 'invoices',
    suite: 'AOS_Invoices',
    label: 'فاکتورها',
    singular: 'فاکتور',
    group: 'finance',
    fields: [
      { name: 'name', label: 'عنوان', required: true, list: true, search: true },
      { name: 'number', label: 'شماره', kind: 'number', list: true },
      { name: 'status', label: 'وضعیت', kind: 'select', options: options(invoiceStatus), list: true },
      { name: 'total_amount', label: 'مبلغ', kind: 'number', list: true },
      { name: 'due_date', label: 'سررسید', kind: 'date' },
    ],
  },
  {
    id: 'contracts',
    suite: 'AOS_Contracts',
    label: 'قراردادها',
    singular: 'قرارداد',
    group: 'finance',
    fields: [
      { name: 'name', label: 'عنوان', required: true, list: true, search: true },
      { name: 'status', label: 'وضعیت', kind: 'select', options: options(contractStatus), list: true },
      { name: 'total_contract_value', label: 'مبلغ', kind: 'number', list: true },
      { name: 'start_date', label: 'شروع', kind: 'date' },
      { name: 'end_date', label: 'پایان', kind: 'date', list: true },
    ],
  },
  {
    id: 'products',
    suite: 'AOS_Products',
    label: 'محصولات',
    singular: 'محصول',
    group: 'finance',
    fields: [
      { name: 'name', label: 'نام', required: true, list: true, search: true },
      { name: 'part_number', label: 'کد', list: true },
      { name: 'price', label: 'قیمت', kind: 'number', list: true },
      { name: 'description', label: 'توضیح', kind: 'textarea' },
    ],
  },
  {
    id: 'reports',
    suite: 'AOR_Reports',
    label: 'گزارش‌ها',
    singular: 'گزارش',
    group: 'insight',
    fields: [
      { name: 'name', label: 'نام', required: true, list: true, search: true },
      { name: 'report_module', label: 'ماژول', kind: 'select', required: true, options: options(reportModules), list: true },
      { name: 'graphs_per_row', label: 'نمودار در هر ردیف', kind: 'number', required: true },
    ],
  },
]

export function moduleById(id: string) {
  return modules.find((item) => item.id === id)
}

export function modulesInGroup(group: string) {
  return modules.filter((item) => item.group === group)
}

export function optionLabel(field: FieldDef, value: string) {
  return field.options?.find((option) => option.value === value)?.label || value
}
