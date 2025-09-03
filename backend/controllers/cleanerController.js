import ICU from '../models/icuModel.js';
import ErrorHandler from '../utils/errorHandler.js';

export const viewRoomsToBeCleaned = async (req, res, next) => {
    try {
        const roomsToBeCleaned = await ICU.find({ status: 'To Be Cleaned' });

        if (!roomsToBeCleaned.length) {
            return res.status(404).json({ message: "No rooms to be cleaned." });
        }

        res.status(200).json({ rooms: roomsToBeCleaned });
    } catch (error) {
        console.error(error);
        next(new ErrorHandler("Server error", 500));
    }
};

export const markRoomAsCleaned = async (req, res, next) => {
    try {
        const { roomId } = req.params;

        if (!roomId) {
            return res.status(400).json({ message: "Room ID is required." });
        }

        const room = await ICU.findById(roomId);
        if (!room) {
            return next(new ErrorHandler("Room not found", 404));
        }

        room.status = 'Cleaned';
        await room.save();

        res.status(200).json({ message: "Room marked as cleaned." });
    } catch (error) {
        console.error(error);
        next(new ErrorHandler("Server error", 500));
    }
};