import { Router } from "express";
import connectionPool from "../utils/db.mjs";
import protectAdmin from "../middlewares/protectAdmin.mjs";
import protectUser from "../middlewares/protectUser.mjs";
import multer from "multer";
import { createClient } from "@supabase/supabase-js";
import bodyValidation from "../middlewares/bodyValidation.mjs";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);
const postRouter = Router();
const multerUpload = multer({ storage: multer.memoryStorage() });
const imageFileUpload = multerUpload.fields([
  { name: "imageFile", maxCount: 1 },
]);

postRouter.post("/", [imageFileUpload, protectAdmin, bodyValidation], async (req, res) => {
  try {
    const newPost = req.body;
    const file = req.files.imageFile[0];
    const bucketName = "my-personal-blog";
    const filePath = `posts/${Date.now()}_${file.originalname}`; 
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false, // ป้องกันการเขียนทับไฟล์เดิม
      });
    if (error) {
      throw error;
    }
    const {
      data: { publicUrl },
    } = supabase.storage.from(bucketName).getPublicUrl(data.path);
    const query = `INSERT INTO posts (title, image, category_id, description, content, status_id)
      VALUES ($1, $2, $3, $4, $5, $6)`;
    const values = [
      newPost.title,
      publicUrl, 
      Number(newPost.category_id),
      newPost.description,
      newPost.content,
      Number(newPost.status_id),
    ];
    await connectionPool.query(query, values);
    return res.status(201).json({ message: "Created post successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: "Server could not create post",
      error: err.message,
    });
  }
});

