import "dotenv/config";
import express from "express";
import cors from "cors";
import postsRouter from "./routes/postRouter.mjs";
import authRouter from "./routes/authRouter.mjs";
import profileRouter from "./routes/profileRouter.mjs";
import categoryRouter from "./routes/categoryRouter.mjs";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());

app.use(
  cors({
    origin: [
      "http://localhost:5173", // Frontend local (Vite)
      "http://localhost:3000", // Frontend local (React แบบอื่น)
      "https://anime-recommondation.vercel.app", // Frontend ที่ Deploy แล้ว
    ],
  })
);

app.get("/health", (req, res) => {
  res.status(200).json({ message: "OK" });
});

app.use("/posts", postsRouter);
app.use("/auth", authRouter);
app.use("/profile", profileRouter);
app.use("/categories", categoryRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
