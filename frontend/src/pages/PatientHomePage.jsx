import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styles from "./PatientHomePage.module.css"; // Importing the CSS module
import axios from "axios";

function PatientHomePage() {
  const { userId, icuId } = useParams();
  const navigate = useNavigate();
  const [patientDetails, setPatientDetails] = useState(null);
  const [doctorDetails, setDoctorDetails] = useState(null); // To store assigned doctor's details
  const [icuDetails, setIcuDetails] = useState(null); // To store ICU details
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showInvoicePopup, setShowInvoicePopup] = useState(false); // To toggle the invoice popup
  const [fees, setFees] = useState(null); // To store the calculated fees

  useEffect(() => {
    if (!userId) {
      setError("User ID is not available.");
      setLoading(false);
      return;
    }

    const fetchPatientAndDoctorDetails = async () => {
      try {
        console.log("Fetching data for userId:", userId);
        const response = await axios.get(
          `http://localhost:3030/user/details/${userId}`
        );
        console.log("Fetched patient data:", response.data);

        const patient = response.data.user;
        setPatientDetails(patient);

        // Fetch assigned doctor details
        if (patient.assignedDoctor) {
          const doctorResponse = await axios.get(
            `http://localhost:3030/user/details/${patient.assignedDoctor}`
          );
          console.log("Fetched doctor data:", doctorResponse.data);
          setDoctorDetails(doctorResponse.data.user);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Failed to load data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchPatientAndDoctorDetails();
  }, [userId]);

  useEffect(() => {
    if (!icuId) {
      setError("ICU ID is not available.");
      return;
    }

    const fetchICUDetails = async () => {
      try {
        console.log("Fetching data for icuId:", icuId);
        const response = await axios.get(
          `http://localhost:3030/manager/view-icu-byId/${icuId}`
        );
        console.log("Fetched ICU data:", response.data);

        const icu = response.data.data;
        setIcuDetails(icu);
      } catch (error) {
        console.error("Error fetching ICU data:", error);
        setError("Failed to load ICU data. Please try again.");
      }
    };

    fetchICUDetails();
  }, [icuId]);

  const handleCheckout = async () => {
    try {
      const response = await axios.get(
        `http://localhost:3030/manager/calculate-fees/${userId}`
      );
      setFees(response.data.data.totalFees);
      setShowInvoicePopup(true); // Show the popup after fetching fees
    } catch (error) {
      console.error("Error calculating fees:", error);
      setError("Failed to calculate fees. Please try again.");
    }
  };

  // Handle logout function
  const handleLogout = () => {
    localStorage.removeItem("userToken");
    navigate("/login"); // Redirect to login page after logout
  };

  // Handle Pay button click
  const handlePay = async () => {
    navigate(`/Home/${userId}`); // Navigate back to UserHomeScreen
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  if (!patientDetails) {
    return <div>No patient data available.</div>;
  }

  return (
    <div className={styles.container}>
      <h1>Welcome, {patientDetails.firstName}</h1>
      <div className={styles.patientInfo}>
        <h2>Patient Details</h2>
        <div className={styles.detail}>
          <strong>First Name:</strong> {patientDetails.firstName}
        </div>
        <div className={styles.detail}>
          <strong>Last Name:</strong> {patientDetails.lastName}
        </div>
        <div className={styles.detail}>
          <strong>Gender:</strong> {patientDetails.gender}
        </div>
        <div className={styles.detail}>
          <strong>Email:</strong> {patientDetails.email}
        </div>
        <div className={styles.detail}>
          <strong>Phone:</strong> {patientDetails.phone}
        </div>
        <div className={styles.detail}>
          <strong>Role:</strong> {patientDetails.role}
        </div>
        <div className={styles.detail}>
          <strong>Current Condition:</strong> {patientDetails.currentCondition}
        </div>
        <div className={styles.detail}>
          <strong>Medical History:</strong> {patientDetails.medicalHistory}
        </div>
      </div>

      {doctorDetails && (
        <div className={styles.doctorInfo}>
          <h2>Assigned Doctor Details</h2>
          <div className={styles.detail}>
            <strong>Name:</strong> {doctorDetails.firstName}{" "}
            {doctorDetails.lastName}
          </div>
          <div className={styles.detail}>
            <strong>Email:</strong> {doctorDetails.email}
          </div>
          <div className={styles.detail}>
            <strong>Phone:</strong> {doctorDetails.phone}
          </div>
        </div>
      )}

      {icuDetails && (
        <div className={styles.icuInfo}>
          <h2>ICU Details</h2>
          <div className={styles.detail}>
            <strong>Specialization:</strong> {icuDetails.specialization}
          </div>
          <div className={styles.detail}>
            <strong>Hospital:</strong> {icuDetails.hospital.name}
          </div>
          <div className={styles.detail}>
            <strong>Fees:</strong> {icuDetails.fees}
          </div>
        </div>
      )}

      {/* Checkout Button */}
      <button onClick={handleCheckout} className={styles.checkoutButton}>
        Proceed to Checkout
      </button>

      {/* Invoice Popup */}
      {showInvoicePopup && (
        <div className={styles.invoicePopup}>
          <div className={styles.popupContent}>
            <h2>Invoice</h2>
            <p>
              <strong>Patient Name:</strong> {patientDetails.firstName}{" "}
              {patientDetails.lastName}
            </p>
            <p>
              <strong>Hospital:</strong> {icuDetails.hospital.name}
            </p>
            <p>
              <strong>Total Amount:</strong> ${fees}
            </p>
            <div className={styles.popupButtons}>
              <button onClick={handlePay} className={styles.payButton}>
                Pay
              </button>
              <button
                onClick={() => setShowInvoicePopup(false)}
                className={styles.cancelButton}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Button */}
      <button onClick={handleLogout} className={styles.logoutButton}>
        Logout
      </button>
    </div>
  );
}

export default PatientHomePage;
