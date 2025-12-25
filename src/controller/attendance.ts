import SessionModel from "../models/SessionModel";
import AttendanceModel from "../models/AttendanceModel";
import { generatorRandomText } from "../utils/generatorRandomText";

// Hàm tính khoảng cách giữa 2 toạ độ GPS (Haversine) - trả về mét
const calculateDistanceInMeters = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) => {
  const R = 6371e3; // bán kính Trái Đất (m)
  const toRad = (value: number) => (value * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

// =====================================================
// 1. Tạo buổi điểm danh (giảng viên)
// =====================================================
export const createSession = async (req: any, res: any) => {
  try {
    const {
      title,
      courseId,
      startTime,
      endTime,
      attendanceWindowStart,
      attendanceWindowEnd,
      latitude,
      longitude,
      radius,
    } = req.body;

    if (!startTime || !endTime || !latitude || !longitude) {
      return res.status(400).json({
        message:
          "Thiếu dữ liệu bắt buộc: startTime, endTime, latitude, longitude.",
      });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        message: "startTime hoặc endTime không hợp lệ.",
      });
    }

    if (start >= end) {
      return res.status(400).json({
        message: "startTime phải nhỏ hơn endTime.",
      });
    }

    // Nếu không truyền thì cho phép điểm danh trong 15 phút đầu
    const attendanceStart = attendanceWindowStart
      ? new Date(attendanceWindowStart)
      : start;
    const attendanceEnd = attendanceWindowEnd
      ? new Date(attendanceWindowEnd)
      : new Date(start.getTime() + 15 * 60 * 1000);

    const session = new SessionModel({
      title,
      courseId,
      startTime: start,
      endTime: end,
      attendanceWindowStart: attendanceStart,
      attendanceWindowEnd: attendanceEnd,
      geoLocation: {
        latitude,
        longitude,
        radius: radius ?? 100,
      },
      status: "scheduled",
    });

    await session.save();

    return res.status(201).json({
      message: "Tạo buổi điểm danh thành công.",
      data: session,
    });
  } catch (error: any) {
    return res.status(500).json({
      message: "Lỗi khi tạo buổi điểm danh.",
      error: error.message,
    });
  }
};

// =====================================================
// 2. Sinh mã QR có thời hạn cho 1 buổi học
// =====================================================
export const generateQrForSession = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { expiresInMinutes } = req.body;

    const session = await SessionModel.findById(id);

    if (!session) {
      return res.status(404).json({
        message: "Không tìm thấy buổi điểm danh.",
      });
    }

    const now = new Date();
    const expireMinutes = expiresInMinutes ?? 5; // mặc định 5 phút
    const expiresAt = new Date(now.getTime() + expireMinutes * 60 * 1000);

    // token dùng để nhúng vào QR
    const token = generatorRandomText(24);

    session.qrToken = token;
    session.qrExpiresAt = expiresAt;
    session.status = "ongoing";
    session.updatedAt = new Date();

    await session.save();

    // Dữ liệu này Frontend sẽ encode thành QR code
    const qrPayload = {
      sessionId: session._id,
      token,
    };

    return res.status(200).json({
      message: "Sinh mã QR cho buổi điểm danh thành công.",
      data: {
        qrPayload,
        expiresAt,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      message: "Lỗi khi sinh mã QR.",
      error: error.message,
    });
  }
};

