import bcrypt from "bcrypt";
import "dotenv/config";

export const hashPassword = async function () {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
};
