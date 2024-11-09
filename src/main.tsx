import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { AuthProvider } from './contexts/AuthContext'
import { BudgetsProvider } from './contexts/BudgetsContext'
import { ExpensesProvider } from './contexts/ExpensesContext'
import './index.css'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Failed to find the root element')

createRoot(rootElement).render(
  <StrictMode>
    <AuthProvider>
      <BudgetsProvider>
        <ExpensesProvider>
          <App />
        </ExpensesProvider>
      </BudgetsProvider>
    </AuthProvider>
  </StrictMode>
)