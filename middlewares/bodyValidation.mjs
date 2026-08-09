function bodyValidation(req, res, next) {
  const { title, image, category_id, description, content, status_id } =
    req.body;

  // multipart/form-data ส่งตัวเลขมาเป็น string เสมอ
  const categoryIdNum = Number(category_id);
  const statusIdNum = Number(status_id);

  // สร้างโพสต์ส่งไฟล์ imageFile / แก้ไขอาจส่ง URL ใน image
  const hasImageFile = Boolean(req.files?.imageFile?.[0]);
  const hasImageUrl = typeof image === "string" && image.trim() !== "";

  if (!title) {
    return res.status(400).json({ message: "Title is required" });
  }
  if (!hasImageFile && !hasImageUrl) {
    return res.status(400).json({ message: "Image is required" });
  }
  if (!category_id || Number.isNaN(categoryIdNum)) {
    return res.status(400).json({ message: "Category_id is required" });
  }
  if (!description) {
    return res.status(400).json({ message: "Description is required" });
  }
  if (!content) {
    return res.status(400).json({ message: "Content is required" });
  }
  if (!status_id || Number.isNaN(statusIdNum)) {
    return res.status(400).json({ message: "Status_id is required" });
  }
  if (typeof title !== "string") {
    return res.status(400).json({ message: "Title must be a string" });
  }
  if (hasImageUrl && typeof image !== "string") {
    return res.status(400).json({ message: "Image must be a string" });
  }
  if (typeof description !== "string") {
    return res.status(400).json({ message: "Description must be a string" });
  }
  if (typeof content !== "string") {
    return res.status(400).json({ message: "Content must be a string" });
  }

  // แปลงเป็น number ให้ handler ใช้ต่อได้
  req.body.category_id = categoryIdNum;
  req.body.status_id = statusIdNum;

  next();
}

export default bodyValidation;
