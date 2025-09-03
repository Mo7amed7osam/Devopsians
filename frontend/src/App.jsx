import { BrowserRouter, Route, Routes } from "react-router-dom";
import Homepage from "./pages/HomePage";
import PageNotFound from "./pages/PageNotFound";
import LoginForm from "./pages/LoginForm";
import RegistrationForm from "./pages/RegisterForm";
import AdminPage from "./pages/AdminPage";
import PrivateRoute from "./pages/PrivateRoute";
import Doctor from "./pages/Doctor";
// import Manager from "./pages/Manager";
//import Manager from "./pages/Manager";
import UserHomeScreen from "./pages/UserHomeScreen";
import AddHospital from "./pages/adminPages/AddHospital";
import ManagerDashboard from "./pages/ManagerDashboard";
import ViewAllHospital from "./pages/adminPages/ViewAllHospital";
import PatientHomePage from "./pages/PatientHomePage";
import UpdateMedicalDetails from "./pages/UpdateMedicalDetails";
import EmployeeManagement from "./pages/EmployeeMgmt";
import Addicu from "./pages/managerPages/Addicu";
//import ManagerDashboard from "./pages/Manager";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Homepage />} />
        <Route path="/Login" element={<LoginForm />} />
        <Route path="/Register" element={<RegistrationForm />} />
        <Route path="/Admin" element={<AdminPage />} />
        <Route path="/Home" element={<UserHomeScreen />} />
        <Route path="/Addhospital" element={<AddHospital />} />
        <Route path="/ViewHospital" element={<ViewAllHospital />} />
        <Route path="/Addicu/:id" element={<Addicu />} />
        <Route
          path="/ManageEmployees/:id"
          element={<EmployeeManagement />}
        />
        <Route
          path="/UpdateDetails/:userId/:icuId"
          element={<UpdateMedicalDetails />}
        />

        <Route
          path="/Home/:id"
          element={
            <PrivateRoute requiredRole="Patient">
              <UserHomeScreen />
            </PrivateRoute>
          }
        />
        <Route
          path="/Doctor/:id"
          element={
            <PrivateRoute requiredRole="Doctor">
              <Doctor />
            </PrivateRoute>
          }
        />
        <Route
          path="/PatientProfile/:userId/:icuId"
          element={
            <PrivateRoute requiredRole="Patient">
              <PatientHomePage />
            </PrivateRoute>
          }
        />
        <Route
          path="/Manager/:id"
          element={
            <PrivateRoute requiredRole="Manager">
              <ManagerDashboard />
            </PrivateRoute>
          }
        />
        {/* <Route
          path="/Addhospital"
          element={
            <PrivateRoute requiredRole="Admin">
              <AddHospital />
            </PrivateRoute>
          }
        /> */}
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
