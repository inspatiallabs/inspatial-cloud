import type { InCloud } from "#/inspatial-cloud.ts";
import ColorMe from "#/utils/color-me.ts";
import { inLog } from "#/in-log/in-log.ts";

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
  const subject = "Create User";
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
  while (!firstName) {
    firstName = prompt(ColorMe.fromOptions("First Name:", {
      color: "brightCyan",
    }));
    if (!firstName) {
      inLog.warn("First name cannot be empty", subject);
    }
  }
  while (!lastName) {
    lastName = prompt(ColorMe.fromOptions("Last Name:", {
      color: "brightCyan",
    }));
    if (!lastName) {
      inLog.warn("Last name cannot be empty", subject);
    }
  }
  while (!email) {
    email = prompt(ColorMe.fromOptions("Email:", { color: "brightCyan" }));
    if (!email) {
      inLog.warn("Email cannot be empty", subject);
    }
  }
  while (!password) {
    password = prompt("Password:");
    if (!password) {
      inLog.warn("Password cannot be empty", subject);
    }
  }
  const user = {
    firstName,
    lastName,
    email,
    password,
  };

  inLog.info(
    `User: ${ColorMe.fromOptions(user.firstName, { color: "green" })} ${
      ColorMe.fromOptions(
        user.lastName,
        { color: "green" },
      )
    } ${ColorMe.fromOptions(user.email, { color: "green" })}`,
    subject,
  );
  return user;
}

export default checkForUser;
