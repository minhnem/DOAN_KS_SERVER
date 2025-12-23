import { Router } from "express";
import { verifyToken } from "../utils/verifyToken";
import {
  createSession,
  generateQrForSession,
  checkInAttendance,
} from "../controller/attendance";

const router = Router();

// Tạo buổi điểm danh (giảng viên)
router.post("/sessions", verifyToken, createSession);

// Sinh mã QR có thời hạn cho buổi học
router.post("/sessions/:id/qr", verifyToken, generateQrForSession);

// Sinh viên quét QR + gửi GPS để điểm danh
router.post("/check-in", verifyToken, checkInAttendance);

export default router;


