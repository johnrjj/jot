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
import {
  EditorContainer,
  EditorToolbar,
  EditorToolbarLeftGroup,
  EditorToolbarBackIcon,
  EditorToolbarBackText,
  EditorToolbarRightGroup,
  EditorToolbarButtonContainer,
  EditorToolbarHistoryButtonIcon,
  EditorToolbarMoreButtonIcon,
  SlateEditorContainer,
  FakeTitle,
} from './components/Editor';
import {
  SideBarContainer,
  SidebarIdentitySection,
  SidebarIdentityLogo,
  SidebarIdentityUserInfoContainer,
  SidebarSearchContainer,
  SidebarSearchIcon,
  SidebarSearchText,
  SidebarAddFileLinkContainer,
  SidebarAddFileLinkIcon,
  SidebarAddFileLinkText,
  SidebarFolderLinkContainer,
  SidebarFolderLinkIcon,
  SidebarFolderLinkText,
  SidebarFileLinkContainer,
  SidebarFileLinkIcon,
  SidebarFileLinkText,
  SidebarContentContainer,
} from './components/Sidebar';
import './reset.css';
import './global.css';
import {
  HistoryContainer,
  HistoryHeaderContainer,
  HistoryHeaderText,
  HistoryCloseButton,
  HistoryItem,
} from './components/History';

const FullViewportAppContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
`;

const MainContainer = styled.div`
  display: flex;
  flex: 1;
