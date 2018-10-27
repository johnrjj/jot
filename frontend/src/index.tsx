import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { Editor } from 'slate-react';
import slate, { Mark } from 'slate';
import { Value, Decoration, Data } from 'slate';
import Automerge from 'automerge';
import { toJSON } from './lib/slate-custom-tojson';
import assign from 'assign-deep';
import { applySlateOperationsHelper } from './lib/apply-slate-operations';
import Websocket from './components/Websocket';
import { automergeJsonToSlate, applyAutomergeOperations } from './adapter/slateAutomergeBridge';
import styled from 'styled-components';
import uuid from 'uuid/v4';
import './reset.css';
import immutable from 'immutable';
import { convertAutomergeToSlateOps } from './adapter/applyAutomergeOperations';
import { string } from 'prop-types';

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

const HistoryContainer = styled.div``;

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
    this.decorateNode = this.decorateNode.bind(this);
    this.onChange = this.onChange.bind(this);
  }

  async componentDidMount() {
    const res = await fetch('http://localhost:3001/api/v0/doc/1');
    const json = await res.json();
    const { serializedDocument } = json;
    const crdt = Automerge.load(serializedDocument);
    this.doc = crdt;

    const initialValue: any = automergeJsonToSlate(this.doc);

    const initialSlateValue = Value.fromJSON(initialValue);

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

  onChange = ({ value, operations, withoutSaving, setValue, ...rest }) => {
    console.log(rest);
    console.log('');
    console.log(value.selection.toJS());
    this.selection = value.selection.toJS();
    console.log('ONCHANGE', value.toJS());

    let decorations = value.decorations;
    const selection = value.selection;
    // decorations = decorations.push({
    //   anchor: {
    //     key: selection.start.key,
    //     offset: selection.start.offset,
    //   },
    //   focus: {
    //     key: selection.start.key,
    //     offset: selection.start.offset,
    //   },
    //   mark: {
    //     type: 'bold',
    //   },
    // });

    const mark = {
      type: 'bold',
    };

    const range = selection;

    // const selection = this.value

    console.log(selection.anchor.key);
    console.log(selection.focus.key);

    // const range = slate.Range.create({
    //   anchor: {
    //     key: 'node-a',
    //     path: [0, 2, 1],
    //     offset: 0,
    //   },
    //   focus: {
    //     key: 'node-b',
    //     path: [0, 3, 2],
    //     offset: 4,
    //   },
    // })

    // const range = {
    //   anchor: { ...selection.anchor, key:  selection.anchor.key},
    //   // focus: selection.focus,
    //   focus: { ...selection.focus, key:  selection.focus.key},

    // }

    // console.log(range);
    // console.log(range.toJS());

    // const meep = value.change().setValue({ decorations });
    // console.log('meep', meep);

    this.setState({ value });
    // console.log(operations.toJS());
    const clientId = this.state.clientId;
    const message = clientId ? `Client ${clientId}` : 'Change log';

    if (rest.fromRemote) {
      console.log('YAY IT WORKED!!');
      return;
    }

    this.editor &&
      this.editor.current &&
      this.editor.current.change(change => {
        // console.log(change.toJS());
        const appliedChanges = change.addMarkAtRange(range, mark);
        // we can tack on anything to the changes object so the onchange() handler
        // knows not to apply these changes again (as it will get called
        // immedietly after we return this a couple lines down.
        appliedChanges.fromRemote = true;
        return appliedChanges;
      });

    // if (inputValue && hasValidAncestors(change.value)) {

    // withoutSaving(() => setValue({ decorations }))

    const docNew = Automerge.change(this.doc, message, doc => {
      // Use the Slate operations to modify the Automerge document.
      applySlateOperationsHelper(doc, operations);
    });

    // THIS TRIGGERS THE CONNECTION THING
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
          //
          const slateOps = convertAutomergeToSlateOps(opSetDiff);
          console.log('slateOps', slateOps);

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

  handleSelect = (event, editor) => {
    console.log(editor.value.toJS());

    console.log(editor.value.selection.toJS());
    const { value } = editor;
    const { selection } = value;
    const { anchor, focus, ...rest } = selection;
    this.selection = selection.toJS();
    // this.setState({
    //   selection,
    // })

    // this.setState({
    //   value: editor.value,
    // });
  };

  /**
   * Decorate code blocks with Prism.js highlighting.
   *
   * @param {Node} node
   * @return {Array}
   */

  decorateNode = (node, next): Range[] => {
    console.log('siiiiit');

    // return this.state.selection;

    // return next();
    const others = next() || [];
    // if (node.type != 'line') return others

    // const language = node.data.get('language')
    // const texts = node.getTexts().toArray()
    // const string = texts.map(t => t.text).join('\n')
    // const grammar = Prism.languages[language]
    // const tokens = Prism.tokenize(string, grammar)
    const decorations = [];
    console.log(this.selection);
    // let startText = texts.shift()
    // let endText = startText
    // let startOffset = 0
    // let endOffset = 0
    // let start = 0

    // for (const token of tokens) {
    //   startText = endText
    //   startOffset = endOffset

    //   const content = getContent(token)
    //   const newlines = content.split('\n').length - 1
    //   const length = content.length - newlines
    //   const end = start + length

    //   let available = startText.text.length - startOffset
    //   let remaining = length

    //   endOffset = startOffset + remaining

    //   while (available < remaining && texts.length > 0) {
    //     endText = texts.shift()
    //     remaining = length - available
    //     available = endText.text.length
    //     endOffset = remaining
    //   }

    //   if (typeof token != 'string') {

    if (this.selection && this.selection.anchor) {
      // const { selection } = this.state;
      const { anchor, focus } = this.selection;

      console.log('inside if');

      // object: "mark"
      // type: "bold"

      const dec: Decoration = slate.Decoration.create({
        anchor,
        focus,
        mark: Mark.create({
          data: slate.Data.create({}),
          type: 'bold',
        }),
        object: 'decoration',

        // mark: {
        //   data: new slate.Data(),
        //   object: "mark",
        //   type: "bold",
        // },
      });
      console.log('pushing decorated');
      decorations.push(dec);
    }

    //   start = end
    // }

    // return next();
    return [...others, ...decorations];
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

    console.log('hererererererere', this.state.value.toJS());

    const { doc } = this;
    const history = Automerge.getHistory(doc);

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
              // onSelect={this.handleSelect}
              renderMark={this.renderMark}
              decorateNode={this.decorateNode}
            />
          </ContentContainer>

          <SideBarContainer>
            <SidebarTitleContainer>sidebar title</SidebarTitleContainer>
            <SidebarContentContainer>
              {history.map(historyUnit => {
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
              })}
            </SidebarContentContainer>
          </SideBarContainer>
        </MainContainer>
      </AppContainer>
    );
  }
}

ReactDOM.render(<Main />, document.getElementById('app'));
