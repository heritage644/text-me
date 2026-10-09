import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import './App.css'
import LoginPage from './auth/login-page'
import SignUp from './auth/signup'

function App() {
  const navigate = useNavigate()

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/signup"
        element={<SignUp onSwitchToLogin={() => navigate('/login')} />}
      />
      <Route path="*" element={<p className="p-8 text-fg">This page no dey o. Go back.</p>} />
    </Routes>
  )
}

export default App