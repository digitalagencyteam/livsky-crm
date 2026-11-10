import { useState } from 'react'
import { useAuthStore } from '../../core/store/authStore'
import { PageSection } from '../../widgets'
import { Button, Card, Form, Input, PasswordInput } from '../../shared/ui'

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user)
  const updateName = useAuthStore((s) => s.updateName)
  const changePassword = useAuthStore((s) => s.changePassword)
  const [nameMsg, setNameMsg] = useState(null)
  const [pwdMsg, setPwdMsg] = useState(null)
  const [busy, setBusy] = useState('')

  async function saveName({ name }) {
    setBusy('name')
    const res = await updateName(name)
    setBusy('')
    setNameMsg(res.ok ? { ok: true, text: 'Сохранено' } : { ok: false, text: res.error })
  }

  async function savePassword(values, e) {
    const form = e.currentTarget
    if (values.newPassword !== values.repeat) return setPwdMsg({ ok: false, text: 'Пароли не совпадают' })
    setBusy('pwd')
    const res = await changePassword(values)
    setBusy('')
    setPwdMsg(res.ok ? { ok: true, text: 'Пароль изменён' } : { ok: false, text: res.error })
    if (res.ok) form.reset()
  }

  return (
    <PageSection pill="Настройки" title="Профиль" subtitle={`Вход по почте ${user?.email}. Забудете пароль — восстановите кодом на эту почту.`}>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="flex flex-col gap-4">
          <p className="font-semibold">Имя</p>
          <Form onSubmit={saveName}>
            <Input name="name" label="Как вас подписывать" defaultValue={user?.name} required maxLength={80} />
            {nameMsg && <p className={nameMsg.ok ? 'text-sm text-ok' : 'text-sm text-danger'}>{nameMsg.text}</p>}
            <Button type="submit" className="self-start" loading={busy === 'name'}>Сохранить</Button>
          </Form>
        </Card>
        <Card className="flex flex-col gap-4">
          <p className="font-semibold">Пароль</p>
          <Form onSubmit={savePassword}>
            <PasswordInput name="currentPassword" label="Текущий пароль" autoComplete="current-password" required />
            <PasswordInput name="newPassword" label="Новый пароль" hint="Не короче 8 символов" autoComplete="new-password" required minLength={8} />
            <PasswordInput name="repeat" label="Ещё раз" autoComplete="new-password" required />
            {pwdMsg && <p className={pwdMsg.ok ? 'text-sm text-ok' : 'text-sm text-danger'}>{pwdMsg.text}</p>}
            <Button type="submit" className="self-start" loading={busy === 'pwd'}>Сменить пароль</Button>
          </Form>
        </Card>
      </div>
    </PageSection>
  )
}
