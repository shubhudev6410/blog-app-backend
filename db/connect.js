import mongoose from "mongoose";
const connection = () => {
  mongoose
    .connect(process.env.MOGOOSE_URI)
    .then(() => console.log("Connection Successful.!"))
    .catch((err) => console.log(err));
};

export default connection;
