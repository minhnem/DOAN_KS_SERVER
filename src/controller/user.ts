import UserModel from "../models/UserModel";
import bcrypt from "bcrypt"
import dotevn from "dotenv"
import { getAccesstoken } from "../utils/getAccesstoken";
import { generatorRandomText } from "../utils/generatorRandomText";
dotevn.config()

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

export { register, login, loginWithGoogle, refreshToken }