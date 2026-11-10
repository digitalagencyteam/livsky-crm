import { env } from '../config/env.js'
import { sendMail } from '../utils/mailer.js'

const KIND = { form: 'Заявка с сайта', call: 'Бронь звонка' }

function leadText(lead) {
  const when = lead.callAt
    ? new Date(lead.callAt).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow', dateStyle: 'long', timeStyle: 'short' })
    : null
  return [
    `${KIND[lead.kind]}: ${lead.name}`,
    `Контакт: ${lead.contact}`,
    when && `Звонок: ${when} (МСК)${lead.platform ? `, ${lead.platform}` : ''}`,
    lead.needs?.length ? `Что нужно: ${lead.needs.join(', ')}` : null,
    lead.message && `\n${lead.message}`,
    lead.page && `\nСтраница: ${lead.page}`,
    `\nОткрыть в CRM: ${env.clientUrl}/leads?open=${lead.id}`,
  ]
    .filter(Boolean)
    .join('\n')
}

/** Уведомить о заявке: почта и телеграм, что настроено. Ошибки не мешают сохранить заявку. */
export async function notifyLead(lead) {
  const text = leadText(lead)
  const jobs = []
  if (env.notifyEmail) jobs.push(sendMail(env.notifyEmail, `${KIND[lead.kind]}: ${lead.name}`, text))
  if (env.telegramBotToken && env.telegramChatId) {
    jobs.push(
      fetch(`https://api.telegram.org/bot${env.telegramBotToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: env.telegramChatId, text, disable_web_page_preview: true }),
        signal: AbortSignal.timeout(10_000),
      }).then((r) => {
        if (!r.ok) throw new Error(`телеграм ответил ${r.status}`)
      }),
    )
  }
  const results = await Promise.allSettled(jobs)
  for (const r of results) if (r.status === 'rejected') console.error('[заявки] уведомление не ушло:', r.reason?.message)
}
