import User from "../models/userModel.js";

export const viewPatientHealthStatus = async (req, res) => {
    try {
      const { doctorId, patientId } = req.params;
  
      const doctor = await User.findById(doctorId);
      if (!doctor || doctor.role !== "Doctor") {
        return res.status(403).json({ message: "Unauthorized: Only doctors can access this information." });
      }
  
      const patient = await User.findById(patientId).populate("assignedDoctor", "userName");
      if (!patient) {
        return res.status(404).json({ message: "Patient not found." });
      }
  
      if (String(patient.assignedDoctor?._id) !== String(doctorId)) {
        return res.status(403).json({ message: "You are not assigned to this patient." });
      }
  
      res.status(200).json({
        currentCondition: patient.currentCondition,
        admissionDate: patient.admissionDate,
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };

  export const viewPatientMedicalHistory = async (req, res) => {
    try {
      const { doctorId, patientId } = req.params;
  
      const doctor = await User.findById(doctorId);
      if (!doctor || doctor.role !== "Doctor") {
        return res.status(403).json({ message: "Unauthorized: Only doctors can access this information." });
      }
  
      const patient = await User.findById(patientId).populate("assignedDoctor", "userName");
      if (!patient) {
        return res.status(404).json({ message: "Patient not found." });
      }
  
      if (String(patient.assignedDoctor?._id) !== String(doctorId)) {
        return res.status(403).json({ message: "You are not assigned to this patient." });
      }
  
      res.status(200).json({
        medicalHistory: patient.medicalHistory,
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };

  export const updatePatientMedicineSchedule = async (req, res) => {
    try {
        const { doctorId, patientId } = req.params;
        const { medicineSchedule } = req.body;

        const doctor = await User.findById(doctorId);
        if (!doctor || doctor.role !== "Doctor") {
            return res.status(403).json({ message: "Unauthorized: Only doctors can perform this action." });
        }

        const patient = await User.findById(patientId).populate("assignedDoctor", "userName");
        if (!patient) {
            return res.status(404).json({ message: "Patient not found." });
        }

        if (String(patient.assignedDoctor?._id) !== String(doctorId)) {
            return res.status(403).json({ message: "You are not assigned to this patient." });
        }

        // Update the medicine schedule
        patient.medicineSchedule = medicineSchedule;
        await patient.save();

        res.status(200).json({
            message: "Medicine schedule updated successfully.",
            updatedSchedule: patient.medicineSchedule,
        });
    } catch (error) {
        res.status(500).json({ message: "An error occurred: " + error.message });
    }
};


export const viewAllAssignedPatients = async (req, res) => {
    try {
      // Correctly access doctorId from params
      const { doctorId } = req.params;
  
      // Fetch the doctor from the database
      const doctor = await User.findById(doctorId);
      if (!doctor || doctor.role !== "Doctor") {
        return res.status(403).json({ message: "Unauthorized: Only doctors can access this information." });
      }
  
      // Fetch the assigned patients
      const assignedPatients = await User.find({ assignedDoctor: doctorId }, "userName firstName lastName currentCondition admissionDate medicalHistory gender medicineSchedule medicalHistory");
  
      if (!assignedPatients || assignedPatients.length === 0) {
        return res.status(404).json({ message: "No patients assigned to this doctor." });
      }
  
      // Return the patients data
      res.status(200).json({
        message: "Patients assigned to this doctor retrieved successfully.",
        patients: assignedPatients,
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };
  
