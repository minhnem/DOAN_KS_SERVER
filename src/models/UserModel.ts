import mongoose, { Schema } from "mongoose";

const UserSchema = new Schema({
    name: {
        type: String,
        required: true
    },

    email: {
        type: String,
        required: true
    },

    password: {
        type: String,
        required: true
    },

    // Mã sinh viên (chỉ dành cho sinh viên - rule = 1)
    studentId: {
        type: String,
        default: null
    },

    photoUrl: String,

    rule: {
        type: Number,
        default: 1
    },

    // Device ID - chỉ dùng cho sinh viên để giới hạn thiết bị
    deviceId: {
        type: String,
        default: null
    },

    // Trạng thái thiết bị đang chờ duyệt
    pendingDeviceChange: {
        type: Boolean,
        default: false
    },

    createdAt: {
        type: Date,
        default: Date.now()
    },

    updatedAt: {
        type: Date,
        default: Date.now()
    }
})

const UserModel = mongoose.model("user", UserSchema)
export default UserModel