import { ICU } from '../models/roomModel.js';
import User from '../models/userModel.js';
import Hospital from '../models/hospitalmodel.js';
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
        if (io) {
            const updatedICUs = await ICU.find({ status: { $regex: '^available$', $options: 'i' } })
                .populate('hospital', 'name address');
            console.log('🏥 [Socket] Emitting icuUpdated (after reservation):', { count: updatedICUs.length });
            io.emit('icuUpdated', updatedICUs);
        } else {
            console.warn('⚠️ Socket.IO instance not available for icuUpdated');
        }

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

        // Handle reservedBy as either ObjectId or populated object
        const reservedById = icu.reservedBy?._id?.toString() || icu.reservedBy?.toString();
        
        if (!icu.isReserved || reservedById !== patientId) {
            return next(new ErrorHandler(`This ICU is not reserved by this patient. ICU reserved by: ${reservedById}, Requesting for: ${patientId}`, 400));
        }

        const patient = await User.findById(patientId);
        if (!patient || patient.role !== 'Patient') {
            return next(new ErrorHandler('Patient not found', 404));
        }

        // Check if patient arrived via ambulance - must be ARRIVED or IN_TRANSIT status
        // Allow check-in for patients without ambulance or those who are IN_TRANSIT/ARRIVED
        if (patient.assignedAmbulance && !['IN_TRANSIT', 'ARRIVED'].includes(patient.patientStatus)) {
            return next(new ErrorHandler('Patient must arrive at hospital before check-in. Current status: ' + patient.patientStatus, 400));
        }

        // Update ICU check-in timestamp using findByIdAndUpdate to avoid validation issues
        await ICU.findByIdAndUpdate(icuId, { 
            checkedInAt: new Date() 
        });

        // Update patient status to CHECKED_IN
        patient.patientStatus = 'CHECKED_IN';
        
        // If patient came via ambulance, free up the ambulance
        if (patient.assignedAmbulance) {
            const ambulance = await User.findById(patient.assignedAmbulance);
            if (ambulance) {
                ambulance.status = 'AVAILABLE';
                ambulance.assignedPatient = null;
                ambulance.assignedHospital = null;
                ambulance.destination = null;
                ambulance.eta = null;
                await ambulance.save();
            }
            
            // Clear ambulance assignment from patient
            patient.assignedAmbulance = null;
            patient.pickupLocation = null;
            patient.needsPickup = false;
        }
        
        await patient.save();

        // Emit socket event
        if (io) {
            const checkinData = {
                icuId: icu._id,
                patientId,
                hospitalName: icu.hospital?.name,
                room: icu.room
            };
            console.log('🏥 [Socket] Emitting patientCheckedIn:', checkinData);
            io.emit('patientCheckedIn', checkinData);
        } else {
            console.warn('⚠️ Socket.IO instance not available for patientCheckedIn');
        }

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

        if (!icuId || !patientId) {
            return res.status(400).json({ 
                success: false,
                message: 'ICU ID and Patient ID are required' 
            });
        }

        // Find the ICU
        const icu = await ICU.findById(icuId);
        if (!icu) {
            return res.status(404).json({ 
                success: false,
                message: 'ICU not found' 
            });
        }

        // Find the patient
        const patient = await User.findById(patientId);
        if (!patient) {
            return res.status(404).json({ 
                success: false,
                message: 'Patient not found' 
            });
        }

        // Verify the patient is in this ICU
        const patientReservedICU = patient.reservedICU?.toString();
        const icuIdString = icuId.toString();

        if (!patientReservedICU || patientReservedICU !== icuIdString) {
            return res.status(400).json({ 
                success: false,
                message: 'This patient is not in this ICU' 
            });
        }

        // Check if fees are paid
        if (!patient.feesPaid) {
            return res.status(400).json({
                success: false,
                message: 'Cannot check out: Patient fees have not been paid. Please process payment first.',
                feesPaid: false
            });
        }

        // Clear ICU reservation using findByIdAndUpdate to avoid validation issues
        await ICU.findByIdAndUpdate(icuId, {
            isReserved: false,
            status: 'Available',
            reservedBy: null,
            checkedInAt: null
        });

        // Emit real-time socket event for ICU check-out
        if (io) {
            const eventData = {
                icuId: icu._id,
                patientId: patient._id,
                status: 'Available',
                timestamp: new Date()
            };
            console.log('🟢 [Socket] Emitting icuCheckOut event:', eventData);
            io.emit('icuCheckOut', eventData);
        } else {
            console.warn('⚠️ Socket.IO instance not available for icuCheckOut event');
        }

        // Clear patient's reservation and reset fees using findByIdAndUpdate
        await User.findByIdAndUpdate(patientId, {
            reservedICU: null,
            patientStatus: null,
            assignedAmbulance: null,
            needsPickup: false,
            pickupLocation: null,
            totalFees: 0
        });

        // Emit socket event for available ICUs
        if (io) {
            const updatedICUs = await ICU.find({ status: { $regex: '^available$', $options: 'i' } })
                .populate('hospital', 'name address');
            console.log('🏥 [Socket] Emitting icuUpdated (after checkout):', { count: updatedICUs.length });
            io.emit('icuUpdated', updatedICUs);

            const checkoutData = {
                icuId: icu._id,
                patientId: patient._id,
                icuRoom: icu.room
            };
            console.log('🚪 [Socket] Emitting patientCheckedOut:', checkoutData);
            io.emit('patientCheckedOut', checkoutData);
        } else {
            console.warn('⚠️ Socket.IO instance not available for checkout events');
        }

        res.status(200).json({
            success: true,
            message: `Patient discharged. ICU Room ${icu.room} is now Available`,
            data: { icu, patient }
        });
    } catch (error) {
        console.error('Check-out error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to check out patient'
        });
    }
};

