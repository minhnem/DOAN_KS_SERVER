import { Router } from "express";
import { verifyToken } from "../utils/verifyToken";
import {
  createDeviceRequest,
  getDeviceRequests,
  approveDeviceRequest,
  rejectDeviceRequest,
  checkDeviceRequestStatus,
  countPendingRequests,
} from "../controller/device";

const router = Router();

// ============ SINH VIÊN ============
// Gửi yêu cầu đổi thiết bị (không cần auth vì chưa đăng nhập được)
router.post("/request", createDeviceRequest);

// Kiểm tra trạng thái yêu cầu
router.get("/request/status/:studentId", checkDeviceRequestStatus);

// ============ GIÁO VIÊN ============
// Lấy danh sách yêu cầu đổi thiết bị
router.get("/requests", verifyToken, getDeviceRequests);

// Đếm số yêu cầu pending
router.get("/requests/count", verifyToken, countPendingRequests);

// Phê duyệt yêu cầu
router.put("/requests/:id/approve", verifyToken, approveDeviceRequest);

// Từ chối yêu cầu
router.put("/requests/:id/reject", verifyToken, rejectDeviceRequest);

export default router;
