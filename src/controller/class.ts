import ClassModel from "../models/ClassModel";
import { generatorRandomText } from "../utils/generatorRandomText";

// =====================================================
// 1. Tạo lớp học mới (Giảng viên)
// =====================================================
export const createClass = async (req: any, res: any) => {
  try {
    const { name, description, maxStudents } = req.body;
    const user = req.user;

    if (!user || !user._id) {
      return res.status(401).json({
        message: "Không xác định được người dùng.",
      });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({
        message: "Tên lớp học không được để trống.",
      });
    }

    // Sinh mã lớp ngẫu nhiên (6 ký tự)
    let code = generatorRandomText(6);

    // Đảm bảo mã không trùng
    let existingClass = await ClassModel.findOne({ code });
    while (existingClass) {
      code = generatorRandomText(6);
      existingClass = await ClassModel.findOne({ code });
    }

    const newClass = new ClassModel({
      code,
      name: name.trim(),
      description: description?.trim() || "",
      teacherId: user._id,
      maxStudents: maxStudents || 0,
      students: [],
      status: "active",
    });

    await newClass.save();

    return res.status(201).json({
      message: "Tạo lớp học thành công.",
      data: newClass,
    });
  } catch (error: any) {
    return res.status(500).json({
      message: "Lỗi khi tạo lớp học.",
      error: error.message,
    });
  }
};

// =====================================================
// 2. Lấy danh sách lớp của giảng viên
// =====================================================
export const getTeacherClasses = async (req: any, res: any) => {
  try {
    const user = req.user;

    if (!user || !user._id) {
      return res.status(401).json({
        message: "Không xác định được người dùng.",
      });
    }

    const classes = await ClassModel.find({ teacherId: user._id })
      .sort({ createdAt: -1 })
      .lean();

    // Thêm số lượng sinh viên vào response
    const classesWithCount = classes.map((cls: any) => ({
      ...cls,
      studentCount: cls.students?.length || 0,
    }));

    return res.status(200).json({
      message: "Lấy danh sách lớp thành công.",
      data: classesWithCount,
    });
  } catch (error: any) {
    return res.status(500).json({
      message: "Lỗi khi lấy danh sách lớp.",
      error: error.message,
    });
  }
};

// =====================================================
// 3. Lấy danh sách lớp của sinh viên
// =====================================================
export const getStudentClasses = async (req: any, res: any) => {
  try {
    const user = req.user;

    if (!user || !user._id) {
      return res.status(401).json({
        message: "Không xác định được người dùng.",
      });
    }

    const classes = await ClassModel.find({ students: user._id })
      .populate("teacherId", "name email")
      .sort({ createdAt: -1 })
      .lean();

    // Format dữ liệu trả về
    const formattedClasses = classes.map((cls: any) => ({
      _id: cls._id,
      code: cls.code,
      name: cls.name,
      description: cls.description,
      teacherName: cls.teacherId?.name || "Chưa xác định",
      teacherEmail: cls.teacherId?.email,
      studentCount: cls.students?.length || 0,
      status: cls.status,
      createdAt: cls.createdAt,
    }));

    return res.status(200).json({
      message: "Lấy danh sách lớp thành công.",
      data: formattedClasses,
    });
  } catch (error: any) {
    return res.status(500).json({
      message: "Lỗi khi lấy danh sách lớp.",
      error: error.message,
    });
  }
};

