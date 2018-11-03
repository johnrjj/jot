import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { Editor } from 'slate-react';
import { Value } from 'slate';
import Automerge from 'automerge';
import uuid from 'uuid/v4';
import styled from 'styled-components';
import Websocket from './components/Websocket';
import { SlateAutomergeAdapter } from '@jot/shared';
import {
  WebSocketMessage,
  RemoteAgentSetSelectionPayload,
} from '@jot/shared/src/types/websocket-types';
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
import {
  HistoryContainer,
  HistoryHeaderContainer,
  HistoryHeaderText,
  HistoryCloseButton,
  HistoryItem,
} from './components/History';
import './reset.css';
import './global.css';
import { Toolbar, Button, Icon } from './components/Toolbar';
const {
  automergeJsonToSlate,
  applySlateOperationsHelper,
  convertAutomergeToSlateOps,
} = SlateAutomergeAdapter;

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

export default class App extends Component<any, any> {
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
      clientId: uuid(),
      docId: null,
      clientUpdateCount: 0,
      serverUpdateCount: 0,
      isConnectedToDocument: false,
      isSidebarOpen: false,
      isHistorySidebarOpen: false,
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
    const clientId = this.state.clientId;
    const message = clientId ? `Client ${clientId}` : 'Change log';

    if (rest.fromSetSelectionSelf) {
    }

    // console.log(operations.toJS());
    if (rest.fromRemote) {
      // needed for programatic updates...
      // without this we get into a loop.
      // the code after this calls the onchange handler again
      // i need to find a better way to do programatic updates(?)
      // this works for now
      return;
    }

    const selectionOps = operations.filter(op => op.type === 'set_selection').map(op =>
      op.merge({
        // OVERLOADING TARGET. Do this until i can PR slate
        target: `remote-agent-setselection-${this.state.clientId}`,
      })
    );

    if (selectionOps.count) {
      const selection = value.selection;

      const decoration = {
        anchor: selection.anchor,
        focus: selection.focus,
        mark: {
          type: `remote-agent-setselection-${this.state.clientId}`,
        },
      };
      const decorations = [decoration];

      this.editor &&
        this.editor.current &&
        this.editor.current.change(change => {
          return change.withoutSaving(() => {
            let c = change.setValue({ decorations });
            c = change.fromRemote = true;
            c = change.fromSetSelectionSelf = true;
            return c;
          });
        });

      if (this.state.isConnectedToDocument) {
        const msg: WebSocketMessage<RemoteAgentSetSelectionPayload> = {
          type: 'remote-agent-setselection',
          payload: {
            clientId: this.state.clientId,
            docId: this.state.docId,
            message: {
              ...decoration,
              mark: {
                type: `remote-agent-setselection-${this.state.clientId}`,
              },
            },
          },
        };
        const message = JSON.stringify(msg);
        this.websocket.current.sendMessage(message);
      } else {
        console.log('not connected to a doc, not sending cursor/selection to webseockt');
      }
    }

    // We need to apply local changes to the automerge document
    const docNew = Automerge.change(this.doc, message, doc => {
      // Use the Slate operations to modify the Automerge document.
      applySlateOperationsHelper(doc, operations);
    });

