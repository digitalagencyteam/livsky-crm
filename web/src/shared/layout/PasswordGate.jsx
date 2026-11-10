import { useState } from 'react'
import { useAuthStore } from '../../core/store/authStore'
import { Button, Form, Modal, PasswordInput } from '../ui'

/**
 * Первый вход с базовым паролем из сида: пока его не сменили, CRM дальше не пускает.
 * Базовый пароль известен всем, кто видел инструкцию, — с ним в финансах не работаем.
 */
export function PasswordGate() {
  const user = useAuthStore((s) => s.user)
  const changePassword = useAuthStore((s) => s.changePassword)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (!user?.mustChangePassword) return null

  async function submit(values) {
    setError('')
    if (values.newPassword !== values.repeat) return setError('Пароли не совпадают')
    setBusy(true)
    const res = await changePassword(values)
    setBusy(false)
    if (!res.ok) setError(res.error)
  }

  return (
    <Modal open title="Смените базовый пароль" hideClose size="sm">
      <Form onSubmit={submit}>
        <p className="text-sm text-ink-3">
          Вы вошли с паролем из инструкции. Придумайте свой — дальше вход только с ним.
          Забудете — восстановите кодом на почту.
        </p>
        <PasswordInput name="currentPassword" label="Текущий пароль" autoComplete="current-password" required />
        <PasswordInput name="newPassword" label="Новый пароль" hint="Не короче 8 символов" autoComplete="new-password" required minLength={8} />
        <PasswordInput name="repeat" label="Ещё раз" autoComplete="new-password" required error={error} />
        <Button type="submit" size="lg" full loading={busy}>Сохранить</Button>
      </Form>
    </Modal>
  )
}
