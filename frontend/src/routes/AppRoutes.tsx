import { Navigate, Route, Routes } from 'react-router-dom'
import DashboardPage from '../pages/DashboardPage.tsx'
import LoginPage from '../pages/LoginPage.tsx'
import RegisterPage from '../pages/RegisterPage.tsx'

/** Rotas: login/registro e painel em /app. (Landing em commit seguinte.) */
export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/app/*" element={<DashboardPage />} />
      <Route path="/" element={<Navigate to="/app" replace />} />
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  )
}