// =====================================================
// 3. Sinh viên gửi dữ liệu điểm danh (QR + GPS)
// =====================================================
export const checkInAttendance = async (req: any, res: any) => {
  try {
    const { sessionId, token, latitude, longitude, accuracy } = req.body;

    // user được gắn sẵn ở verifyToken (decode JWT)
    const user = req.user;

    if (!user || !user._id) {
      return res.status(401).json({
        message: "Không xác định được sinh viên từ token.",
      });
    }

    if (!sessionId || !token || !latitude || !longitude) {
      return res.status(400).json({
        message:
          "Thiếu dữ liệu bắt buộc: sessionId, token, latitude, longitude.",
      });
    }

    const now = new Date();

    const session = await SessionModel.findById(sessionId);

    if (!session) {
      return res.status(404).json({
        message: "Buổi điểm danh không tồn tại.",
      });
    }

    // 1. Kiểm tra QR hợp lệ
    if (!session.qrToken || !session.qrExpiresAt) {
      return res.status(400).json({
        message: "Buổi học chưa bật điểm danh bằng QR.",
      });
    }

    if (session.qrToken !== token) {
      return res.status(400).json({
        message: "Mã QR không hợp lệ.",
      });
    }

    if (now > session.qrExpiresAt) {
      return res.status(400).json({
        message: "Mã QR đã hết hạn.",
      });
    }

    // 2. Kiểm tra thời gian trong khung điểm danh
    if (
      now < session.attendanceWindowStart ||
      now > session.attendanceWindowEnd
    ) {
      return res.status(400).json({
        message: "Hiện không nằm trong khung giờ cho phép điểm danh.",
      });
    }

    // 3. Kiểm tra GPS trong bán kính cho phép
    const sessionLocation = session.geoLocation as {
      latitude: number;
      longitude: number;
      radius: number;
    };

    const distance = calculateDistanceInMeters(
      sessionLocation.latitude,
      sessionLocation.longitude,
      latitude,
      longitude
    );
    const isOutsideArea = distance > sessionLocation.radius;

    // 4. Không cho điểm danh trùng (1 sinh viên / 1 buổi)
    const existing = await AttendanceModel.findOne({
      sessionId: session._id,
      studentId: user._id,
    });

    if (existing) {
      return res.status(400).json({
        message: "Bạn đã điểm danh cho buổi học này rồi.",
        data: existing,
      });
    }

    // Xác định trạng thái: có mặt / trễ / ngoài vùng
    let status: "present" | "late" | "outside_area" = "present";

    if (isOutsideArea) {
      status = "outside_area";
    } else if (now > session.startTime) {
      status = "late";
    }

    const attendance = new AttendanceModel({
      sessionId: session._id,
      studentId: user._id,
      checkInTime: now,
      status,
      location: {
        latitude,
        longitude,
        accuracy,
        distanceToClass: distance,
      },
    });

    await attendance.save();

    return res.status(201).json({
      message: "Điểm danh thành công.",
      data: attendance,
    });
  } catch (error: any) {
    // Phòng trường hợp ghi trùng do race condition
    if (error.code === 11000) {
      return res.status(400).json({
        message: "Bạn đã điểm danh cho buổi học này rồi.",
      });
    }

    return res.status(500).json({
      message: "Lỗi khi thực hiện điểm danh.",
      error: error.message,
    });
  }
};

// =====================================================
// 4. Lấy danh sách buổi điểm danh theo lớp (Giảng viên)
// =====================================================
export const getSessionsByClass = async (req: any, res: any) => {
  try {
    const { classId } = req.params;

    const sessions = await SessionModel.find({ courseId: classId })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      message: "Lấy danh sách buổi điểm danh thành công.",
      data: sessions,
    });
  } catch (error: any) {
    return res.status(500).json({
      message: "Lỗi khi lấy danh sách buổi điểm danh.",
      error: error.message,
    });
  }
};

// =====================================================
// 5. Lấy danh sách điểm danh theo buổi (Giảng viên)
// =====================================================
export const getAttendanceBySession = async (req: any, res: any) => {
  try {
    const { sessionId } = req.params;

    const attendances = await AttendanceModel.find({ sessionId })
      .populate("studentId", "name email")
      .sort({ checkInTime: -1 })
      .lean();

    // Format lại dữ liệu
    const formattedData = attendances.map((att: any) => ({
      _id: att._id,
      studentName: att.studentId?.name || "Chưa xác định",
      studentEmail: att.studentId?.email,
      status: att.status,
      checkInTime: att.checkInTime,
      location: att.location,
    }));

    return res.status(200).json({
      message: "Lấy danh sách điểm danh thành công.",
      data: formattedData,
    });
  } catch (error: any) {
    return res.status(500).json({
      message: "Lỗi khi lấy danh sách điểm danh.",
      error: error.message,
    });
  }
};

// =====================================================
// 6. Lấy lịch sử điểm danh của sinh viên
// =====================================================
export const getStudentAttendanceHistory = async (req: any, res: any) => {
  try {
    const user = req.user;

    if (!user || !user._id) {
      return res.status(401).json({
        message: "Không xác định được người dùng.",
      });
    }

    const attendances = await AttendanceModel.find({ studentId: user._id })
      .populate("sessionId", "title startTime endTime")
      .sort({ checkInTime: -1 })
      .lean();

    // Format lại dữ liệu
    const formattedData = attendances.map((att: any) => ({
      _id: att._id,
      sessionTitle: att.sessionId?.title || "Buổi học",
      sessionStartTime: att.sessionId?.startTime,
      sessionEndTime: att.sessionId?.endTime,
      status: att.status,
      checkInTime: att.checkInTime,
      location: att.location,
    }));

    return res.status(200).json({
      message: "Lấy lịch sử điểm danh thành công.",
      data: formattedData,
    });
  } catch (error: any) {
    return res.status(500).json({
      message: "Lỗi khi lấy lịch sử điểm danh.",
      error: error.message,
    });
  }
};

