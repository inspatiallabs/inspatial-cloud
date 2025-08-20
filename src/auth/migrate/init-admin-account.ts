import type { InSpatialORM } from "~/orm/inspatial-orm.ts";
import type { User } from "../entries/user/_user.type.ts";
import { center } from "../../terminal/format-utils.ts";
import type { Account } from "../entries/account/_account.type.ts";

export async function initAdminAccount(
  orm: InSpatialORM,
) {
  const accounts = await orm.count("account");
  if (accounts > 0) {
    return;
  }
  const newAdminUser = await createAdminUser(orm);
  if (!newAdminUser) {
    return;
  }
  const account = await orm.createEntry<Account>("account", {
    users: [{ user: newAdminUser.id }],
  });
  await account.runAction("initialize");
  orm.inLog.info("Admin account created successfully.");
}

async function createAdminUser(orm: InSpatialORM): Promise<User | undefined> {
  // return;
  const userCount = await orm.count("user");

  const subject = "System Admin User";
  if (userCount > 0) {
    return;
  }
  const firstName = "InSpatial";
  const lastName = "Admin";
  const email = "admin@user.com";
  const password = "password";
  const role = "systemAdmin";

  const info = [
    `Creating a new admin user with the following details:`,
    `First Name: ${firstName}`,
    `Last Name: ${lastName}`,
    `Email: ${email}`,
    `Password: ${password}`,
    `Role: ${role}`,
  ];
  orm.inLog.warn(
    info.map((line) => center(line)).join("\n"),
    subject,
  );

  const user = orm.getNewEntry<User>("user");
  user.update({
    firstName,
    lastName,
    email,
    role,
    systemAdmin: true,
  });

  user.systemAdmin = true;
  await user.save();
  await user.runAction("setPassword", { password });
  orm.inLog.info("Admin user created successfully.");
  return user;
}
