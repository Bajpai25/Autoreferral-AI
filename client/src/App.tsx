import { Route, Routes } from "react-router-dom"
import DashboardPage from "./pages/dashboard"
import Home from "./pages/Home"
import ProtectedRoute from "./utils/ProtectedRoute"
import PublicRoute from "./utils/PublicRoute"
// import Flow from "./components/xyflow/ReactFlow"
// import CustomNodes from "./components/xyflow/customNodes"
import WorkflowBuilder from "./pages/WorkflowBuilder"

 const App=()=>{
  return (
    <div>
      <Routes>
        <Route  path="/dashboard" element={<ProtectedRoute><DashboardPage/></ProtectedRoute>}></Route>
      
        <Route path="/" element={<PublicRoute><Home/></PublicRoute>}></Route>
        {/* <Route path="/flow" element={<Flow/>}></Route> */}
        {/* <Route path="/custom" element={<CustomNodes/>}></Route> */}
        <Route path="/workflow-builder" element={<WorkflowBuilder/>}></Route>
      </Routes>
    </div>
  )
}

export default App