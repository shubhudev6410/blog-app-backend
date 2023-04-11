import fs from "fs";
import path, { join } from "path";

export const unlinkImage = (imagePath, folder, x = 1) => {
  if (x === 1)
    imagePath = join(path.resolve(), `/uploads/${folder}/${imagePath}`);

  if (fs.existsSync(imagePath)) {
    fs.unlink(imagePath, (err) => {
      if (err) throw err;
    });
    return true;
  } else {
    return false;
  }
};
