const express = require("express");
const router = express.Router();
const Document = require("../models/Document");
const User = require("../models/User");
const auth = require("../middleware/auth");

// Create a new document
router.post("/", auth, async (req, res) => {
  const { title } = req.body;
  const newDoc = new Document({
    title,
    owner: req.user.id,
  });
  await newDoc.save();
  res.status(201).json(newDoc);
});

// Read all documents (owned + shared)
router.get("/", auth, async (req, res) => {
  const docs = await Document.find({
    $or: [
      { owner: req.user.id },
      { sharedWith: { $elemMatch: { userId: req.user.id } } },
    ],
  }).sort({ updatedAt: -1 });
  res.json(docs);
});

// Read a specific document (if owner or shared)
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

router.put("/:id", auth, async (req, res) => {
  const doc = await Document.findById(req.params.id);
  if (!doc) return res.status(404).json({ error: "Not found" });

  const isOwner = doc.owner.toString() === req.user.id;

  // Make sure to convert all sharedWith userIds to strings for comparison
  const isEditor = doc.sharedWith.some(
    (s) => s.userId.toString() === req.user.id && s.role === "editor"
  );

  console.log("PUT /documents/:id");
  console.log("User:", req.user.id);
  console.log("Owner:", doc.owner.toString());
  console.log("IsOwner:", isOwner);
  console.log(
    "SharedWith:",
    doc.sharedWith.map((s) => ({
      userId: s.userId.toString(),
      role: s.role,
    }))
  );
  console.log("IsEditor:", isEditor);

  if (!isOwner && !isEditor) {
    return res.status(403).json({ error: "Forbidden" });
  }

  doc.title = req.body.title || doc.title;
  doc.content = req.body.content || doc.content;
  await doc.save();
  res.json(doc);
});

// Delete a document (only owner)
router.delete("/:id", auth, async (req, res) => {
  const doc = await Document.findById(req.params.id);
  if (!doc) return res.status(404).json({ error: "Not found" });

  if (doc.owner.toString() !== req.user.id) {
    return res.status(403).json({ error: "Only owner can delete" });
  }

  await doc.deleteOne();
  res.json({ success: true });
});

// Share a document with a user by email
router.post("/:id/share", auth, async (req, res) => {
  const { email, role } = req.body;
  const { id } = req.params;

  // Validate role
  if (!["viewer", "editor"].includes(role)) {
    return res.status(400).json({ error: "Invalid role" });
  }

  const doc = await Document.findById(id);
  if (!doc) return res.status(404).json({ error: "Document not found" });

  // Only owner can share
  if (doc.owner.toString() !== req.user.id) {
    return res.status(403).json({ error: "Only owner can share" });
  }

  // Find user by email
  const userToShare = await User.findOne({ email });
  if (!userToShare) {
    return res.status(404).json({ error: "User not found" });
  }

  // Don't share with self
  if (userToShare._id.toString() === req.user.id) {
    return res.status(400).json({ error: "Cannot share with yourself" });
  }

  // Avoid duplicates
  const alreadyShared = doc.sharedWith.find(
    (entry) => entry.userId.toString() === userToShare._id.toString()
  );

  if (alreadyShared) {
    alreadyShared.role = role; // Update role
  } else {
    doc.sharedWith.push({ userId: userToShare._id, role });
  }

  await doc.save();
  res.json({ message: "Document shared successfully" });
});

module.exports = router;