// =====================================================
// 7. Thống kê điểm danh theo lớp (Giảng viên)
// =====================================================
export const getClassAttendanceStats = async (req: any, res: any) => {
  try {
    const { classId } = req.params;
    const ClassModel = require("../models/ClassModel").default;

    // Lấy thông tin lớp và danh sách sinh viên
    const classData = await ClassModel.findById(classId)
      .populate("students", "name email")
      .lean();

    if (!classData) {
      return res.status(404).json({
        message: "Không tìm thấy lớp học.",
      });
    }

    // Lấy tất cả buổi học của lớp
    const sessions = await SessionModel.find({ courseId: classId }).lean();
    const totalSessions = sessions.length;
    const sessionIds = sessions.map((s: any) => s._id);

    // Lấy tất cả điểm danh của các buổi học trong lớp
    const allAttendances = await AttendanceModel.find({
      sessionId: { $in: sessionIds },
    }).lean();

    // Tính toán thống kê cho từng sinh viên
    const studentsStats = (classData.students || []).map((student: any) => {
      const studentAttendances = allAttendances.filter(
        (att: any) => att.studentId.toString() === student._id.toString()
      );

      const presentCount = studentAttendances.filter(
        (att: any) => att.status === "present"
      ).length;
      const lateCount = studentAttendances.filter(
        (att: any) => att.status === "late"
      ).length;
      const absentCount = totalSessions - studentAttendances.length;

      return {
        _id: student._id,
        name: student.name,
        email: student.email,
        totalSessions,
        presentCount,
        lateCount,
        absentCount,
        attendanceRate:
          totalSessions > 0
            ? Math.round(((presentCount + lateCount) / totalSessions) * 100)
            : 0,
      };
    });

    return res.status(200).json({
      message: "Lấy thống kê điểm danh thành công.",
      data: {
        className: classData.name,
        classCode: classData.code,
        totalSessions,
        totalStudents: classData.students?.length || 0,
        students: studentsStats,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      message: "Lỗi khi lấy thống kê điểm danh.",
      error: error.message,
    });
  }
};

// =====================================================
// 8. Lấy danh sách SV với trạng thái điểm danh theo buổi (Giảng viên)
// =====================================================
export const getSessionAttendanceWithStudents = async (req: any, res: any) => {
  try {
    const { sessionId } = req.params;
    const ClassModel = require("../models/ClassModel").default;

    // Lấy thông tin buổi học
    const session = await SessionModel.findById(sessionId).lean();
    if (!session) {
      return res.status(404).json({
        message: "Không tìm thấy buổi học.",
      });
    }

    // Lấy thông tin lớp và danh sách sinh viên
    const classData = await ClassModel.findById(session.courseId)
      .populate("students", "name email")
      .lean();

    if (!classData) {
      return res.status(404).json({
        message: "Không tìm thấy lớp học.",
      });
    }

    // Lấy danh sách điểm danh của buổi này
    const attendances = await AttendanceModel.find({ sessionId }).lean();

    // Kết hợp danh sách sinh viên với trạng thái điểm danh
    const studentsWithStatus = (classData.students || []).map((student: any) => {
      const attendance = attendances.find(
        (att: any) => att.studentId.toString() === student._id.toString()
      );

      return {
        _id: student._id,
        name: student.name,
        email: student.email,
        attendanceId: attendance?._id || null,
        status: attendance?.status || "absent", // absent = chưa điểm danh
        checkInTime: attendance?.checkInTime || null,
        location: attendance?.location || null,
      };
    });

    return res.status(200).json({
      message: "Lấy danh sách điểm danh thành công.",
      data: {
        session: {
          _id: session._id,
          title: session.title,
          startTime: session.startTime,
          endTime: session.endTime,
          status: session.status,
        },
        students: studentsWithStatus,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      message: "Lỗi khi lấy danh sách điểm danh.",
      error: error.message,
    });
  }
};

// =====================================================
// 9. Điểm danh thủ công cho sinh viên (Giảng viên)
// =====================================================
export const manualCheckIn = async (req: any, res: any) => {
  try {
    const { sessionId, studentId, status } = req.body;

    if (!sessionId || !studentId || !status) {
      return res.status(400).json({
        message: "Thiếu thông tin: sessionId, studentId, status.",
      });
    }

    if (!["present", "late", "absent"].includes(status)) {
      return res.status(400).json({
        message: "Trạng thái không hợp lệ. Chỉ chấp nhận: present, late, absent.",
      });
    }

    const session = await SessionModel.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        message: "Không tìm thấy buổi học.",
      });
    }

    // Kiểm tra xem đã có bản ghi điểm danh chưa
    let attendance = await AttendanceModel.findOne({ sessionId, studentId });

    if (status === "absent") {
      // Nếu đánh vắng thì xóa bản ghi điểm danh (nếu có)
      if (attendance) {
        await AttendanceModel.deleteOne({ _id: attendance._id });
      }
      return res.status(200).json({
        message: "Đã đánh vắng sinh viên.",
        data: null,
      });
    }

    if (attendance) {
      // Cập nhật trạng thái
      attendance.status = status;
      attendance.updatedAt = new Date();
      await attendance.save();
    } else {
      // Tạo bản ghi mới
      attendance = new AttendanceModel({
        sessionId,
        studentId,
        checkInTime: new Date(),
        status,
        location: {
          latitude: 0,
          longitude: 0,
          accuracy: 0,
          distanceToClass: 0,
        },
      });
      await attendance.save();
    }

    return res.status(200).json({
      message: `Điểm danh ${status === "present" ? "có mặt" : "muộn"} thành công.`,
      data: attendance,
    });
  } catch (error: any) {
    return res.status(500).json({
      message: "Lỗi khi điểm danh thủ công.",
      error: error.message,
    });
  }
};

