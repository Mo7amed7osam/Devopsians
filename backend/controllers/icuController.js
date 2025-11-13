import ICU from '../models/icuModel.js';
import User from '../models/userModel.js';

// Get all ICUs with their hospital details
export const getAllICUs = async (req, res, next) => {
    try {
        const icus = await ICU.find()
            .populate('hospital', 'name address contactNumber location')
            .lean();
        
        res.status(200).json(icus);
    } catch (error) {
        console.error('Error fetching ICUs:', error);
        next(error);
    }
};

// Get ICU by ID
export const getICUById = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        const icu = await ICU.findById(id)
            .populate('hospital', 'name address contactNumber location')
            .lean();
        
        if (!icu) {
            return res.status(404).json({ message: 'ICU not found' });
        }
        
        res.status(200).json(icu);
    } catch (error) {
        console.error('Error fetching ICU:', error);
        next(error);
    }
};

// Reserve an ICU for a patient
export const reserveICU = async (req, res, next) => {
    try {
        const { icuId, patientId } = req.body;
        
        if (!icuId || !patientId) {
            return res.status(400).json({ message: 'ICU ID and Patient ID are required' });
        }
        
        // Find the ICU
        const icu = await ICU.findById(icuId);
        if (!icu) {
            return res.status(404).json({ message: 'ICU not found' });
        }
        
        // Check if ICU is available
        if (icu.status !== 'Available' || icu.isReserved) {
            return res.status(400).json({ message: 'ICU is not available for reservation' });
        }
        
        // Find the patient
        const patient = await User.findById(patientId);
        if (!patient) {
            return res.status(404).json({ message: 'Patient not found' });
        }
        
        // Normalize role check (user model uses `role` with capitalized values)
        if (!patient.role || patient.role.toLowerCase() !== 'patient') {
            return res.status(400).json({ message: 'User is not a patient' });
        }

        // Check if patient already has a reservation
        if (patient.reservedICU) {
            return res.status(400).json({ message: 'Patient already has an ICU reservation' });
        }

        // Update ICU (mark reserved and set reservedBy)
        icu.isReserved = true;
        icu.status = 'Occupied';
        icu.reservedBy = patientId;
        await icu.save();

        // Update patient
        patient.reservedICU = icuId;
        patient.patientStatus = 'RESERVED'; // Set patient status to RESERVED
        await patient.save();
        
        // Populate hospital details before sending response
        const updatedICU = await ICU.findById(icuId).populate('hospital', 'name address contactNumber location');
        
        res.status(200).json({
            message: 'ICU reserved successfully',
            icu: updatedICU,
            patient: {
                _id: patient._id,
                userName: patient.userName,
                email: patient.email,
                reservedICU: patient.reservedICU
            }
        });
    } catch (error) {
        console.error('Error reserving ICU:', error);
        next(error);
    }
};

// Cancel ICU reservation
export const cancelReservation = async (req, res, next) => {
    try {
        const { icuId, patientId } = req.body;
        
        if (!icuId || !patientId) {
            return res.status(400).json({ message: 'ICU ID and Patient ID are required' });
        }
        
        // Find the ICU
        const icu = await ICU.findById(icuId);
        if (!icu) {
            return res.status(404).json({ message: 'ICU not found' });
        }
        
        // Find the patient
        const patient = await User.findById(patientId);
        if (!patient) {
            return res.status(404).json({ message: 'Patient not found' });
        }
        
        // Verify the reservation
        if (patient.reservedICU?.toString() !== icuId) {
            return res.status(400).json({ message: 'This ICU is not reserved by this patient' });
        }
        
        // Update ICU
    icu.isReserved = false;
    icu.status = 'Available';
    icu.reservedBy = null;
    await icu.save();

    // Update patient
    patient.reservedICU = null;
    patient.patientStatus = null; // Clear patient status
    await patient.save();
        
        res.status(200).json({
            message: 'ICU reservation cancelled successfully'
        });
    } catch (error) {
        console.error('Error cancelling reservation:', error);
        next(error);
    }
};

// Get available ICUs
export const getAvailableICUs = async (req, res, next) => {
    try {
        const icus = await ICU.find({
                status: { $regex: '^available$', $options: 'i' },
                isReserved: false
            })
        .populate('hospital', 'name address contactNumber location')
        .lean();
        
        res.status(200).json(icus);
    } catch (error) {
        console.error('Error fetching available ICUs:', error);
        next(error);
    }
};
