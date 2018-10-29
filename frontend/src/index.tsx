import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { Editor } from 'slate-react';
import { Value } from 'slate';
import Automerge from 'automerge';
import uuid from 'uuid/v4';
import styled from 'styled-components';
import Websocket from './components/Websocket';
import { Search, Plus, Folder, File, ChevronLeft, Clock, MoreHorizontal } from 'react-feather';
import {
  automergeJsonToSlate,
  applySlateOperationsHelper,
  convertAutomergeToSlateOps,
} from './adapter/slate-automerge-bridge';
import './reset.css';
import './global.css';
import { theme, colors } from './theme';

const AppContainer = styled.div`
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

// #SECTION SIDEBAR [START]
const SideBarContainer = styled.div`
  display: flex;
  flex-direction: column;
  flex: 5;
  max-width: 24rem;
  padding-top: ${theme.sidebar.leftPadding};
  background-color: ${theme.sidebar.backgroundColor};
`;

const SidebarIdentitySection = styled.div`
  margin-left: ${theme.sidebar.leftPadding};
  margin-bottom: ${theme.sidebar.paddingBetweenSections};
  display: flex;
  flex-direction: row;
`;

const SidebarIdentityLogo = styled.div`
  height: 56px;
  width: 56px;
  border-radius: 8px;
  background-image: linear-gradient(
    56deg,
    #8cdcfb 0%,
    #6bbafd 25%,
    #53a0fe 35%,
    #93a1f0 49%,
    #8e8eef 61%,
    #5d5cee 100%
  );
`;

const SidebarIdentityUserInfoContainer = styled.div`
  display: flex;
  flex-direction: row;
  flex: 1;
  /* background-color: ${colors.lightBlue.normal}; */
`;

const SidebarSearchContainer = styled.div`
  margin-left: ${theme.sidebar.leftPadding};
  margin-bottom: ${theme.sidebar.paddingBetweenSections};
  display: flex;
  flex-direction: row;
  align-items: center;
`;

const SidebarSearchIcon = styled(Search)`
  height: 24px;
  width: 24px;
  color: ${colors.gray.dark};
  margin-right: ${theme.sidebar.spaceBetweenIconAndText};
`;
const SidebarSearchText = styled.span`
  color: ${colors.gray.dark};
`;

const SidebarAddFileLinkContainer = styled.div`
  margin-left: ${theme.sidebar.leftPadding};
  margin-bottom: ${theme.sidebar.paddingBetweenSections};
  display: flex;
  flex-grow: 0;
  flex-direction: row;
  align-items: center;
`;

//https://www.flaticon.com/free-icon/notepad_148972#term=write&page=1&position=23
// i really liek these icons

const SidebarAddFileLinkIcon = styled(Plus)`
  color: ${theme.sidebar.actionLinkColor};
  margin-right: ${theme.sidebar.spaceBetweenIconAndText};
`;
const SidebarAddFileLinkText = styled.span`
  color: ${theme.sidebar.actionLinkColor};
  line-height: 24px;
`;

const SidebarFolderLinkContainer = styled.div`
  margin-left: ${theme.sidebar.leftPadding};
  margin-bottom: 16px;
  display: flex;
  flex-direction: row;
  align-items: center;
`;

const SidebarFolderLinkIcon = styled(Folder)`
  color: ${theme.sidebar.actionLinkColor};
  margin-right: ${theme.sidebar.spaceBetweenIconAndText};
`;
const SidebarFolderLinkText = styled.span`
  color: ${theme.sidebar.folderLinkColor};
  font-weight: 600;
  line-height: 24px;
`;

const SidebarFileLinkContainer = styled.div`
  padding-left: calc(${theme.sidebar.leftPadding} + 2rem);
  padding-top: 8px;
  padding-bottom: 8px;
  display: flex;
  flex-direction: row;
  align-items: center;
  background-color: ${props => (props.selected ? colors.lightBlue.normal : 'inherit')};
`;

const SidebarFileLinkIcon = styled(File)`
  color: ${props => (props.selected ? '#fff' : theme.sidebar.fileColor)};

  margin-right: ${theme.sidebar.spaceBetweenIconAndText};
`;
const SidebarFileLinkText = styled.span`
  color: ${props => (props.selected ? '#fff' : theme.sidebar.folderLinkColor)};
  font-weight: ${props => (props.selected ? '600' : '500')};

  line-height: 24px;
`;

const SidebarContentContainer = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow-y: scroll;
`;
// #SECTION SIDEBAR [END]

// #SECTION EDITOR [START]
const EditorContainer = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  max-width: 64rem;
  flex-basis: 64rem;
`;

const EditorToolbar = styled.div`
  height: 6rem;
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #f5f5f5;
  margin-bottom: 2rem;
`;

const EditorToolbarLeftGroup = styled.div`
  display: flex;
  align-items: center;
`;

const EditorToolbarBackIcon = styled(ChevronLeft)`
  color: ${colors.black.light};
  margin-right: 0.5rem;
  opacity: 0.87;
`;
const EditorToolbarBackText = styled.span`
  color: ${colors.black.light};
`;

const EditorToolbarRightGroup = styled.div`
  display: flex;
  align-items: center;
`;

const EditorToolbarButtonContainer = styled.div`
  padding: 0.5rem 1rem;
  display: flex;
  justify-content: center;
  align-items: center;
  border: 1px solid ${colors.gray.light};
  border-radius: 8px;
  color: ${colors.gray.darker};
  margin: 0 0.25rem;
`;

const EditorToolbarHistoryButtonIcon = styled(Clock)`
  color: ${colors.gray.darker};
  height: 16px;
  width: 16px;
  padding-right: 8px;
`;

const EditorToolbarMoreButtonIcon = styled(MoreHorizontal)`
  color: ${colors.gray.darker};
  height: 16px;
  width: 16px;
  padding-left: 8px;
`;

const FakeTitle = styled.div`
  font-family: 'Playfair Display', serif;
  font-size: 3rem;
  color: ${theme.editor.primaryTextColor};
  font-weight: 700;
  line-height: 1.5;
  margin-bottom: 2rem;
  letter-spacing: 1px;
`;

const SlateEditorContainer = styled.div`
  overflow-y: scroll;
  line-height: 2;
  color: ${theme.editor.primaryTextColor};
  font-size: 20px;
  letter-spacing: 0.25;
`;

const HistoryContainer = styled.div``;

// #SECTION EDITOR [END]

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
        </MainContainer>
      </AppContainer>
    );
  }
}

ReactDOM.render(<Main />, document.getElementById('app'));
