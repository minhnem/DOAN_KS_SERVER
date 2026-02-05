import mongoose, { Schema } from "mongoose";

// Yêu cầu đổi thiết bị từ sinh viên
const DeviceRequestSchema = new Schema({
  // Sinh viên gửi yêu cầu
  studentId: {
    type: Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },

  // Device ID cũ (thiết bị đang được phép)
  oldDeviceId: {
    type: String,
    default: null,
  },

  // Device ID mới (thiết bị muốn đổi sang)
  newDeviceId: {
    type: String,
    required: true,
  },

  // Trạng thái yêu cầu
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },

  // Lý do từ chối (nếu có)
  rejectReason: {
    type: String,
    default: null,
  },

  // Thời gian xử lý
  processedAt: {
    type: Date,
    default: null,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },

  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Index để tìm kiếm nhanh
DeviceRequestSchema.index({ studentId: 1, status: 1 });
DeviceRequestSchema.index({ status: 1, createdAt: -1 });

const DeviceRequestModel = mongoose.model("device_request", DeviceRequestSchema);

export default DeviceRequestModel;
