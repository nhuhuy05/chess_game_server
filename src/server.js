import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import authRoute from "./routes/authRoute.js";
import gameRoute from "./routes/gameRoute.js";
import userRoute from "./routes/userRoute.js";
import friendRoute from "./routes/friendRoute.js";
import { protectedRoute } from "./middlewares/authMiddleware.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoute);


app.use(protectedRoute);
app.use("/api/matchmaking", gameRoute);
app.use("/api/games", gameRoute);
app.use("/api/users", userRoute);
app.use("/api/friends", friendRoute);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}: http://localhost:${PORT}`);
});