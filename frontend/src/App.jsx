import './App.css'

import { BrowserRouter, Routes, Route } from 'react-router-dom'

import PublicRouter from '@pages/Public/PublicRouter'
import AdminRouter from '@pages/Admin/AdminRouter'
import AuthGuard from '@helpers/AuthGuard'
import AuthRouter from '@pages/Auth/AuthRouter'

function App() {

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/*" element={<PublicRouter/>}/>
        <Route path="/admin/*" element={
            <AuthGuard><AdminRouter/></AuthGuard>
        }/>
        <Route path="/auth/*" element={<AuthRouter/>}/>
      </Routes>
    </BrowserRouter>
  )
}

export default App
