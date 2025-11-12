import mongoose from 'mongoose';
import mongooseSequence from 'mongoose-sequence';
import validator from 'validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const AutoIncrement = mongooseSequence(mongoose); // Initialize the plugin

const userSchema = new mongoose.Schema(
    {
        userId: {
            type: Number,
            unique: true,
        },
        userName: {
            type: String,
            required: true,
            minlength: [2, "Username is required"],
        },
        firstName: {
            type: String,
            required: true,
            minlength: [2, "First Name is required"],
        },
        lastName: {
            type: String,
            required: true,
            minlength: [2, "Last Name is required"],
        },
        email: {
            type: String,
            required: false,
            unique: true,
            validate: [validator.isEmail, "Invalid email address"],
        },
        gender: {
            type: String,
            required: true,
            enum: ["Male", "Female"],
        },
        phone: {
            type: String,
            required: true,
            minlength: [2, "Phone number is required"],
        },
        userPass: {
            type: String,
            required: true,
            minlength: [6, "Password must be at least 6 characters"],
            select: false,
        },
        role: {
            type: String,
            required: true,
            enum: [
                "Patient",
                "Doctor",
                "Admin",
                "Manager",
                "Receptionist",
                "Ambulance",
            ],
        },
        
        services: [
            {
                serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
                reservedAt: { type: Date, default: Date.now },
            },
        ]
        ,
        location: {
            type: {
                type: String, // Must be "Point" for GeoJSON
                enum: ['Point'],
                required: false,
            },
            coordinates: {
                type: [Number], // [longitude, latitude]
                required: false,
            },
        },
        // Specific fields for Patients
        currentCondition: { type: String }, // e.g., allergies, symptoms
        admissionDate: { type: Date },
        medicalHistory: { type: String || "no medical history" },
        assignedDoctor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        medicineSchedule:{ type: String},
        totalFees: {
            type: Number,
            default: 0,
        },

        // Specific fields for Managers
        assignedDepartments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Department" }],
        assignedEmployees: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Employees under their management


        //for employees

        assignedManager: { type: mongoose.Schema.Types.ObjectId, ref: "Manager" },




        // Specific fields for Doctors
        doctorDepartment: { type: String }, // Department specialization
        patients: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // List of assigned patients

        // Specific fields for Admins
        hospitalId: [{ type: mongoose.Schema.Types.ObjectId, ref: "Hospital" }],

        // Fields for Receptionists
        assignedHospital: { type: mongoose.Schema.Types.ObjectId, ref: "Hospital" },

        // Fields for Ambulance
        status: { 
            type: String, 
            enum: ["AVAILABLE", "EN_ROUTE", "ARRIVED_HOSPITAL"],
            default: "AVAILABLE"
        },
        currentLocation: {
            type: {
                type: String,
                enum: ['Point'],
            },
            coordinates: [Number], // [longitude, latitude]
        },
        eta: { type: Number }, // Estimated time of arrival in minutes
        assignedPatient: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        destination: { type: String },

    // Reservation reference (if a patient has an active ICU reservation)
    reservedICU: { type: mongoose.Schema.Types.ObjectId, ref: 'ICURoom' },

        // Common timestamps for all roles
    },
    {
        timestamps: true,
    }
);
userSchema.plugin(AutoIncrement, { inc_field: "userId" });
userSchema.index({ location: "2dsphere" });
userSchema.pre("save", async function (next) {
    if (!this.isModified("userPass")) {
        return next();
    }
    this.userPass = await bcrypt.hash(this.userPass, 10);
    next();
});
userSchema.methods.comparePassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.userPass);
};
userSchema.methods.generateJsonWebToken = function () {
    const secret = process.env.JWT_SECRET_KEY || process.env.JWT_SECRET;
    return jwt.sign({ id: this._id, role: this.role }, secret, {
        expiresIn: process.env.JWT_EXPIRES,
    });
};

const User = mongoose.model("User", userSchema);
export default User;