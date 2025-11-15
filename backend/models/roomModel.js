import mongoose from 'mongoose';

export const ICU_SPECIALIZATIONS = [
    'Medical ICU',
    'Surgical ICU',
    'Cardiac ICU',
    'Neonatal ICU',
    'Pediatric ICU',
    'Neurological ICU',
    'Trauma ICU',
    'Burn ICU',
    'Respiratory ICU',
    'Coronary Care Unit',
    'Oncology ICU',
    'Transplant ICU',
    'Geriatric ICU',
    'Post-Anesthesia Care Unit',
    'Obstetric ICU',
    'Infectious Disease ICU',
];

// ---------------- General Room Schema ----------------
const roomSchema = new mongoose.Schema({
    roomType: {
        type: String,
        required: true,
    },
    equipmentList: {
        type: [String],
        required: true,
    },
    sterilized: {
        type: Boolean,
        required: true,
    },
    currentOccupancy: {
        type: Number,
        required: true,
    },
    capacity: {
        type: Number,
        required: true,
    },
    fees: {
        type: Number,
        required: true,
    },
});

// ---------------- ICU Room Schema ----------------
const ICURoomSchema = new mongoose.Schema(
    {
        hospital: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Hospital',
            required: true,
        },
        specialization: {
            type: String,
            required: true,
            enum: ICU_SPECIALIZATIONS,
        },
        // Room identifier (e.g., "101", "A-12") — stored as string to allow flexible formats
        room: {
            type: String,
            required: true,
            trim: true,
        },
        // Number of beds/capacity for the ICU room
        capacity: {
            type: Number,
            required: true,
            default: 1,
            min: 1,
        },
        status: {
            type: String,
            enum: ['Occupied', 'Available', 'Maintenance'],
            default: 'Available',
        },
        fees: {
            type: Number,
            required: true,
            default: 100,
        },
        isReserved: {
            type: Boolean,
            default: false,
        },
        reservedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        checkedInAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

// Avoid OverwriteModelError when hot reloading
const Room = mongoose.models.Room || mongoose.model('Room', roomSchema);
const ICU = mongoose.models.ICURoom || mongoose.model('ICURoom', ICURoomSchema);

export { ICU, Room };
export default Room;
