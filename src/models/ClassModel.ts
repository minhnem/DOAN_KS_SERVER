import mongoose, { Schema } from "mongoose";

// Mô tả lớp học / khóa học
const ClassSchema = new Schema({
  // Mã lớp (sinh tự động, dùng để SV tham gia)
  code: {
    type: String,
    required: true,
    unique: true,
  },

  // Tên lớp học
  name: {
    type: String,
    required: true,
  },

  // Mô tả lớp học
  description: {
    type: String,
  },

  // Giảng viên tạo lớp
  teacherId: {
    type: Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },

  // Danh sách sinh viên trong lớp
  students: [
    {
      type: Schema.Types.ObjectId,
      ref: "user",
    },
  ],

  // Số lượng sinh viên tối đa (0 = không giới hạn)
  maxStudents: {
    type: Number,
    default: 0,
  },

  // Trạng thái lớp học
  status: {
    type: String,
    enum: ["active", "archived", "closed"],
    default: "active",
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

// Index để tìm kiếm nhanh theo code và teacherId
ClassSchema.index({ code: 1 });
ClassSchema.index({ teacherId: 1 });
ClassSchema.index({ students: 1 });

const ClassModel = mongoose.model("class", ClassSchema);

export default ClassModel;

