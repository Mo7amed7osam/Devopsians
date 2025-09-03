import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import styles from "./EmployeeMgmt.module.css"; // Import the CSS module
import TrackEmployeeTasks from "../components/TrackEmployeeTasks";
import AssignTask from "../components/AssignTask";

function EmployeeManagement() {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [modalAction, setModalAction] = useState(null);
  const { managerId } = useParams(); // Manager ID from route params

  useEffect(() => {
    if (managerId) {
      axios
        .get(`http://localhost:3030/manager/view-all-employees/${managerId}`)
        .then((response) => {
          setEmployees(response.data.employees);
        })
        .catch((error) => console.error("Error:", error));
    }
  }, [managerId]);

  const handleRemoveEmployee = (_id) => {
    axios
      .delete(`http://localhost:3030/manager/remove-employee`, {
        data: { id: _id },
      })
      .then(() => {
        setEmployees(employees.filter((emp) => emp._id !== _id));
        setSelectedEmployee(null);
        setModalAction(null);
      })
      .catch((error) => {
        console.error("Error removing employee:", error);
      });
  };

  const openModal = (action) => {
    setModalAction(action);
  };

  const closeModal = () => {
    setModalAction(null);
  };

  const handleSelectEmployee = (employee) => {
    setSelectedEmployee(employee);
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Employee Management</h1>

      {/* Employee Grid */}
      <div className={styles.employeeGrid}>
        {employees.length === 0 ? (
          <p>No employees found</p>
        ) : (
          employees.map((employee) => (
            <div
              key={employee._id}
              className={`${styles.employeeCard} ${
                selectedEmployee === employee ? styles.employeeCardSelected : ""
              }`}
              onClick={() => handleSelectEmployee(employee)}
            >
              <div className={styles.cardHeader}>
                <h2>{`${employee.firstName} ${employee.lastName}`}</h2>
              </div>
              <div className={styles.cardContent}>
                <p>Role: {employee.role}</p>
                <p>Email: {employee.email}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Actions for the selected employee */}
      {selectedEmployee && (
        <div className={styles.employeeActions}>
          <button
            className={styles.removeButton}
            onClick={() => handleRemoveEmployee(selectedEmployee._id)}
          >
            Remove Employee
          </button>
          <button
            className={styles.assignButton}
            onClick={() => openModal("assign")}
          >
            Assign Task
          </button>
          <button
            className={styles.trackButton}
            onClick={() => openModal("track")}
          >
            Track Tasks
          </button>
        </div>
      )}

      {/* Assign Task Modal */}
      {modalAction === "assign" && selectedEmployee && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Assign Task to {selectedEmployee.firstName}</h2>
              <button className={styles.modalClose} onClick={closeModal}>
                ×
              </button>
            </div>
            <AssignTask
              employeeId={selectedEmployee._id}
              onClose={closeModal}
            />
          </div>
        </div>
      )}

      {/* Track Tasks Modal */}
      {modalAction === "track" && selectedEmployee && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Tasks for {selectedEmployee.firstName}</h2>
              <button className={styles.modalClose} onClick={closeModal}>
                ×
              </button>
            </div>
            <TrackEmployeeTasks
              employeeId={selectedEmployee._id}
              onClose={closeModal}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default EmployeeManagement;
