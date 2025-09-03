// src/components/UpdateMedicalDetails.jsx
import { useState } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import styles from "./UserHomeScreen.module.css"; // You can create your own styles

const UpdateMedicalDetails = () => {
  const { userId, icuId } = useParams(); // Access the userId from the URL params
  const navigate = useNavigate(); // Use navigate to programmatically navigate
  const [currentCondition, setCurrentCondition] = useState("");
  const [medicalHistory, setMedicalHistory] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Send data to the backend to update the medical details
      await axios.put(
        `http://localhost:3030/user/${userId}/update-medical-details`,
        {
          currentCondition,
          medicalHistory,
        }
      );
      alert("Medical details updated successfully!");

      // Navigate to PatientProfile page after successful update
      navigate(`/PatientProfile/${userId}/${icuId}`);
    } catch (error) {
      console.error("Error updating medical details:", error);
      alert("Failed to update medical details. Please try again.");
    }
  };

  async function handleCancel({ userId, icuId }) {
    await axios.post("http://localhost:3030/patient/free-icu", {
      userId: userId,
      icuId: icuId,
    });

    navigate(`/Home/${userId}`);
  }

  return (
    <div className={styles.popupContainer}>
      <div className={styles.popupBox}>
        <h2>Update Medical Details</h2>
        <form onSubmit={handleSubmit}>
          <label>
            Current Condition:
            <textarea
              value={currentCondition}
              onChange={(e) => setCurrentCondition(e.target.value)}
              className={styles.textArea}
              required
            />
          </label>
          <label>
            Medical History (Optional):
            <textarea
              value={medicalHistory}
              onChange={(e) => setMedicalHistory(e.target.value)}
              className={styles.textArea}
            />
          </label>
          <div className={styles.buttonGroup}>
            <button
              type="submit"
              className={styles.submitButton}
              onClick={() => handleSubmit}
            >
              Submit
            </button>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={() => handleCancel({ userId, icuId })} // Navigate back to home screen
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UpdateMedicalDetails;
