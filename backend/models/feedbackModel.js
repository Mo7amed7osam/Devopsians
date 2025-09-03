import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
    {
        hospital: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Hospital',
            required: true,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        rating: {
            type: Number,
            required: true,
            min: 0,
            max: 5,
        },
        comment: {
            type: String,
        },
    },
    {
        timestamps: true,
    }
);


const Feedback = mongoose.model('Feedback', feedbackSchema);

export default Feedback;