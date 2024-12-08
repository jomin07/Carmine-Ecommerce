const dotenv = require("dotenv");
dotenv.config();
const mongoose = require("mongoose");
mongoose.connect(process.env.MONGO);
const path = require("path");
const nocache = require("nocache");

const express = require("express");
const app = express();

app.use(nocache());

app.use(express.static(path.join(__dirname, "public")));

const userRoute = require("./routes/userRoute");
const adminRoute = require("./routes/adminRoute");

app.use("/", userRoute);

app.use("/admin", adminRoute);

app.listen(5000, () => {
  console.log("Server is running");
});
