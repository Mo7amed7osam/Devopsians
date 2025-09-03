import mongoose from 'mongoose';

const shiftSchema = new mongoose.Schema({
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    startTime: {
        type: Date,
        required: true,
    },
    endTime: {
        type: Date,
        required: true,
    },
    breakTime: {
        type: String,
        default: '30 mins',
    },
}, {
    timestamps: true,
});

const Shift = mongoose.model('Shift', shiftSchema);
export default Shift;
