import expres from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

const app = expres();

// Using Middlewares

app.use(cors({ credentials: true, origin: "http://localhost:3000" }));
app.use(expres.json());
app.use(cookieParser());
dotenv.config();

// Setting static folders

app.use("/uploads", expres.static("uploads"));

// Root route

app.get("/", (req, res) => {
  res.send("<h1>Welcome to our Api...</h1>");
});

//  Importing routes

import userRoute from "./routes/user.js";
import postRoute from "./routes/post.js";

//  Using Routes

app.use("/api/user", userRoute);
app.use("/api/post", postRoute);

const PORT = process.env.PORT || 3302;

// Conneting to database..
import connection from "./db/connect.js";
connection();

// Intializing the app

app.listen(PORT, () =>
  console.log(
    `Server is listening on port ${PORT}  go to http://localhost:${PORT}`
  )
);