`;

const ContentContainer = styled.div`
  display: flex;
  flex: 1;
  flex-direction: row;
  justify-content: center;
  z-index: 1;
  box-shadow: -4px 0 10px 4px rgba(126, 122, 122, 0.1);
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
    this.state = {
      loaded: false,
      error: null,
      value: null,
      isConnectedToDocument: false,
      clientId: uuid(),
      docId: null,
      clientUpdateCount: 0,
      serverUpdateCount: 0,
    };

    this.docSet = new Automerge.DocSet();

    this.websocket = React.createRef();
    this.editor = React.createRef();
  }

  async componentDidMount() {
    try {
      const res = await fetch('http://localhost:3001/api/v0/doc/1');
      if (res.status >= 400) {
        return this.setState({
          error: new Error(
            `api fetch for sample doc got a ${res.status} [${res.statusText}]\n is your backend on`
          ),
        });
      }
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
        docId: '1',
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
    } catch (error) {
      if (error.message === 'Failed to fetch') {
        return this.setState({
          error: 'Error fetching sample document. Is the API up? Make sure it is running.',
        });
      }
    }

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

  componentDidCatch(e, stack) {
    console.error(e, stack);
    this.setState({
      error: e,
    });
  }

  onChange = ({ value, operations, ...rest }) => {
    this.setState({ value });
    this.selection = value.selection.toJS();
    const selection = value.selection;
    const mark = {
      type: 'bold',
    };
    const range = selection;
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
    // console.log(' got a msg', msgJson);
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
    const { anchor, focus } = selection;
    this.selection = selection.toJS();
  };

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
      case 'bold':
        return (
          <span {...attributes} style={{ fontWeight: 'bold' }}>
            {children}
          </span>
        );
      default:
        return next();
    }
  };

  render() {
    const { loaded, error } = this.state;
    if (error) {
      return (
        <div>
          error <pre>{JSON.stringify(error)}</pre>
        </div>
      );
    }
    if (!loaded) {
      return <div>loading...</div>;
    }
    // const history = Automerge.getHistory(this.doc);
    return (
      <FullViewportAppContainer>
        <MainContainer>
          <SideBarContainer>
            <SidebarIdentitySection>
              <SidebarIdentityLogo />
              <SidebarIdentityUserInfoContainer />
            </SidebarIdentitySection>
            <SidebarSearchContainer>
              <SidebarSearchIcon />
              <SidebarSearchText>Search Files or Folders</SidebarSearchText>
            </SidebarSearchContainer>
            <SidebarAddFileLinkContainer>
              <SidebarAddFileLinkIcon />
              <SidebarAddFileLinkText>Add File or Folder</SidebarAddFileLinkText>
            </SidebarAddFileLinkContainer>
            <SidebarFolderLinkContainer>
              <SidebarFolderLinkIcon />
              <SidebarFolderLinkText>Sample Document Folder</SidebarFolderLinkText>
            </SidebarFolderLinkContainer>
            <SidebarFileLinkContainer>
              <SidebarFileLinkIcon />
              <SidebarFileLinkText>Quick notes</SidebarFileLinkText>
            </SidebarFileLinkContainer>
            <SidebarFileLinkContainer selected>
              <SidebarFileLinkIcon selected />
              <SidebarFileLinkText selected>Welcome to the Jot Editor</SidebarFileLinkText>
            </SidebarFileLinkContainer>
            <SidebarFileLinkContainer style={{ marginBottom: '16px' }}>
              <SidebarFileLinkIcon />
              <SidebarFileLinkText>Interesting facts about snakes</SidebarFileLinkText>
            </SidebarFileLinkContainer>
            <SidebarFolderLinkContainer>
              <SidebarFolderLinkIcon />
              <SidebarFolderLinkText>Favorite recipes</SidebarFolderLinkText>
            </SidebarFolderLinkContainer>
            <SidebarFolderLinkContainer>
              <SidebarFolderLinkIcon />
              <SidebarFolderLinkText>Book reviews</SidebarFolderLinkText>
            </SidebarFolderLinkContainer>
            <SidebarContentContainer />
          </SideBarContainer>

          <ContentContainer>
            <EditorContainer>
              <EditorToolbar>
                <EditorToolbarLeftGroup>
                  <EditorToolbarBackIcon />
                  <EditorToolbarBackText>Back</EditorToolbarBackText>
                </EditorToolbarLeftGroup>
                <EditorToolbarRightGroup>
                  <EditorToolbarButtonContainer>
                    <EditorToolbarHistoryButtonIcon />
                    <span>History</span>
                  </EditorToolbarButtonContainer>
                  <EditorToolbarButtonContainer>
                    <span>More</span>
                    <EditorToolbarMoreButtonIcon />
                  </EditorToolbarButtonContainer>
                </EditorToolbarRightGroup>
              </EditorToolbar>
              <SlateEditorContainer>
                <Websocket
                  ref={this.websocket}
                  debug={true}
                  url={'ws://localhost:3001/ws'}
                  onMessage={this.handleMessage}
                  onClose={() => console.log('websocket closed')}
                />
                <FakeTitle>Welcome to the Jot Editor</FakeTitle>
                <Editor
                  ref={this.editor}
                  placeholder="Go ahead and jot something down..."
                  autoCorrect={false}
                  autoFocus={true}
                  spellCheck={false}
                  value={this.state.value}
                  onChange={this.onChange}
                  // onSelect={this.handleSelect}
                  renderMark={this.renderMark as any}
                />
              </SlateEditorContainer>
            </EditorContainer>
          </ContentContainer>

          <HistoryContainer>
            <HistoryHeaderContainer>
              <HistoryHeaderText>History</HistoryHeaderText>
              <HistoryCloseButton />
            </HistoryHeaderContainer>
            <HistoryItem
              name={'John Johnson'}
              date={'Aug 10'}
              type={'created'}
              avatarSrc={'https://randomuser.me/api/portraits/men/1.jpg'}
            />
            <HistoryItem
              name={'Matt Ryan'}
              date={'Aug 10'}
              type={'edited'}
              avatarSrc={'https://randomuser.me/api/portraits/men/3.jpg'}
            />
            <HistoryItem
              name={'Samantha Smith'}
              date={'Aug 10'}
              type={'commented'}
              avatarSrc={'https://randomuser.me/api/portraits/women/2.jpg'}
            />
            <HistoryItem
              name={'Andrea Smith'}
              date={'Aug 10'}
              type={'edited'}
              avatarSrc={'https://randomuser.me/api/portraits/men/2.jpg'}
            />
          </HistoryContainer>
        </MainContainer>
      </FullViewportAppContainer>
    );
  }
}

ReactDOM.render(<Main />, document.getElementById('app'));
