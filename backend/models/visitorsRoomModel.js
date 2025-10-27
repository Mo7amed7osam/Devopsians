import mongoose from "mongoose";

const visitorsRoomSchema = new mongoose.Schema(
  {
    roomNumber: {
      type: String,
      required: true,
      unique: true,
    },
    capacity: {
      type: Number,
      required: true,
      default: 1,
    },
    currentOccupancy: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["Available", "Occupied", "Maintenance"],
      default: "Available",
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    visitors: [
      {
        visitorName: {
          type: String,
          required: true,
        },
        relationshipToPatient: {
          type: String,
        },
        checkInTime: {
          type: Date,
          default: Date.now,
        },
        checkOutTime: {
          type: Date,
        },
      },
    ],
    hospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hospital",
    },
    floor: {
      type: Number,
    },
    notes: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const VisitorsRoom = mongoose.model("VisitorsRoom", visitorsRoomSchema);

export default VisitorsRoom;
