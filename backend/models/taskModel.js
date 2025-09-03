import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    priority: {
        type: String,
        enum: ['Low', 'Medium', 'High'],
        default: 'Low',
    },
    status: {
        type: String,
        enum: ['Not Started', 'In Progress', 'Completed'],
        default: 'Not Started',
    },
    deadline: {
        type: Date,
        required: true,
    },
}, {
    timestamps: true,
});

const Task = mongoose.model('Task', taskSchema);
export default Task;
