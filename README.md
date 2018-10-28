# ✍️ Jot 

[![CircleCI](https://circleci.com/gh/johnrjj/jot.svg?style=svg&circle-token=f3d5f772f89eee9e33f32c1c273e7164d3635567)](https://circleci.com/gh/johnrjj/jot) 

## Overview

Realtime collaboritve editor using CRDTs.


## Getting started

### Local dev setup

First install deps: 

```
yarn install
```

In one tab start the backend server:

```
yarn start:backend
```

and in another tab start the webserver:

```
yarn start:frontend
```

#### Backend 

The dev backend server is hosted at [`http://localhost:3001`](`http://localhost:3001`). It does not live reload yet.

To make sure it is working, make a GET request to [`http://localhost:3000/api/v0/healthcheck`](http://localhost:3000/api/v0/healthcheck).


##### Frontend

The dev backend server is hosted at [`http://localhost:1234`](http://localhost:1234). It will live reload.
