import mongoose, { Schema } from "mongoose";

// Mô tả thông tin một buổi học / buổi điểm danh
const SessionSchema = new Schema({
  // Có thể liên kết với lớp/môn học (tuỳ bạn mở rộng sau)
  courseId: {
    type: Schema.Types.ObjectId,
    ref: "course",
  },

  // Tiêu đề buổi học, ví dụ: "Buổi 1 - Giới thiệu môn học"
  title: {
    type: String,
  },

  // Thời gian diễn ra buổi học
  startTime: {
    type: Date,
    required: true,
  },
  endTime: {
    type: Date,
    required: true,
  },

  // Khung thời gian cho phép điểm danh (ví dụ: 0–15 phút đầu)
  attendanceWindowStart: {
    type: Date,
    required: true,
  },
  attendanceWindowEnd: {
    type: Date,
    required: true,
  },

  // Thông tin toạ độ lớp học
  geoLocation: {
    latitude: {
      type: Number,
      required: true,
    },
    longitude: {
      type: Number,
      required: true,
    },
    // Bán kính cho phép theo mét
    radius: {
      type: Number,
      default: 100,
    },
  },

  // Thông tin QR hiện tại (token + thời điểm hết hạn)
  qrToken: {
    type: String,
  },
  qrExpiresAt: {
    type: Date,
  },

  status: {
    type: String,
    enum: ["scheduled", "ongoing", "closed"],
    default: "scheduled",
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

const SessionModel = mongoose.model("session", SessionSchema);

export default SessionModel;


