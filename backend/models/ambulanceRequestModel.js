import mongoose from 'mongoose';

const ambulanceRequestSchema = new mongoose.Schema(
    {
        patient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        hospital: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Hospital',
            required: true,
        },
        icu: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ICURoom',
            required: false,
        },
        pickupLocation: {
            type: String,
            required: true,
        },
        pickupCoordinates: {
            type: {
                type: String,
                enum: ['Point'],
                default: 'Point',
            },
            coordinates: {
                type: [Number], // [longitude, latitude]
                required: true,
            },
        },
        status: {
            type: String,
            enum: ['pending', 'accepted', 'in_transit', 'arrived', 'completed', 'cancelled'],
            default: 'pending',
        },
        acceptedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        acceptedAt: {
            type: Date,
            default: null,
        },
        patientPhone: {
            type: String,
            required: false,
        },
        urgency: {
            type: String,
            enum: ['normal', 'urgent', 'critical'],
            default: 'normal',
        },
        notes: {
            type: String,
            default: '',
        },
    },
    {
        timestamps: true,
    }
);

// Index for geospatial queries
ambulanceRequestSchema.index({ pickupCoordinates: '2dsphere' });

// Index for quick status filtering
ambulanceRequestSchema.index({ status: 1, createdAt: -1 });

const AmbulanceRequest = mongoose.model('AmbulanceRequest', ambulanceRequestSchema);

export default AmbulanceRequest;
