import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import userRouter from "./src/router/user";
import attendanceRouter from "./src/router/attendance";
import classRouter from "./src/router/class";
import deviceRouter from "./src/router/device";
import cors from "cors";

dotenv.config();

const PORT = process.env.PORT;
const dbURL = `mongodb+srv://${process.env.DATABASE_USERNAME}:${process.env.DATABASE_PASSWORD}@cluster0.ywhsg.mongodb.net/doanks?retryWrites=true&w=majority&appName=Cluster0`;
const app = express();

app.use(express.json());
app.use(cors());

// API đăng ký / đăng nhập
app.use("/auth", userRouter);

// API điểm danh bằng QR + GPS
app.use("/attendance", attendanceRouter);

// API quản lý lớp học
app.use("/class", classRouter);

// API quản lý thiết bị sinh viên
app.use("/device", deviceRouter);

const connectDB = async () => {
  try {
    await mongoose.connect(dbURL);
    console.log("connect to db successfully");
  } catch (error) {
    console.log(`can not connect to db ${error}`);
  }
};

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`server is starting at http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.log(error);
  });
