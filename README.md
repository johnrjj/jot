# ✍️ Jot 

[![CircleCI](https://circleci.com/gh/johnrjj/jot.svg?style=svg&circle-token=f3d5f772f89eee9e33f32c1c273e7164d3635567)](https://circleci.com/gh/johnrjj/jot) [![Greenkeeper badge](https://badges.greenkeeper.io/johnrjj/jot.svg?token=c7ecb37b97912ada6cb220f095fcf1e64193d4bb32db380702b3cb6e2550ce4e&ts=1540698479566)](https://greenkeeper.io/) 

## Overview

Realtime collaboritve editor using CRDTs.


## Getting started

### Local dev setup

First install deps: 

```
yarn install
```

To run the entire stack (frontend and backend). [Redis automatically connects to dev cloud instance].

```
yarn start
```


#### Backend 

The dev backend server is hosted at [`http://localhost:3001`](`http://localhost:3001`). It will live relod.

To make sure it is working, make a GET request to [`http://localhost:3001/api/v0/healthcheck`](http://localhost:3001/api/v0/healthcheck).


##### Frontend

The dev backend server is hosted at [`http://localhost:1234`](http://localhost:1234). It will also live reload.
