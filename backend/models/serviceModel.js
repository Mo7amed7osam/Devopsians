import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        fee: {
            type: Number,
            required: true,
        },
        category: {
            type: String,
            enum: ['ICU', 'Visitor Room', 'Kids Area', 'General'],
            default: 'General',
        },
        description: {
            type: String,
            default: "",
        },
        reservedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: false, // Make it optional initially, required only when a service is reserved
        },
       
    },
    {
        timestamps: true,
    }
);

const Service = mongoose.model('Service', serviceSchema);

export default Service;
