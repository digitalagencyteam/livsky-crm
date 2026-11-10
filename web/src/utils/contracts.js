export const CONTRACT_STATUS = {
  draft: { label: 'Черновик', tone: 'neutral' },
  sent: { label: 'На подписи', tone: 'warn' },
  signed: { label: 'Подписан', tone: 'ok' },
  terminated: { label: 'Закрыт', tone: 'danger' },
}

export const STATUS_OPTIONS = Object.entries(CONTRACT_STATUS).map(([value, s]) => ({ value, label: s.label }))

export const FILE_KIND = {
  original: 'Проект',
  signed: 'Подписанный',
  appendix: 'Приложение',
}

export const KIND_TEXT = {
  client: {
    party: 'Клиент',
    subject: 'Предмет договора',
    subjectHint: 'Например: разработка сайта, SEO на 6 месяцев',
    amount: 'Сумма договора, $',
    create: 'Договор с клиентом',
  },
  employee: {
    party: 'Сотрудник (ФИО)',
    subject: 'Должность',
    subjectHint: 'Например: дизайнер, SMM-менеджер',
    amount: 'Оклад / ставка, $',
    create: 'Договор с сотрудником',
  },
}

/** Дата для поля: ГГГГ-ММ-ДД из ISO */
export const toDay = (v) => (v ? String(v).slice(0, 10) : '')
