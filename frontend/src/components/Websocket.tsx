import React from 'react';

export interface WebsocketPropTypes {
  url: string;
  onMessage: Function;
  onOpen?: Function;
  onClose: Function;
  debug?: boolean;
  reconnect?: boolean;
  protocol?: string;
  reconnectIntervalInMilliSeconds?: number;
}

export interface WebsocketState {
  ws: WebSocket;
  attempts: number;
}

class Websocket extends React.Component<WebsocketPropTypes, WebsocketState> {
  shouldReconnect: boolean = null;
  timeoutID: any = null;

  static defaultProps = { debug: false, reconnect: true };

  constructor(props) {
    super(props);
    this.state = {
      ws: new WebSocket(this.props.url, this.props.protocol),
      attempts: 1,
    };
  }

  logging(logline) {
    if (this.props.debug === true) {
      console.log(logline);
    }
  }

  generateInterval(k) {
    if (this.props.reconnectIntervalInMilliSeconds > 0) {
      return this.props.reconnectIntervalInMilliSeconds;
    }
    return Math.min(30, Math.pow(2, k) - 1) * 1000;
  }

  setupWebsocket() {
    let websocket = this.state.ws;

    websocket.onopen = () => {
      this.logging('Websocket connected');
      this.props.onOpen && this.props.onOpen();
    };

    websocket.onmessage = evt => {
      this.props.onMessage(evt.data);
    };

    this.shouldReconnect = this.props.reconnect;
    websocket.onclose = () => {
      this.logging('Websocket disconnected');
      if (typeof this.props.onClose === 'function') this.props.onClose();
      if (this.shouldReconnect) {
        let time = this.generateInterval(this.state.attempts);
        this.timeoutID = setTimeout(() => {
          this.setState({ attempts: this.state.attempts + 1 });
          this.setState({ ws: new WebSocket(this.props.url, this.props.protocol) });
          this.setupWebsocket();
        }, time);
      }
    };
  }

  componentDidMount() {
    this.setupWebsocket();
  }

  componentWillUnmount() {
    this.shouldReconnect = false;
    clearTimeout(this.timeoutID);
    let websocket = this.state.ws;
    websocket.close();
  }

  sendMessage = (data: any) => {
    const websocket = this.state.ws;
    this.waitForConnection(() => websocket.send(data));
  };

  waitForConnection = (callback, interval = 1000) => {
    const ws = this.state.ws;
    return ws.readyState === ws.OPEN
      ? callback()
      : setTimeout(() => this.waitForConnection(callback, interval), interval); //todo expon retry
  };

  render() {
    return <div />;
  }
}

export default Websocket;
