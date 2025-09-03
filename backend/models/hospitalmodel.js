import mongoose from 'mongoose';
import validator from 'validator';

const hospitalSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        address: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            validate: [validator.isEmail, 'Invalid email address'],
        },
        location: {
            type: {
                type: String,
                enum: ['Point'],
                required: true,
            },
            coordinates: {
                type: [Number],
                required: true,
            },
        },
        contactNumber: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            enum: ['Active', 'Blocked'],
            default: 'Active',
        },
        assignedManager: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    {
        timestamps: true, 
    }
);
hospitalSchema.index({ location: '2dsphere' });

const Hospital = mongoose.model('Hospital', hospitalSchema);
export default Hospital;