// =====================================================
// 10. Cập nhật buổi học (Giảng viên)
// =====================================================
export const updateSession = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const {
      title,
      startTime,
      endTime,
      attendanceWindowStart,
      attendanceWindowEnd,
      latitude,
      longitude,
      radius,
      status,
    } = req.body;

    const session = await SessionModel.findById(id);

    if (!session) {
      return res.status(404).json({
        message: "Không tìm thấy buổi học.",
      });
    }

    // Cập nhật các trường
    if (title !== undefined) session.title = title;
    if (startTime !== undefined) session.startTime = new Date(startTime);
    if (endTime !== undefined) session.endTime = new Date(endTime);
    if (attendanceWindowStart !== undefined)
      session.attendanceWindowStart = new Date(attendanceWindowStart);
    if (attendanceWindowEnd !== undefined)
      session.attendanceWindowEnd = new Date(attendanceWindowEnd);
    if (latitude !== undefined && session.geoLocation)
      (session.geoLocation as any).latitude = latitude;
    if (longitude !== undefined && session.geoLocation)
      (session.geoLocation as any).longitude = longitude;
    if (radius !== undefined && session.geoLocation)
      (session.geoLocation as any).radius = radius;
    if (status !== undefined && ["scheduled", "ongoing", "closed"].includes(status))
      session.status = status;

    session.updatedAt = new Date();
    await session.save();

    return res.status(200).json({
      message: "Cập nhật buổi học thành công.",
      data: session,
    });
  } catch (error: any) {
    return res.status(500).json({
      message: "Lỗi khi cập nhật buổi học.",
      error: error.message,
    });
  }
};

// =====================================================
// 11. Xóa buổi học (Giảng viên)
// =====================================================
export const deleteSession = async (req: any, res: any) => {
  try {
    const { id } = req.params;

    const session = await SessionModel.findById(id);

    if (!session) {
      return res.status(404).json({
        message: "Không tìm thấy buổi học.",
      });
    }

    // Xóa tất cả điểm danh của buổi học
    await AttendanceModel.deleteMany({ sessionId: id });

    // Xóa buổi học
    await SessionModel.findByIdAndDelete(id);

    return res.status(200).json({
      message: "Xóa buổi học thành công.",
    });
  } catch (error: any) {
    return res.status(500).json({
      message: "Lỗi khi xóa buổi học.",
      error: error.message,
    });
  }
};

// =====================================================
// 12. Lấy chi tiết buổi học
// =====================================================
export const getSessionDetail = async (req: any, res: any) => {
  try {
    const { id } = req.params;

    const session = await SessionModel.findById(id).lean();

    if (!session) {
      return res.status(404).json({
        message: "Không tìm thấy buổi học.",
      });
    }

    return res.status(200).json({
      message: "Lấy thông tin buổi học thành công.",
      data: session,
    });
  } catch (error: any) {
    return res.status(500).json({
      message: "Lỗi khi lấy thông tin buổi học.",
      error: error.message,
    });
  }
};


