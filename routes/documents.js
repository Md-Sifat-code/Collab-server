const express = require("express");
const router = express.Router();
const Document = require("../models/Document");
const auth = require("../middleware/auth");

// Create
router.post("/", auth, async (req, res) => {
  const { title } = req.body;
  const newDoc = new Document({
    title,
    owner: req.user.id,
  });
  await newDoc.save();
  res.status(201).json(newDoc);
});

// Read all (own + shared)
router.get("/", auth, async (req, res) => {
  const docs = await Document.find({
    $or: [
      { owner: req.user.id },
      { sharedWith: { $elemMatch: { userId: req.user.id } } },
    ],
  }).sort({ updatedAt: -1 });
  res.json(docs);
});

// Read one
router.get("/:id", auth, async (req, res) => {
  const doc = await Document.findById(req.params.id);
  if (!doc) return res.status(404).json({ error: "Not found" });

  const isOwner = doc.owner.toString() === req.user.id;
  const isShared = doc.sharedWith.some(
    (s) => s.userId.toString() === req.user.id
  );

  if (!isOwner && !isShared) {
    return res.status(403).json({ error: "Forbidden" });
  }

  res.json(doc);
});

// Update
router.put("/:id", auth, async (req, res) => {
  const doc = await Document.findById(req.params.id);
  if (!doc) return res.status(404).json({ error: "Not found" });

  const isOwner = doc.owner.toString() === req.user.id;
  const isEditor = doc.sharedWith.some(
    (s) => s.userId.toString() === req.user.id && s.role === "editor"
  );

  if (!isOwner && !isEditor) {
    return res.status(403).json({ error: "Forbidden" });
  }

  doc.title = req.body.title || doc.title;
  doc.content = req.body.content || doc.content;
  await doc.save();
  res.json(doc);
});

// Delete
router.delete("/:id", auth, async (req, res) => {
  const doc = await Document.findById(req.params.id);
  if (!doc) return res.status(404).json({ error: "Not found" });

  if (doc.owner.toString() !== req.user.id) {
    return res.status(403).json({ error: "Only owner can delete" });
  }

  await doc.deleteOne();
  res.json({ success: true });
});

module.exports = router;