    // This also kicks off the Automerge.connection instance
    this.docSet.setDoc(this.state.docId, docNew);
    this.doc = docNew;
  };

  closeHistorySidebar = () => {
    this.setState({
      isHistorySidebarOpen: false,
    });
  };

  toggleHistorySidebar = () => {
    this.setState(prevState => ({ isHistorySidebarOpen: !prevState.isHistorySidebarOpen }));
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
    } else if (msgJson.type === 'remote-agent-setselection-from-server') {
      const { payload } = msgJson;
      const clientId = payload.clientId;

      if (clientId === this.state.clientId) {
        console.log('received our own message from the server, skipping');
        return;
      }
      let decoration = payload.message;
      const decorations = [decoration];
      this.editor &&
        this.editor.current &&
        this.editor.current.change(change => {
          return change.withoutSaving(() => {
            let c = change.setValue({ decorations });
            c = change.fromRemote = true;
            c = change.fromSetSelectionSelf = true;
            return c;
          });
        });
    } else {
      console.log('dont know msg type', msgJson, msg);
    }
  };

  renderNode = (props, next) => {
    const { attributes, children, node } = props;

    switch (node.type) {
      case 'block-quote':
        return <blockquote {...attributes}>{children}</blockquote>;
      case 'bulleted-list':
        return <ul {...attributes}>{children}</ul>;
      case 'heading-one':
        return <h1 {...attributes}>{children}</h1>;
      case 'heading-two':
        return <h2 {...attributes}>{children}</h2>;
      case 'list-item':
        return <li {...attributes}>{children}</li>;
      case 'numbered-list':
        return <ol {...attributes}>{children}</ol>;
      default:
        return next();
    }
  };

  renderMark = (props, next) => {
    const { children, mark, attributes } = props;

    // if (mark.type === `remote-agent-setselection-${this.state.clientId}`) {
    //   return (
    //     <span {...attributes} style={{ fontWeight: 'bold' }}>
    //       {children}
    //     </span>
    //   );
    // }

    if (
      mark.type.startsWith('remote-agent-setselection-') &&
      mark.type !== `remote-agent-setselection-${this.state.clientId}`
    ) {
      return (
        <span
          {...attributes}
          style={{
            position: 'relative',
            backgroundColor: 'rgba(138,208,222,0.3)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              width: '100px',
              height: '10px',
              top: '-20px',
              left: 0,
              fontSize: '12px',
              userSelect: 'none',
            }}
          >
            <span
              style={{
                position: 'absolute',
                width: '5px',
                height: '10px',
                top: '0',
                left: '0',
                backgroundColor: 'green',
              }}
            />
          </div>
          <span
            style={{
              opacity: 0.4,
              height: '100%',
              position: 'absolute',
              width: '100%',
              top: 0,
              left: 0,
            }}
          />
          {children}
        </span>
      );
    }
    switch (mark.type) {
      case 'bold':
        return <strong {...attributes}>{children}</strong>;
      case 'code':
        return <code {...attributes}>{children}</code>;
      case 'italic':
        return <em {...attributes}>{children}</em>;
      case 'underlined':
      case 'underline':
        return <u {...attributes}>{children}</u>;
      default:
        return next();
    }
  };

  render() {
    const { loaded, error, isHistorySidebarOpen } = this.state;
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
                  <EditorToolbarButtonContainer onClick={this.toggleHistorySidebar}>
                    <EditorToolbarHistoryButtonIcon />
                    <span>History</span>
                  </EditorToolbarButtonContainer>
                  <EditorToolbarButtonContainer>
                    <span>More</span>
                    <EditorToolbarMoreButtonIcon />
                  </EditorToolbarButtonContainer>
                </EditorToolbarRightGroup>
              </EditorToolbar>
              <Toolbar>
                {this.renderMarkButton('bold', 'format_bold')}
                {this.renderMarkButton('italic', 'format_italic')}
                {this.renderMarkButton('underlined', 'format_underlined')}
                {this.renderMarkButton('code', 'code')}
                {/* {this.renderBlockButton('heading-one', 'looks_one')}
          {this.renderBlockButton('heading-two', 'looks_two')}
          {this.renderBlockButton('block-quote', 'format_quote')}
          {this.renderBlockButton('numbered-list', 'format_list_numbered')}
          {this.renderBlockButton('bulleted-list', 'format_list_bulleted')} */}
              </Toolbar>
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
                  renderNode={this.renderNode}
                  renderMark={this.renderMark as any}
                />
              </SlateEditorContainer>
            </EditorContainer>
          </ContentContainer>

          {isHistorySidebarOpen && (
            <HistoryContainer>
              <HistoryHeaderContainer>
                <HistoryHeaderText>History</HistoryHeaderText>
                <HistoryCloseButton onClick={this.closeHistorySidebar} />
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
          )}
        </MainContainer>
      </FullViewportAppContainer>
    );
  }

  hasMark = (type: string): boolean => {
    const { value } = this.state;
    return value.activeMarks.some(mark => mark.type == type);
  };

  renderBlockButton(): any {
    throw new Error('Method not implemented.');
  }

  onClickMark = (event: Event, type: string) => {
    event.preventDefault();
    console.log(this.editor.current);

    this.editor.current.command('toggleMark', type);
    console.log('added mark');
  };

  renderMarkButton = (type: string, icon: string) => {
    const isActive = this.hasMark(type);
    return (
      <Button active={isActive} onMouseDown={event => this.onClickMark(event, type)}>
        <Icon>{icon}</Icon>
      </Button>
    );
  };
}
