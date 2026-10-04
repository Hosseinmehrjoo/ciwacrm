import { activityLinks, documentLink, type ModuleLink } from './links'

export type { ModuleLink }

export type FieldKind = 'text' | 'textarea' | 'email' | 'tel' | 'number' | 'date' | 'datetime' | 'select' | 'relate' | 'password'

export type FieldDef = {
  name: string
  label: string
  kind?: FieldKind
  required?: boolean
  options?: { value: string; label: string }[]
  list?: boolean
  search?: boolean
  relate?: { suite: string; label: string; search?: string[]; title?: 'name' | 'person' }
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
  /** Only system admins may open this module in the CIWA UI. */
  adminOnly?: boolean
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

const caseState = [
  ['Open', 'باز'],
  ['Closed', 'بسته'],
] as const

const caseType = [
  ['Administration', 'اداری'],
  ['Product', 'محصول'],
  ['User', 'کاربری'],
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

const leadSource = [
  ['Cold Call', 'تماس سرد'],
  ['Existing Customer', 'مشتری فعلی'],
  ['Self Generated', 'خودساخته'],
  ['Employee', 'کارمند'],
  ['Partner', 'شریک'],
  ['Public Relations', 'روابط عمومی'],
  ['Direct Mail', 'پست مستقیم'],
  ['Conference', 'کنفرانس'],
  ['Trade Show', 'نمایشگاه'],
  ['Web Site', 'وب‌سایت'],
  ['Word of mouth', 'دهان‌به‌دهان'],
  ['Email', 'ایمیل'],
  ['Campaign', 'کمپین'],
  ['Other', 'سایر'],
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

const accountType = [
  ['Analyst', 'تحلیل‌گر'],
  ['Competitor', 'رقیب'],
  ['Customer', 'مشتری'],
  ['Integrator', 'یکپارچه‌ساز'],
  ['Investor', 'سرمایه‌گذار'],
  ['Partner', 'شریک'],
  ['Press', 'رسانه'],
  ['Prospect', 'محتمل'],
  ['Reseller', 'فروشنده'],
  ['Other', 'سایر'],
] as const

const industry = [
  ['Apparel', 'پوشاک'],
  ['Banking', 'بانکداری'],
  ['Biotechnology', 'زیست‌فناوری'],
  ['Chemicals', 'شیمیایی'],
  ['Communications', 'ارتباطات'],
  ['Construction', 'ساختمان'],
  ['Consulting', 'مشاوره'],
  ['Education', 'آموزش'],
  ['Electronics', 'الکترونیک'],
  ['Energy', 'انرژی'],
  ['Engineering', 'مهندسی'],
  ['Entertainment', 'سرگرمی'],
  ['Environmental', 'محیط زیست'],
  ['Finance', 'مالی'],
  ['Government', 'دولتی'],
  ['Healthcare', 'سلامت'],
  ['Hospitality', 'مهمان‌داری'],
  ['Insurance', 'بیمه'],
  ['Machinery', 'ماشین‌آلات'],
  ['Manufacturing', 'تولید'],
  ['Media', 'رسانه'],
  ['Not For Profit', 'غیرانتفاعی'],
  ['Recreation', 'تفریح'],
  ['Retail', 'خرده‌فروشی'],
  ['Shipping', 'حمل‌ونقل دریایی'],
  ['Technology', 'فناوری'],
  ['Telecommunications', 'مخابرات'],
  ['Transportation', 'حمل‌ونقل'],
  ['Utilities', 'خدمات عمومی'],
  ['Other', 'سایر'],
] as const

const salutation = [
  ['Mr.', 'آقا'],
  ['Ms.', 'خانم'],
  ['Mrs.', 'خانم متأهل'],
  ['Miss', 'دوشیزه'],
  ['Dr.', 'دکتر'],
  ['Prof.', 'استاد'],
] as const

const opportunityType = [
  ['Existing Business', 'کسب‌وکار فعلی'],
  ['New Business', 'کسب‌وکار جدید'],
] as const

const paymentTerms = [
  ['Net 15', '۱۵ روزه'],
  ['Net 30', '۳۰ روزه'],
] as const

const emailStatus = [
  ['archived', 'بایگانی'],
  ['closed', 'بسته'],
  ['draft', 'پیش‌نویس'],
  ['read', 'خوانده‌شده'],
  ['replied', 'پاسخ‌داده‌شده'],
  ['sent', 'ارسال‌شده'],
  ['send_error', 'خطای ارسال'],
  ['unread', 'خوانده‌نشده'],
] as const

const documentStatus = [
  ['Active', 'فعال'],
  ['Draft', 'پیش‌نویس'],
  ['Expired', 'منقضی'],
  ['Under Review', 'در بررسی'],
  ['Pending', 'در انتظار'],
] as const

const bugStatus = [
  ['New', 'جدید'],
  ['Assigned', 'واگذار شده'],
  ['Closed', 'بسته'],
  ['Pending', 'در انتظار'],
  ['Rejected', 'رد شده'],
] as const

const projectStatus = [
  ['Draft', 'پیش‌نویس'],
  ['In Review', 'در بررسی'],
  ['Underway', 'در حال اجرا'],
  ['On Hold', 'معلق'],
  ['Completed', 'تمام شده'],
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

const accountRelate = { suite: 'Accounts', label: 'name' }
const contactRelate = { suite: 'Contacts', label: 'last_name', title: 'person' as const, search: ['first_name', 'last_name'] }
const userRelate = { suite: 'Users', label: 'user_name', title: 'person' as const, search: ['user_name', 'first_name', 'last_name'] }
const campaignRelate = { suite: 'Campaigns', label: 'name' }
const opportunityRelate = { suite: 'Opportunities', label: 'name' }
const projectRelate = { suite: 'Project', label: 'name' }
const releaseRelate = { suite: 'Releases', label: 'name' }

export const modules: ModuleDef[] = [
  {
    id: 'contacts',
    suite: 'Contacts',
    label: 'مخاطبین',
    singular: 'مخاطب',
    group: 'people',
    fields: [
      { name: 'salutation', label: 'عنوان', kind: 'select', options: options(salutation) },
      { name: 'first_name', label: 'نام', list: true, search: true },
      { name: 'last_name', label: 'نام خانوادگی', required: true, list: true, search: true },
      { name: 'title', label: 'سمت', list: true },
      { name: 'department', label: 'دپارتمان' },
      { name: 'account_id', label: 'مشتری', kind: 'relate', relate: accountRelate },
      { name: 'phone_mobile', label: 'موبایل', kind: 'tel', list: true },
      { name: 'phone_work', label: 'تلفن محل کار', kind: 'tel' },
      { name: 'phone_home', label: 'تلفن منزل', kind: 'tel' },
      { name: 'phone_fax', label: 'فکس', kind: 'tel' },
      { name: 'email1', label: 'ایمیل', kind: 'email', list: true, search: true },
      { name: 'lead_source', label: 'منبع سرنخ', kind: 'select', options: options(leadSource), list: true },
      { name: 'reports_to_id', label: 'مدیر مستقیم', kind: 'relate', relate: contactRelate },
      { name: 'assigned_user_id', label: 'مسئول', kind: 'relate', relate: userRelate },
      { name: 'primary_address_street', label: 'خیابان' },
      { name: 'primary_address_city', label: 'شهر', list: true },
      { name: 'primary_address_state', label: 'استان' },
      { name: 'primary_address_postalcode', label: 'کد پستی' },
      { name: 'primary_address_country', label: 'کشور' },
      { name: 'description', label: 'توضیح', kind: 'textarea' },
    ],
    links: [
      ...activityLinks,
      documentLink,
      { link: 'opportunities', label: 'فرصت‌های فروش', suite: 'Opportunities', title: 'name' },
      { link: 'cases', label: 'تیکت‌ها', suite: 'Cases', title: 'name' },
      { link: 'bugs', label: 'اشکالات', suite: 'Bugs', title: 'name' },
      { link: 'leads', label: 'سرنخ‌ها', suite: 'Leads', title: 'person' },
      { link: 'project', label: 'پروژه‌ها', suite: 'Project', title: 'name' },
      { link: 'aos_quotes', label: 'پیش‌فاکتورها', suite: 'AOS_Quotes', title: 'name' },
      { link: 'aos_invoices', label: 'فاکتورها', suite: 'AOS_Invoices', title: 'name' },
      { link: 'aos_contracts', label: 'قراردادها', suite: 'AOS_Contracts', title: 'name' },
      { link: 'campaigns', label: 'کمپین‌ها', suite: 'Campaigns', title: 'name' },
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
      { name: 'account_type', label: 'نوع', kind: 'select', options: options(accountType), list: true },
      { name: 'industry', label: 'صنعت', kind: 'select', options: options(industry), list: true },
      { name: 'phone_office', label: 'تلفن', kind: 'tel', list: true },
      { name: 'phone_fax', label: 'فکس', kind: 'tel' },
      { name: 'email1', label: 'ایمیل', kind: 'email', list: true, search: true },
      { name: 'website', label: 'وب‌سایت', list: true },
      { name: 'annual_revenue', label: 'درآمد سالانه' },
      { name: 'employees', label: 'تعداد کارمند' },
      { name: 'parent_id', label: 'مشتری والد', kind: 'relate', relate: accountRelate },
      { name: 'assigned_user_id', label: 'مسئول', kind: 'relate', relate: userRelate },
      { name: 'billing_address_street', label: 'خیابان صورتحساب' },
      { name: 'billing_address_city', label: 'شهر صورتحساب', list: true },
      { name: 'billing_address_state', label: 'استان صورتحساب' },
      { name: 'billing_address_postalcode', label: 'کد پستی صورتحساب' },
      { name: 'billing_address_country', label: 'کشور صورتحساب' },
      { name: 'shipping_address_street', label: 'خیابان ارسال' },
      { name: 'shipping_address_city', label: 'شهر ارسال' },
      { name: 'shipping_address_state', label: 'استان ارسال' },
      { name: 'shipping_address_postalcode', label: 'کد پستی ارسال' },
      { name: 'shipping_address_country', label: 'کشور ارسال' },
      { name: 'description', label: 'توضیح', kind: 'textarea' },
    ],
    links: [
      ...activityLinks,
      documentLink,
      { link: 'contacts', label: 'مخاطبین', suite: 'Contacts', title: 'person' },
      { link: 'opportunities', label: 'فرصت‌های فروش', suite: 'Opportunities', title: 'name' },
      { link: 'leads', label: 'سرنخ‌ها', suite: 'Leads', title: 'person' },
      { link: 'cases', label: 'تیکت‌ها', suite: 'Cases', title: 'name' },
      { link: 'bugs', label: 'اشکالات', suite: 'Bugs', title: 'name' },
      { link: 'project', label: 'پروژه‌ها', suite: 'Project', title: 'name' },
      { link: 'aos_quotes', label: 'پیش‌فاکتورها', suite: 'AOS_Quotes', title: 'name' },
      { link: 'aos_invoices', label: 'فاکتورها', suite: 'AOS_Invoices', title: 'name' },
      { link: 'aos_contracts', label: 'قراردادها', suite: 'AOS_Contracts', title: 'name' },
      { link: 'campaigns', label: 'کمپین‌ها', suite: 'Campaigns', title: 'name' },
    ],
  },
  {
    id: 'leads',
    suite: 'Leads',
    label: 'سرنخ‌ها',
    singular: 'سرنخ',
    group: 'marketing',
    fields: [
      { name: 'salutation', label: 'عنوان', kind: 'select', options: options(salutation) },
      { name: 'first_name', label: 'نام', list: true, search: true },
      { name: 'last_name', label: 'نام خانوادگی', required: true, list: true, search: true },
      { name: 'status', label: 'وضعیت', kind: 'select', options: options(leadStatus), list: true },
      { name: 'lead_source', label: 'منبع', kind: 'select', options: options(leadSource), list: true },
      { name: 'title', label: 'سمت' },
      { name: 'account_name', label: 'سازمان', search: true, list: true },
      { name: 'phone_mobile', label: 'موبایل', kind: 'tel', list: true },
      { name: 'phone_work', label: 'تلفن کار', kind: 'tel' },
      { name: 'phone_fax', label: 'فکس', kind: 'tel' },
      { name: 'email1', label: 'ایمیل', kind: 'email', list: true, search: true },
      { name: 'website', label: 'وب‌سایت' },
      { name: 'opportunity_amount', label: 'مبلغ فرصت احتمالی', kind: 'number' },
      { name: 'refered_by', label: 'معرف' },
      { name: 'campaign_id', label: 'کمپین', kind: 'relate', relate: campaignRelate },
      { name: 'assigned_user_id', label: 'مسئول', kind: 'relate', relate: userRelate },
      { name: 'primary_address_street', label: 'خیابان' },
      { name: 'primary_address_city', label: 'شهر' },
      { name: 'primary_address_state', label: 'استان' },
      { name: 'primary_address_postalcode', label: 'کد پستی' },
      { name: 'primary_address_country', label: 'کشور' },
      { name: 'status_description', label: 'توضیح وضعیت', kind: 'textarea' },
      { name: 'lead_source_description', label: 'توضیح منبع', kind: 'textarea' },
      { name: 'description', label: 'توضیح', kind: 'textarea' },
    ],
    links: [
      ...activityLinks,
      { link: 'campaigns', label: 'کمپین‌ها', suite: 'Campaigns', title: 'name' },
    ],
  },
  {
    id: 'prospects',
    suite: 'Prospects',
    label: 'مخاطبان هدف',
    singular: 'مخاطب هدف',
    group: 'marketing',
    fields: [
      { name: 'salutation', label: 'عنوان', kind: 'select', options: options(salutation) },
      { name: 'first_name', label: 'نام', list: true, search: true },
      { name: 'last_name', label: 'نام خانوادگی', required: true, list: true, search: true },
      { name: 'title', label: 'سمت', list: true },
      { name: 'department', label: 'دپارتمان' },
      { name: 'account_name', label: 'سازمان', list: true, search: true },
      { name: 'phone_mobile', label: 'موبایل', kind: 'tel', list: true },
      { name: 'phone_work', label: 'تلفن', kind: 'tel' },
      { name: 'email1', label: 'ایمیل', kind: 'email', list: true, search: true },
      { name: 'assigned_user_id', label: 'مسئول', kind: 'relate', relate: userRelate },
      { name: 'primary_address_city', label: 'شهر' },
      { name: 'description', label: 'توضیح', kind: 'textarea' },
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
      { name: 'account_id', label: 'مشتری', kind: 'relate', relate: accountRelate },
      { name: 'opportunity_type', label: 'نوع', kind: 'select', options: options(opportunityType), list: true },
      { name: 'lead_source', label: 'منبع سرنخ', kind: 'select', options: options(leadSource) },
      { name: 'amount', label: 'مبلغ', kind: 'number', required: true, list: true },
      { name: 'sales_stage', label: 'مرحله', kind: 'select', required: true, options: options(salesStages), list: true },
      { name: 'probability', label: 'احتمال (درصد)', kind: 'number', list: true },
      { name: 'date_closed', label: 'تاریخ بستن', kind: 'date', required: true },
      { name: 'campaign_id', label: 'کمپین', kind: 'relate', relate: campaignRelate },
      { name: 'next_step', label: 'گام بعدی' },
      { name: 'assigned_user_id', label: 'مسئول', kind: 'relate', relate: userRelate },
      { name: 'description', label: 'توضیح', kind: 'textarea' },
    ],
    links: [
      ...activityLinks,
      documentLink,
      { link: 'contacts', label: 'مخاطبین', suite: 'Contacts', title: 'person' },
      { link: 'leads', label: 'سرنخ‌ها', suite: 'Leads', title: 'person' },
      { link: 'project', label: 'پروژه‌ها', suite: 'Project', title: 'name' },
      { link: 'aos_quotes', label: 'پیش‌فاکتورها', suite: 'AOS_Quotes', title: 'name' },
      { link: 'aos_contracts', label: 'قراردادها', suite: 'AOS_Contracts', title: 'name' },
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
      { name: 'number', label: 'شماره', kind: 'number', list: true },
      { name: 'billing_account_id', label: 'مشتری', kind: 'relate', relate: accountRelate },
      { name: 'billing_contact_id', label: 'مخاطب', kind: 'relate', relate: contactRelate },
      { name: 'opportunity_id', label: 'فرصت فروش', kind: 'relate', relate: opportunityRelate },
      { name: 'stage', label: 'مرحله', kind: 'select', options: options(quoteStage), list: true },
      { name: 'term', label: 'شرایط پرداخت', kind: 'select', options: options(paymentTerms) },
      { name: 'total_amount', label: 'مبلغ', kind: 'number', list: true },
      { name: 'expiration', label: 'اعتبار تا', kind: 'date' },
      { name: 'assigned_user_id', label: 'مسئول', kind: 'relate', relate: userRelate },
      { name: 'description', label: 'توضیح', kind: 'textarea' },
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
      { name: 'case_number', label: 'شماره', list: true },
      { name: 'account_id', label: 'مشتری', kind: 'relate', relate: accountRelate },
      { name: 'contact_created_by_id', label: 'مخاطب', kind: 'relate', relate: contactRelate },
      { name: 'state', label: 'وضعیت کلی', kind: 'select', options: options(caseState), list: true },
      { name: 'status', label: 'وضعیت', kind: 'select', required: true, options: options(caseStatus), list: true },
      { name: 'priority', label: 'اولویت', kind: 'select', options: options(casePriority), list: true },
      { name: 'type', label: 'نوع', kind: 'select', options: options(caseType) },
      { name: 'assigned_user_id', label: 'مسئول', kind: 'relate', relate: userRelate },
      { name: 'resolution', label: 'راه‌حل', kind: 'textarea' },
      { name: 'description', label: 'شرح', kind: 'textarea' },
    ],
    links: [
      ...activityLinks.filter((item) => item.link !== 'emails'),
      documentLink,
      { link: 'contacts', label: 'مخاطبین', suite: 'Contacts', title: 'person' },
      { link: 'bugs', label: 'اشکالات', suite: 'Bugs', title: 'name' },
      { link: 'project', label: 'پروژه‌ها', suite: 'Project', title: 'name' },
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
      { name: 'start_date', label: 'تاریخ شروع', kind: 'date' },
      { name: 'end_date', label: 'تاریخ پایان', kind: 'date', list: true },
      { name: 'budget', label: 'بودجه', kind: 'number', list: true },
      { name: 'expected_cost', label: 'هزینه مورد انتظار', kind: 'number' },
      { name: 'actual_cost', label: 'هزینه واقعی', kind: 'number' },
      { name: 'expected_revenue', label: 'درآمد مورد انتظار', kind: 'number' },
      { name: 'impressions', label: 'بازدید', kind: 'number' },
      { name: 'objective', label: 'هدف', kind: 'textarea' },
      { name: 'content', label: 'محتوا', kind: 'textarea' },
      { name: 'assigned_user_id', label: 'مسئول', kind: 'relate', relate: userRelate },
    ],
    links: [
      { link: 'prospectlists', label: 'فهرست‌های هدف', suite: 'ProspectLists', title: 'name' },
      { link: 'emailmarketing', label: 'ارسال‌های ایمیل', suite: 'EmailMarketing', title: 'name' },
      { link: 'tracked_urls', label: 'ردیاب‌ها', suite: 'CampaignTrackers', title: 'name' },
      { link: 'accounts', label: 'مشتریان', suite: 'Accounts', title: 'name' },
      { link: 'leads', label: 'سرنخ‌ها', suite: 'Leads', title: 'person' },
      { link: 'opportunities', label: 'فرصت‌ها', suite: 'Opportunities', title: 'name' },
      { link: 'surveyresponses_campaigns', label: 'پاسخ نظرسنجی', suite: 'SurveyResponses', title: 'name' },
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
      { name: 'date_start', label: 'شروع', kind: 'datetime' },
      { name: 'date_due', label: 'موعد', kind: 'datetime', list: true },
      { name: 'contact_id', label: 'مخاطب', kind: 'relate', relate: contactRelate },
      { name: 'parent_type', label: 'مرتبط با نوع', kind: 'select', options: options([['Accounts', 'مشتری'], ['Contacts', 'مخاطب'], ['Opportunities', 'فرصت'], ['Cases', 'تیکت'], ['Leads', 'سرنخ'], ['Project', 'پروژه']]) },
      { name: 'parent_id', label: 'شناسه مرتبط' },
      { name: 'assigned_user_id', label: 'مسئول', kind: 'relate', relate: userRelate },
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
      { name: 'date_end', label: 'پایان', kind: 'datetime' },
      { name: 'duration_hours', label: 'مدت (ساعت)', kind: 'number' },
      { name: 'duration_minutes', label: 'مدت (دقیقه)', kind: 'number' },
      { name: 'location', label: 'مکان', list: true },
      { name: 'parent_type', label: 'مرتبط با نوع', kind: 'select', options: options([['Accounts', 'مشتری'], ['Contacts', 'مخاطب'], ['Opportunities', 'فرصت'], ['Cases', 'تیکت'], ['Leads', 'سرنخ']]) },
      { name: 'parent_id', label: 'شناسه مرتبط' },
      { name: 'assigned_user_id', label: 'مسئول', kind: 'relate', relate: userRelate },
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
      { name: 'parent_type', label: 'مرتبط با نوع', kind: 'select', options: options([['Accounts', 'مشتری'], ['Contacts', 'مخاطب'], ['Opportunities', 'فرصت'], ['Cases', 'تیکت'], ['Leads', 'سرنخ']]) },
      { name: 'parent_id', label: 'شناسه مرتبط' },
      { name: 'assigned_user_id', label: 'مسئول', kind: 'relate', relate: userRelate },
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
      { name: 'contact_id', label: 'مخاطب', kind: 'relate', relate: contactRelate },
      { name: 'parent_type', label: 'مرتبط با نوع', kind: 'select', options: options([['Accounts', 'مشتری'], ['Contacts', 'مخاطب'], ['Opportunities', 'فرصت'], ['Cases', 'تیکت'], ['Leads', 'سرنخ']]) },
      { name: 'parent_id', label: 'شناسه مرتبط' },
      { name: 'assigned_user_id', label: 'مسئول', kind: 'relate', relate: userRelate },
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
      { name: 'number', label: 'شماره', kind: 'number', list: true },
      { name: 'billing_account_id', label: 'مشتری', kind: 'relate', relate: accountRelate },
      { name: 'billing_contact_id', label: 'مخاطب', kind: 'relate', relate: contactRelate },
      { name: 'quote_number', label: 'شماره پیش‌فاکتور' },
      { name: 'status', label: 'وضعیت', kind: 'select', options: options(invoiceStatus), list: true },
      { name: 'total_amount', label: 'مبلغ', kind: 'number', list: true },
      { name: 'due_date', label: 'سررسید', kind: 'date' },
      { name: 'invoice_date', label: 'تاریخ فاکتور', kind: 'date' },
      { name: 'assigned_user_id', label: 'مسئول', kind: 'relate', relate: userRelate },
      { name: 'description', label: 'توضیح', kind: 'textarea' },
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
      { name: 'contract_account_id', label: 'مشتری', kind: 'relate', relate: accountRelate },
      { name: 'opportunity_id', label: 'فرصت فروش', kind: 'relate', relate: opportunityRelate },
      { name: 'status', label: 'وضعیت', kind: 'select', options: options(contractStatus), list: true },
      { name: 'total_contract_value', label: 'مبلغ', kind: 'number', list: true },
      { name: 'start_date', label: 'شروع', kind: 'date' },
      { name: 'end_date', label: 'پایان', kind: 'date', list: true },
      { name: 'customer_signed_date', label: 'امضای مشتری', kind: 'date' },
      { name: 'company_signed_date', label: 'امضای شرکت', kind: 'date' },
      { name: 'assigned_user_id', label: 'مسئول', kind: 'relate', relate: userRelate },
      { name: 'description', label: 'توضیح', kind: 'textarea' },
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
      { name: 'part_number', label: 'کد', list: true, search: true },
      { name: 'price', label: 'قیمت', kind: 'number', list: true },
      { name: 'cost', label: 'بهای تمام‌شده', kind: 'number' },
      { name: 'type', label: 'نوع', list: true },
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
      { name: 'description', label: 'توضیح', kind: 'textarea' },
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
      { name: 'email_recipients', label: 'گیرندگان ایمیل', kind: 'textarea' },
    ],
  },
  {
    id: 'users',
    suite: 'Users',
    label: 'کاربران',
    singular: 'کاربر',
    group: 'people',
    adminOnly: true,
    fields: [
      { name: 'user_name', label: 'نام کاربری', required: true, list: true, search: true },
      { name: 'ciwa_password', label: 'رمز ورود', kind: 'password', required: true },
      { name: 'first_name', label: 'نام', list: true, search: true },
      { name: 'last_name', label: 'نام خانوادگی', required: true, list: true, search: true },
      { name: 'title', label: 'سمت', list: true },
      { name: 'department', label: 'دپارتمان' },
      { name: 'phone_work', label: 'تلفن', kind: 'tel' },
      { name: 'phone_mobile', label: 'موبایل', kind: 'tel' },
      { name: 'email1', label: 'ایمیل', kind: 'email', list: true },
      { name: 'address_city', label: 'شهر' },
      { name: 'description', label: 'توضیح', kind: 'textarea' },
    ],
  },
  {
    id: 'employees',
    suite: 'Employees',
    label: 'کارمندان',
    singular: 'کارمند',
    group: 'people',
    adminOnly: true,
    fields: [
      { name: 'user_name', label: 'نام کاربری', required: true, list: true, search: true },
      { name: 'ciwa_password', label: 'رمز ورود', kind: 'password', required: true },
      { name: 'first_name', label: 'نام', list: true, search: true },
      { name: 'last_name', label: 'نام خانوادگی', required: true, list: true, search: true },
      { name: 'title', label: 'سمت', list: true },
      { name: 'department', label: 'دپارتمان', list: true },
      { name: 'phone_work', label: 'تلفن', kind: 'tel' },
      { name: 'phone_mobile', label: 'موبایل', kind: 'tel' },
      { name: 'email1', label: 'ایمیل', kind: 'email', list: true },
      { name: 'address_city', label: 'شهر' },
      { name: 'description', label: 'توضیح', kind: 'textarea' },
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
    links: [
      { link: 'prospects', label: 'مخاطبان هدف', suite: 'Prospects', title: 'person' },
      { link: 'contacts', label: 'مخاطبین', suite: 'Contacts', title: 'person' },
      { link: 'leads', label: 'سرنخ‌ها', suite: 'Leads', title: 'person' },
      { link: 'users', label: 'کاربران', suite: 'Users', title: 'person' },
    ],
  },
  {
    id: 'campaign-trackers',
    suite: 'CampaignTrackers',
    label: 'ردیاب‌های کمپین',
    singular: 'ردیاب',
    group: 'marketing',
    fields: [
      { name: 'tracker_name', label: 'نام ردیاب', required: true, list: true, search: true },
      { name: 'tracker_url', label: 'نشانی', required: true, list: true },
      { name: 'campaign_id', label: 'کمپین', kind: 'relate', relate: campaignRelate },
      { name: 'is_optout', label: 'انصراف', kind: 'select', options: options([['0', 'خیر'], ['1', 'بله']]), list: true },
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
      { name: 'type', label: 'نوع', list: true },
      { name: 'status', label: 'وضعیت', kind: 'select', options: options(emailStatus), list: true },
      { name: 'from_addr_name', label: 'فرستنده', list: true },
      { name: 'to_addrs', label: 'گیرنده' },
      { name: 'cc_addrs', label: 'رونوشت' },
      { name: 'bcc_addrs', label: 'رونوشت مخفی' },
      { name: 'date_sent_received', label: 'زمان', kind: 'datetime', list: true },
      { name: 'parent_type', label: 'مرتبط با نوع', kind: 'select', options: options([['Accounts', 'مشتری'], ['Contacts', 'مخاطب'], ['Leads', 'سرنخ'], ['Cases', 'تیکت'], ['Opportunities', 'فرصت']]) },
      { name: 'parent_id', label: 'شناسه مرتبط' },
      { name: 'assigned_user_id', label: 'مسئول', kind: 'relate', relate: userRelate },
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
      { name: 'type', label: 'نوع', list: true },
      { name: 'description', label: 'متن', kind: 'textarea' },
      { name: 'body_html', label: 'متن HTML', kind: 'textarea' },
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
      { name: 'from_name', label: 'نام فرستنده', list: true },
      { name: 'from_addr', label: 'ایمیل فرستنده', kind: 'email', required: true, list: true },
      { name: 'status', label: 'وضعیت', required: true, list: true },
      { name: 'date_start', label: 'شروع', kind: 'datetime', required: true },
      { name: 'template_name', label: 'قالب' },
      { name: 'campaign_id', label: 'کمپین', kind: 'relate', relate: campaignRelate },
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
      { name: 'filename', label: 'نام فایل', list: true },
      { name: 'revision', label: 'نسخه', list: true },
      { name: 'status_id', label: 'وضعیت', kind: 'select', options: options(documentStatus), list: true },
      { name: 'category_id', label: 'دسته', list: true },
      { name: 'subcategory_id', label: 'زیردسته' },
      { name: 'template_type', label: 'نوع قالب' },
      { name: 'is_template', label: 'قالب؟', kind: 'select', options: options([['0', 'خیر'], ['1', 'بله']]) },
      { name: 'active_date', label: 'تاریخ انتشار', kind: 'date', required: true },
      { name: 'exp_date', label: 'تاریخ انقضا', kind: 'date' },
      { name: 'assigned_user_id', label: 'مسئول', kind: 'relate', relate: userRelate },
      { name: 'description', label: 'توضیح', kind: 'textarea' },
    ],
    links: [
      { link: 'accounts', label: 'مشتریان', suite: 'Accounts', title: 'name' },
      { link: 'contacts', label: 'مخاطبین', suite: 'Contacts', title: 'person' },
      { link: 'opportunities', label: 'فرصت‌ها', suite: 'Opportunities', title: 'name' },
      { link: 'cases', label: 'تیکت‌ها', suite: 'Cases', title: 'name' },
    ],
  },
  {
    id: 'document-revisions',
    suite: 'DocumentRevisions',
    label: 'نسخه‌های سند',
    singular: 'نسخه سند',
    group: 'activity',
    fields: [
      { name: 'filename', label: 'نام فایل', required: true, list: true, search: true },
      { name: 'revision', label: 'شماره نسخه', required: true, list: true },
      { name: 'change_log', label: 'شرح تغییرات', kind: 'textarea', list: true },
      { name: 'document_id', label: 'شناسه سند', required: true },
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
      { name: 'date_end', label: 'پایان', kind: 'datetime' },
      { name: 'budget', label: 'بودجه', kind: 'number', list: true },
      { name: 'assigned_user_id', label: 'مسئول', kind: 'relate', relate: userRelate },
      { name: 'description', label: 'شرح', kind: 'textarea' },
    ],
    links: [
      { link: 'fp_events_contacts', label: 'مخاطبین', suite: 'Contacts', title: 'person' },
      { link: 'fp_events_leads_1', label: 'سرنخ‌ها', suite: 'Leads', title: 'person' },
      { link: 'fp_events_prospects_1', label: 'مخاطبان هدف', suite: 'Prospects', title: 'person' },
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
      { name: 'address_country', label: 'کشور' },
      { name: 'capacity', label: 'ظرفیت' },
      { name: 'description', label: 'توضیح', kind: 'textarea' },
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
      { name: 'call_id', label: 'شناسه تماس' },
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
      { name: 'status', label: 'وضعیت', kind: 'select', options: options([['Draft', 'پیش‌نویس'], ['In_Review', 'در بررسی'], ['Published', 'منتشر شده']]), list: true },
      { name: 'revision', label: 'بازبینی', list: true },
      { name: 'author', label: 'نویسنده' },
      { name: 'approver', label: 'تأییدکننده' },
      { name: 'assigned_user_id', label: 'مسئول', kind: 'relate', relate: userRelate },
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
      { name: 'submit_text', label: 'متن دکمه ارسال' },
      { name: 'satisfied_text', label: 'متن رضایت' },
      { name: 'neither_text', label: 'متن خنثی' },
      { name: 'dissatisfied_text', label: 'متن نارضایتی' },
      { name: 'assigned_user_id', label: 'مسئول', kind: 'relate', relate: userRelate },
      { name: 'description', label: 'توضیح', kind: 'textarea' },
    ],
    links: [
      { link: 'surveys_surveyquestions', label: 'سؤال‌ها', suite: 'SurveyQuestions', title: 'name' },
      { link: 'surveys_surveyresponses', label: 'پاسخ‌ها', suite: 'SurveyResponses', title: 'name' },
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
      { name: 'sort_order', label: 'ترتیب', kind: 'number', list: true },
      { name: 'description', label: 'توضیح', kind: 'textarea' },
    ],
  },
  {
    id: 'survey-question-options',
    suite: 'SurveyQuestionOptions',
    label: 'گزینه‌های سؤال',
    singular: 'گزینه',
    group: 'support',
    fields: [
      { name: 'name', label: 'متن گزینه', required: true, list: true, search: true },
      { name: 'sort_order', label: 'ترتیب', kind: 'number', list: true },
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
      { name: 'campaign_id', label: 'کمپین', kind: 'relate', relate: campaignRelate },
      { name: 'contact_id', label: 'مخاطب', kind: 'relate', relate: contactRelate },
      { name: 'account_id', label: 'مشتری', kind: 'relate', relate: accountRelate },
      { name: 'description', label: 'متن', kind: 'textarea' },
    ],
  },
  {
    id: 'survey-question-responses',
    suite: 'SurveyQuestionResponses',
    label: 'پاسخ‌های سؤال',
    singular: 'پاسخ سؤال',
    group: 'support',
    fields: [
      { name: 'name', label: 'عنوان', required: true, list: true, search: true },
      { name: 'answer', label: 'پاسخ', list: true },
      { name: 'answer_bool', label: 'بله/خیر', list: true },
      { name: 'answer_datetime', label: 'پاسخ زمانی', kind: 'datetime' },
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
      { name: 'bug_number', label: 'شماره', list: true },
      { name: 'status', label: 'وضعیت', kind: 'select', options: options(bugStatus), list: true },
      { name: 'priority', label: 'اولویت', kind: 'select', options: options(priority), list: true },
      { name: 'type', label: 'نوع', list: true },
      { name: 'source', label: 'منبع', list: true },
      { name: 'product_category', label: 'دسته محصول', list: true },
      { name: 'found_in_release', label: 'نسخه یافت‌شده', kind: 'relate', relate: releaseRelate },
      { name: 'fixed_in_release', label: 'نسخه رفع‌شده', kind: 'relate', relate: releaseRelate },
      { name: 'account_id', label: 'مشتری', kind: 'relate', relate: accountRelate },
      { name: 'contact_id', label: 'مخاطب', kind: 'relate', relate: contactRelate },
      { name: 'assigned_user_id', label: 'مسئول', kind: 'relate', relate: userRelate },
      { name: 'resolution', label: 'راه‌حل', kind: 'textarea' },
      { name: 'work_log', label: 'گزارش کار', kind: 'textarea' },
      { name: 'description', label: 'شرح', kind: 'textarea' },
    ],
    links: [
      ...activityLinks.filter((item) => !['emails'].includes(item.link)),
      documentLink,
      { link: 'contacts', label: 'مخاطبین', suite: 'Contacts', title: 'person' },
      { link: 'accounts', label: 'مشتریان', suite: 'Accounts', title: 'name' },
      { link: 'cases', label: 'تیکت‌ها', suite: 'Cases', title: 'name' },
    ],
  },
  {
    id: 'releases',
    suite: 'Releases',
    label: 'نسخه‌های محصول',
    singular: 'نسخه',
    group: 'support',
    fields: [
      { name: 'name', label: 'نام نسخه', required: true, list: true, search: true },
      { name: 'status', label: 'وضعیت', list: true },
      { name: 'list_order', label: 'ترتیب', kind: 'number', list: true },
    ],
  },
  {
    id: 'case-updates',
    suite: 'AOP_Case_Updates',
    label: 'به‌روزرسانی تیکت‌ها',
    singular: 'به‌روزرسانی',
    group: 'support',
    fields: [
      { name: 'name', label: 'عنوان', required: true, list: true, search: true },
      { name: 'case_id', label: 'تیکت', kind: 'relate', relate: { suite: 'Cases', label: 'name' } },
      { name: 'contact_id', label: 'مخاطب', kind: 'relate', relate: contactRelate },
      { name: 'internal', label: 'داخلی', kind: 'select', options: options([['0', 'خیر'], ['1', 'بله']]), list: true },
      { name: 'description', label: 'متن', kind: 'textarea', list: true },
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
      { name: 'status', label: 'وضعیت', kind: 'select', options: options(projectStatus), list: true },
      { name: 'priority', label: 'اولویت', kind: 'select', options: options(priority), list: true },
      { name: 'estimated_start_date', label: 'شروع برآوردی', kind: 'date' },
      { name: 'estimated_end_date', label: 'پایان برآوردی', kind: 'date', required: true, list: true },
      { name: 'assigned_user_id', label: 'مسئول', kind: 'relate', relate: userRelate },
      { name: 'description', label: 'شرح', kind: 'textarea' },
    ],
    links: [
      { link: 'projecttask', label: 'وظایف پروژه', suite: 'ProjectTask', title: 'name' },
      ...activityLinks,
      { link: 'contacts', label: 'مخاطبین', suite: 'Contacts', title: 'person' },
      { link: 'accounts', label: 'مشتریان', suite: 'Accounts', title: 'name' },
      { link: 'opportunities', label: 'فرصت‌ها', suite: 'Opportunities', title: 'name' },
      { link: 'cases', label: 'تیکت‌ها', suite: 'Cases', title: 'name' },
      { link: 'bugs', label: 'اشکالات', suite: 'Bugs', title: 'name' },
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
      { name: 'project_id', label: 'پروژه', kind: 'relate', relate: projectRelate },
      { name: 'status', label: 'وضعیت', kind: 'select', options: options(taskStatus), list: true },
      { name: 'priority', label: 'اولویت', kind: 'select', options: options(priority), list: true },
      { name: 'percent_complete', label: 'درصد پیشرفت', kind: 'number', list: true },
      { name: 'milestone_flag', label: 'مایلستون', kind: 'select', options: options([['0', 'خیر'], ['1', 'بله']]) },
      { name: 'order_number', label: 'ترتیب', kind: 'number' },
      { name: 'date_start', label: 'شروع', kind: 'date', list: true },
      { name: 'date_finish', label: 'پایان', kind: 'date' },
      { name: 'assigned_user_id', label: 'مسئول', kind: 'relate', relate: userRelate },
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
      { name: 'description', label: 'توضیح', kind: 'textarea' },
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
    id: 'workflow-processed',
    suite: 'AOW_Processed',
    label: 'اجرای گردش‌کار',
    singular: 'اجرا',
    group: 'admin',
    adminOnly: true,
    fields: [
      { name: 'name', label: 'نام', required: true, list: true, search: true },
      { name: 'status', label: 'وضعیت', list: true },
      { name: 'parent_type', label: 'نوع رکورد', list: true },
      { name: 'parent_id', label: 'شناسه رکورد' },
    ],
  },
  {
    id: 'workflows',
    suite: 'AOW_WorkFlow',
    label: 'گردش‌های کار',
    singular: 'گردش کار',
    group: 'admin',
    adminOnly: true,
    fields: [
      { name: 'name', label: 'نام', required: true, list: true, search: true },
      { name: 'flow_module', label: 'بخش', required: true, list: true },
      { name: 'status', label: 'وضعیت', list: true },
      { name: 'run_when', label: 'زمان اجرا' },
      { name: 'flow_run_on', label: 'اجرا روی' },
      { name: 'multiple_runs', label: 'اجرای چندباره', kind: 'select', options: options([['0', 'خیر'], ['1', 'بله']]) },
    ],
  },
  {
    id: 'roles',
    suite: 'ACLRoles',
    label: 'نقش‌ها',
    singular: 'نقش',
    group: 'admin',
    adminOnly: true,
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
    adminOnly: true,
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
    adminOnly: true,
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
    adminOnly: true,
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
    adminOnly: true,
    fields: [
      { name: 'name', label: 'نام', required: true, list: true, search: true },
      { name: 'smtp_from_name', label: 'نام فرستنده', required: true, list: true },
      { name: 'smtp_from_addr', label: 'ایمیل فرستنده', kind: 'email', required: true, list: true },
      { name: 'mail_smtpserver', label: 'سرور' },
      { name: 'mail_smtpport', label: 'پورت' },
      { name: 'mail_smtpuser', label: 'کاربر SMTP' },
    ],
  },
  {
    id: 'inbound-email',
    suite: 'InboundEmail',
    label: 'ایمیل ورودی',
    singular: 'حساب ورودی',
    group: 'admin',
    adminOnly: true,
    fields: [
      { name: 'name', label: 'نام', required: true, list: true, search: true },
      { name: 'status', label: 'وضعیت', required: true, list: true },
      { name: 'server_url', label: 'سرور', required: true, list: true },
      { name: 'email_user', label: 'کاربر ایمیل', required: true },
      { name: 'port', label: 'پورت' },
      { name: 'mailbox', label: 'صندوق' },
    ],
  },
  {
    id: 'oauth-providers',
    suite: 'ExternalOAuthProvider',
    label: 'ارائه‌دهنده OAuth',
    singular: 'ارائه‌دهنده',
    group: 'admin',
    adminOnly: true,
    fields: [
      { name: 'name', label: 'نام', required: true, list: true, search: true },
      { name: 'type', label: 'نوع', list: true },
      { name: 'client_id', label: 'شناسه کلاینت', list: true },
    ],
  },
  {
    id: 'oauth-connections',
    suite: 'ExternalOAuthConnection',
    label: 'اتصال‌های OAuth',
    singular: 'اتصال',
    group: 'admin',
    adminOnly: true,
    fields: [
      { name: 'name', label: 'نام', required: true, list: true, search: true },
      { name: 'type', label: 'نوع', list: true },
    ],
  },
  {
    id: 'calendar-accounts',
    suite: 'CalendarAccount',
    label: 'حساب‌های تقویم',
    singular: 'حساب تقویم',
    group: 'admin',
    adminOnly: true,
    fields: [
      { name: 'name', label: 'نام', required: true, list: true, search: true },
      { name: 'type', label: 'نوع', list: true },
      { name: 'url', label: 'نشانی' },
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

export function canAccessModule(module: ModuleDef | undefined, isAdmin: boolean) {
  if (!module) return false
  return !module.adminOnly || isAdmin
}

export function visibleModules(isAdmin: boolean) {
  return modules.filter((module) => canAccessModule(module, isAdmin))
}

export function visibleGroupOrder(isAdmin: boolean) {
  return groupOrder.filter((group) => visibleModules(isAdmin).some((module) => module.group === group) || group === 'activity')
}

export function optionLabel(field: FieldDef, value: string) {
  return field.options?.find((option) => option.value === value)?.label || value
}
