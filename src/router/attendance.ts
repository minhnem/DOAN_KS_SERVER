import { Router } from "express";
import { verifyToken } from "../utils/verifyToken";
import {
  createSession,
  generateQrForSession,
  checkInAttendance,
  getSessionsByClass,
  getAttendanceBySession,
  getStudentAttendanceHistory,
} from "../controller/attendance";

const router = Router();

// ============ GIẢNG VIÊN ============
// Tạo buổi điểm danh
router.post("/sessions", verifyToken, createSession);

// Sinh mã QR có thời hạn cho buổi học
router.post("/sessions/:id/qr", verifyToken, generateQrForSession);

// Lấy danh sách buổi điểm danh theo lớp
router.get("/class/:classId/sessions", verifyToken, getSessionsByClass);

// Lấy danh sách điểm danh theo buổi
router.get("/sessions/:sessionId/attendances", verifyToken, getAttendanceBySession);

// ============ SINH VIÊN ============
// Sinh viên quét QR + gửi GPS để điểm danh
router.post("/check-in", verifyToken, checkInAttendance);

// Lấy lịch sử điểm danh của sinh viên
router.get("/history", verifyToken, getStudentAttendanceHistory);

export default router;


