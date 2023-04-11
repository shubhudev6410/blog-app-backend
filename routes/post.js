import expres from "express";
import multer from "multer";
import jwt from "jsonwebtoken";
import fs from "fs";
import { unlinkImage } from "../helper/UnlinkImage.js";
import multerMiddleware from "../helper/multerMiddleware.js";

import postModel from "../models/Post.js";

const secretKey = process.env.SECRET_KEY;

const router = expres.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads/posts");
  },
  filename: function (req, file, cb) {
    let fileExt = file.mimetype;

    fileExt = fileExt.split("/")[1];

    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `post-image-${uniqueSuffix}.${fileExt}`);
  },
});

const upload = multer({ storage: storage });

router.post("/", upload.single("image"), async (req, res) => {
  try {
    const { title, desc } = req.body;

    const fileSize = req.file.size;
    const imageName = req.file.filename;

    if (fileSize / 1024 < 500) {
      const { loggedSecretKey } = req.cookies;

      const token = jwt.verify(loggedSecretKey, `${secretKey}`);

      const { id } = token;
      const newPost = new postModel({
        title,
        desc,
        image: imageName,
        author: id,
      });

      newPost
        .save()
        .then(() => {
          res
            .status(201)
            .json({ message: "Post created successfully.!", newPost });
        })
        .catch((err) =>
          res.json({
            message: "Error Creating new Post ..!",
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
            message: "Image siz must be less than 500KB..!",
          });
          console.log("Yes deleted");
        });
      } else {
        res.status(500).json({ message: "Error Uploading File..!" });
      }
    }
  } catch (error) {
    console.log(error);
  }
});

router.get("/", async (req, res) => {
  const allPosts = await postModel
    .find()
    .sort({ createdAt: -1 })
    .populate("author", ["name"])
    .limit(20);

  res.status(200).json(allPosts);
});

router.get("/relatedPosts/:id", async (req, res) => {
  const { id } = req.params;
  const post = await postModel
    .find({ author: id })
    .sort({ createdAt: -1 })
    .populate("author", ["name"]);

  res.status(200).json(post);
});

router.get("/:id", async (req, res) => {
  const { id } = req.params;

  const singlePost = await postModel.findById(id).populate("author", ["name"]);

  res.json(singlePost);
});

// ! Deleting post

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const post = await postModel.findById(id);

    const { image } = post;
    if (unlinkImage(image, "posts")) {
      await postModel.findByIdAndDelete(id);

      res.status(200).json({ message: "Post Deletd Successfully..!" });
    } else {
      res.status(501).json({ message: "Unable to delete post Image..!" });
    }
  } catch (error) {
    res.status(501).json({ message: "Internal Server Error..!" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, desc } = req.body;

    const updatePost = await postModel.findByIdAndUpdate(id, { title, desc });

    updatePost
      .save()
      .then(() => {
        res.status(200).json({ message: "Updated successfully.!" });
      })
      .catch((err) => {
        res.status(501).json({ message: "Updated successfully.!", err });
      });
  } catch (error) {
    res.status(501).json({ message: "Internal Server Error..!" });
  }
});

router.put(
  "/image/:id",
  multerMiddleware("./uploads/posts", "post-image", "newImage"),
  async (req, res) => {
    try {
      const fileSize = req.file.size;
      const filePath = req.file.path;
      const imageName = req.file.filename;

      if (fileSize / 1024 < 1024) {
        const { id } = req.params;

        const postImage = await postModel.findById(id);

        const imagePath = postImage?.image;

        const updateImage = await postModel.findByIdAndUpdate(id, {
          image: imageName,
        });

        updateImage
          .save()
          .then(() => {
            if (unlinkImage(imagePath, "posts")) {
              res
                .status(200)
                .json({ message: "Image updated successfully..!" });
            } else {
              res
                .status(501)
                .json({ message: "Unable to delete previous Blog Image..!" });
            }
          })
          .catch((err) => {
            res
              .status(501)
              .json({ message: "Unable to make changes in database..!", err });
          });
      } else {
        let x = 2;
        if (unlinkImage(filePath, "posts", x)) {
          res
            .status(501)
            .json({ message: "Image Size must be less than 1MB.!" });
        } else {
          res
            .status(501)
            .json({ message: "Internal Server Error. Cannot Update Image..!" });
        }
      }
    } catch (error) {
      res.status(501).json({ message: "Error Occurred.!", error });
    }
  }
);

export default router;
