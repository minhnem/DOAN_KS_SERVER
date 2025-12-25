import UserModel from "../models/UserModel";
import bcrypt from "bcrypt"
import dotevn from "dotenv"
import { getAccesstoken } from "../utils/getAccesstoken";
import { generatorRandomText } from "../utils/generatorRandomText";
dotevn.config()

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
    const {email} = body
    try {
        const user: any = await UserModel.findOne({email})
        if(!user) {
            throw new Error("Tài khoản không tồn tại.")
        }

        const isMatchPassword = await bcrypt.compare(body.password, user.password)

        if(!isMatchPassword) {
            throw new Error("Đăng nhập thất bại.")
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

export { register, login, loginWithGoogle, refreshToken, getProfile, updateProfile, changePassword }