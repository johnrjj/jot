# ✍️ Jot

[![CircleCI](https://circleci.com/gh/johnrjj/jot.svg?style=svg&circle-token=f3d5f772f89eee9e33f32c1c273e7164d3635567)](https://circleci.com/gh/johnrjj/jot) [![Greenkeeper badge](https://badges.greenkeeper.io/johnrjj/jot.svg?token=c7ecb37b97912ada6cb220f095fcf1e64193d4bb32db380702b3cb6e2550ce4e&ts=1540698479566)](https://greenkeeper.io/)

## Overview

Realtime collaborative editor using CRDTs, Websockets, and more.

## Getting started

### Local dev setup

A good bit of work has been done to ensure a great devx. Install the dependencies and immedietly begin running the app using sensible defaults. No dockerfile (yet).

First install deps:

```
yarn install
```

To run the entire stack in dev mode (frontend and backend):

```
yarn start
```

Your default browser will automatically open to the local frontend app when done compiling.

All packages are watched, and have live and/or hot reloading where applicable.

Redis automatically connects to a cloud dev Redis server (you can override if needed).

### Package Local Dev Links

#### `@jot/frontend`

The dev frontend server is hosted at [`http://localhost:1234`](http://localhost:1234). It will live reload.

#### `@jot/backend`

The dev backend server is hosted at [`http://localhost:3001`](http://localhost:3001). It will also live reload.

To confirm it's working, a GET request to [`http://localhost:3001/api/v0/healthcheck`](http://localhost:3001/api/v0/healthcheck) should return a status code 200 `OK`.

## Deployment

### Overview

#### Prod URLs

Frontend: [`https://jot-app.surge.sh`](https://jot-app.surge.sh)

Backend: [`https://jot-api-prod.herokuapp.com`](https://jot-api-prod.herokuapp.com)

---

### Package Deployment:

### `@jot/frontend`

Frontend is manually deployed right now via yarn script:

```
yarn deploy:frontend
```

Prod frontend url: [`https://jot-app.surge.sh`](https://jot-app.surge.sh)

### `@jot/backend`

Backend autodeploys to Heroku on every successful master build.

Prod backend base url: `https://jot-api-prod.herokuapp.com`

Prod backend healthcheck url: [`https://jot-api-prod.herokuapp.com/healthcheck`](https://jot-api-prod.herokuapp.com/healthcheck)

### `@jot/common`

Does not need to be deployed.

## Architecture

### Websockets

Realtime data is multiplexed over websockets.

#### Document State

Document state and data from the automerge CRDT is sent and recieved and always ensures that the information ends up being transmitted and confirmed.

#### Remote Client Cursors

Remote cursors are treated as UDP-esque networking, not mission critical, and if they drop or lose a packet, not the end of the world.

#### Document channels/lobbies/event streams/figure out a standard name

Document channels are joined and left via websockets as well. Client sends over a request to join, server either does not allow or allows. If server allows we send an ack, completing the handshake.

What else do we send over websockets?

### Redis

All internal events should flow through redis event bus.
