import { BrowserRouter, Route, Routes } from "react-router-dom";
import Homepage from "./pages/Homepage";
import PageNotFound from "./pages/PageNotFound";
import LoginForm from "./pages/auth/LoginForm";
import RegistrationForm from "./pages/auth/RegisterForm";
import AdminPage from "./pages/AdminPage";
import PrivateRoute from "./routes/PrivateRoute";
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
        <Route
          path="/Admin"
          element={
            <PrivateRoute requiredRole="Admin">
              <AdminPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/Addhospital"
          element={
            <PrivateRoute requiredRole="Admin">
              <AddHospital />
            </PrivateRoute>
          }
        />
        <Route
          path="/ViewHospital"
          element={
            <PrivateRoute requiredRole="Admin">
              <ViewAllHospital />
            </PrivateRoute>
          }
        />
        <Route
          path="/Addicu"
          element={
            <PrivateRoute requiredRole="Manager">
              <Addicu />
            </PrivateRoute>
          }
        />
        <Route
          path="/ManageEmployees"
          element={
            <PrivateRoute requiredRole="Manager">
              <EmployeeManagement />
            </PrivateRoute>
          }
        />
        <Route
          path="/UpdateDetails"
          element={
            <PrivateRoute requiredRole="Patient">
              <UpdateMedicalDetails />
            </PrivateRoute>
          }
        />

        <Route
          path="/Home"
          element={
            <PrivateRoute requiredRole="Patient">
              <UserHomeScreen />
            </PrivateRoute>
          }
        />
        <Route
          path="/Doctor"
          element={
            <PrivateRoute requiredRole="Doctor">
              <Doctor />
            </PrivateRoute>
          }
        />
        <Route
          path="/PatientProfile"
          element={
            <PrivateRoute requiredRole="Patient">
              <PatientHomePage />
            </PrivateRoute>
          }
        />
        <Route
          path="/Manager"
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
