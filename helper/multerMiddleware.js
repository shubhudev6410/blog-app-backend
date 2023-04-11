import multer from "multer";

const uploadImage = (uploadPath, prefix, image) => {
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, `${uploadPath}`);
    },
    filename: function (req, file, cb) {
      let fileExt = file.mimetype;

      fileExt = fileExt.split("/")[1];

      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, `${prefix}-${uniqueSuffix}.${fileExt}`);
    },
  });

  const upload = multer({ storage: storage });

  return upload.single(`${image}`);
};

export default uploadImage;
