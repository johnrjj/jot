import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { Editor } from 'slate-react';
import { Value } from 'slate';
import Automerge from 'automerge';
import { toJSON } from './lib/slate-custom-tojson';
import assign from 'assign-deep';
import { applySlateOperationsHelper } from './lib/apply-slate-operations';
import Websocket from './components/Websocket';
import { automergeJsonToSlate, applyAutomergeOperations } from './adapter/slateAutomergeBridge';
import styled from 'styled-components';
import uuid from 'uuid/v4';
import './reset.css';
import { convertAutomergeToSlateOps } from './adapter/applyAutomergeOperations';

const AppContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
`;

const NavBar = styled.div`
  height: 64px;
  width: 100%;
  background-image: linear-gradient(134deg, #ff8d94 0%, #fdcbbc 100%);
`;

const MainContainer = styled.div`
  display: flex;
  flex: 1;
`;

const ContentContainer = styled.div`
  display: flex;
  flex: 1;
  border: 1px solid black;
`;

const SideBarContainer = styled.div`
  display: flex;
  flex-direction: column;
  flex: 0;
  min-width: 16rem;
  border: 1px solid black;
`;

const SidebarTitleContainer = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
`;

const SidebarContentContainer = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow-y: scroll;
`;

const EditorContainer = styled.div`
  display: flex;
`;

const HistoryContainer = styled.div``;

class Main extends Component<any, any> {
  doc: any;
  docSet: any;
  websocket: any;
  connection: any;
  editor: any;
  constructor(props) {
    super(props);
    this.docSet = new Automerge.DocSet();

    this.state = {
      loaded: false,
      value: null,
      isConnectedToDocument: false,
      clientId: uuid(),
      docId: '1',
      clientUpdateCount: 0,
      serverUpdateCount: 0,
    };
    this.websocket = React.createRef();
    this.editor = React.createRef();
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
          clientId: this.state.clientId,
          docId: this.state.docId,
          message: data,
        },
      });

      if (this.state.isConnectedToDocument) {
        this.websocket.current.sendMessage(message);
      } else {
        setTimeout(() => {
          // wait a second while we connect...
          this.websocket.current.sendMessage(message);
        }, 1000);
      }

      // if (!hasBootstrapped) {
      //   hasBootstrapped = true;
      //   this.connection.receiveMsg(msg);
      // }

      // if (msg.changes) {
      //   send(msg);
      // }
    });

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
              docId: this.state.docId,
              clientId: this.state.clientId,
            },
          })
        ) || this.connection.open(),
      1000
    );
  }

  onChange = ({ value, operations, ...rest }) => {
    console.log(rest);
    console.log('');
    console.log('ONCHANGE', value.toJS());
    this.setState({ value });
    // console.log(operations.toJS());
    const clientId = this.state.clientId;
    const message = clientId ? `Client ${clientId}` : 'Change log';

    if (rest.fromRemote) {
      console.log('YAY IT WORKED!!');
      return;
    }

    const docNew = Automerge.change(this.doc, message, doc => {
      // Use the Slate operations to modify the Automerge document.
      applySlateOperationsHelper(doc, operations);
    });

    // const prevDoc = this.docSet.getDoc(this.state.docId);
    // const opSetDiff = Automerge.diff(prevDoc, docNew);
    // if (opSetDiff.length !== 0) {
    //   this.doc = docNew;

    // THIS TRIGGERS THE CONNECTION THING
    this.docSet.setDoc(this.state.docId, docNew);
    this.doc = docNew;
    // }

    // const diff = Automerge.diff(this.doc, docNew);
    // console.log(diff);
    // console.log(Automerge.getHistory(docNew));
    // console.log(Automerge.save(docNew).length);
  };
  handleMessage = msg => {
    const msgJson = JSON.parse(msg);
    console.log(' got a msg', msgJson);
    if (msgJson.type === 'server-update') {
      const docNew = this.connection.receiveMsg(msgJson.payload);

      if (!this.state.isConnectedToDocument) {
        this.setState({
          isConnectedToDocument: true,
        });
      }

      console.log('synced, handshake done');

      if (msgJson.payload.changes) {
        console.log('has changes!!!!!');

        // // Instead of...
        // const { value } = this.state
        // const change = value.change()
        // ...
        // this.onChange(change)

        // // You now would do...
        // this.editor.change(change => {
        //   const { value } = change
        //   ...
        // })

        const currentDoc = this.doc;
        const opSetDiff = Automerge.diff(currentDoc, docNew);
        if (opSetDiff.length !== 0) {
          //
          const slateOps = convertAutomergeToSlateOps(opSetDiff);
          console.log('slateOps', slateOps);

          this.editor.current.change(change => {
            console.log('HERE1');
            const appliedChanges = change.applyOperations(slateOps);
            appliedChanges.fromRemote = true;
            // console.log(changes);
            // console.log('prob will error after this');
            // this.doc = this.docSet.getDoc(this.state.docId);
            // this.docSet.setDoc(this.state.docId); // maybe set doc here...
            return appliedChanges;
          });

          const updatedDoc = this.docSet.getDoc(this.state.docId);
          console.log(updatedDoc);
          console.log('HERE2');
          this.doc = updatedDoc;
          // this.docSet.setDoc(this.state.docId)

          // Apply the operation

          // let change = this.state.value.change()
          // change = applyAutomergeOperations(opSetDiff, change, () => { console.log('merge failed womp womp') });
          // if (change) {
          //     this.setState({ value: change.value })
          // }
        }
      }
    }
  };

  render() {
    const { loaded } = this.state;
    if (!loaded) {
      return <div>loading...</div>;
    }

    const { doc } = this;
    // const history = Automerge.getHistory(doc);

    // console.log(history);
    return (
      <AppContainer>
        <NavBar>crazy experiment navbar</NavBar>

        <MainContainer>
          <ContentContainer>
            <Websocket
              ref={this.websocket}
              debug={true}
              url={'ws://localhost:3001/ws'}
              onMessage={this.handleMessage}
              onOpen={e => console.log(e)}
              onClose={() => {}}
            />
            <Editor
              ref={this.editor}
              placeholder="Enter some plain text..."
              autoCorrect={false}
              autoFocus={true}
              spellCheck={false}
              value={this.state.value}
              onChange={this.onChange}
            />
          </ContentContainer>

          <SideBarContainer>
            <SidebarTitleContainer>sidebar title</SidebarTitleContainer>
            <SidebarContentContainer>
              {/* {history.map(historyUnit => {
                const { change, snapshot } = historyUnit;
                const { actor, deps, message, ops, seq } = change;
                return (
                  <div style={{ marginBottom: '1rem' }}>
                    <div>history edit</div>
                    <div>actor: {actor}</div>
                    <div>message: {message}</div>
                    <div>seq: {seq}</div>
                  </div>
                );
              })} */}
            </SidebarContentContainer>
          </SideBarContainer>
        </MainContainer>
      </AppContainer>
    );
  }
}

ReactDOM.render(<Main />, document.getElementById('app'));
