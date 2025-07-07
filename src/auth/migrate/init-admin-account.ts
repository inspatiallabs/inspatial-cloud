import type { InSpatialORM } from "~/orm/inspatial-orm.ts";
import type { InCloud } from "~/in-cloud.ts";
import type { User } from "../entries/user/_user.type.ts";
import { inLog } from "#inLog";
import { center } from "../../terminal/format-utils.ts";

export async function initAdminAccount(
  inCloud: InCloud,
  orm: InSpatialORM,
) {
  const accounts = await orm.count("account");
  if (accounts > 0) {
    return;
  }
  const info = [
    `Creating a new admin user with the following details:`,
    `First Name: InSpatial`,
    `Last Name: Admin`,
    `Email: admin@user.com`,
    `Password: password`,
    `Role: systemAdmin`,
  ];
  inLog.warn(
    info.map((line) => center(line)).join("\n"),
    "Admin Account Creation",
  );
  const account = await inCloud.runAction("auth", "createAccount", {
    firstName: "InSpatial",
    lastName: "Admin",
    email: "admin@user.com",
    password: "password",
  });
  const user = await orm.getEntry<User>("user", account.users[0].user);
  user.role = "systemAdmin";
  user.systemAdmin = true;
  await user.save();
  inLog.info("Admin account created successfully.");
}
