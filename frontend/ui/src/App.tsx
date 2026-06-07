import { useEffect } from 'react'
import { AdminApp } from './components/AdminApp'
import { ThemeProvider } from './components/theme-provider'
import { ModalStackProvider } from '@proxy-smart/shared-ui'
import './App.css'

function App() {
  useEffect(() => {
    document.getElementById('initial-loader')?.remove();
  }, []);

  return (
    <ThemeProvider defaultTheme="system" storageKey="proxy-smart-theme">
      <ModalStackProvider>
        <AdminApp />
      </ModalStackProvider>
    </ThemeProvider>
  )
}

export default App
