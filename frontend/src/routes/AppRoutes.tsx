import { Navigate, Route, Routes } from 'react-router-dom'
import DashboardPage from '../pages/DashboardPage.tsx'
import LandingPage from '../pages/LandingPage.tsx'
import LoginPage from '../pages/LoginPage.tsx'
import RegisterPage from '../pages/RegisterPage.tsx'

/**
 * Rotas da aplicação. A landing (`/`) é a primeira tela; o painel fica em `/app`.
 */
export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/app/*" element={<DashboardPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