postRouter.get("/", async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 6;
    const category = req.query.category;
    const keyword = req.query.keyword;
    const offset = (page - 1) * limit;

    const selectPosts = `
      SELECT
        posts.id,
        posts.image,
        categories.name AS category,
        posts.title,
        posts.description,
        posts.date,
        posts.content,
        statuses.status AS status,
        posts.likes_count,
        'Piradon L.' AS author
      FROM posts
      LEFT JOIN categories ON posts.category_id = categories.id
      LEFT JOIN statuses ON posts.status_id = statuses.id
    `;

    const fromWithJoins = `
      FROM posts
      LEFT JOIN categories ON posts.category_id = categories.id
      LEFT JOIN statuses ON posts.status_id = statuses.id
    `;

    let result;
    let totalPosts;

    if (category && keyword) {
      const count = await connectionPool.query(
        `SELECT COUNT(*) ${fromWithJoins}
         WHERE statuses.id = 2
           AND categories.name ILIKE $1
           AND (posts.title ILIKE $2 OR posts.description ILIKE $2 OR posts.content ILIKE $2)`,
        [category, `%${keyword}%`]
      );
      totalPosts = Number(count.rows[0].count);

      result = await connectionPool.query(
        `${selectPosts}
         WHERE statuses.id = 2
           AND categories.name ILIKE $1
           AND (posts.title ILIKE $2 OR posts.description ILIKE $2 OR posts.content ILIKE $2)
         ORDER BY posts.id DESC
         LIMIT $3 OFFSET $4`,
        [category, `%${keyword}%`, limit, offset]
      );
    } else if (category) {
      const count = await connectionPool.query(
        `SELECT COUNT(*) ${fromWithJoins}
         WHERE statuses.id = 2
           AND categories.name ILIKE $1`,
        [category]
      );
      totalPosts = Number(count.rows[0].count);

      result = await connectionPool.query(
        `${selectPosts}
         WHERE statuses.id = 2
           AND categories.name ILIKE $1
         ORDER BY posts.id DESC
         LIMIT $2 OFFSET $3`,
        [category, limit, offset]
      );
    } else if (keyword) {
      const count = await connectionPool.query(
        `SELECT COUNT(*) ${fromWithJoins}
         WHERE statuses.id = 2
           AND (posts.title ILIKE $1
            OR posts.description ILIKE $1
            OR posts.content ILIKE $1)`,
        [`%${keyword}%`]
      );
      totalPosts = Number(count.rows[0].count);

      result = await connectionPool.query(
        `${selectPosts}
         WHERE statuses.id = 2
           AND (posts.title ILIKE $1
            OR posts.description ILIKE $1
            OR posts.content ILIKE $1)
         ORDER BY posts.id DESC
         LIMIT $2 OFFSET $3`,
        [`%${keyword}%`, limit, offset]
      );
    } else {
      const count = await connectionPool.query(
        `SELECT COUNT(*) ${fromWithJoins}
         WHERE statuses.id = 2`
      );
      totalPosts = Number(count.rows[0].count);

      result = await connectionPool.query(
        `${selectPosts}
         WHERE statuses.id = 2
         ORDER BY posts.id DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );
    }

    const totalPages = Math.ceil(totalPosts / limit) || 1;

    return res.status(200).json({
      totalPosts,
      totalPages,
      currentPage: page,
      limit,
      posts: result.rows,
      nextPage: page < totalPages ? page + 1 : null,
    });
  } catch (e) {
    return res.status(500).json({
      message: "Server could not read post because database connection",
    });
  }
});

// get all posts including draft (รองรับ pagination สำหรับ View more)
postRouter.get("/admin", protectAdmin, async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const countResult = await connectionPool.query(`SELECT COUNT(*) FROM posts`);
    const totalPosts = Number(countResult.rows[0].count);
    const totalPages = Math.ceil(totalPosts / limit) || 1;

    const result = await connectionPool.query(
      `
      SELECT 
          posts.*, 
          categories.name AS category, 
          statuses.status
      FROM posts
      INNER JOIN categories ON posts.category_id = categories.id
      INNER JOIN statuses ON posts.status_id = statuses.id
      ORDER BY posts.date DESC
      LIMIT $1 OFFSET $2
      `,
      [limit, offset]
    );

    return res.status(200).json({
      totalPosts,
      totalPages,
      currentPage: page,
      limit,
      posts: result.rows,
      nextPage: page < totalPages ? page + 1 : null,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server could not read posts because of a database issue",
    });
  }
});

postRouter.get("/admin/:postId", protectAdmin, async (req, res) => {
  // ลอจิกในอ่านข้อมูลโพสต์ด้วย Id ในระบบ
  // 1) Access ตัว Endpoint Parameter ด้วย req.params
  const postIdFromClient = req.params.postId;

  try {
    // 2) เขียน Query เพื่ออ่านข้อมูลโพสต์ ด้วย Connection Pool
    const results = await connectionPool.query(
      `
    SELECT 
        posts.*, 
        categories.name AS category, 
        statuses.status
    FROM posts
    INNER JOIN categories ON posts.category_id = categories.id
    INNER JOIN statuses ON posts.status_id = statuses.id
    WHERE posts.id = $1
  `,
      [postIdFromClient] // status id = 2 means showing only publish post
    );

    // เพิ่ม Conditional logic ว่าถ้าข้อมูลที่ได้กลับมาจากฐานข้อมูลเป็นค่า false (null / undefined)
    if (!results.rows[0]) {
      return res.status(404).json({
        message: `Server could not find a requested post (post id: ${postIdFromClient})`,
      });
    }

    // 3) Return ตัว Response กลับไปหา Client
    return res.status(200).json(results.rows[0]);
  } catch {
    return res.status(500).json({
      message: `Server could not read post because database issue`,
    });
  }
});


postRouter.get("/:postId", async (req, res) => {
  try {
    const postId = req.params.postId;
    const postData = await connectionPool.query(
      `SELECT
         posts.id,
         posts.image,
         categories.name AS category,
         posts.title,
         posts.description,
         posts.date,
         posts.content,
         statuses.status AS status,
         posts.likes_count,
         'Piradon L.' AS author
       FROM posts
       LEFT JOIN categories 
       ON posts.category_id = categories.id
       LEFT JOIN statuses 
       ON posts.status_id = statuses.id
       WHERE posts.id = $1`,
      [postId]
    );
    if (!postData.rows[0]) {
      return res.status(404).json({ message: "Server could not find a requested post" });
    }
    return res.status(200).json(postData.rows[0]);
  } catch (error) {
    return res.status(500).json({
      message: "Server could not read post because database connection",
    });
  }
});

postRouter.put(
  "/:postId",
  [imageFileUpload, protectAdmin],
  async (req, res) => {
    const postIdFromClient = req.params.postId;
    const updatedPost = { ...req.body, date: new Date() };
    const bucketName = "my-personal-blog";

    try {
      let publicUrl = updatedPost.image;
      const file = req.files?.imageFile?.[0];

      if (file) {
        const filePath = `posts/${Date.now()}_${file.originalname}`;
        const { data, error } = await supabase.storage
          .from(bucketName)
          .upload(filePath, file.buffer, {
            contentType: file.mimetype,
            upsert: false,
          });
        if (error) {
          throw error;
        }
        const {
          data: { publicUrl: uploadedUrl },
        } = supabase.storage.from(bucketName).getPublicUrl(data.path);
        publicUrl = uploadedUrl;
      }

      const result = await connectionPool.query(
        `
          UPDATE posts
          SET title = $2,
              image = $3,
              category_id = $4,
              description = $5,
              content = $6,
              status_id = $7,
              date = $8
          WHERE id = $1
        `,
        [
          postIdFromClient,
          updatedPost.title,
          publicUrl,
          parseInt(updatedPost.category_id, 10),
          updatedPost.description,
          updatedPost.content,
          parseInt(updatedPost.status_id, 10),
          updatedPost.date,
        ]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          message: `Server could not find a requested post to update (post id: ${postIdFromClient})`,
        });
      }

      return res.status(200).json({ message: "Updated post successfully" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        message: "Server could not update post due to an error",
      });
    }
  }
);

postRouter.delete("/:postId", [protectAdmin], async (req, res) => {
  try {
    const postId = req.params.postId;
      const postData = await connectionPool.query("SELECT * FROM posts WHERE id = $1", [postId]);
    if (!postData.rows[0]) {
      return res.status(404).json({
        message: "Server could not find a requested post to delete",
      });
    }
    await connectionPool.query("DELETE FROM posts WHERE id = $1", [postId]);
    return res.status(200).json({ message: "Deleted post successfully" });
  } catch (error) {
    return res.status(500).json({
      message: "Server could not delete post because database connection",
    });
  }
});

postRouter.get("/:postId/comments", async (req, res) => {

  const postIdFromClient = req.params.postId;

  try {
    const results = await connectionPool.query(
      `
    SELECT 
        comments.*, 
        users.name,
        users.username,
        users.profile_pic
    FROM comments
    INNER JOIN users ON comments.user_id = users.id
    WHERE post_id = $1
    ORDER BY comments.created_at DESC
  `,
      [postIdFromClient]
    );

    return res.status(200).json(results.rows);
  } catch {
    return res.status(500).json({
      message: `Server could not read comments because database connection`,
    });
  }
});

postRouter.post("/:postId/comments", protectUser, async (req, res) => {
  const postIdFromClient = req.params.postId;
  const { id: userId } = req.user;
  const { comment } = req.body;

  if (!comment || comment.trim().length === 0) {
    return res.status(400).json({ message: "Comment content cannot be empty" });
  }

  if (comment.length > 500) {
    return res.status(400).json({
      message: "Comment content exceeds the maximum length of 500 characters",
    });
  }
  try {
    // Insert the comment into the database
    const query = `INSERT INTO comments (post_id, user_id, comment_text) VALUES ($1, $2, $3)`;
    const values = [postIdFromClient, userId, comment];
    await connectionPool.query(query, values);

    // Return ตัว Response กลับไปหา Client ว่าสร้างสำเร็จ
    return res.status(201).json({ message: "Created comment successfully" });
  } catch (err) {
    return res.status(500).json({
      message:
        "Server could not create comment due to a database connection issue",
      error: err.message,
    });
  }
});

postRouter.get("/:postId/likes", async (req, res) => {
  // ลอจิกในการนับจำนวนไลค์ของโพสต์ด้วย Id ในระบบ
  // 1) Access ตัว Endpoint Parameter ด้วย req.params
  const postIdFromClient = req.params.postId;
  // 2) เขียน Query เพื่อนับจำนวนไลค์ ด้วย Connection Pool
  try {
    const results = await connectionPool.query(
      `
    SELECT 
        COUNT(*) AS like_count
    FROM likes
    WHERE post_id = $1
  `,
      [postIdFromClient]
    );
    // 3) Return ตัว Response กลับไปหา Client
    return res
      .status(200)
      .json({ like_count: Number(results.rows[0].like_count) });
  } catch {
    return res.status(500).json({
      message: `Server could not count likes because database connection`,
    });
  }
});

postRouter.post("/:postId/likes", protectUser, async (req, res) => {
  const postIdFromClient = req.params.postId;
  const userId = req.user.id;
  try {
    const query = `INSERT INTO likes (post_id, user_id) VALUES ($1, $2)`;
    const values = [postIdFromClient, userId];
    await connectionPool.query(query, values);
    return res.status(201).json({ message: "Created like successfully" });
  } catch (err) {
    return res.status(500).json({
      message:
        "Server could not create like because of a database connection issue",
      error: err.message,
    });
  }
});

postRouter.delete("/:postId/likes", protectUser, async (req, res) => {
  const postIdFromClient = req.params.postId;
  const userId = req.user.id;
  try {
    const query = `DELETE FROM likes WHERE post_id = $1 AND user_id = $2`;
    const values = [postIdFromClient, userId];

    const result = await connectionPool.query(query, values);

    // Check if a row was deleted
    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ message: "Like not found or you do not own this like" });
    }

    return res.status(200).json({ message: "Deleted like successfully" });
  } catch (err) {
    return res.status(500).json({
      message: `Server could not delete like due to a database connection issue`,
      error: err.message,
    });
  }
});

export default postRouter;
