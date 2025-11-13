import ICU from '../models/icuModel.js';
import User from '../models/userModel.js';
import ErrorHandler from '../utils/errorHandler.js';
import { io } from '../index.js';

// Reserve ICU (existing functionality)
export const reserveICU = async (req, res, next) => {
    try {
        const { icuId, patientId } = req.body;

        if (!icuId || !patientId) {
            return next(new ErrorHandler('ICU ID and Patient ID are required', 400));
        }

        const icu = await ICU.findById(icuId);
        if (!icu) {
            return next(new ErrorHandler('ICU not found', 404));
        }

        if (icu.status !== 'Available' || icu.isReserved) {
            return next(new ErrorHandler('ICU is not available', 400));
        }

        const patient = await User.findById(patientId);
        if (!patient || patient.role !== 'Patient') {
            return next(new ErrorHandler('Invalid patient', 404));
        }

        if (patient.reservedICU) {
            return next(new ErrorHandler('Patient already has an ICU reservation', 400));
        }

        // Reserve the ICU
        icu.isReserved = true;
        icu.status = 'Occupied';
        icu.reservedBy = patientId;
        await icu.save();

        // Update patient
        patient.reservedICU = icuId;
        patient.patientStatus = 'RESERVED'; // Set status to RESERVED
        await patient.save();

        // Emit socket event
        io.emit('icuUpdated', await ICU.find({ status: { $regex: '^available$', $options: 'i' } })
            .populate('hospital', 'name address'));

        res.status(201).json({
            success: true,
            message: 'ICU reserved successfully',
            icu
        });
    } catch (error) {
        next(new ErrorHandler(error.message, 500));
    }
};

// Check-in patient to ICU
export const checkInPatient = async (req, res, next) => {
    try {
        const { icuId, patientId } = req.body;

        if (!icuId || !patientId) {
            return next(new ErrorHandler('ICU ID and Patient ID are required', 400));
        }

        const icu = await ICU.findById(icuId).populate('hospital', 'name address');
        if (!icu) {
            return next(new ErrorHandler('ICU not found', 404));
        }

        if (!icu.isReserved || icu.reservedBy?.toString() !== patientId) {
            return next(new ErrorHandler('This ICU is not reserved by this patient', 400));
        }

        const patient = await User.findById(patientId);
        if (!patient || patient.role !== 'Patient') {
            return next(new ErrorHandler('Patient not found', 404));
        }

        // Confirm check-in - ICU already marked as Occupied during reservation
        // Just update timestamp or additional fields if needed
        icu.checkedInAt = new Date();
        await icu.save();

        // Update patient status to CHECKED_IN
        patient.patientStatus = 'CHECKED_IN';
        await patient.save();

        // Emit socket event
        io.emit('patientCheckedIn', {
            icuId: icu._id,
            patientId,
            hospitalName: icu.hospital?.name,
            room: icu.room
        });

        res.status(200).json({
            success: true,
            message: `Patient checked in to ${icu.hospital?.name} - Room ${icu.room}`,
            icu
        });
    } catch (error) {
        next(new ErrorHandler(error.message, 500));
    }
};

// Check-out patient from ICU (discharge)
export const checkOutPatient = async (req, res, next) => {
    try {
        const { icuId, patientId } = req.body;

        if (!icuId && !patientId) {
            return next(new ErrorHandler('ICU ID or Patient ID is required', 400));
        }

        let icu;
        let patient;

        // Find ICU by ID or by patient ID
        if (icuId) {
            icu = await ICU.findById(icuId);
        } else if (patientId) {
            icu = await ICU.findOne({ reservedBy: patientId, isReserved: true });
        }

        if (!icu) {
            return next(new ErrorHandler('ICU not found or not reserved', 404));
        }

        if (!icu.isReserved) {
            return next(new ErrorHandler('ICU is not occupied', 400));
        }

        // Find the patient
        patient = await User.findById(icu.reservedBy);
        if (!patient) {
            return next(new ErrorHandler('Patient not found', 404));
        }

        // Check-out: Clear reservation and mark as Available
        icu.isReserved = false;
        icu.status = 'Available';
        icu.reservedBy = null;
        icu.checkedInAt = null;
        await icu.save();

        // Clear patient's reservation and update status
        patient.reservedICU = null;
        patient.patientStatus = 'CHECKED_OUT';
        await patient.save();

        // Emit socket event for available ICUs
        io.emit('icuUpdated', await ICU.find({ status: { $regex: '^available$', $options: 'i' } })
            .populate('hospital', 'name address'));

        io.emit('patientCheckedOut', {
            icuId: icu._id,
            patientId: patient._id,
            room: icu.room
        });

        res.status(200).json({
            success: true,
            message: `Patient discharged. ICU Room ${icu.room} is now Available`,
            icu
        });
    } catch (error) {
        next(new ErrorHandler(error.message, 500));
    }
};

// Get all ICU requests (reserved ICUs waiting for check-in)
export const getICURequests = async (req, res, next) => {
    try {
        // First, get all patients with RESERVED status
        const reservedPatients = await User.find({ 
            role: 'Patient',
            patientStatus: 'RESERVED',
            reservedICU: { $ne: null }
        }).select('_id');

        const reservedPatientIds = reservedPatients.map(p => p._id);

        // Get ICUs reserved by these patients
        const icuRequests = await ICU.find({ 
            isReserved: true,
            status: 'Occupied',
            reservedBy: { $in: reservedPatientIds }
        })
        .populate('hospital', 'name address contactNumber')
        .populate('reservedBy', 'firstName lastName email phone patientStatus');

        res.status(200).json({
            success: true,
            count: icuRequests.length,
            requests: icuRequests
        });
    } catch (error) {
        next(new ErrorHandler(error.message, 500));
    }
};

// Calculate fee
export const calculateFee = async (req, res, next) => {
    try {
        const { patientId } = req.query;

        if (!patientId) {
            return next(new ErrorHandler('Patient ID is required', 400));
        }

        const patient = await User.findById(patientId);
        if (!patient) {
            return next(new ErrorHandler('Patient not found', 404));
        }

        // Get patient's ICU if they have one
        let totalFee = 0;
        if (patient.reservedICU) {
            const icu = await ICU.findById(patient.reservedICU);
            if (icu && icu.checkedInAt) {
                // Calculate days stayed
                const daysStayed = Math.ceil((Date.now() - icu.checkedInAt.getTime()) / (1000 * 60 * 60 * 24));
                totalFee = icu.fees * daysStayed;
            } else if (icu) {
                totalFee = icu.fees; // Just one day if not checked in yet
            }
        }

        res.status(200).json({
            success: true,
            patientId,
            totalFee,
            message: `Total fee calculated: ${totalFee} EGP`
        });
    } catch (error) {
        next(new ErrorHandler(error.message, 500));
    }
};