// Get all ICU requests (reserved ICUs waiting for check-in)
export const getICURequests = async (req, res, next) => {
    try {
        // Get all patients with any pending status (waiting for check-in or in transport)
        const readyPatients = await User.find({ 
            role: 'Patient',
            patientStatus: { $in: ['RESERVED', 'AWAITING_PICKUP', 'IN_TRANSIT', 'ARRIVED'] },
            reservedICU: { $ne: null }
        }).select('_id');

        const readyPatientIds = readyPatients.map(p => p._id);

        // Get ICUs reserved by these patients
        const icuRequests = await ICU.find({ 
            isReserved: true,
            status: 'Occupied',
            reservedBy: { $in: readyPatientIds }
        })
        .populate('hospital', 'name address contactNumber')
        .populate({
            path: 'reservedBy',
            select: 'firstName lastName email phone patientStatus assignedAmbulance needsPickup pickupLocation',
            populate: {
                path: 'assignedAmbulance',
                select: 'firstName lastName userName status'
            }
        });

        res.status(200).json({
            success: true,
            count: icuRequests.length,
            requests: icuRequests
        });
    } catch (error) {
        next(new ErrorHandler(error.message, 500));
    }
};

// Get checked-in patients
export const getCheckedInPatients = async (req, res, next) => {
    try {
        // Get all checked-in patients
        const checkedInPatients = await User.find({ 
            role: 'Patient',
            patientStatus: 'CHECKED_IN',
            reservedICU: { $ne: null }
        }).select('_id');

        const checkedInPatientIds = checkedInPatients.map(p => p._id);

        // Get ICUs with checked-in patients
        const checkedInICUs = await ICU.find({ 
            isReserved: true,
            status: 'Occupied',
            reservedBy: { $in: checkedInPatientIds },
            checkedInAt: { $ne: null }
        })
        .populate('hospital', 'name address contactNumber')
        .populate({
            path: 'reservedBy',
            select: 'firstName lastName email phone patientStatus'
        });

        res.status(200).json({
            success: true,
            count: checkedInICUs.length,
            patients: checkedInICUs
        });
    } catch (error) {
        next(new ErrorHandler(error.message, 500));
    }
};

