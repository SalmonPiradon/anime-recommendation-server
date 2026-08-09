import express from "express";
import connectionPool from "../utils/db.mjs";
import protectAdmin from "../middlewares/protectAdmin.mjs";

const categoryRouter = express.Router();

// Get all categories
categoryRouter.get("/", async (req, res) => {
  try {
    const { rows } = await connectionPool.query(
      "SELECT * FROM categories ORDER BY id"
    );
    return res.status(200).json(rows);
  } catch {
    return res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// Get category by ID
categoryRouter.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await connectionPool.query(
      "SELECT * FROM categories WHERE id = $1",
      [id]
    );
    if (!rows.length) {
      return res.status(404).json({ error: "Category not found" });
    }
    return res.json(rows[0]);
  } catch {
    return res.status(500).json({ error: "Failed to fetch category" });
  }
});

// Create a new category
categoryRouter.post("/", protectAdmin, async (req, res) => {
  const { name } = req.body;
  try {
    await connectionPool.query("INSERT INTO categories (name) VALUES ($1)", [
      name,
    ]);
    return res.status(201).json({ message: "Created category successfully" });
  } catch {
    return res.status(500).json({ error: "Failed to create category" });
  }
});

// Update an existing category
categoryRouter.put("/:id", protectAdmin, async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  try {
    const result = await connectionPool.query(
      "UPDATE categories SET name = $1 WHERE id = $2",
      [name, id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Category not found" });
    }
    return res.status(201).json({ message: "Updated category successfully" });
  } catch {
    return res.status(500).json({ error: "Failed to update category" });
  }
});

// Delete a category
categoryRouter.delete("/:id", protectAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await connectionPool.query(
      "DELETE FROM categories WHERE id = $1",
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Category not found" });
    }
    return res.json({ message: "Deleted category successfully" });
  } catch {
    return res.status(500).json({ error: "Failed to delete category" });
  }
});

export default categoryRouter;
