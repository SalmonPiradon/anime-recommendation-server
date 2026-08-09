import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import connectionPool from "../utils/db.mjs";
import protectUser from "../middlewares/protectUser.mjs";
import multer from "multer";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const profileRouter = Router();
const multerUpload = multer({ storage: multer.memoryStorage() });
const imageFileUpload = multerUpload.fields([
  { name: "imageFile", maxCount: 1 },
]);

// express อ่านข้อมูลประเภท multipart/form-data ไม่ได้เลยใช้ multer มาเป็น middleware

profileRouter.put("/", [imageFileUpload, protectUser], async (req, res) => {
  const { id: userId } = req.user; 
  const { name, username } = req.body;
  const newProfilePic = req.files?.imageFile?.[0]; 

  if (name && (name.trim().length === 0 || name.length > 100)) {
    return res
      .status(400)
      .json({ message: "Name cannot be empty or exceed 100 characters" });
  }

  if (username && (username.trim().length === 0 || username.length > 50)) {
    return res
      .status(400)
      .json({ message: "Username cannot be empty or exceed 50 characters" });
  }

  let profilePicUrl = null;

  try {
    // If a file is uploaded, upload it to Supabase Storage
    if (newProfilePic) {
      const bucketName = "my-personal-blog"; 
      const filePath = `profiles/${userId}-${Date.now()}`; // Generate a unique file path

      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, newProfilePic.buffer, {
          contentType: newProfilePic.mimetype,
          upsert: false, // Prevent overwriting the file
        });

      if (error) {
        throw new Error("Failed to upload profile picture to storage");
      }

      // Get the public URL of the uploaded file
      const {
        data: { publicUrl },
      } = supabase.storage.from(bucketName).getPublicUrl(data.path);
      profilePicUrl = publicUrl;
    }

    // Construct update query dynamically
    const fieldsToUpdate = [];
    const values = [];
    let paramIndex = 1;

    if (name) {
      fieldsToUpdate.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (username) {
      fieldsToUpdate.push(`username = $${paramIndex++}`);
      values.push(username);
    }
    if (profilePicUrl) {
      fieldsToUpdate.push(`profile_pic = $${paramIndex++}`);
      values.push(profilePicUrl);
    }

    if (fieldsToUpdate.length === 0) {
      return res.status(400).json({ message: "No fields to update provided" });
    }

    values.push(userId); // Add `userId` as the last parameter for the WHERE clause

    const query = `
        UPDATE users 
        SET ${fieldsToUpdate.join(", ")}
        WHERE id = $${paramIndex}
      `;

    await connectionPool.query(query, values);

    return res.status(200).json({ message: "Profile updated successfully" });
  } catch (err) {
    return res.status(500).json({
      message: "Failed to update profile",
      error: err.message,
    });
  }
});

export default profileRouter;
