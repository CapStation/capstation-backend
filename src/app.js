const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const connectDB = require("./configs/db");
const routes = require("./routes");

// Tambahkan baris berikut:
const passport = require("passport");
require("./configs/passport")(); // <-- Inisialisasi Google Strategy

const app = express();
connectDB();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Tambahkan baris berikut:
app.use(passport.initialize());

app.get("/health", (req, res) => res.json({ ok: true, time: new Date() }));

app.use("/api", routes);

app.use((err, req, res, next) => {
  console.error(err);
  res
    .status(err.status || 500)
    .json({ message: err.message || "Internal Server Error" });
});

module.exports = app;
