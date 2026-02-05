import UserModel from "../models/UserModel";
import VerificationCodeModel from "../models/VerificationCodeModel";
import bcrypt from "bcrypt"
import dotevn from "dotenv"
import { getAccesstoken } from "../utils/getAccesstoken";
import { generatorRandomText } from "../utils/generatorRandomText";
import { handleSendEmail } from "../utils/handleSendEmail";
dotevn.config()

// Sinh mã xác minh 6 chữ số
const generateVerificationCode = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Gửi mã xác minh email
const sendVerificationCode = async (req: any, res: any) => {
    const { name, email, password, rule, studentId } = req.body;

    try {
        if (!name || !email || !password) {
            return res.status(400).json({ message: "Vui lòng điền đầy đủ thông tin." });
        }

        // Sinh viên (rule = 1) phải có mã sinh viên
        if ((!rule || rule === 1) && !studentId) {
            return res.status(400).json({ message: "Vui lòng nhập mã sinh viên." });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: "Mật khẩu phải có ít nhất 6 ký tự." });
        }

        const existingUser = await UserModel.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ message: "Email đã được đăng ký." });
        }

        // Kiểm tra mã sinh viên đã tồn tại chưa (chỉ với sinh viên)
        if ((!rule || rule === 1) && studentId) {
            const existingStudentId = await UserModel.findOne({ studentId: studentId.trim() });
            if (existingStudentId) {
                return res.status(400).json({ message: "Mã sinh viên đã được đăng ký." });
            }
        }

        await VerificationCodeModel.deleteMany({ email: email.toLowerCase() });

        const code = generateVerificationCode();
        const expiresAt = new Date(Date.now() + 60 * 1000); // 60 giây

        const salt = await bcrypt.genSalt(10);
        const hashPassword = await bcrypt.hash(password, salt);

        const verificationDoc = new VerificationCodeModel({
            email: email.toLowerCase(),
            code,
            name,
            password: hashPassword,
            rule: rule ?? 1,
            studentId: studentId?.trim() || null,
            expiresAt,
        });
        await verificationDoc.save();

        await handleSendEmail({
            from: "App Điểm Danh <namtdvp10a6@gmail.com>",
            to: email,
            subject: "Mã xác minh đăng ký tài khoản",
            text: `Mã xác minh của bạn là: ${code}. Mã này có hiệu lực trong 60 giây.`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #4361ee; text-align: center;">APP ĐIỂM DANH - ĐĂNG KÝ TÀI KHOẢN</h2>
                    <p>Xin chào <strong>${name}</strong>,</p>
                    <p>Mã xác minh của bạn là:</p>
                    <div style="background: #f0f4ff; padding: 20px; text-align: center; border-radius: 12px; margin: 20px 0;">
                        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #4361ee;">${code}</span>
                    </div>
                    <p style="color: #e74c3c;">⏱️ Mã có hiệu lực trong 60 giây.</p>
                </div>
            `,
        });

        res.status(200).json({
            message: "Mã xác minh đã được gửi đến email của bạn.",
            data: { email: email.toLowerCase() }
        });
    } catch (error: any) {
        console.error("Send verification error:", error);
        res.status(500).json({ message: error.message || "Không thể gửi mã xác minh." });
    }
};

// Xác minh mã và hoàn tất đăng ký
const verifyCodeAndRegister = async (req: any, res: any) => {
    const { email, code, deviceId } = req.body;

    try {
        if (!email || !code) {
            return res.status(400).json({ message: "Vui lòng nhập email và mã xác minh." });
        }

        const verificationDoc = await VerificationCodeModel.findOne({
            email: email.toLowerCase(),
            code,
        });

        if (!verificationDoc) {
            return res.status(400).json({ message: "Mã xác minh không đúng hoặc đã hết hạn." });
        }

        if (new Date() > verificationDoc.expiresAt) {
            await VerificationCodeModel.deleteOne({ _id: verificationDoc._id });
            return res.status(400).json({ message: "Mã xác minh đã hết hạn. Vui lòng gửi lại mã mới." });
        }

        const existingUser = await UserModel.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            await VerificationCodeModel.deleteOne({ _id: verificationDoc._id });
            return res.status(400).json({ message: "Email đã được đăng ký." });
        }

        // Lưu deviceId cho sinh viên (rule = 1)
        const isStudent = verificationDoc.rule === 1;

        const newUser: any = new UserModel({
            name: verificationDoc.name,
            email: verificationDoc.email,
            password: verificationDoc.password,
            rule: verificationDoc.rule,
            studentId: (verificationDoc as any).studentId || null,
            deviceId: isStudent && deviceId ? deviceId : null,
        });
        await newUser.save();

        await VerificationCodeModel.deleteOne({ _id: verificationDoc._id });

        delete newUser._doc.password;

        res.status(200).json({
            message: "Đăng ký thành công!",
            data: {
                ...newUser._doc,
                token: await getAccesstoken({
                    _id: newUser._id,
                    email: newUser.email,
                    rule: newUser.rule,
                }),
            },
        });
    } catch (error: any) {
        console.error("Verify code error:", error);
        res.status(500).json({ message: error.message || "Xác minh thất bại." });
    }
};

// Lấy thông tin profile hiện tại
const getProfile = async (req: any, res: any) => {
    try {
        const user = req.user;
        if (!user || !user._id) {
            return res.status(401).json({ message: "Không xác định được người dùng." });
        }

        const userData: any = await UserModel.findById(user._id).select("-password");
        if (!userData) {
            return res.status(404).json({ message: "Người dùng không tồn tại." });
        }

        res.status(200).json({
            message: "Lấy thông tin thành công.",
            data: userData
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// Cập nhật thông tin profile
const updateProfile = async (req: any, res: any) => {
    try {
        const user = req.user;
        if (!user || !user._id) {
            return res.status(401).json({ message: "Không xác định được người dùng." });
        }

        const { name, photoUrl } = req.body;

        const userData: any = await UserModel.findById(user._id);
        if (!userData) {
            return res.status(404).json({ message: "Người dùng không tồn tại." });
        }

        if (name) userData.name = name.trim();
        if (photoUrl !== undefined) userData.photoUrl = photoUrl;
        userData.updatedAt = new Date();

        await userData.save();

        // Trả về thông tin mới (không có password)
        const updatedUser = await UserModel.findById(user._id).select("-password");

        res.status(200).json({
            message: "Cập nhật thông tin thành công.",
            data: updatedUser
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// Đổi mật khẩu
const changePassword = async (req: any, res: any) => {
    try {
        const user = req.user;
        if (!user || !user._id) {
            return res.status(401).json({ message: "Không xác định được người dùng." });
        }

        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: "Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới." });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: "Mật khẩu mới phải có ít nhất 6 ký tự." });
        }

        const userData: any = await UserModel.findById(user._id);
        if (!userData) {
            return res.status(404).json({ message: "Người dùng không tồn tại." });
        }

        // Kiểm tra mật khẩu hiện tại
        const isMatch = await bcrypt.compare(currentPassword, userData.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Mật khẩu hiện tại không đúng." });
        }

        // Hash mật khẩu mới
        const salt = await bcrypt.genSalt(10);
        const hashPassword = await bcrypt.hash(newPassword, salt);
        userData.password = hashPassword;
        userData.updatedAt = new Date();

        await userData.save();

        res.status(200).json({
            message: "Đổi mật khẩu thành công."
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

const register = async (req: any, res: any) => {
    const body = req.body
    const {email, password} = body
    try {

        const user = await UserModel.findOne({email})
        if(user) {
            throw new Error("Tài khoản đã tồn tại.")
        }

        
        const salt = await bcrypt.genSalt(10) 
        const hashPassword = await bcrypt.hash(password, salt)
        body.password = hashPassword

        const newUser: any = new UserModel(body)
        await newUser.save()

        delete newUser._doc.password

        res.status(200).json({
            message: "Đăng ký thành công.",
            data: {
                ...newUser._doc, 
                token: await getAccesstoken({
                    _id: newUser._id,
                    email: newUser.email,
                    rule: 1
                })
            }
        })
    } catch (error: any) {
        res.status(404).json({
            message: error.message
        })
    }
}

const login = async (req: any, res: any) => {
    const body = req.body
    const { email, deviceId } = body
    try {
        const user: any = await UserModel.findOne({email})
        if(!user) {
            throw new Error("Tài khoản không tồn tại.")
        }

        const isMatchPassword = await bcrypt.compare(body.password, user.password)

        if(!isMatchPassword) {
            throw new Error("Mật khẩu không đúng.")
        }

        // Kiểm tra thiết bị cho sinh viên (rule = 1)
        if (user.rule === 1 && deviceId) {
            // Nếu sinh viên chưa có deviceId (lần đầu đăng nhập) → lưu deviceId
            if (!user.deviceId) {
                user.deviceId = deviceId;
                await user.save();
            } 
            // Nếu deviceId khác với thiết bị đã đăng ký
            else if (user.deviceId !== deviceId) {
                // Kiểm tra xem có đang chờ duyệt không
                if (user.pendingDeviceChange) {
                    return res.status(403).json({
                        message: "Yêu cầu đổi thiết bị của bạn đang chờ giáo viên phê duyệt.",
                        requireDeviceChange: true,
                        pendingApproval: true,
                        studentId: user._id,
                    });
                }
                
                // Yêu cầu đổi thiết bị
                return res.status(403).json({
                    message: "Tài khoản này đã được đăng ký trên thiết bị khác. Vui lòng gửi yêu cầu đổi thiết bị.",
                    requireDeviceChange: true,
                    pendingApproval: false,
                    studentId: user._id,
                    studentName: user.name,
                    studentCode: user.studentId,
                    oldDeviceId: user.deviceId,
                    newDeviceId: deviceId,
                });
            }
        }
        
        delete user._doc.password

        res.status(200).json({
            message: "Đăng nhập thành công.",
            data: {
                ...user._doc, 
                token: await getAccesstoken({
                    _id: user._id,
                    email: user.email,
                    rule: user.rule ?? 1
                })
            }
        })
    } catch (error: any) {
        res.status(404).json({
            message: error.message
        })
    }
}

const loginWithGoogle = async (req: any, res: any) => {
    const body = req.body
    const {email} = body
    try {

        const user: any = await UserModel.findOne({email})
        if(user) {
            delete user._doc.password
            res.status(200).json({
                message: "Đăng nhập thành công.",
                data: {
                    ...user._doc, 
                    token: await getAccesstoken({
                        _id: user._id,
                        email: user.email,
                        rule: user.rule ?? 1
                    })
                }
            })
        }else {
            const salt = await bcrypt.genSalt(10) 
            const hashPassword = await bcrypt.hash(generatorRandomText(6), salt)
            body.password = hashPassword
    
            const newUser: any = new UserModel(body)
            await newUser.save()
    
            delete newUser._doc.password
    
            res.status(200).json({
                message: "Đăng ký thành công.",
                data: {
                    ...newUser._doc, 
                    token: await getAccesstoken({
                        _id: newUser._id,
                        email: newUser.email,
                        rule: 1
                    })
                }
            })
        }

    } catch (error: any) {
        res.status(404).json({
            message: error.message
        })
    }
}

const refreshToken = async (req: any, res: any) => {
    const { id }= req.query
    try {
        const user =  await UserModel.findById(id)
        if(!user) {
            throw new Error("Người dùng không tồn tại.")
        }

        const token = await getAccesstoken({
            _id: id,
            email: user.email as string,
            rule: user.rule
        })

        res.status(200).json({
            message: "refresh thành công.",
            data: token
        })
    } catch (error: any) {
        res.status(404).json({
            message: error.message
        })
    }
    
}

export { register, login, loginWithGoogle, refreshToken, getProfile, updateProfile, changePassword, sendVerificationCode, verifyCodeAndRegister }