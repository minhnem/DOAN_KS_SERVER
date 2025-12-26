import mongoose, { Schema } from "mongoose";

const VerificationCodeSchema = new Schema({
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
    },
    code: {
        type: String,
        required: true,
    },
    // Thông tin đăng ký tạm thời
    name: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        required: true,
    },
    rule: {
        type: Number,
        default: 1,
    },
    // Mã sinh viên (chỉ dành cho sinh viên)
    studentId: {
        type: String,
        default: null,
    },
    expiresAt: {
        type: Date,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// Tự động xóa document khi hết hạn
VerificationCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const VerificationCodeModel = mongoose.model("verification_code", VerificationCodeSchema);
export default VerificationCodeModel;

