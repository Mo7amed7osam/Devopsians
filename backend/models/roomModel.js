import mongoose from 'mongoose';

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

export default mongoose.model('Room', roomSchema);
