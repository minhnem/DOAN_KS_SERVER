import DeviceRequestModel from "../models/DeviceRequestModel";
import UserModel from "../models/UserModel";

// =====================================================
// 1. Sinh viên gửi yêu cầu đổi thiết bị
// =====================================================
export const createDeviceRequest = async (req: any, res: any) => {
  try {
    const { studentId, oldDeviceId, newDeviceId } = req.body;

    if (!studentId || !newDeviceId) {
      return res.status(400).json({
        message: "Thiếu thông tin: studentId, newDeviceId.",
      });
    }

    // Kiểm tra sinh viên tồn tại
    const student = await UserModel.findById(studentId);
    if (!student) {
      return res.status(404).json({
        message: "Không tìm thấy sinh viên.",
      });
    }

    // Kiểm tra xem đã có yêu cầu pending chưa
    const existingRequest = await DeviceRequestModel.findOne({
      studentId,
      status: "pending",
    });

    if (existingRequest) {
      return res.status(400).json({
        message: "Bạn đã có yêu cầu đổi thiết bị đang chờ xử lý.",
      });
    }

    // Tạo yêu cầu mới
    const newRequest = new DeviceRequestModel({
      studentId,
      oldDeviceId: oldDeviceId || student.deviceId,
      newDeviceId,
      status: "pending",
    });

    await newRequest.save();

    // Đánh dấu sinh viên đang chờ duyệt
    student.pendingDeviceChange = true;
    await student.save();

    return res.status(201).json({
      message: "Yêu cầu đổi thiết bị đã được gửi. Vui lòng chờ giáo viên phê duyệt.",
      data: newRequest,
    });
  } catch (error: any) {
    return res.status(500).json({
      message: "Lỗi khi gửi yêu cầu đổi thiết bị.",
      error: error.message,
    });
  }
};

// =====================================================
// 2. Giáo viên lấy danh sách yêu cầu đổi thiết bị
// =====================================================
export const getDeviceRequests = async (req: any, res: any) => {
  try {
    const user = req.user;

    if (!user || user.rule !== 2) {
      return res.status(403).json({
        message: "Chỉ giáo viên mới có quyền xem danh sách yêu cầu.",
      });
    }

    const { status } = req.query;

    // Lọc theo status nếu có
    const filter: any = {};
    if (status && ["pending", "approved", "rejected"].includes(status)) {
      filter.status = status;
    }

    const requests = await DeviceRequestModel.find(filter)
      .populate("studentId", "name email studentId")
      .sort({ createdAt: -1 })
      .lean();

    // Format dữ liệu
    const formattedRequests = requests.map((req: any) => ({
      _id: req._id,
      studentName: req.studentId?.name || "Không xác định",
      studentEmail: req.studentId?.email,
      studentCode: req.studentId?.studentId || "N/A",
      oldDeviceId: req.oldDeviceId,
      newDeviceId: req.newDeviceId,
      status: req.status,
      rejectReason: req.rejectReason,
      createdAt: req.createdAt,
      processedAt: req.processedAt,
    }));

    return res.status(200).json({
      message: "Lấy danh sách yêu cầu thành công.",
      data: formattedRequests,
    });
  } catch (error: any) {
    return res.status(500).json({
      message: "Lỗi khi lấy danh sách yêu cầu.",
      error: error.message,
    });
  }
};

// =====================================================
// 3. Giáo viên phê duyệt yêu cầu đổi thiết bị
// =====================================================
export const approveDeviceRequest = async (req: any, res: any) => {
  try {
    const user = req.user;
    const { id } = req.params;

    if (!user || user.rule !== 2) {
      return res.status(403).json({
        message: "Chỉ giáo viên mới có quyền phê duyệt.",
      });
    }

    const request = await DeviceRequestModel.findById(id);
    if (!request) {
      return res.status(404).json({
        message: "Không tìm thấy yêu cầu.",
      });
    }

    if (request.status !== "pending") {
      return res.status(400).json({
        message: "Yêu cầu này đã được xử lý trước đó.",
      });
    }

    // Cập nhật deviceId cho sinh viên được duyệt
    // KHÔNG xóa deviceId của sinh viên khác - mỗi SV có thiết bị riêng
    const student = await UserModel.findById(request.studentId);
    if (student) {
      student.deviceId = request.newDeviceId;
      student.pendingDeviceChange = false;
      await student.save();
    }

    // Cập nhật trạng thái yêu cầu
    request.status = "approved";
    request.processedAt = new Date();
    await request.save();

    console.log(`📱 Đã duyệt thiết bị ${request.newDeviceId} cho sinh viên ${student?.name}`);

    return res.status(200).json({
      message: "Đã phê duyệt yêu cầu đổi thiết bị.",
      data: request,
    });
  } catch (error: any) {
    return res.status(500).json({
      message: "Lỗi khi phê duyệt yêu cầu.",
      error: error.message,
    });
  }
};

// =====================================================
// 4. Giáo viên từ chối yêu cầu đổi thiết bị
// =====================================================
export const rejectDeviceRequest = async (req: any, res: any) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { reason } = req.body;

    if (!user || user.rule !== 2) {
      return res.status(403).json({
        message: "Chỉ giáo viên mới có quyền từ chối.",
      });
    }

    const request = await DeviceRequestModel.findById(id);
    if (!request) {
      return res.status(404).json({
        message: "Không tìm thấy yêu cầu.",
      });
    }

    if (request.status !== "pending") {
      return res.status(400).json({
        message: "Yêu cầu này đã được xử lý trước đó.",
      });
    }

    // Cập nhật trạng thái sinh viên
    const student = await UserModel.findById(request.studentId);
    if (student) {
      student.pendingDeviceChange = false;
      await student.save();
    }

    // Cập nhật trạng thái yêu cầu
    request.status = "rejected";
    request.rejectReason = reason || "Không có lý do";
    request.processedAt = new Date();
    await request.save();

    return res.status(200).json({
      message: "Đã từ chối yêu cầu đổi thiết bị.",
      data: request,
    });
  } catch (error: any) {
    return res.status(500).json({
      message: "Lỗi khi từ chối yêu cầu.",
      error: error.message,
    });
  }
};

// =====================================================
// 5. Sinh viên kiểm tra trạng thái yêu cầu
// =====================================================
export const checkDeviceRequestStatus = async (req: any, res: any) => {
  try {
    const { studentId } = req.params;

    const request = await DeviceRequestModel.findOne({
      studentId,
    })
      .sort({ createdAt: -1 })
      .lean();

    if (!request) {
      return res.status(200).json({
        message: "Không có yêu cầu nào.",
        data: null,
      });
    }

    return res.status(200).json({
      message: "Lấy trạng thái yêu cầu thành công.",
      data: {
        status: request.status,
        rejectReason: request.rejectReason,
        createdAt: request.createdAt,
        processedAt: request.processedAt,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      message: "Lỗi khi kiểm tra trạng thái.",
      error: error.message,
    });
  }
};

// =====================================================
// 6. Đếm số yêu cầu pending (cho badge)
// =====================================================
export const countPendingRequests = async (req: any, res: any) => {
  try {
    const user = req.user;

    if (!user || user.rule !== 2) {
      return res.status(403).json({
        message: "Chỉ giáo viên mới có quyền xem.",
      });
    }

    const count = await DeviceRequestModel.countDocuments({ status: "pending" });

    return res.status(200).json({
      message: "Đếm thành công.",
      data: { count },
    });
  } catch (error: any) {
    return res.status(500).json({
      message: "Lỗi khi đếm yêu cầu.",
      error: error.message,
    });
  }
};
