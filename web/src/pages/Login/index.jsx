import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../core/store/authStore'
import { Button, Card, Form, Input, Logo, PasswordInput } from '../../shared/ui'

const STEP = { LOGIN: 'login', FORGOT: 'forgot', RESET: 'reset' }

/** Вход админа: пароль или код с почты, если пароль забыт. */
export default function LoginPage() {
  const { token, login, forgotPassword, resetPassword, loading } = useAuthStore()
  const [step, setStep] = useState(STEP.LOGIN)
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const navigate = useNavigate()
  const from = useLocation().state?.from?.pathname || '/'

  if (token) return <Navigate to={from} replace />

  async function onLogin(values) {
    setError('')
    const res = await login(values)
    if (res.ok) navigate(from, { replace: true })
    else setError(res.error)
  }

  async function onForgot(values) {
    setError('')
    const res = await forgotPassword(values.email)
    if (!res.ok) return setError(res.error)
    setEmail(values.email)
    setInfo('Если почта верная, на неё пришёл код из 6 цифр. Он действует 10 минут.')
    setStep(STEP.RESET)
  }

  async function onReset(values) {
    setError('')
    if (values.newPassword !== values.repeat) return setError('Пароли не совпадают')
    const res = await resetPassword({ email, code: values.code, newPassword: values.newPassword })
    if (res.ok) navigate('/', { replace: true })
    else setError(res.error)
  }

  return (
    <main className="min-h-full grid place-items-center px-4 py-10">
      <div className="w-full max-w-[400px] flex flex-col gap-6">
        <div className="flex justify-center">
          <Logo />
        </div>
        <Card pad="lg" className="flex flex-col gap-5">
          {step === STEP.LOGIN && (
            <>
              <div>
                <h1 className="font-display text-xl">Вход</h1>
                <p className="text-sm text-ink-3 mt-1">Админка агентства: бухгалтерия, договоры, заявки и сайт.</p>
              </div>
              <Form onSubmit={onLogin}>
                <Input name="email" type="email" label="Почта" autoComplete="username" required />
                <PasswordInput name="password" label="Пароль" autoComplete="current-password" required error={error} />
                <Button type="submit" size="lg" full loading={loading}>Войти</Button>
              </Form>
              <button type="button" className="text-sm text-accent self-center hover:underline" onClick={() => { setError(''); setStep(STEP.FORGOT) }}>
                Забыли пароль?
              </button>
            </>
          )}

          {step === STEP.FORGOT && (
            <>
              <div>
                <h1 className="font-display text-xl">Восстановление</h1>
                <p className="text-sm text-ink-3 mt-1">Пришлём код на почту админа.</p>
              </div>
              <Form onSubmit={onForgot}>
                <Input name="email" type="email" label="Почта" required error={error} />
                <Button type="submit" size="lg" full loading={loading}>Получить код</Button>
              </Form>
              <button type="button" className="text-sm text-ink-3 self-center hover:text-ink" onClick={() => setStep(STEP.LOGIN)}>
                ← Назад ко входу
              </button>
            </>
          )}

          {step === STEP.RESET && (
            <>
              <div>
                <h1 className="font-display text-xl">Новый пароль</h1>
                <p className="text-sm text-ink-3 mt-1">{info}</p>
              </div>
              <Form onSubmit={onReset}>
                <Input name="code" label="Код из письма" inputMode="numeric" maxLength={6} autoComplete="one-time-code" required />
                <PasswordInput name="newPassword" label="Новый пароль" hint="Не короче 8 символов" autoComplete="new-password" required minLength={8} />
                <PasswordInput name="repeat" label="Ещё раз" autoComplete="new-password" required error={error} />
                <Button type="submit" size="lg" full loading={loading}>Сохранить и войти</Button>
              </Form>
            </>
          )}
        </Card>
      </div>
    </main>
  )
}
