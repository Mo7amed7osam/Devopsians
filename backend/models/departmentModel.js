import mongoose from 'mongoose';

const departmentSchema = new mongoose.Schema({
    departmentId: {
        type: Number,
        required: true,
        unique: true,
    },
    departmentName: {
        type: String,
        required: true,
    },
    assignedManager: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Reference to Manager
        required: true,
    },
});

export default mongoose.model('Department', departmentSchema);
