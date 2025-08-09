import { Route, Routes } from "react-router-dom"
import DashboardPage from "./pages/dashboard"
import Home from "./pages/Home"

 const App=()=>{
  return (
    <div>
      <Routes>
        <Route path="/dashboard" element={<DashboardPage/>}></Route>
        <Route path="/" element={<Home/>}></Route>
      </Routes>
    </div>
  )
}

export default App