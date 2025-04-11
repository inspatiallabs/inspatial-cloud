import type { InSpatialCloud } from "#/inspatial-cloud.ts";
import cloudLogger from "#/cloud-logger.ts";
import { ColorMe } from "@inspatial/serve/utils";

async function checkForUser(app: InSpatialCloud) {
  const { orm } = app;
  const userCount = await orm.count("user");
  const subject = "System Admin User";
  if (userCount === 0) {
    cloudLogger.warn(
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
    cloudLogger.info("Admin user created successfully.");
    prompt("Press any key to continue...");
  }
}

function promptForUser() {
  const subject = "Create User";
  let firstName: string | null = "";
  let lastName: string | null = "";
  let email: string | null = "";
  let password: string | null = "";
  while (!firstName) {
    firstName = prompt(ColorMe.fromOptions("First Name:", {
      color: "brightCyan",
    }));
    if (!firstName) {
      cloudLogger.warn("First name cannot be empty", subject);
    }
  }
  while (!lastName) {
    lastName = prompt(ColorMe.fromOptions("Last Name:", {
      color: "brightCyan",
    }));
    if (!lastName) {
      cloudLogger.warn("Last name cannot be empty", subject);
    }
  }
  while (!email) {
    email = prompt(ColorMe.fromOptions("Email:", { color: "brightCyan" }));
    if (!email) {
      cloudLogger.warn("Email cannot be empty", subject);
    }
  }
  while (!password) {
    password = prompt("Password:");
    if (!password) {
      cloudLogger.warn("Password cannot be empty", subject);
    }
  }
  const user = {
    firstName,
    lastName,
    email,
    password,
  };

  cloudLogger.info(
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
