import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

// Middleware: kiểm tra JWT trong header Authorization: Bearer <token>
// Nếu hợp lệ sẽ gắn thông tin user vào req.user
export const verifyToken = (req: any, res: any, next: any) => {
  try {
    const rawHeader =
      (req.headers.authorization ||
        (req.headers.Authorization as string | undefined)) ?? "";

    if (!rawHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Không tìm thấy token xác thực.",
      });
    }

    const token = rawHeader.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.SECRET_KEY as string
    ) as any;

    req.user = decoded;

    next();
  } catch (error: any) {
    return res.status(401).json({
      message: "Token không hợp lệ hoặc đã hết hạn.",
      error: error.message,
    });
  }
};


