import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { Editor } from 'slate-react';
import { Value } from 'slate';
import Automerge from 'automerge';
import { toJSON } from './lib/slate-custom-tojson';
import assign from 'assign-deep';
import { applySlateOperationsHelper } from './lib/apply-slate-operations';
import Websocket from './components/Websocket';
import { automergeJsonToSlate } from './adapter/slateAutomergeBridge';

class Foo extends Component<any, any> {
  doc: any;
  docSet: any;
  websocket: any;
  connection: any;
  constructor(props) {
    super(props);
    this.docSet = new Automerge.DocSet();

    this.state = {
      loaded: false,
      value: null,
    };
    this.websocket = React.createRef();
  }

  async componentDidMount() {
    const res = await fetch('http://localhost:3001/api/v0/doc/1');
    const json = await res.json();
    const { serializedDocument } = json;
    const crdt = Automerge.load(serializedDocument);
    this.doc = crdt;
    // console.log(crdt);
    const initialValue: any = automergeJsonToSlate(this.doc);

    // console.log('FROM THE VERSION', initialValue);

    // console.log('a', Plain.deserialize('text here').toJS());
    const initialSlateValue = Value.fromJSON(initialValue);
    // console.log('b', initialSlateValue.toJS());
    // console.log()
    // this.doc = Automerge.load(s);

    this.docSet.setDoc('1', this.doc);

    this.setState({
      loaded: true,
      value: initialSlateValue,
    });

    // const send = data => {
    //   this.websocket.current.sendMessage(JSON.stringify({ type: 'send-operation', payload: data }))
    // }
    // const autocon = (this.autocon = new Automerge.Connection(this.docSet, send))
    // autocon.open()
    // let hasBootstrapped = false;

    this.connection = new Automerge.Connection(this.docSet, data => {
      const message = JSON.stringify({
        type: 'automerge-connection-send',
        payload: {
          clientId: 'client1',
          docId: '1',
          message: data,
        },
      });
      this.websocket.current.sendMessage(message);
      // if (!hasBootstrapped) {
      //   hasBootstrapped = true;
      //   this.connection.receiveMsg(msg);
      // }

      // if (msg.changes) {
      //   send(msg);
      // }
    });

    this.connection.open();
    // this.docSet.setDoc(this.props.docId, this.doc)
    // this.props.sendMessage(this.props.clientId, {
    //     docId: this.props.docId,
    //     clock: Immutable.Map(),
    // })
    // this.props.connectionHandler(this.props.clientId, true)

    setTimeout(
      () =>
        this.websocket.current.sendMessage(
          JSON.stringify({
            type: 'join-document',
            payload: {
              docId: '1',
              clientId: 'client1',
            },
          })
        ),
      1000
    );
  }

  onChange = ({ value, operations }) => {
    this.setState({ value });
    console.log(operations.toJS());
    const clientId = '1';
    const message = clientId ? `Client ${clientId}` : 'Change log';
    const docNew = Automerge.change(this.doc, message, doc => {
      // Use the Slate operations to modify the Automerge document.
      applySlateOperationsHelper(doc, operations);
    });
    const diff = Automerge.diff(this.doc, docNew);
    console.log(diff);
    console.log(Automerge.getHistory(docNew));
    console.log(Automerge.save(docNew).length);

    this.doc = docNew;
    const x = docNew;

    // THIS TRIGGERS THE CONNECTION THING
    this.docSet.setDoc('1', x);
  };
  handleMessage = msg => {
    const msgJson = JSON.parse(msg);
    console.log(' got a msg', msgJson);
    if (msgJson.type === 'server-update') {
      this.connection.receiveMsg(msgJson.payload);
      console.log('synced, handshake done');
    }
  };

  render() {
    const { loaded } = this.state;
    if (!loaded) {
      return <div>loading...</div>;
    }
    return (
      <div>
        <Websocket
          ref={this.websocket}
          debug={true}
          url={'ws://localhost:3001/ws'}
          onMessage={this.handleMessage}
          onOpen={e => console.log(e)}
          onClose={() => {}}
        />
        <Editor
          placeholder="Enter some plain text..."
          value={this.state.value}
          onChange={this.onChange}
        />
      </div>
    );
  }
}

const Demo = () => <div>sup</div>;

ReactDOM.render(<Foo />, document.getElementById('app'));
