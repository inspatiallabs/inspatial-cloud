import type { InCloud } from "#/inspatial-cloud.ts";

async function checkForUser(app: InCloud) {
  const { orm } = app;
  const userCount = await orm.count("user");
  const subject = "System Admin User";
  if (userCount === 0) {
    app.inLog.warn(
      "No users found in the database. Creating an admin user...",
      subject,
    );

    const { firstName, lastName, email, password } = promptForUser();

    const user = orm.getNewEntry("user");
    user.update({
      firstName,
      lastName,
      email,
    });

    user.systemAdmin = true;
    await user.save();
    await user.runAction("setPassword", { password });
    app.inLog.info("Admin user created successfully.");
    // prompt("Press any key to continue...");
  }
}

function promptForUser() {
  let firstName: string | null = "InSpatial";
  let lastName: string | null = "Admin";
  let email: string | null = "admin@user.com";
  let password: string | null = "password";
  return {
    firstName,
    lastName,
    email,
    password,
  };
}

export default checkForUser;
