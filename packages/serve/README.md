<div align="center">

# ☁️ `InSpatial Serve`

_Your entry point into InSpatial Cloud_

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Core](https://img.shields.io/badge/cloud-inspatial.serve-brightgreen.svg)](https://www.inspatial.cloud)

</div>

## 📝 Description

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
