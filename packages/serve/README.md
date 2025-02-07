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

## 🛠️ InSpatial Serve (🟡 Preview)

_Your entry point into InSpatial Cloud_

`InSpatialServer` is used under the hood by `InSpatialApp` and handles the web
server setup, configuration and core functionality.

It is designed as a standalone module that can be used as a web server for any
Deno project.

## 🌟 Features

- 🚀 Simple API
- 🧩 Built-in extensions
- 📦 Easy to extend
- 🌐 Fully compatible with [Deno Deploy](https://deno.com/deploy)
- 💪 Compatible with `deno serve`
- 🔍 User-Agent parsing

## 📦 Install InSpatial Serve:

Choose your preferred package manager:

```bash
deno install jsr:@inspatial/serve
```

## 

```bash
npx jsr add @inspatial/serve
```

## 

```bash
yarn dlx jsr add @inspatial/serve
```

## 

```bash
pnpm dlx jsr add @inspatial/serve
```

## 

```bash
bunx jsr add @inspatial/serve
```

## 🛠️ Usage

### Basic Usage

```ts
// main.ts
import InSpatialServer from "@inspatial/serve";

const server = new InSpatialServer({
  extensions: [], // Add extensions here
});

server.run();
```

run the server using `deno run`:

```shell
deno run -A main.ts
```

### With Deno Serve

`InSpatialServer` is also compatible with `deno serve`. This is useful when you
want to use features like parallel processing.

```ts
// main.ts
import InSpatialServer from "@inspatial/serve";

const server = new InSpatialServer({
  extensions: [], // Add extensions here
});

export default server;
```

Now you can run the server using `deno serve`:

```shell
deno serve --parallel main.ts
```

## 🚀 Getting Started

To begin your journey with InSpatial Serve, visit our comprehensive
documentation at [inspatial.cloud](https://www.inspatial.cloud).

---

## 🤝 Contributing

We welcome contributions from the community! Please read our
[Contributing Guidelines](CONTRIBUTING.md) to get started.

---

## 📄 License

InSpatial Serve is released under the Apache 2.0 License. See the
[LICENSE](LICENSE) file for details.

---

<div align="center">

<strong>Ready to supercharge your spatial development?</strong>
<br>
<a href="https://www.inspatial.app">Get Started with InSpatial App</a>

</div>
