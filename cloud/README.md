

# InSpatial Cloud

## Getting Started

### Pre-requisites

- Deno
- PostgreSQL


### Installation

**MacOS/Linux**
```bash
curl -fsSL https://deno.land/install.sh | sh
```

**Windows**
```bash
irm https://deno.land/install.ps1 | iex
```

Add the InSpatial Cloud module to your Deno project using the following command:

```bash
deno add jsr:@inspatial/cloud
```

## Usage

### Basic Usage

```ts
import { InSpatialCloud } from "@inspatial/cloud";

const app = new InSpatialCloud("myApp");

app.run();
```

Now you can run the app:

```bash
deno run -A main.ts
```

You can verify the app is running by pinging the API endpoint in you browser:


[http://localhost:8000/api?group=api&action=ping](http://localhost:8000/api?group=api&action=ping)


You should see the following response:

```json
{
  "message": "pong",
  "timestamp": 1745065012205,
  "app": "myApp"
}

```
