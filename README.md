# Harvester Dashboard
[![Build Status](http://drone-publish.rancher.io/api/badges/harvester/dashboard/status.svg)](http://drone-publish.rancher.io/harvester/dashboard)

Harvester Dashboard UI, Harvester is an open-source hyper-converged infrastructure (HCI) software built on Kubernetes.

## Running for Development
This is what you probably want to get started.
```bash
# Install dependencies
yarn install

# For development, serve with hot reload at https://localhost:8005
# using the endpoint for your Harvester API
API=https://your-harvester yarn dev
# or put the variable into a .env file
# Goto https://localhost:8005
```

```
# build harvester plugin
yarn build-pkg harvester && yarn serve-pkgs

# Open another terminal
HARVESTER_PKG_URL=http://127.0.0.1:4500/harvester-${version}/harvester-${version}.umd.min.js API=https://your-harvester yarn mem-dev
```

## Other Building Modes
```bash
# Build for standalone use within Harvester
# (These are done on commit/tag via Drone)
./scripts/build-embedded # for embedding into harvester builds
./scripts/build-hosted # for hosting on a static file webserver and pointing Harvester's ui-index at it
# Output in dist/

# Develop via Docker instead of a local nodejs
docker build -f Dockerfile.dev -t dashboard:dev .
docker run -v $(pwd):/src \
  -v dashboard_node:/src/node_modules \
  -p 8005:8005 \
  -e API=https://your-rancher \
  dashboard:dev
# The first time will take *forever* installing node_modules into the volume; it will be faster next time.
# Goto https://localhost:8005

# Developing against a standalone "Steve" API on a Mac
git clone https://github.com/rancher/steve.git
cd steve
make run-host

cd dashboard
docker build -f Dockerfile.dev -t rancher/dashboard:dev .
docker run -v $(pwd):/src \
  -v dashboard_node:/src/node_modules \
  -p 8005:8005 \
  -e API=http://172.17.0.1:8989 \
  rancher/dashboard:dev
# The first time will take *forever* installing node_modules into the volume; it will be faster next time.
# Goto https://localhost:8005
```

# What is it?

Dashboard is "stateless" client for the Harvester APIs built with [Vue.js](https://vuejs.org/) and [NuxtJS](https://nuxtjs.org/).  It is normally built and packaged as a folder of static HTML/CSS/JS files which are bundled into a Harvester release, with the index.html returned by the API server as the "fallback" case for any request that looks like it came from a browser and does not match an API URL.

## Developer Docs

For information on APIs, the layout of the codebase, Vuex stores, localization and more, see the [developer docs.](https://rancher.github.io/dashboard/getting-started/concepts/)

## Contributing

For developers, after reading through the introduction on this page, head over to our [Getting Started](https://rancher.github.io/dashboard/getting-started/concepts) guide to learn more.

License
=======
Copyright (c) 2014-2021 [Rancher Labs, Inc.](http://rancher.com)

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

[http://www.apache.org/licenses/LICENSE-2.0](http://www.apache.org/licenses/LICENSE-2.0)

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
