import mongoose from 'mongoose';

const companySchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        logo: String,
        mcNumber: String,
        dotNumber: String,
        address: String,
        phone: String,
    },
    { timestamps: true }
);

const Company = mongoose.model('Company', companySchema);
export default Company;
