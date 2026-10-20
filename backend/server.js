require("dotenv").config({ path: "./.env" });
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");

const authRoutes = require("./src/routes/auth");
const dashboardRoutes = require("./src/routes/dashboard");
const inviteRoutes = require("./src/routes/invite");
const candidateRoutes = require("./src/routes/candidate");
const submissionRoutes = require("./src/routes/submission");
const pdfRoutes = require("./src/routes/pdf");
const clientRoutes = require("./src/routes/client");
const billingRoutes = require("./src/routes/billing");

const app = express();
const PORT = process.env.PORT || 5000;

// DB Connection
connectDB();

// Middlewares
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "https://mnr-digital-address.vercel.app",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));
app.use(cookieParser());
app.use(express.static("public"));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/invites", inviteRoutes);
app.use("/api/candidate", candidateRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api/pdf", pdfRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/billing", billingRoutes);

app.get("/", (req, res) => res.send("Code 2 Crown Multi-Client SaaS Backend Running"));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
