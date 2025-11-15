import mongoose from "mongoose";

export const SERVICE_CATEGORIES = ['ICU', 'Visitor Room', 'Kids Area', 'General'];

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
            enum: SERVICE_CATEGORIES,
            default: 'General',
        },
        description: {
            type: String,
            default: "",
        },
        reservedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: false,
        },
    },
    {
        timestamps: true,
    }
);

const Service = mongoose.models.Service || mongoose.model('Service', serviceSchema);

export default Service;
