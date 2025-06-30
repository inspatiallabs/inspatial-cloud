<div align="center">
    <a href="https://inspatiallabs.com" target="_blank">
    <p align="center">
    <picture>
    <source media="(prefers-color-scheme: light)" srcset="https://inspatial-storage.s3.eu-west-2.amazonaws.com/media/icon-brutal-dark.svg">
      <source media="(prefers-color-scheme: dark)" srcset="https://inspatial-storage.s3.eu-west-2.amazonaws.com/media/icon-brutal-light.svg">
        <img src="https://inspatial-storage.s3.eu-west-2.amazonaws.com/media/icon-brutal-dark.svg" alt="InSpatial" width="300">
    </picture>
</p>
   </a>

<br>
   <br>

<p align="center">
  <a href="https://inspatiallabs.com" target="_blank">
    <picture>
        <source media="(prefers-color-scheme: light)" srcset="https://inspatial-storage.s3.eu-west-2.amazonaws.com/media/logo-dark.svg">
        <source media="(prefers-color-scheme: dark)" srcset="https://inspatial-storage.s3.eu-west-2.amazonaws.com/media/logo-light.svg">
        <img src="https://inspatial-storage.s3.eu-west-2.amazonaws.com/media/logo-dark.svg" height="75" alt="InSpatial">
    </picture>
    </a>
</p>

_Reality is your canvas_

<h3 align="center">
    InSpatial is a universal development environment (UDE) <br> for building cross-platform and spatial (AR/MR/VR) applications
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

<br>

<div align="center">
  <a href="https://www.inspatial.cloud#gh-dark-mode-only" target="_blank">
      <img src="https://inspatial-storage.s3.eu-west-2.amazonaws.com/media/inspatial-cloud-light.svg"  alt="InSpatial Cloud" height="45">
  </a>
  <a href="https://www.inspatial.cloud#gh-light-mode-only" target="_blank">
      <img src="https://inspatial-storage.s3.eu-west-2.amazonaws.com/media/inspatial-cloud-dark.svg"  alt="InSpatial Cloud" height="45">
  </a>
</div>

<br>

---

## 🌟 Welcome to InSpatial Cloud

InSpatial Cloud is your one-stop-shop, batteries-included backend for building
universal and spatial (AR/MR/VR) applications.

## 🚀 Features

Some of the key features include:

- **InSpatialORM**: An easy-to-use advanced ORM for PostgreSQL
- **InDB**: An embedded database for local development (no need to install
  PostgreSQL locally!)
- **Authentication**: Built-in authentication and authorization out of the box
- **InLive**: Real-time data streaming and synchronization over WebSockets
- **InQueue**: A task queue system for background processing
- **CloudAPI**: A powerful API that is easy to use and extend. Includes built in
  request validation and authentication
- **InCache**: A powerful caching layer for your data
- **Extensible**: InSpatial Cloud is built to be extensible. In fact, most of
  the core features are built as extensions!

This is only a small preview of what InSpatial Cloud can and will do.

Stay tuned for more features and updates (and documentation 😉) as we continue
to build out the platform.

---

## 🤝 Contributing

We welcome contributions from the community! Please read our
[Contributing Guidelines](CONTRIBUTING.md) to get started.

---

## 📄 License

InSpatial Cloud is released under the Apache 2.0 License. See the
[LICENSE](LICENSE) file for details.

---

<div align="center">
  <strong>Ready to shape the future of spatial computing?</strong>
  <br>
  <a href="https://www.inspatial.app">Start Building with InSpatial</a>
</div>

---

### Pre-requisites

- Deno

### Installation

Install the InSpatial Cloud CLI:

```shell
deno install -g jsr:@inspatial/cloud/incloud
```

initialize a new project

```shell
incloud init myProject
```
This will create a folder in the current directory with a started project.

Now you can run your InSpatial Cloud project:

```shell
cd my-project
incloud run main.ts
```

You can verify the app is running by navigating to [http://localhost:8000](http://localhost:8000) in your browser
