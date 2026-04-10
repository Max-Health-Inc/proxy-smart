import { AdminApp } from './components/AdminApp'
import { ThemeProvider } from './components/theme-provider'
import './App.css'

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="proxy-smart-theme">
      <AdminApp />
    </ThemeProvider>
  )
}

export default App
