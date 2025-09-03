import mongoose from "mongoose";

const visitorRoomSchema = new mongoose.Schema(
    {
        hospital: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Hospital',
            required: true,
        },
        roomNumber: {
            type: String,
            required: true,
            unique: true,
        },
        capacity: {
            type: Number,
            required: true,
        },
        status: {
            type: String,
            enum: ['Available', 'Reserved'],
            default: 'Available',
        },
        roomType: {
            type: String,
            enum: ['Normal Room', 'Kids Area'],
            required: true,
        },
        fees: {
            type: Number,
            required: true,
            default: 200,
        },
        reservedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        reservationHistory: [
            {
                user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
                date: { type: Date, default: Date.now },
            },
        ],
    },
    {
        timestamps: true,
    }
);

const VisitorRoom = mongoose.model('VisitorRoom', visitorRoomSchema);

export default VisitorRoom;
