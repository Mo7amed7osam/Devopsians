import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import styles from "./Doctor.module.css";

const DoctorDashboard = () => {
  const { id: doctorId } = useParams();
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newMedicineSchedule, setNewMedicineSchedule] = useState("");

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          `http://localhost:3030/doctor/assigned-patients/doctor/${doctorId}/`
        );

        if (response.status !== 200) {
          throw new Error("Failed to fetch patients data.");
        }

        setPatients(response.data.patients);
      } catch (error) {
        setError("Unable to fetch patients. Please try again later.", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, [doctorId]);

  const filteredPatients = patients.filter((patient) =>
    `${patient.firstName} ${patient.lastName}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const handleUpdateMedicineSchedule = async () => {
    const patientId = selectedPatient?.id || selectedPatient?._id;

    if (!patientId || !newMedicineSchedule.trim()) {
      alert("Please select a patient and enter a valid medicine schedule.");
      return;
    }

    try {
      const response = await axios.put(
        `http://localhost:3030/doctor/update-medicine-schedule/doctor/${doctorId}/patient/${patientId}`,
        { medicineSchedule: newMedicineSchedule }
      );

      if (response.status === 200) {
        setSelectedPatient((prev) => ({
          ...prev,
          medicineSchedule: newMedicineSchedule,
        }));
        setNewMedicineSchedule("");
        alert("Medicine schedule updated successfully.");
      } else {
        throw new Error("Failed to update medicine schedule.");
      }
    } catch (error) {
      console.error("Error updating medicine schedule:", error);
      alert("An error occurred. Please try again.");
    }
  };

  const renderPatientCard = (patient) => (
    <div
      key={patient.id || patient._id}
      className={`${styles.patientCard} ${
        selectedPatient?.id === patient.id ? styles.selected : ""
      }`}
      onClick={() => setSelectedPatient(patient)}
    >
      <div className="patient-card-header">
        <h3>
          {patient.firstName} {patient.lastName}
        </h3>
      </div>
    </div>
  );

  const renderPatientDetails = () => {
    if (!selectedPatient) return null;

    return (
      <div className={styles.patientDetails}>
        <div className={styles.patientDetailsHeader}>
          <div className={styles.patientHeaderInfo}>
            <h2>
              {selectedPatient.firstName} {selectedPatient.lastName}
            </h2>
            <span className={styles.patientHeaderCondition}>
              {selectedPatient.currentCondition}
            </span>
          </div>
          <button
            className={styles.closeBtn}
            onClick={() => setSelectedPatient(null)}
          >
            ×
          </button>
        </div>

        <div className={styles.patientDetailsTabs}>
          {["overview", "history", "medicine"].map((tab) => (
            <button
              key={tab}
              className={activeTab === tab ? styles.active : ""}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div className={styles.patientDetailsContent}>
          {activeTab === "overview" && (
            <div className={styles.overviewTab}>
              <div className={styles.overviewGrid}>
                <div className={styles.overviewItem}>
                  <h4>Personal Information</h4>
                  <p>
                    <strong>Gender:</strong> {selectedPatient.gender}
                  </p>
                  <p>
                    <strong>Admission Date:</strong>{" "}
                    {selectedPatient.admissionDate}
                  </p>
                </div>
                <div className={styles.overviewItem}>
                  <h4>Current Condition</h4>
                  <p>{selectedPatient.currentCondition}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "history" && (
            <div className={styles.historyTab}>
              <h3>Medical History</h3>
              <p>
                {selectedPatient.medicalHistory ||
                  "No medical history available."}
              </p>
            </div>
          )}

          {activeTab === "medicine" && (
            <div className={styles.medicineTab}>
              <h3>Medicine Schedule</h3>
              <pre>
                {selectedPatient.medicineSchedule || "No schedule available."}
              </pre>
              <textarea
                className={styles.medicineInput}
                placeholder="Update medicine schedule"
                value={newMedicineSchedule}
                onChange={(e) => setNewMedicineSchedule(e.target.value)}
              ></textarea>
              <button
                className={styles.updateMedicineBtn}
                onClick={handleUpdateMedicineSchedule}
              >
                Update Schedule
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.doctorDashboard}>
      <header className={styles.dashboardHeader}>
        <h1>Doctor Dashboard</h1>
        <div className={styles.headerActions}>
          <div className={styles.searchWrapper}>
            <i className="search-icon">🔍</i>
            <input
              type="search"
              placeholder="Search patients..."
              className={styles.searchInput}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className={styles.notificationBtn}>
            <span className="notification-badge">2</span>
          </button>
          <div className={styles.profileSection}>
            <span className={styles.profileName}>Dr. Sarah Thompson</span>
          </div>
        </div>
      </header>

      <div className={styles.dashboardContent}>
        <div className={styles.patientsList}>
          <div className={styles.patientsListHeader}>
            <h2>My Patients</h2>
            <span className={styles.patientCount}>
              {filteredPatients.length} Total
            </span>
          </div>

          {loading ? (
            <div className={styles.loading}>Loading patients...</div>
          ) : error ? (
            <div className={styles.error}>{error}</div>
          ) : filteredPatients.length > 0 ? (
            filteredPatients.map(renderPatientCard)
          ) : (
            <div className={styles.noPatients}>No patients found</div>
          )}
        </div>

        <div className={styles.patientDetailsSection}>
          {selectedPatient ? (
            renderPatientDetails()
          ) : (
            <div className={styles.noPatientSelected}>
              <h3>Select a Patient</h3>
              <p>Click on a patient card to view detailed information</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DoctorDashboard;
