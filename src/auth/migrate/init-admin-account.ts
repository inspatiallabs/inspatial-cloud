import type { InSpatialORM } from "~/orm/inspatial-orm.ts";
import { center } from "../../terminal/format-utils.ts";
import type { User } from "#types/models.ts";

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
  const account = await orm.createEntry("account", {
    name: "Admin Account",

    users: [{ user: newAdminUser.id, isOwner: true, role: "accountAdmin" }],
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

  const info = [
    `Creating a new admin user with the following details:`,
    `First Name: ${firstName}`,
    `Last Name: ${lastName}`,
    `Email: ${email}`,
    `Password: ${password}`,
  ];
  orm.inLog.warn(
    info.map((line) => center(line)).join("\n"),
    subject,
  );

  const user = orm.getNewEntry("user");
  user.update({
    firstName,
    lastName,
    email,
    systemAdmin: true,
    adminPortalAccess: true,
  });

  user.$systemAdmin = true;
  await user.save();
  await user.runAction("setPassword", { password });
  orm.inLog.info("Admin user created successfully.");
  return user;
}
