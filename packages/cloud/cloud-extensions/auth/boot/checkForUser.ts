import type { InSpatialCloud } from "#/inspatial-cloud.ts";
import cloudLogger from "#/cloud-logger.ts";

async function checkForUser(app: InSpatialCloud) {
  const { orm } = app;
  const userCount = await orm.count("user");
  if (userCount === 0) {
    prompt("No users found. Please create an admin user.");
    const firstName = prompt("First Name:");
    const lastName = prompt("Last Name:");
    const email = prompt("Email:");
    const password = prompt("Password:");
    const user = await orm.createEntry("user", {
      firstName,
      lastName,
      email,
      systemAdmin: true,
    });
    await user.runAction("setPassword", { password });
    cloudLogger.info("Admin user created successfully.");
    prompt("Press any key to continue...");
  }
}

export default checkForUser;
