import { ICU } from '../models/roomModel.js';
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
        
        console.log('🔴 Cancel reservation request:', { icuId, patientId });
        
        if (!icuId || !patientId) {
            console.log('🔴 Missing required fields');
            return res.status(400).json({ message: 'ICU ID and Patient ID are required' });
        }
        
        // Find the ICU
        const icu = await ICU.findById(icuId);
        if (!icu) {
            console.log('🔴 ICU not found:', icuId);
            return res.status(404).json({ message: 'ICU not found' });
        }
        
        console.log('✅ ICU found:', { id: icu._id, status: icu.status, isReserved: icu.isReserved, reservedBy: icu.reservedBy });
        
        // Find the patient
        const patient = await User.findById(patientId);
        if (!patient) {
            console.log('🔴 Patient not found:', patientId);
            return res.status(404).json({ message: 'Patient not found' });
        }
        
        console.log('✅ Patient found:', { 
            id: patient._id, 
            reservedICU: patient.reservedICU, 
            patientStatus: patient.patientStatus 
        });
        
        // Verify the reservation - handle both ObjectId and string comparison
        const patientReservedICU = patient.reservedICU?.toString() || patient.reservedICU;
        const icuIdString = icuId.toString();
        
        console.log('🔍 Comparing IDs:', { 
            patientReservedICU, 
            icuIdString,
            match: patientReservedICU === icuIdString 
        });
        
        if (!patientReservedICU || patientReservedICU !== icuIdString) {
            console.log('🔴 ICU mismatch');
            return res.status(400).json({ 
                message: 'This ICU is not reserved by this patient',
                debug: {
                    patientReservedICU: patientReservedICU,
                    icuId: icuIdString,
                    patientHasReservation: !!patientReservedICU
                }
            });
        }
        
        // Don't allow cancellation if patient is already checked in
        if (patient.patientStatus === 'CHECKED_IN') {
            return res.status(400).json({ message: 'Cannot cancel reservation after check-in. Please contact reception.' });
        }
        
        // If patient has an assigned ambulance, clear it
        if (patient.assignedAmbulance) {
            const ambulance = await User.findById(patient.assignedAmbulance);
            if (ambulance) {
                ambulance.status = 'AVAILABLE';
                ambulance.assignedPatient = null;
                ambulance.assignedHospital = null;
                ambulance.destination = null;
                await ambulance.save();
            }
            patient.assignedAmbulance = null;
        }
        
        // Update ICU
        icu.isReserved = false;
        icu.status = 'Available';
        icu.reservedBy = null;
        icu.checkedInAt = null;
        await icu.save();

        // Update patient
        patient.reservedICU = null;
        patient.patientStatus = null;
        patient.needsPickup = false;
        patient.pickupLocation = null;
        await patient.save();
        
        res.status(200).json({
            success: true,
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
