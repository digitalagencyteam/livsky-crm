import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../core/store/authStore'
import { useLeadsStore } from '../../core/store/leadsStore'
import { useAutoRefresh } from '../lib/useAutoRefresh'
import { cx } from '../lib/cx'
import { ConfirmModal, Logo } from '../ui'
import { PasswordGate } from './PasswordGate'
import { IconContract, IconGear, IconInbox, IconMoney, IconOut, IconSite } from './icons'

const NAV = [
  { to: '/', label: 'Бухгалтерия', icon: IconMoney },
  { to: '/contracts', label: 'Договоры', icon: IconContract },
  { to: '/leads', label: 'Заявки', icon: IconInbox, badge: 'leads' },
  { to: '/site', label: 'Сайт', icon: IconSite },
]

function NavItem({ to, label, icon: Icon, badge, compact }) {
  const newCount = useLeadsStore((s) => s.newCount)
  const count = badge === 'leads' ? newCount : 0
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        cx(
          'relative flex items-center gap-3 rounded-full text-sm font-semibold transition',
          compact ? 'flex-col gap-1 px-2 py-1.5 text-[11px]' : 'px-4 py-2.5',
          isActive ? 'accent-fill text-white' : 'text-ink-2 hover:text-ink hover:bg-panel-2',
        )
      }
    >
      <Icon />
      <span className={compact ? '' : 'flex-1'}>{label}</span>
      {count > 0 && (
        <span
          className={cx(
            'rounded-full bg-white px-1.5 text-[11px] font-bold tabular-nums text-[#3a34a8]',
            compact && 'absolute -top-0.5 right-1',
          )}
        >
          {count}
        </span>
      )}
    </NavLink>
  )
}

export function AppLayout() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const refreshMe = useAuthStore((s) => s.refreshMe)
  const fetchNewCount = useLeadsStore((s) => s.fetchNewCount)
  const [confirmOut, setConfirmOut] = useState(false)
  const wide = useLocation().pathname.startsWith('/site/')

  // Новые заявки видно в меню без перезагрузки: опрос раз в минуту и при возврате на вкладку
  useAutoRefresh(() => {
    fetchNewCount()
    refreshMe()
  }, 60_000)

  return (
    <div className="min-h-full flex">
      <PasswordGate />

      <aside className="hidden lg:flex w-[260px] shrink-0 flex-col gap-6 p-5 sticky top-0 h-dvh">
        <div className="px-2 pt-1">
          <Logo />
        </div>
        <nav className="panel rounded-[28px] p-2 flex flex-col gap-1">
          {NAV.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </nav>
        <div className="mt-auto panel rounded-[22px] p-2 flex flex-col gap-1">
          <p className="px-4 pt-2 pb-1 text-sm font-semibold truncate">{user?.name || 'Админ'}</p>
          <p className="px-4 pb-2 caption truncate">{user?.email}</p>
          <NavItem to="/settings" label="Настройки" icon={IconGear} />
          <button
            type="button"
            onClick={() => setConfirmOut(true)}
            className="flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-semibold text-ink-3 hover:text-ink hover:bg-panel-2"
          >
            <IconOut /> Выйти
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="lg:hidden sticky top-0 z-30 px-4 pt-3">
          <div className="panel panel-solid rounded-full px-4 h-14 flex items-center justify-between">
            <Logo />
            <NavLink to="/settings" aria-label="Настройки" className="text-ink-2 p-2">
              <IconGear />
            </NavLink>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 pb-28 lg:px-8 lg:py-8 lg:pb-10">
          <div className={cx('mx-auto', wide ? 'max-w-[1400px]' : 'max-w-[1180px]')}>
            <Outlet />
          </div>
        </main>
      </div>

      {/* Телефон: разделы внизу, как таб-бар iOS */}
      <nav className="lg:hidden fixed bottom-3 inset-x-3 z-30 panel panel-solid rounded-[28px] p-1.5 grid grid-cols-4 gap-1">
        {NAV.map((item) => (
          <NavItem key={item.to} {...item} compact />
        ))}
      </nav>

      <ConfirmModal
        open={confirmOut}
        onClose={() => setConfirmOut(false)}
        title="Выйти из CRM?"
        confirmText="Выйти"
        onConfirm={logout}
      />
    </div>
  )
}
