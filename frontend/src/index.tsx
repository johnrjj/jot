import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { Editor } from 'slate-react';
import { Value } from 'slate';
import Automerge from 'automerge';
import uuid from 'uuid/v4';
import styled from 'styled-components';
import Websocket from './components/Websocket';
import {
  automergeJsonToSlate,
  applySlateOperationsHelper,
  convertAutomergeToSlateOps,
} from './adapter/slate-automerge-bridge';
import './reset.css';
import './global.css';

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

const Cursor = styled.span`
  background-color: green;
`;

class Main extends Component<any, any> {
  doc: any;
  docSet: any;
  websocket: any;
  connection: any;
  editor: any;
  selection: any;

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
    this.onChange = this.onChange.bind(this);
  }

  async componentDidMount() {
    const res = await fetch('http://localhost:3001/api/v0/doc/1');
    const json = await res.json();
    const { serializedDocument } = json;
    const crdt = Automerge.load(serializedDocument);
    this.doc = crdt;

    const initialValueJSON: any = automergeJsonToSlate(this.doc);
    const initialSlateValue = Value.fromJSON(initialValueJSON);
    this.docSet.setDoc('1', this.doc);

    this.setState({
      loaded: true,
      value: initialSlateValue,
    });

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
    });

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
    this.selection = value.selection.toJS();
    console.log('ONCHANGE', value.toJS());
    let decorations = value.decorations;
    const selection = value.selection;
    const mark = {
      type: 'bold',
    };
    const range = selection;
    this.setState({ value });
    const clientId = this.state.clientId;
    const message = clientId ? `Client ${clientId}` : 'Change log';

    if (rest.fromRemote) {
      // needed for programatic updates...
      // without this we get into a loop.
      // the code after this calls the onchange handler again
      // i need to find a better way to do programatic updates(?)
      // this works for now
      return;
    }

    this.editor &&
      this.editor.current &&
      this.editor.current.change(change => {
        const appliedChanges = change.addMarkAtRange(range, mark);
        // we can tack on anything to the changes object so the onchange() handler
        // knows not to apply these changes again (as it will get called
        // immedietly after we return this a couple lines down.
        appliedChanges.fromRemote = true;
        return appliedChanges;
      });

    const docNew = Automerge.change(this.doc, message, doc => {
      // Use the Slate operations to modify the Automerge document.
      applySlateOperationsHelper(doc, operations);
    });

    // This also kicks off the Automerge.connection instance
    this.docSet.setDoc(this.state.docId, docNew);
    this.doc = docNew;
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
      if (msgJson.payload.changes) {
        const currentDoc = this.doc;
        const opSetDiff = Automerge.diff(currentDoc, docNew);
        if (opSetDiff.length !== 0) {
          const slateOps = convertAutomergeToSlateOps(opSetDiff);
          this.editor.current.change(change => {
            const appliedChanges = change.applyOperations(slateOps);
            // we can tack on anything to the changes object so the onchange() handler
            // knows not to apply these changes again (as it will get called
            // immedietly after we return this a couple lines down.
            appliedChanges.fromRemote = true;
            return appliedChanges;
          });
          const updatedDoc = this.docSet.getDoc(this.state.docId);
          this.doc = updatedDoc;
        }
      }
    }
  };

  handleSelect = (_event, editor) => {
    const { value } = editor;
    const { selection } = value;
    const { anchor, focus, ...rest } = selection;
    this.selection = selection.toJS();
  };

  /**
   * Render a Slate mark.
   *
   * @param {Object} props
   * @return {Element}
   */

  renderMark = (props, next) => {
    const { children, mark, attributes } = props;
    console.log(children, mark, attributes);
    switch (mark.type) {
      case 'bold':
        return <Cursor {...attributes}>{children}</Cursor>;
      case 'code':
        return <code {...attributes}>{children}</code>;
      case 'italic':
        return <em {...attributes}>{children}</em>;
      case 'underlined':
        return <u {...attributes}>{children}</u>;
      case 'comment':
        return (
          <span {...attributes} style={{ opacity: '0.33' }}>
            {children}
          </span>
        );
      case 'bold':
        return (
          <span {...attributes} style={{ fontWeight: 'bold' }}>
            {children}
          </span>
        );
      case 'tag':
        return (
          <span {...attributes} style={{ fontWeight: 'bold' }}>
            {children}
          </span>
        );
      case 'punctuation':
        return (
          <span {...attributes} style={{ opacity: '0.75' }}>
            {children}
          </span>
        );
      default:
        return next();
    }
  };

  render() {
    const { loaded } = this.state;
    if (!loaded) {
      return <div>loading...</div>;
    }
    // const history = Automerge.getHistory(this.doc);
    return (
      <AppContainer>
        <NavBar>crazy experiment ~~~~</NavBar>
        <MainContainer>
          <ContentContainer>
            <Websocket
              ref={this.websocket}
              debug={true}
              url={'ws://localhost:3001/ws'}
              onMessage={this.handleMessage}
              onClose={() => console.log('websocket closed')}
            />
            <Editor
              ref={this.editor}
              placeholder="Enter some plain text..."
              autoCorrect={false}
              autoFocus={true}
              spellCheck={false}
              value={this.state.value}
              onChange={this.onChange}
              // onSelect={this.handleSelect}
              renderMark={this.renderMark as any}
            />
          </ContentContainer>

          <SideBarContainer>
            <SidebarTitleContainer>sidebar title</SidebarTitleContainer>
            <SidebarContentContainer>
              {/* {history.map(historyUnit => {
                const { change, snapshot } = historyUnit;
                const { actor, deps, message, ops, seq } = change;
                return (
                  <div key={actor + seq} style={{ marginBottom: '1rem' }}>
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
