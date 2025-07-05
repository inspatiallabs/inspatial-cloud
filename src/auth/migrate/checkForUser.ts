import { center } from "~/utils/mod.ts";
import type { InSpatialORM } from "../../orm/inspatial-orm.ts";
import { inLog } from "#inLog";

async function checkForUser(orm: InSpatialORM) {
  // return;
  const userCount = await orm.count("user");
  const subject = "System Admin User";
  if (userCount === 0) {
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
    inLog.warn(
      info.map((line) => center(line)).join("\n"),
      subject,
    );

    const user = orm.getNewEntry("user");
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
    inLog.info("Admin user created successfully.");
    // prompt("Press any key to continue...");
  }
}

export default checkForUser;
