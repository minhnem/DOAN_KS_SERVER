import { Router } from "express";
import { login, loginWithGoogle, refreshToken, register, getProfile, updateProfile, changePassword } from "../controller/user";
import { verifyToken } from "../utils/verifyToken";

const router = Router()

router.post("/register", register)
router.post("/login", login)
router.post("/google-login", loginWithGoogle)
router.get("/refresh-token", refreshToken)

// Profile APIs (protected)
router.get("/profile", verifyToken, getProfile)
router.put("/profile", verifyToken, updateProfile)
router.put("/change-password", verifyToken, changePassword)

export default router