// =====================================================
// 4. Sinh viên tham gia lớp bằng mã code
// =====================================================
export const joinClassByCode = async (req: any, res: any) => {
  try {
    const { code } = req.body;
    const user = req.user;

    if (!user || !user._id) {
      return res.status(401).json({
        message: "Không xác định được người dùng.",
      });
    }

    if (!code || !code.trim()) {
      return res.status(400).json({
        message: "Mã lớp không được để trống.",
      });
    }

    const classData = await ClassModel.findOne({
      code: code.trim().toUpperCase(),
    });

    if (!classData) {
      return res.status(404).json({
        message: "Không tìm thấy lớp học với mã này.",
      });
    }

    if (classData.status !== "active") {
      return res.status(400).json({
        message: "Lớp học đã đóng hoặc không còn hoạt động.",
      });
    }

    // Kiểm tra xem sinh viên đã trong lớp chưa
    const isAlreadyJoined = classData.students.some(
      (studentId: any) => studentId.toString() === user._id.toString()
    );

    if (isAlreadyJoined) {
      return res.status(400).json({
        message: "Bạn đã tham gia lớp học này rồi.",
      });
    }

    // Kiểm tra số lượng sinh viên tối đa
    if (
      classData.maxStudents > 0 &&
      classData.students.length >= classData.maxStudents
    ) {
      return res.status(400).json({
        message: "Lớp học đã đầy.",
      });
    }

    // Thêm sinh viên vào lớp
    classData.students.push(user._id);
    classData.updatedAt = new Date();
    await classData.save();

    // Populate thông tin giảng viên để trả về
    await classData.populate("teacherId", "name email");

    return res.status(200).json({
      message: "Tham gia lớp học thành công.",
      data: {
        _id: classData._id,
        code: classData.code,
        name: classData.name,
        description: classData.description,
        teacherName: (classData.teacherId as any)?.name || "Chưa xác định",
        studentCount: classData.students.length,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      message: "Lỗi khi tham gia lớp học.",
      error: error.message,
    });
  }
};

// =====================================================
// 5. Lấy thông tin chi tiết lớp học
// =====================================================
export const getClassDetail = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const user = req.user;

    if (!user || !user._id) {
      return res.status(401).json({
        message: "Không xác định được người dùng.",
      });
    }

    const classData = await ClassModel.findById(id)
      .populate("teacherId", "name email")
      .populate("students", "name email")
      .lean();

    if (!classData) {
      return res.status(404).json({
        message: "Không tìm thấy lớp học.",
      });
    }

    return res.status(200).json({
      message: "Lấy thông tin lớp thành công.",
      data: classData,
    });
  } catch (error: any) {
    return res.status(500).json({
      message: "Lỗi khi lấy thông tin lớp.",
      error: error.message,
    });
  }
};

// =====================================================
// 6. Lấy danh sách sinh viên trong lớp (cho giảng viên)
// =====================================================
export const getClassStudents = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const user = req.user;

    if (!user || !user._id) {
      return res.status(401).json({
        message: "Không xác định được người dùng.",
      });
    }

    const classData = await ClassModel.findById(id)
      .populate("students", "name email photoUrl")
      .lean();

    if (!classData) {
      return res.status(404).json({
        message: "Không tìm thấy lớp học.",
      });
    }

    // Kiểm tra quyền (chỉ giảng viên của lớp mới xem được)
    if ((classData.teacherId as any).toString() !== user._id.toString()) {
      return res.status(403).json({
        message: "Bạn không có quyền xem danh sách sinh viên của lớp này.",
      });
    }

    return res.status(200).json({
      message: "Lấy danh sách sinh viên thành công.",
      data: classData.students,
    });
  } catch (error: any) {
    return res.status(500).json({
      message: "Lỗi khi lấy danh sách sinh viên.",
      error: error.message,
    });
  }
};

// =====================================================
// 7. Xoá/Đóng lớp học (Giảng viên)
// =====================================================
export const closeClass = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const user = req.user;

    if (!user || !user._id) {
      return res.status(401).json({
        message: "Không xác định được người dùng.",
      });
    }

    const classData = await ClassModel.findById(id);

    if (!classData) {
      return res.status(404).json({
        message: "Không tìm thấy lớp học.",
      });
    }

    if (classData.teacherId.toString() !== user._id.toString()) {
      return res.status(403).json({
        message: "Bạn không có quyền đóng lớp học này.",
      });
    }

    classData.status = "closed";
    classData.updatedAt = new Date();
    await classData.save();

    return res.status(200).json({
      message: "Đóng lớp học thành công.",
      data: classData,
    });
  } catch (error: any) {
    return res.status(500).json({
      message: "Lỗi khi đóng lớp học.",
      error: error.message,
    });
  }
};

