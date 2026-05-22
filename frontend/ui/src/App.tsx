import { AdminApp } from './components/AdminApp'
import { ThemeProvider } from './components/theme-provider'
import { ModalStackProvider } from '@proxy-smart/shared-ui'
import './App.css'

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="proxy-smart-theme">
      <ModalStackProvider>
        <AdminApp />
      </ModalStackProvider>
    </ThemeProvider>
  )
}

export default App
