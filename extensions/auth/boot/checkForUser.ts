import { center } from "/utils/mod.ts";
import type { InCloud } from "/cloud/cloud-common.ts";

async function checkForUser(inCloud: InCloud) {
  const { orm } = inCloud;
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
    inCloud.inLog.warn(
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
    inCloud.inLog.info("Admin user created successfully.");
    // prompt("Press any key to continue...");
  }
}

export default checkForUser;
