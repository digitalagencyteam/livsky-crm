import { createBrowserRouter, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { AppLayout } from '../../shared/layout/AppLayout'
import LoginPage from '../../pages/Login'
import BoardPage from '../../pages/Board'
import ContractsPage from '../../pages/Contracts'
import LeadsPage from '../../pages/Leads'
import SitePage from '../../pages/Site'
import PostEditorPage from '../../pages/Site/PostEditor'
import CaseEditorPage from '../../pages/Site/CaseEditor'
import SettingsPage from '../../pages/Settings'

function Protected() {
  const isAuthed = useAuthStore((s) => Boolean(s.token))
  const location = useLocation()
  if (!isAuthed) return <Navigate to="/login" replace state={{ from: location }} />
  return <Outlet />
}

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <Protected />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <BoardPage /> },
          { path: '/contracts', element: <ContractsPage /> },
          { path: '/leads', element: <LeadsPage /> },
          { path: '/site', element: <SitePage /> },
          { path: '/site/posts/:id', element: <PostEditorPage /> },
          { path: '/site/cases/:id', element: <CaseEditorPage /> },
          { path: '/settings', element: <SettingsPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
