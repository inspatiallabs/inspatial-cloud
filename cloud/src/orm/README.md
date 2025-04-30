<div align="center">
    <picture>
        <source media="(prefers-color-scheme: dark)" srcset="https://inspatial-storage.s3.eu-west-2.amazonaws.com/media/icon-brutal-light.svg">
        <source media="(prefers-color-scheme: light)" srcset="https://inspatial-storage.s3.eu-west-2.amazonaws.com/media/icon-brutal-dark.svg">
        <img src="https://inspatial-storage.s3.eu-west-2.amazonaws.com/media/icon-brutal-dark.svg" alt="InSpatial" width="300">
    </picture>

<br>
   <br>

<p align="center">
    <picture>
        <source media="(prefers-color-scheme: dark)" srcset="https://inspatial-storage.s3.eu-west-2.amazonaws.com/media/logo-light.svg">
        <source media="(prefers-color-scheme: light)" srcset="https://inspatial-storage.s3.eu-west-2.amazonaws.com/media/logo-dark.svg">
        <img src="https://inspatial-storage.s3.eu-west-2.amazonaws.com/media/logo-dark.svg" height="75" alt="InSpatial">
    </picture>
</p>

_Reality is your canvas_

<h3 align="center">
  InSpatial is a spatial computing platform <br> for building universal and XR (AR/MR/VR) applications
</h3>

[![InSpatial Dev](https://inspatial-storage.s3.eu-west-2.amazonaws.com/media/dev-badge.svg)](https://www.inspatial.dev)
[![InSpatial Cloud](https://inspatial-storage.s3.eu-west-2.amazonaws.com/media/cloud-badge.svg)](https://www.inspatial.cloud)
[![InSpatial App](https://inspatial-storage.s3.eu-west-2.amazonaws.com/media/app-badge.svg)](https://www.inspatial.app)
[![InSpatial Store](https://inspatial-storage.s3.eu-west-2.amazonaws.com/media/store-badge.svg)](https://www.inspatial.store)

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Discord](https://img.shields.io/badge/discord-join_us-5a66f6.svg?style=flat-square)](https://discord.gg/inspatiallabs)
[![Twitter](https://img.shields.io/badge/twitter-follow_us-1d9bf0.svg?style=flat-square)](https://twitter.com/inspatiallabs)
[![LinkedIn](https://img.shields.io/badge/linkedin-connect_with_us-0a66c2.svg?style=flat-square)](https://www.linkedin.com/company/inspatiallabs)

</div>

##

<div align="center">

| InSpatial                                                                                                                     | Description                          | Link                                           |
| ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | ---------------------------------------------- |
| [![InSpatial Dev](https://inspatial-storage.s3.eu-west-2.amazonaws.com/media/dev-badge.svg)](https://www.inspatial.dev)       | Universal Libraries & Frameworks     | [inspatial.dev](https://www.inspatial.dev)     |
| [![InSpatial Cloud](https://inspatial-storage.s3.eu-west-2.amazonaws.com/media/cloud-badge.svg)](https://www.inspatial.cloud) | Backend APIs and SDKs                | [inspatial.cloud](https://www.inspatial.cloud) |
| [![InSpatial App](https://inspatial-storage.s3.eu-west-2.amazonaws.com/media/app-badge.svg)](https://www.inspatial.app)       | Build and manage your InSpatial apps | [inspatial.app](https://www.inspatial.app)     |
| [![InSpatial Store](https://inspatial-storage.s3.eu-west-2.amazonaws.com/media/store-badge.svg)](https://www.inspatial.store) | Deploy and discover InSpatial apps   | [inspatial.store](https://www.inspatial.store) |

</div>

---

## 🗃 InSpatial ORM (🔴 Unstable)


`InSpatialORM` is a high-level object-relational mapping library for Deno powered by `InSpatialDB` to connect to `PostgreSQL`.

It is designed to work with InSpatial Cloud and can be used as a standalone module for any Deno project.

InSpatial ORM is currently in development and is not recommended for production use.


## 📦 Install InSpatial ORM

```bash
deno add jsr:@inspatial/orm
```


## Basic Usage

### Define an EntryType
```ts

// user.ts
export const userEntry = new EntryType("user", {
  idMode: "ulid",
  defaultListFields: ["firstName", "lastName"],
  fields: [{
    key: "firstName",
    type: "DataField",
    label: "First Name",
    description: "The user's first name",
    required: true,
  }, {
    key: "lastName",
    type: "DataField",
    label: "Last Name",
    description: "The user's last names",
    required: true,
  }, {
    key: "email",
    type: "EmailField",
    label: "Email",
    description: "The user's email address used for login",
    required: true,
    unique: true,
  }, {
    key: "fullName",
    type: "DataField",
    label: "Full Name",
    description: "The user's password used for login",
    readOnly: true,
  }],
  actions: [
    {
      key: "sayHello",
      async action({ user, orm, data }) {
        return {
          message: `${user.fullName} says: "Hello, ${data.friendName}!"`,
        };
      },
      params: [{
        key: "friendName",
        type: "string",
        label: "Friend's Name",
        required: true,
      }],
    },
  ],
  hooks: {
    beforeUpdate: [{
      name: "Generate Name",
      description: "Generate the full name of the user",
      async handler({
        user,
      }) {
        user.fullName = `${user.firstName} ${user.lastName}`;
      },
    }],
  },
});
```

### Create an ORM instance
```ts
import { InSpatialORM, InSpatialDB } from "@inspatial/orm";
import { userEntry } from "./user.ts";

const orm = new InSpatialORM({
  db: new InSpatialDB({
    connection:{
        connectionType: "tcp",
        host: "localhost",
        port: 5432,
        user: "postgres",
        schema: "public", // optional, default is public
        password: "password",
        database: "inspatial" // database name, be sure to create it first with postgres `createdb <database>`
    }
  }),
  entries: [userEntry], // array of defined `EntryType` objects
  settings: [], // array of defined `SettingType` objects
});

await orm.migrate(); // create tables and indexes

```

### Use the ORM
```ts

// create a new user entry
const user = await orm.createEntry("user", {
  firstName: "Some",
  lastName: "Dev",
  email: "some@dev.email",
  });


// run an action on the user entry
const result = await user.runAction("sayHello", { friendName: "Other Dev" });

console.log(result.message); // Some Dev says: "Hello, Other Dev!"
```
