import { ICU } from '../models/roomModel.js';
import User from '../models/userModel.js';
import AmbulanceRequest from '../models/ambulanceRequestModel.js';
import { io } from '../index.js';

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
        const { icuId, patientId, needsPickup, pickupLocation, pickupCoordinates } = req.body;
        
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

        // Update patient with pickup info if needed
        patient.reservedICU = icuId;
        patient.needsPickup = needsPickup || false;
        patient.pickupLocation = needsPickup ? pickupLocation : null;
        patient.patientStatus = needsPickup ? 'AWAITING_PICKUP' : 'RESERVED';
        await patient.save();
        
        // Populate hospital details before sending response
        const updatedICU = await ICU.findById(icuId).populate('hospital', 'name address contactNumber location');
        
        let ambulanceRequest = null;
        
        // If patient needs pickup, create an ambulance request
        if (needsPickup && pickupCoordinates) {
            // Check for existing active request
            const existingRequest = await AmbulanceRequest.findOne({
                patient: patientId,
                status: { $in: ['pending', 'accepted', 'in_transit'] }
            });
            
            if (!existingRequest) {
                ambulanceRequest = new AmbulanceRequest({
                    patient: patientId,
                    hospital: updatedICU.hospital._id,
                    icu: icuId,
                    pickupLocation: pickupLocation || 'Patient location',
                    pickupCoordinates: {
                        type: 'Point',
                        coordinates: pickupCoordinates.coordinates || pickupCoordinates
                    },
                    patientPhone: patient.phone,
                    urgency: 'normal',
                    status: 'pending'
                });
                await ambulanceRequest.save();
                
                // Populate request for socket broadcast
                const populatedRequest = await AmbulanceRequest.findById(ambulanceRequest._id)
                    .populate('patient', 'firstName lastName phone userName')
                    .populate('hospital', 'name address location')
                    .populate('icu', 'specialization room');
                
                // Broadcast ambulance request to all available ambulances
                if (io) {
                    const requestData = {
                        requestId: populatedRequest._id,
                        patientId: populatedRequest.patient._id,
                        patientName: populatedRequest.patient.firstName 
                            ? `${populatedRequest.patient.firstName} ${populatedRequest.patient.lastName}`
                            : populatedRequest.patient.userName,
                        patientPhone: populatedRequest.patient.phone,
                        pickupLocation: populatedRequest.pickupLocation,
                        pickupCoordinates: populatedRequest.pickupCoordinates.coordinates,
                        hospitalId: populatedRequest.hospital._id,
                        hospitalName: populatedRequest.hospital.name,
                        hospitalLocation: populatedRequest.hospital.location?.coordinates,
                        specialization: populatedRequest.icu?.specialization || 'ICU',
                        room: populatedRequest.icu?.room || 'N/A',
                        urgency: populatedRequest.urgency,
                        timestamp: populatedRequest.createdAt
                    };
                    console.log('🚑 [Socket] Emitting ambulancePickupRequest:', requestData);
                    io.emit('ambulancePickupRequest', requestData);
                    
                    // Notify patient
                    const patientNotif = {
                        patientId: populatedRequest.patient._id,
                        message: 'Your ambulance request has been sent to all available ambulance crews!',
                        type: 'pickup_request_sent'
                    };
                    console.log('📢 [Socket] Emitting patientNotification:', patientNotif);
                    io.emit('patientNotification', patientNotif);
                }
            }
        }
        
        // Emit real-time socket event for ICU reservation
        if (io) {
            const eventData = {
                icuId: updatedICU._id,
                hospitalId: updatedICU.hospital._id,
                hospitalName: updatedICU.hospital.name,
                patientId: patient._id,
                patientName: patient.userName,
                specialization: updatedICU.specialization,
                room: updatedICU.room,
                status: updatedICU.status,
                needsPickup: needsPickup || false,
                timestamp: new Date()
            };
            console.log('🔴 [Socket] Emitting icuReserved event:', eventData);
            io.emit('icuReserved', eventData);
        } else {
            console.warn('⚠️ Socket.IO instance not available for icuReserved event');
        }
        
        res.status(200).json({
            message: needsPickup 
                ? 'ICU reserved successfully. Ambulance request sent!' 
                : 'ICU reserved successfully',
            icu: updatedICU,
            patient: {
                _id: patient._id,
                userName: patient.userName,
                email: patient.email,
                reservedICU: patient.reservedICU,
                needsPickup: patient.needsPickup,
                patientStatus: patient.patientStatus
            },
            ambulanceRequest: ambulanceRequest ? { _id: ambulanceRequest._id, status: ambulanceRequest.status } : null
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
        
        // Emit real-time socket event for ICU cancellation
        if (io) {
            const eventData = {
                icuId: icu._id,
                patientId: patient._id,
                status: 'Available',
                timestamp: new Date()
            };
            console.log('🔵 [Socket] Emitting icuReservationCancelled event:', eventData);
            io.emit('icuReservationCancelled', eventData);
        } else {
            console.warn('⚠️ Socket.IO instance not available for icuReservationCancelled event');
        }
        
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
