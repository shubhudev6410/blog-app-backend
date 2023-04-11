import expres from "express";
import userModel from "../models/User.js";
import postModel from "../models/Post.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import multer from "multer";
import fs from "fs";
import { unlinkImage } from "../helper/UnlinkImage.js";

const router = expres.Router();

const secretKey = process.env.SECRET_KEY;

//  Creating User

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads/authors");
  },
  filename: function (req, file, cb) {
    let fileExt = file.mimetype;

    fileExt = fileExt.split("/")[1];

    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `author-${uniqueSuffix}.${fileExt}`);
  },
});

const upload = multer({ storage: storage });

router.post("/", upload.single("avatar"), async (req, res) => {
  const { name, email, password, about } = req.body;

  const hashedPassword = await bcrypt.hash(password, 10);
  const userDoc = await userModel.findOne({ email });

  if (!userDoc) {
    const fileSize = req.file.size;
    const imageName = req.file.filename;

    if (fileSize / 1024 < 1024) {
      const newUser = new userModel({
        name,
        email,
        about,
        avatar: imageName,
        password: hashedPassword,
      });

      newUser
        .save()
        .then(() => {
          res.status(201).json(newUser);
        })
        .catch((err) =>
          res.json({
            message: "Error saving User..!",
            err,
          })
        );
    } else {
      const filePath = req.file.path;
      if (fs.existsSync(filePath)) {
        fs.unlink(filePath, (err) => {
          if (err) {
            throw err;
          }
          res.status(501).json({
            message: "Image siz must be less than 1MB..!",
          });
        });
      } else {
        res.status(500).json({ message: "Error Uploading File..!" });
      }
    }
  } else {
    res.status(403).json({
      message: "User Already Exit with this Email ID...!",
    });
  }
});

// Logging User

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const isUserExist = await userModel.findOne({ email });

  if (!isUserExist) {
    res.status(403).json({
      message: "User does not exist. Please register yourself.!",
    });
  } else {
    const userPassword = isUserExist.password;

    if (await bcrypt.compare(password, userPassword)) {
      const { _id, email } = isUserExist;
      const token = jwt.sign({ id: _id, email }, `${secretKey}`);

      res.status(200).cookie("loggedSecretKey", token).json({
        id: _id,
        email,
      });
    } else {
      res.status(403).json({
        message: "Password is Wrong..!",
      });
    }
  }
});

// ! Verifying User Profile
router.get("/profile", (req, res) => {
  const { loggedSecretKey } = req.cookies;

  const token = jwt.verify(loggedSecretKey, `${secretKey}`);

  res.status(200).json(token);
});

// ! Logout User

router.post("/logout", (req, res) => {
  res.cookie("loggedSecretKey", "").json("ok");
});

// ! Getting single Uswer Detail

router.get("/:id", async (req, res) => {
  const { id } = req.params;

  const userDoc = await userModel.findById(id, ["name", "email", "avatar"]);

  const userPosts = await postModel
    .find({ author: id })
    .sort({ createdAt: -1 });

  res.json({ userDoc, userPosts });
});

//  ! Getting logged user posts & Details

router.post("/single/:secret", async (req, res) => {
  try {
    const { secret } = req.params;

    if (!secret)
      res.status(501).json({ message: "Key has been not provided..!" });

    const currentUser = jwt.verify(secret, `${secretKey}`);

    const { id } = currentUser;

    const userInfo = await userModel.findById(id);
    const userPosts = await postModel.find({ author: id });

    res.status(200).json({ user: userInfo, posts: userPosts });
  } catch (error) {
    res.status(501).json({
      message: "Internal server Error cannot fetch user.Try again later",
      error,
    });
  }
});

// ! Updating Basic User Details
router.post("/update/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { username, userAbout } = req.body;

    const updateUser = await userModel.findByIdAndUpdate(id, {
      name: username,
      about: userAbout,
    });

    updateUser.save().then(() => {
      res.status(200).json({ isUpdate: true });
    });

    console.log(username);
  } catch (error) {
    res.status(501).json({ message: "Internal server error..!", error });
  }
});

// ! Updarting user Avatar

router.put("/update/avatar/:id", upload.single("avatar"), async (req, res) => {
  try {
    const fileSize = req.file.size;
    const filePath = req.file.path;
    const imageName = req.file.filename;

    if (fileSize / 1024 < 1024) {
      const { id } = req.params;

      const userAvatar = await userModel.findById(id);

      const imagePath = userAvatar?.avatar;

      const updateAvatar = await userModel.findByIdAndUpdate(id, {
        avatar: imageName,
      });

      updateAvatar
        .save()
        .then(() => {
          if (unlinkImage(imagePath, "authors")) {
            res.status(200).json({ message: "Avatar updated successfully..!" });
          } else {
            res
              .status(501)
              .json({ message: "Unable to delete previous avatar..!" });
          }
        })
        .catch((err) => {
          res
            .status(501)
            .json({ message: "Unable to make changes in database..!", err });
        });
    } else {
      let x = 2;
      if (unlinkImage(filePath, "authors", x)) {
        res.status(501).json({ message: "Image Size must be less than 1MB.!" });
      } else {
        res
          .status(501)
          .json({ message: "Internal Server Error. Cannot Update Image..!" });
      }
    }
  } catch (error) {
    res.status(501).json({ message: "Error Occurred.!", error });
  }
});

export default router;
