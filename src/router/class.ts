import { Router } from "express";
import { verifyToken } from "../utils/verifyToken";
import {
  createClass,
  getTeacherClasses,
  getStudentClasses,
  joinClassByCode,
  getClassDetail,
  getClassStudents,
  closeClass,
} from "../controller/class";

const router = Router();

// ============ GIẢNG VIÊN ============
// Tạo lớp học mới
router.post("/create", verifyToken, createClass);

// Lấy danh sách lớp của giảng viên
router.get("/teacher", verifyToken, getTeacherClasses);

// Lấy danh sách sinh viên trong lớp
router.get("/:id/students", verifyToken, getClassStudents);

// Đóng lớp học
router.put("/:id/close", verifyToken, closeClass);

// ============ SINH VIÊN ============
// Lấy danh sách lớp của sinh viên
router.get("/student", verifyToken, getStudentClasses);

// Tham gia lớp bằng mã code
router.post("/join", verifyToken, joinClassByCode);

// ============ CHUNG ============
// Lấy thông tin chi tiết lớp
router.get("/:id", verifyToken, getClassDetail);

export default router;

