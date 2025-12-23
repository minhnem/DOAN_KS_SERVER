import mongoose, { Schema } from "mongoose";

// Bản ghi điểm danh cho từng sinh viên trong từng buổi học
const AttendanceSchema = new Schema({
  sessionId: {
    type: Schema.Types.ObjectId,
    ref: "session",
    required: true,
  },

  studentId: {
    type: Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },

  // Thời điểm sinh viên thực hiện check-in
  checkInTime: {
    type: Date,
    required: true,
  },

  // Kết quả điểm danh: có mặt / trễ / ngoài vùng
  status: {
    type: String,
    enum: ["present", "late", "outside_area"],
    default: "present",
  },

  // Vị trí GPS tại thời điểm check-in
  location: {
    latitude: {
      type: Number,
      required: true,
    },
    longitude: {
      type: Number,
      required: true,
    },
    accuracy: {
      type: Number,
    },
    // Khoảng cách tới lớp (m)
    distanceToClass: {
      type: Number,
    },
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

// Đảm bảo 1 sinh viên chỉ có 1 bản ghi điểm danh trong 1 buổi học
AttendanceSchema.index({ sessionId: 1, studentId: 1 }, { unique: true });

const AttendanceModel = mongoose.model("attendance", AttendanceSchema);

export default AttendanceModel;