// Mark fees as paid
export const markFeesPaid = async (req, res, next) => {
    try {
        const { patientId } = req.body;

        if (!patientId) {
            return res.status(400).json({
                success: false,
                message: 'Patient ID is required'
            });
        }

        const patient = await User.findByIdAndUpdate(
            patientId,
            { feesPaid: true },
            { new: true }
        );

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: 'Patient not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Payment confirmed',
            data: { patientId, feesPaid: true }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Calculate fee
export const calculateFee = async (req, res, next) => {
    try {
        const { patientId } = req.query;

        if (!patientId) {
            return next(new ErrorHandler('Patient ID is required', 400));
        }

        const patient = await User.findById(patientId).populate('reservedICU');
        if (!patient) {
            return next(new ErrorHandler('Patient not found', 404));
        }

        let totalFee = 0;
        let daysStayed = 0;
        let dailyRate = 0;
        let checkInDate = null;

        if (patient.reservedICU) {
            const icu = patient.reservedICU;
            dailyRate = icu.fees || 0;
            
            if (icu.checkedInAt) {
                checkInDate = icu.checkedInAt;
                // Calculate days stayed (minimum 1 day)
                const msStayed = Date.now() - new Date(icu.checkedInAt).getTime();
                daysStayed = Math.max(1, Math.ceil(msStayed / (1000 * 60 * 60 * 24)));
                totalFee = dailyRate * daysStayed;
            } else {
                // Not checked in yet - show estimated fee for 1 day
                daysStayed = 1;
                totalFee = dailyRate;
            }
        }

        // Update patient's total fees
        await User.findByIdAndUpdate(patientId, { totalFees: totalFee });

        res.status(200).json({
            success: true,
            data: {
                patientId,
                patientName: `${patient.firstName} ${patient.lastName}`,
                totalFee,
                dailyRate,
                daysStayed,
                checkInDate,
                feesPaid: patient.feesPaid || false,
                icuRoom: patient.reservedICU?.room || 'N/A',
                status: patient.patientStatus
            },
            message: `Total fee: ${totalFee} EGP (${daysStayed} day${daysStayed > 1 ? 's' : ''} × ${dailyRate} EGP/day)`
        });
    } catch (error) {
        next(new ErrorHandler(error.message, 500));
    }
};

// Approve ICU request and assign ambulance for pickup
export const approveICURequest = async (req, res, next) => {
    try {
        const { patientId, icuId, needsPickup, pickupLocation } = req.body;

        if (!patientId || !icuId) {
            return next(new ErrorHandler('Patient ID and ICU ID are required', 400));
        }

        const patient = await User.findById(patientId);
        if (!patient || patient.role !== 'Patient') {
            return next(new ErrorHandler('Patient not found', 404));
        }

        const icu = await ICU.findById(icuId).populate('hospital', 'name address location');
        if (!icu) {
            return next(new ErrorHandler('ICU not found', 404));
        }

        // Update patient with pickup information
        patient.needsPickup = needsPickup || false;
        patient.pickupLocation = pickupLocation || null;
        
        if (needsPickup) {
            // Set status to awaiting pickup
            patient.patientStatus = 'AWAITING_PICKUP';
            
            // Find available ambulance
            const availableAmbulance = await User.findOne({
                role: 'Ambulance',
                status: 'AVAILABLE',
                assignedPatient: null // Make sure ambulance is not already assigned
            });

            if (availableAmbulance) {
                // Assign ambulance but keep status as AVAILABLE until ambulance accepts
                // ambulance.status will be updated to EN_ROUTE when they accept
                availableAmbulance.assignedPatient = patientId;
                availableAmbulance.assignedHospital = icu.hospital._id;
                availableAmbulance.destination = icu.hospital.name;
                await availableAmbulance.save();

                patient.assignedAmbulance = availableAmbulance._id;

                // Emit socket event for ambulance
                io.emit('ambulanceAssigned', {
                    ambulanceId: availableAmbulance._id,
                    patientId,
                    patientName: `${patient.firstName} ${patient.lastName}`,
                    hospitalId: icu.hospital._id,
                    hospitalName: icu.hospital.name,
                    pickupLocation: pickupLocation || 'Patient Location',
                    destination: icu.hospital.name,
                });
            } else {
                return next(new ErrorHandler('No available ambulance at the moment', 400));
            }
        } else {
            // Patient is coming by themselves - direct to check-in
            patient.patientStatus = 'RESERVED';
        }

        await patient.save();

        res.status(200).json({
            success: true,
            message: needsPickup 
                ? `Ambulance assigned for pickup. Patient will be transported to ${icu.hospital.name}`
                : 'ICU request approved. Patient can proceed to hospital for check-in.',
            patient,
            needsPickup
        });
    } catch (error) {
        next(new ErrorHandler(error.message, 500));
    }
};
