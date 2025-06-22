import { center } from "/utils/mod.ts";
import type { InCloud } from "/cloud/cloud-common.ts";

async function checkForUser(inCloud: InCloud) {
  const { orm } = inCloud;
  const userCount = await orm.count("user");
  const subject = "System Admin User";
  if (userCount === 0) {
    const userInfo = promptForUser();
    const { firstName, lastName, email, password } = userInfo;
    const info = [
      `Creating a new admin user with the following details:`,
      `First Name: ${firstName}`,
      `Last Name: ${lastName}`,
      `Email: ${email}`,
      `Password: ${password}`,
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
    });

    user.systemAdmin = true;
    await user.save();
    await user.runAction("setPassword", { password });
    inCloud.inLog.info("Admin user created successfully.");
    // prompt("Press any key to continue...");
  }
}

function promptForUser() {
  // We've opted to hardcode the user details instead of prompting for the sake of simplicity when starting a new project.
  const firstName: string | null = "InSpatial";
  const lastName: string | null = "Admin";
  const email: string | null = "admin@user.com";
  const password: string | null = "password";
  return {
    firstName,
    lastName,
    email,
    password,
  };
}

export default checkForUser;
