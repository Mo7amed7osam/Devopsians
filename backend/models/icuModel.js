import mongoose from 'mongoose';


const ICURoomSchema = new mongoose.Schema(
    {
        hospital: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Hospital',
            required: true,
        },
        specialization: {
            type: String,
            required: true,
            enum: [
                "Medical ICU",
                "Surgical ICU",
                "Cardiac ICU",
                "Neonatal ICU",
                "Pediatric ICU",
                "Neurological ICU",
                "Trauma ICU",
                "Burn ICU",
                "Respiratory ICU",
                "Coronary Care Unit",
                "Oncology ICU",
                "Transplant ICU",
                "Geriatric ICU",
                "Post-Anesthesia Care Unit",
                "Obstetric ICU",
                "Infectious Disease ICU",
            ],
        },
        status: {
            type: String,
            enum: ['Occupied', 'Available', 'To Be Cleaned', 'Cleaned'],
            default: 'Available',
        },
        fees: {
            type: Number,
            required: true,
            default: 100,
        },
        isReserved: {
            type: Boolean,
            default: false,
        },
        reservedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    {
        timestamps: true,
    }
);

const ICU = mongoose.model('ICURoom', ICURoomSchema);

export default ICU;