const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema({
  filename: String,
  mimetype: String,
  size: Number,
  path: String, 
}, { _id: false });

const projectSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  theme: { type: String },
  tags: [{ type: String }],
  year: { type: String },

  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  supervisor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  status: {
    type: String,
    enum: ["Bisa Dilanjutkan", "Ditutup"],
    default: "Bisa Dilanjutkan",
  },

  documentation1: {
    proposal: fileSchema,     
    presentation: fileSchema, 
  },
  documentation2: {
    poster: fileSchema,       // .png/.pdf
    demoVideo: fileSchema,    // .mp4/.mkv
  },

  continuationRequests: [
    {
      requester: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      status: {
        type: String,
        enum: ["pending", "accepted", "rejected"],
        default: "pending",
      },
    },
  ],
}, { timestamps: true });

module.exports = mongoose.model("Project", projectSchema);
