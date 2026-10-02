export type FieldKind = 'text' | 'textarea' | 'email' | 'tel' | 'number' | 'date' | 'datetime' | 'select' | 'relate'

export type FieldDef = {
  name: string
  label: string
  kind?: FieldKind
  required?: boolean
  options?: { value: string; label: string }[]
  list?: boolean
  search?: boolean
  relate?: { suite: string; label: string }
}

export type ModuleLink = {
  link: string
  label: string
  suite: string
  title: 'name' | 'person'
}

export type ModuleDef = {
  id: string
  suite: string
  label: string
  singular: string
  group: string
  fields: FieldDef[]
  links?: ModuleLink[]
  board?: boolean
  lines?: boolean
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
      { name: 'account_id', label: 'مشتری', kind: 'relate', relate: { suite: 'Accounts', label: 'name' } },
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
    links: [
      { link: 'contacts', label: 'مخاطبین', suite: 'Contacts', title: 'person' },
      { link: 'opportunities', label: 'فرصت‌های فروش', suite: 'Opportunities', title: 'name' },
      { link: 'cases', label: 'تیکت‌ها', suite: 'Cases', title: 'name' },
      { link: 'aos_quotes', label: 'پیش‌فاکتورها', suite: 'AOS_Quotes', title: 'name' },
      { link: 'aos_invoices', label: 'فاکتورها', suite: 'AOS_Invoices', title: 'name' },
      { link: 'aos_contracts', label: 'قراردادها', suite: 'AOS_Contracts', title: 'name' },
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
    board: true,
    fields: [
      { name: 'name', label: 'عنوان', required: true, list: true, search: true },
      { name: 'account_id', label: 'مشتری', kind: 'relate', relate: { suite: 'Accounts', label: 'name' } },
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
    lines: true,
    fields: [
      { name: 'name', label: 'عنوان', required: true, list: true, search: true },
      { name: 'billing_account_id', label: 'مشتری', kind: 'relate', relate: { suite: 'Accounts', label: 'name' } },
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
      { name: 'account_id', label: 'مشتری', kind: 'relate', relate: { suite: 'Accounts', label: 'name' } },
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
      { name: 'duration_hours', label: 'مدت (ساعت)', kind: 'number' },
      { name: 'duration_minutes', label: 'مدت (دقیقه)', kind: 'number', list: true },
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
    lines: true,
    fields: [
      { name: 'name', label: 'عنوان', required: true, list: true, search: true },
      { name: 'billing_account_id', label: 'مشتری', kind: 'relate', relate: { suite: 'Accounts', label: 'name' } },
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
    lines: true,
    fields: [
      { name: 'name', label: 'عنوان', required: true, list: true, search: true },
      { name: 'billing_account_id', label: 'مشتری', kind: 'relate', relate: { suite: 'Accounts', label: 'name' } },
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
  {
    id: 'scheduled-reports',
    suite: 'AOR_Scheduled_Reports',
    label: 'گزارش‌های زمان‌بندی‌شده',
    singular: 'گزارش زمان‌بندی‌شده',
    group: 'insight',
    fields: [
      { name: 'name', label: 'نام', required: true, list: true, search: true },
      { name: 'status', label: 'وضعیت', list: true },
      { name: 'schedule', label: 'زمان‌بندی', required: true, list: true },
    ],
  },
  {
    id: 'users',
    suite: 'Users',
    label: 'کاربران',
    singular: 'کاربر',
    group: 'people',
    fields: [
      { name: 'user_name', label: 'نام کاربری', required: true, list: true, search: true },
      { name: 'first_name', label: 'نام', list: true, search: true },
      { name: 'last_name', label: 'نام خانوادگی', required: true, list: true, search: true },
      { name: 'title', label: 'سمت', list: true },
      { name: 'department', label: 'دپارتمان' },
      { name: 'phone_work', label: 'تلفن', kind: 'tel' },
    ],
  },
  {
    id: 'employees',
    suite: 'Employees',
    label: 'کارمندان',
    singular: 'کارمند',
    group: 'people',
    fields: [
      { name: 'first_name', label: 'نام', list: true, search: true },
      { name: 'last_name', label: 'نام خانوادگی', required: true, list: true, search: true },
      { name: 'title', label: 'سمت', list: true },
      { name: 'department', label: 'دپارتمان', list: true },
      { name: 'phone_work', label: 'تلفن', kind: 'tel' },
    ],
  },
  {
    id: 'product-categories',
    suite: 'AOS_Product_Categories',
    label: 'دسته‌های محصول',
    singular: 'دسته محصول',
    group: 'finance',
    fields: [
      { name: 'name', label: 'نام', required: true, list: true, search: true },
      { name: 'description', label: 'توضیح', kind: 'textarea', list: true },
    ],
  },
  {
    id: 'pdf-templates',
    suite: 'AOS_PDF_Templates',
    label: 'قالب‌های چاپ',
    singular: 'قالب چاپ',
    group: 'finance',
    fields: [
      { name: 'name', label: 'نام', required: true, list: true, search: true },
      { name: 'type', label: 'نوع سند', list: true },
      { name: 'description', label: 'توضیح', kind: 'textarea' },
    ],
  },
  {
    id: 'currencies',
    suite: 'Currencies',
    label: 'واحدهای پول',
    singular: 'واحد پول',
    group: 'finance',
    fields: [
      { name: 'name', label: 'نام', required: true, list: true, search: true },
      { name: 'symbol', label: 'نماد', required: true, list: true },
      { name: 'iso4217', label: 'کد', list: true },
      { name: 'conversion_rate', label: 'نرخ تبدیل', kind: 'number', required: true },
      { name: 'status', label: 'وضعیت', list: true },
    ],
  },
  {
    id: 'prospect-lists',
    suite: 'ProspectLists',
    label: 'فهرست‌های هدف',
    singular: 'فهرست هدف',
    group: 'marketing',
    fields: [
      { name: 'name', label: 'نام', required: true, list: true, search: true },
      { name: 'list_type', label: 'نوع', list: true },
      { name: 'description', label: 'توضیح', kind: 'textarea' },
    ],
  },
  {
    id: 'emails',
    suite: 'Emails',
    label: 'ایمیل‌ها',
    singular: 'ایمیل',
    group: 'marketing',
    fields: [
      { name: 'name', label: 'موضوع', required: true, list: true, search: true },
      { name: 'from_addr_name', label: 'فرستنده', list: true },
      { name: 'date_sent_received', label: 'زمان', kind: 'datetime', list: true },
      { name: 'description', label: 'متن', kind: 'textarea' },
    ],
  },
  {
    id: 'email-templates',
    suite: 'EmailTemplates',
    label: 'قالب‌های ایمیل',
    singular: 'قالب ایمیل',
    group: 'marketing',
    fields: [
      { name: 'name', label: 'نام', required: true, list: true, search: true },
      { name: 'subject', label: 'موضوع', list: true },
      { name: 'description', label: 'متن', kind: 'textarea' },
    ],
  },
  {
    id: 'email-marketing',
    suite: 'EmailMarketing',
    label: 'ارسال‌های کمپین',
    singular: 'ارسال کمپین',
    group: 'marketing',
    fields: [
      { name: 'name', label: 'نام', required: true, list: true, search: true },
      { name: 'from_addr', label: 'ایمیل فرستنده', kind: 'email', required: true, list: true },
      { name: 'status', label: 'وضعیت', required: true, list: true },
      { name: 'date_start', label: 'شروع', kind: 'datetime', required: true },
    ],
  },
  {
    id: 'documents',
    suite: 'Documents',
    label: 'اسناد',
    singular: 'سند',
    group: 'activity',
    fields: [
      { name: 'document_name', label: 'نام', required: true, list: true, search: true },
      { name: 'status_id', label: 'وضعیت', list: true },
      { name: 'category_id', label: 'دسته', list: true },
      { name: 'active_date', label: 'تاریخ انتشار', kind: 'date', required: true },
      { name: 'exp_date', label: 'تاریخ انقضا', kind: 'date' },
      { name: 'description', label: 'توضیح', kind: 'textarea' },
    ],
  },
  {
    id: 'events',
    suite: 'FP_events',
    label: 'رویدادها',
    singular: 'رویداد',
    group: 'activity',
    fields: [
      { name: 'name', label: 'عنوان', required: true, list: true, search: true },
      { name: 'date_start', label: 'شروع', kind: 'datetime', required: true, list: true },
      { name: 'budget', label: 'بودجه', kind: 'number', list: true },
      { name: 'description', label: 'شرح', kind: 'textarea' },
    ],
  },
  {
    id: 'event-locations',
    suite: 'FP_Event_Locations',
    label: 'مکان‌های رویداد',
    singular: 'مکان رویداد',
    group: 'activity',
    fields: [
      { name: 'name', label: 'نام', required: true, list: true, search: true },
      { name: 'address', label: 'نشانی', required: true, list: true },
      { name: 'address_city', label: 'شهر', required: true, list: true },
      { name: 'capacity', label: 'ظرفیت' },
    ],
  },
  {
    id: 'call-reschedules',
    suite: 'Calls_Reschedule',
    label: 'تغییر زمان تماس',
    singular: 'تغییر زمان',
    group: 'activity',
    fields: [
      { name: 'name', label: 'عنوان', required: true, list: true, search: true },
      { name: 'reason', label: 'دلیل', list: true },
    ],
  },
  {
    id: 'knowledge',
    suite: 'AOK_KnowledgeBase',
    label: 'پایگاه دانش',
    singular: 'مطلب',
    group: 'support',
    fields: [
      { name: 'name', label: 'عنوان', required: true, list: true, search: true },
      { name: 'status', label: 'وضعیت', list: true },
      { name: 'revision', label: 'بازبینی', list: true },
      { name: 'description', label: 'متن', kind: 'textarea' },
    ],
  },
  {
    id: 'knowledge-categories',
    suite: 'AOK_Knowledge_Base_Categories',
    label: 'دسته‌های دانش',
    singular: 'دسته دانش',
    group: 'support',
    fields: [
      { name: 'name', label: 'نام', required: true, list: true, search: true },
      { name: 'description', label: 'توضیح', kind: 'textarea', list: true },
    ],
  },
  {
    id: 'surveys',
    suite: 'Surveys',
    label: 'نظرسنجی‌ها',
    singular: 'نظرسنجی',
    group: 'support',
    fields: [
      { name: 'name', label: 'نام', required: true, list: true, search: true },
      { name: 'status', label: 'وضعیت', list: true },
      { name: 'description', label: 'توضیح', kind: 'textarea' },
    ],
  },
  {
    id: 'survey-questions',
    suite: 'SurveyQuestions',
    label: 'سؤال‌های نظرسنجی',
    singular: 'سؤال',
    group: 'support',
    fields: [
      { name: 'name', label: 'سؤال', required: true, list: true, search: true },
      { name: 'type', label: 'نوع', list: true },
      { name: 'description', label: 'توضیح', kind: 'textarea' },
    ],
  },
  {
    id: 'survey-responses',
    suite: 'SurveyResponses',
    label: 'پاسخ‌های نظرسنجی',
    singular: 'پاسخ',
    group: 'support',
    fields: [
      { name: 'name', label: 'عنوان', required: true, list: true, search: true },
      { name: 'happiness', label: 'رضایت', kind: 'number', list: true },
      { name: 'description', label: 'متن', kind: 'textarea' },
    ],
  },
  {
    id: 'bugs',
    suite: 'Bugs',
    label: 'اشکالات',
    singular: 'اشکال',
    group: 'support',
    fields: [
      { name: 'name', label: 'عنوان', required: true, list: true, search: true },
      { name: 'status', label: 'وضعیت', list: true },
      { name: 'priority', label: 'اولویت', list: true },
      { name: 'description', label: 'شرح', kind: 'textarea' },
    ],
  },
  {
    id: 'projects',
    suite: 'Project',
    label: 'پروژه‌ها',
    singular: 'پروژه',
    group: 'projects',
    fields: [
      { name: 'name', label: 'نام', required: true, list: true, search: true },
      { name: 'status', label: 'وضعیت', list: true },
      { name: 'priority', label: 'اولویت', list: true },
      { name: 'estimated_end_date', label: 'پایان برآوردی', kind: 'date', required: true },
      { name: 'description', label: 'شرح', kind: 'textarea' },
    ],
  },
  {
    id: 'project-tasks',
    suite: 'ProjectTask',
    label: 'وظایف پروژه',
    singular: 'وظیفه پروژه',
    group: 'projects',
    fields: [
      { name: 'name', label: 'عنوان', required: true, list: true, search: true },
      { name: 'status', label: 'وضعیت', list: true },
      { name: 'date_start', label: 'شروع', kind: 'date', list: true },
      { name: 'date_finish', label: 'پایان', kind: 'date' },
      { name: 'description', label: 'شرح', kind: 'textarea' },
    ],
  },
  {
    id: 'project-templates',
    suite: 'AM_ProjectTemplates',
    label: 'قالب‌های پروژه',
    singular: 'قالب پروژه',
    group: 'projects',
    fields: [
      { name: 'name', label: 'نام', required: true, list: true, search: true },
      { name: 'status', label: 'وضعیت', list: true },
      { name: 'priority', label: 'اولویت', list: true },
      { name: 'description', label: 'شرح', kind: 'textarea' },
    ],
  },
  {
    id: 'task-templates',
    suite: 'AM_TaskTemplates',
    label: 'قالب‌های وظیفه',
    singular: 'قالب وظیفه',
    group: 'projects',
    fields: [
      { name: 'name', label: 'نام', required: true, list: true, search: true },
      { name: 'status', label: 'وضعیت', list: true },
      { name: 'priority', label: 'اولویت', list: true },
      { name: 'description', label: 'شرح', kind: 'textarea' },
    ],
  },
  {
    id: 'maps',
    suite: 'jjwg_Maps',
    label: 'نقشه‌ها',
    singular: 'نقشه',
    group: 'insight',
    fields: [
      { name: 'name', label: 'نام', required: true, list: true, search: true },
      { name: 'module_type', label: 'بخش', required: true, list: true },
      { name: 'unit_type', label: 'واحد', required: true, list: true },
      { name: 'distance', label: 'فاصله', kind: 'number', required: true },
    ],
  },
  {
    id: 'map-areas',
    suite: 'jjwg_Areas',
    label: 'مناطق نقشه',
    singular: 'منطقه',
    group: 'insight',
    fields: [
      { name: 'name', label: 'نام', required: true, list: true, search: true },
      { name: 'city', label: 'شهر', list: true },
      { name: 'country', label: 'کشور', list: true },
      { name: 'description', label: 'توضیح', kind: 'textarea' },
    ],
  },
  {
    id: 'map-markers',
    suite: 'jjwg_Markers',
    label: 'نشانگرهای نقشه',
    singular: 'نشانگر',
    group: 'insight',
    fields: [
      { name: 'name', label: 'نام', required: true, list: true, search: true },
      { name: 'city', label: 'شهر', list: true },
      { name: 'country', label: 'کشور', list: true },
      { name: 'description', label: 'توضیح', kind: 'textarea' },
    ],
  },
  {
    id: 'spots',
    suite: 'Spots',
    label: 'نمای مدیریتی',
    singular: 'نما',
    group: 'insight',
    fields: [
      { name: 'name', label: 'نام', required: true, list: true, search: true },
      { name: 'type', label: 'نوع', required: true, list: true },
    ],
  },
  {
    id: 'feed',
    suite: 'SugarFeed',
    label: 'جریان فعالیت',
    singular: 'رویداد جریان',
    group: 'insight',
    fields: [
      { name: 'name', label: 'عنوان', required: true, list: true, search: true },
      { name: 'related_module', label: 'بخش', list: true },
      { name: 'description', label: 'شرح', kind: 'textarea' },
    ],
  },
  {
    id: 'alerts',
    suite: 'Alerts',
    label: 'هشدارها',
    singular: 'هشدار',
    group: 'insight',
    fields: [
      { name: 'name', label: 'عنوان', required: true, list: true, search: true },
      { name: 'target_module', label: 'بخش', list: true },
      { name: 'description', label: 'متن', kind: 'textarea' },
    ],
  },
  {
    id: 'favorites',
    suite: 'Favorites',
    label: 'علاقه‌مندی‌ها',
    singular: 'علاقه‌مندی',
    group: 'insight',
    fields: [
      { name: 'name', label: 'عنوان', required: true, list: true, search: true },
    ],
  },
  {
    id: 'saved-searches',
    suite: 'SavedSearch',
    label: 'جستجوهای ذخیره‌شده',
    singular: 'جستجو',
    group: 'insight',
    fields: [
      { name: 'name', label: 'نام', required: true, list: true, search: true },
      { name: 'search_module', label: 'بخش', required: true, list: true },
      { name: 'description', label: 'توضیح', kind: 'textarea' },
    ],
  },
  {
    id: 'workflows',
    suite: 'AOW_WorkFlow',
    label: 'گردش‌های کار',
    singular: 'گردش کار',
    group: 'admin',
    fields: [
      { name: 'name', label: 'نام', required: true, list: true, search: true },
      { name: 'flow_module', label: 'بخش', required: true, list: true },
      { name: 'status', label: 'وضعیت', list: true },
      { name: 'run_when', label: 'زمان اجرا' },
    ],
  },
  {
    id: 'roles',
    suite: 'ACLRoles',
    label: 'نقش‌ها',
    singular: 'نقش',
    group: 'admin',
    fields: [
      { name: 'name', label: 'نام', required: true, list: true, search: true },
      { name: 'description', label: 'شرح', kind: 'textarea', list: true },
    ],
  },
  {
    id: 'security-groups',
    suite: 'SecurityGroups',
    label: 'گروه‌های دسترسی',
    singular: 'گروه دسترسی',
    group: 'admin',
    fields: [
      { name: 'name', label: 'نام', required: true, list: true, search: true },
      { name: 'description', label: 'شرح', kind: 'textarea', list: true },
    ],
  },
  {
    id: 'business-hours',
    suite: 'AOBH_BusinessHours',
    label: 'ساعات کاری',
    singular: 'ساعت کاری',
    group: 'admin',
    fields: [
      { name: 'name', label: 'نام', required: true, list: true, search: true },
      { name: 'day', label: 'روز', list: true },
      { name: 'opening_hours', label: 'شروع', list: true },
      { name: 'closing_hours', label: 'پایان' },
    ],
  },
  {
    id: 'schedulers',
    suite: 'Schedulers',
    label: 'کارهای زمان‌بندی‌شده',
    singular: 'کار زمان‌بندی‌شده',
    group: 'admin',
    fields: [
      { name: 'name', label: 'نام', required: true, list: true, search: true },
      { name: 'status', label: 'وضعیت', list: true },
      { name: 'job', label: 'کار', required: true, list: true },
      { name: 'job_interval', label: 'بازه', required: true },
      { name: 'date_time_start', label: 'شروع', kind: 'datetime', required: true },
      { name: 'last_run', label: 'آخرین اجرا', kind: 'datetime' },
    ],
  },
  {
    id: 'outbound-email',
    suite: 'OutboundEmailAccounts',
    label: 'ایمیل خروجی',
    singular: 'حساب خروجی',
    group: 'admin',
    fields: [
      { name: 'name', label: 'نام', required: true, list: true, search: true },
      { name: 'smtp_from_name', label: 'نام فرستنده', required: true, list: true },
      { name: 'smtp_from_addr', label: 'ایمیل فرستنده', kind: 'email', required: true, list: true },
      { name: 'mail_smtpserver', label: 'سرور' },
    ],
  },
  {
    id: 'inbound-email',
    suite: 'InboundEmail',
    label: 'ایمیل ورودی',
    singular: 'حساب ورودی',
    group: 'admin',
    fields: [
      { name: 'name', label: 'نام', required: true, list: true, search: true },
      { name: 'status', label: 'وضعیت', required: true, list: true },
      { name: 'server_url', label: 'سرور', required: true, list: true },
      { name: 'email_user', label: 'کاربر ایمیل', required: true },
    ],
  },
]

export const groupOrder = ['people', 'sales', 'finance', 'marketing', 'activity', 'support', 'projects', 'insight', 'admin'] as const

export const groupLabel: Record<string, string> = {
  people: 'افراد',
  sales: 'فروش',
  finance: 'مالی',
  marketing: 'بازاریابی',
  activity: 'فعالیت‌ها',
  support: 'پشتیبانی مشتریان',
  projects: 'پروژه‌ها',
  insight: 'گزارش و پیگیری',
  admin: 'مدیریت سامانه',
}

export function moduleById(id: string) {
  return modules.find((item) => item.id === id)
}

export function modulesInGroup(group: string) {
  return modules.filter((item) => item.group === group)
}

export function optionLabel(field: FieldDef, value: string) {
  return field.options?.find((option) => option.value === value)?.label || value
}
