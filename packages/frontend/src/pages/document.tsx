import React, { Component } from 'react';
import { Editor, RenderAttributes, RenderMarkProps, SlateType } from 'slate-react';
import { Value, Selection, Range, Mark, Decoration, Point } from 'slate';
import Automerge from 'automerge';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Router, Link } from '@reach/router';
import { isEqual, debounce } from 'lodash';
import { faFont, faQuoteRight, faBold, faItalic, faCode, faUnderline } from '@fortawesome/free-solid-svg-icons';
import {
  SlateAutomergeAdapter,
  WebSocketClientMessageFactory,
  generateItemFromHash,
  ADJECTIVES,
  ANIMALS,
  COLORS,
} from '@jot/common';
import {
  WebsocketServerMessages,
  UpdateClientSelectionMessage,
  JoinDocumentSuccessMessage,
  AutomergeUpdateFromServerMessage,
  KeepaliveFromServerMessage,
  RemoteAgentCursorUpdateFromServerMessage,
  UpdateDocumentActiveUserListWSMessage,
} from '@jot/common/dist/websockets/websocket-actions';
import Websocket from '../components/Websocket';
import ToolTip from '../components/Tooltip';
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
} from '../components/Editor';
import { Sidebar } from '../components/Sidebar';
import {
  HistoryContainer,
  HistoryHeaderContainer,
  HistoryHeaderText,
  HistoryCloseButton,
  HistoryItem,
} from '../components/History';
import { Toolbar, Button } from '../components/Toolbar';
import {
  Cursor,
  SpanRelativeAnchor,
  AbsoluteFullWidth,
  RemoteCursorRangeMark,
  SpanRelativeAnchorWithBackgroundColor,
  CursorMarker,
} from '../components/Cursor';
import '../reset.css';
import '../global.css';
import invariant from 'invariant';
const { automergeJsonToSlate, applySlateOperationsHelper, convertAutomergeToSlateOps } = SlateAutomergeAdapter;

const FontIcon = props => <FontAwesomeIcon icon={faFont} {...props} />;
const QuoteIcon = props => <FontAwesomeIcon icon={faQuoteRight} {...props} />;
const BoldIcon = props => <FontAwesomeIcon icon={faBold} {...props} />;
const ItalicIcon = props => <FontAwesomeIcon icon={faItalic} {...props} />;
const CodeIcon = props => <FontAwesomeIcon icon={faCode} {...props} />;
const UnderlineIcon = props => <FontAwesomeIcon icon={faUnderline} {...props} />;

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

interface DocEditProps {
  wsEndpoint: string;
  apiEndpoint: string;
  path: string;
  clientId: string;
  docId?: string; // needs to be optional otherwise typescript complains w/ reach router typings
}

interface DocEditState {
  loading: boolean;
  value: Value;
  docId: string;
  isSyncedWithServer: boolean;
  clientUpdateCount: number;
  serverUpdateCount: number;
  isConnectedToDocument: boolean;
  isSidebarOpen: boolean;
  isHistorySidebarOpen: boolean;
  activeUserIds: string[];
  error?: Error | string;
  showTooltip: boolean;
}

export interface DecorationJS {
  anchor: any;
  focus: any;
  mark: {
    type: string;
  };
}

const DEFAULT_NODE = 'paragraph';

export default class DocApp extends Component<DocEditProps, DocEditState> {
  doc: any;
  docSet: any;
  connection: any;
  selection: any;
  websocket: React.RefObject<any>;
  editor: React.RefObject<any>;
  remoteCursorTimers: Map<string, Function>;
  activeRemoteCursorSet: Map<string, DecorationJS>;

  constructor(props: DocEditProps) {
    super(props);
    this.state = {
      loading: true,
      error: null,
      value: null,
      docId: null,
      clientUpdateCount: 0,
      serverUpdateCount: 0,
      isSyncedWithServer: false,
      isConnectedToDocument: false,
      isSidebarOpen: false,
      isHistorySidebarOpen: false,
      activeUserIds: [],
      showTooltip: false,
    };

    this.docSet = new Automerge.DocSet();

    this.websocket = React.createRef();
    this.editor = React.createRef<any>();
    this.activeRemoteCursorSet = new Map();
    this.remoteCursorTimers = new Map();
  }

  handleUndo = () => {
    const docBeforeUndo = this.doc;
    if (!Automerge.canUndo(docBeforeUndo)) {
      console.warn('cant undo, nothing to undo, block this in ui');
      return;
    }
    const docAfterUndo = Automerge.undo(docBeforeUndo, 'undo');
    const diffOps = Automerge.diff(docBeforeUndo, docAfterUndo);
    const _changes = Automerge.getChanges(docBeforeUndo, docAfterUndo);
    console.log('automerge.diff (ops)', diffOps, JSON.stringify(diffOps));

    const slateOps = convertAutomergeToSlateOps(diffOps);
    console.log('undo:slateOps', slateOps, JSON.stringify(slateOps));
    this.editor.current.change(change => {
      const appliedChanges = change.applyOperations(slateOps);
      // data key for onchange handler to know its from a remote source
      appliedChanges.fromRemote = true;
      return appliedChanges;
    });
    // This also kicks off the Automerge.connection instance
    this.docSet.setDoc(this.state.docId, docAfterUndo);
    this.doc = docAfterUndo;
  };

  handleRedo = () => {
    const docBeforeRedo = this.doc;
    if (!Automerge.canRedo(docBeforeRedo)) {
      console.warn('cant redo, nothing to undo, block this in ui');
      return;
    }
    const docAfterRedo = Automerge.redo(docBeforeRedo, 'undo');
    const diffOps = Automerge.diff(docBeforeRedo, docAfterRedo);
    const _changes = Automerge.getChanges(docBeforeRedo, docAfterRedo);
    console.log('automerge.diff (ops)', diffOps, JSON.stringify(diffOps));

    const slateOps = convertAutomergeToSlateOps(diffOps);
    console.log('undo:slateOps', slateOps, JSON.stringify(slateOps));
    this.editor.current.change(change => {
      const appliedChanges = change.applyOperations(slateOps);
      // data key for onchange handler to know its from a remote source
      appliedChanges.fromRemote = true;
      return appliedChanges;
    });
    // This also kicks off the Automerge.connection instance
    this.docSet.setDoc(this.state.docId, docAfterRedo);
    this.doc = docAfterRedo;
  };

  async componentDidMount() {
    const docIdToRequest = this.props.docId;
    try {
      const res = await fetch(`${this.props.apiEndpoint}/doc/${docIdToRequest}`);
      // 404 doc does not exist
      if (res.status === 404) {
        return this.setState({ error: 'document does not exist' });
      }
      // general error
      if (res.status >= 400) {
        return this.setState({
          error: `api fetch for sample doc got a ${res.status} [${res.statusText}]\nis your backend on?`,
        });
      }
      const json = await res.json();
      const { serializedDocument } = json;
      const docId = docIdToRequest;
      const crdt = Automerge.load(serializedDocument);
      this.doc = crdt;
      const initialValueJSON: any = automergeJsonToSlate(this.doc);
      const initialSlateValue = Value.fromJSON(initialValueJSON);
      this.docSet.setDoc(docId, this.doc);

      this.setState({
        value: initialSlateValue,
        docId: docId,
      });
    } catch (error) {
      console.log(error.message);
      if (error.message === 'Failed to fetch') {
        return this.setState({
          error: 'Error fetching sample document. Is the API up? Make sure it is running.',
        });
      }
    }

    setTimeout(
      () =>
        this.websocket.current.sendJsonMessage(
          WebSocketClientMessageFactory.createJoinDocumentRequestMessage({
            docId: this.state.docId,
            clientId: this.props.clientId,
          }),
        ),
      1000,
    );
  }

  componentDidUpdate(prevProps: DocEditProps, prevState: DocEditState) {
    if (!prevState.isConnectedToDocument && this.state.isConnectedToDocument) {
      this.connection = new Automerge.Connection(this.docSet, data => {
        const message = WebSocketClientMessageFactory.createAutomergeUpdateToServerMessage({
          clientId: this.props.clientId,
          docId: this.state.docId,
          message: data,
        });
        this.websocket.current.sendJsonMessage(message);
      });
      this.connection.open();
    }
  }

  componentDidCatch(e, stack) {
    console.error(e, stack);
    this.setState({
      error: e,
    });
  }

  onChange = ({ value, operations, ...rest }) => {
    console.log('onChange', 'operations:', operations.toJS());
    this.setState({ value });
    this.selection = value.selection.toJS();
    const clientId = this.props.clientId;
    const automergeCommitMessage = clientId ? `Client ${clientId} change` : 'Unknown clientId change';

    if (rest.fromSetSelectionSelf) {
    }

    if (rest.fromRemote) {
      // needed for programatic updates...
      // without this we get into a loop.
      // the code after this calls the onchange handler again
      // i need to find a better way to do programatic updates(?)
      // this works for now
      return;
    }

    const selectionOps = operations.filter(op => op.type === 'set_selection');

    if (selectionOps.count) {
      const selection: Selection = value.selection;
      const agentId = this.props.clientId;
      if (!agentId) {
        console.warn('Trying to send a selection range to the server but agentId not set');
      }

      if (agentId && this.state.isConnectedToDocument) {
        const decoration = createRemoteCursorDecoration(selection, agentId);
        const msg: UpdateClientSelectionMessage = WebSocketClientMessageFactory.createUpdateClientSelectionMessage({
          clientId: this.props.clientId,
          docId: this.state.docId,
          decoration,
        });
        // needs to send _after_ an automerge update of insert text or something
        setTimeout(() => this.websocket.current.sendJsonMessage(msg), 0);
      } else {
        console.log('not connected to a doc, not sending cursor/selection to webseockt');
      }
    }

    // We need to apply local changes to the automerge document
    const docNew = Automerge.change(this.doc, automergeCommitMessage, doc => {
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
    this.setState(prevState => ({
      isHistorySidebarOpen: !prevState.isHistorySidebarOpen,
    }));
  };

  handleJoinDocumentSuccessMessage(_msg: JoinDocumentSuccessMessage): void {
    this.setState({
      loading: false,
      isConnectedToDocument: true,
    });
  }

  handleKeepAlive(_msg: KeepaliveFromServerMessage): void {}

  handleRemoteAgentSelectionFromServerMessage(msg: RemoteAgentCursorUpdateFromServerMessage): void {
    const { payload } = msg;
    const clientId = payload.clientId;

    if (!clientId) {
      console.warn('no clientId found in remote agent selection');
      return;
    }

    if (clientId === this.props.clientId) {
      console.log('received our own message from the server, skipping');
      return;
    }

    if (this.remoteCursorTimers.has(clientId)) {
      console.log('has');
      const debounceFn = this.remoteCursorTimers.get(clientId);
      debounceFn();
    } else {
      console.log('doesnt have');
      this.setState({ showTooltip: true });
      const fnToCall = () => this.remoteCursorTimers.delete(clientId) && this.setState({ showTooltip: false });
      const debounceFn = debounce(fnToCall, 1500);
      this.remoteCursorTimers.set(clientId, debounceFn);
    }

    const remoteSelectionDecorationNotNormalized = payload.message;

    // Save to active remote cursor set.
    this.activeRemoteCursorSet.set(payload.message.mark.type, remoteSelectionDecorationNotNormalized);

    if (
      !isEqual(remoteSelectionDecorationNotNormalized.anchor.path, remoteSelectionDecorationNotNormalized.focus.path)
    ) {
      console.error(
        'multiple block selection range: not implemented yet.\nDecorations dont work across blocks with custom logic. remote range wont look right',
      );
      const selectionRange = Range.create(remoteSelectionDecorationNotNormalized);
      const remoteSelection = Selection.create(remoteSelectionDecorationNotNormalized);
      let normalizedRemoteSelectionDecoration: any = this.editor.current.value.document.resolveSelection(
        remoteSelectionDecorationNotNormalized,
      );
      // console.log('multiple node selection remote selection:', remoteSelection.toJS());

      const editor = this.editor.current as Editor;
      const document = editor.value.document;
      // console.log(selectionRange.toJS());

      const blocks = document.getBlocksAtRange(selectionRange);
      let startBlock = document.getClosestBlock(remoteSelection.anchor.path);
      let endBlock = document.getClosestBlock(remoteSelection.focus.path);
      console.log('new data', blocks.toJS(), startBlock.toJS(), endBlock.toJS());
      // const startInline = document.getClosestInline(start.key)
      // const endInline = document.getClosestInline(end.key)
      // let startChild = startBlock.getFurthestAncestor(start.key)
      // let endChild = endBlock.getFurthestAncestor(end.key)

      console.log('multiple node normalized remote selection', normalizedRemoteSelectionDecoration.toJS());
    }

    // Need to do some hacks to work around a decoration being 'zero' width.
    const remoteSelection = Selection.create(remoteSelectionDecorationNotNormalized);
    let normalizedRemoteSelectionDecoration: any = remoteSelectionDecorationNotNormalized;
    // if its collapsed, the selection iss techncially zero width (offset would be zero, for example)
    // slate doesn't support that, so what we need to do is extend it by one so slate accepts it.
    // ie; if the anchor was 0 and focus was 0, we'd increment the focus to 1.
    // then we render a mark at the left of 0 showing the remote cursor.
    // special case: if its at the end of a block, we go back by 1.
    // we can figure this out by normalizing our guess (incrementing focus by 1) and if it
    // gets normalized back, we can assume it does not exist, thus we are at the end of the line,
    // and instead, lets decrement our anchor by 1, and show the cursor to the right instead.
    if (remoteSelection.isCollapsed) {
      let finalizedRemoteNormalizedSelection: Selection = remoteSelection;

      const editor = this.editor.current;
      // const node = editor.value.document.getNode(remoteSelection.focus.path);
      const moveForward = remoteSelection.moveFocusForward(1) as Selection;
      const normalizedMoveForward: Selection = editor.value.document.resolveSelection(moveForward);
      finalizedRemoteNormalizedSelection = normalizedMoveForward;

      let isCollapsedAtEnd = false;
      if (normalizedMoveForward.anchor.offset === normalizedMoveForward.focus.offset) {
        isCollapsedAtEnd = true;
        const moveBackward = remoteSelection.moveAnchorBackward(1) as Selection;
        const normalizedMoveBackward: Selection = editor.value.document.resolveSelection(moveBackward);
        finalizedRemoteNormalizedSelection = normalizedMoveBackward;
      }

      const { mark } = remoteSelectionDecorationNotNormalized;
      const markHydatedWithData = {
        ...mark,
        data: {
          isCollapsed: true,
          isCollapsedAtEnd: isCollapsedAtEnd,
          userId: payload.clientId,
        },
      };
      normalizedRemoteSelectionDecoration = { mark: markHydatedWithData, ...finalizedRemoteNormalizedSelection.toJS() };
    } else {
      // not collapsed
      const { mark } = remoteSelectionDecorationNotNormalized;
      const markHydatedWithData = {
        ...mark,
        data: {
          isCollapsed: false,
          userId: payload.clientId,
        },
      };
      normalizedRemoteSelectionDecoration = { ...normalizedRemoteSelectionDecoration, mark: markHydatedWithData };
    }
    const previousDecorations: Array<Decoration> = this.state.value.decorations.toJS();
    const previousDecorationsFiltered = previousDecorations.filter(
      x => x.mark.type !== remoteSelectionDecorationNotNormalized.mark.type,
    );
    let decorations = [...previousDecorationsFiltered, normalizedRemoteSelectionDecoration];

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
  }

  handleServerUpdateMessage = (msg: AutomergeUpdateFromServerMessage): void => {
    const docNew = this.connection.receiveMsg(msg.payload);
    if (msg.payload.changes) {
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
    if (!this.state.isSyncedWithServer) {
      this.setState({
        isSyncedWithServer: true,
      });
    }
  };

  handleUpdateActiveUserListForDoc = (msg: UpdateDocumentActiveUserListWSMessage) => {
    const { type, payload } = msg;
    const { activeIds } = payload;
    this.setState({
      activeUserIds: activeIds,
    });
  };

  handleMessage = msg => {
    const msgJson: WebsocketServerMessages = JSON.parse(msg);
    switch (msgJson.type) {
      case 'join-document-success':
        const joinDocumentSuccessMessage = msgJson;
        this.handleJoinDocumentSuccessMessage(joinDocumentSuccessMessage);
        break;
      case 'keepalive':
        const keepaliveMessage = msgJson;
        this.handleKeepAlive(keepaliveMessage);
        break;
      case 'remote-agent-setselection-from-server':
        const remoteAgentSetSelectionFromServer = msgJson;
        this.handleRemoteAgentSelectionFromServerMessage(remoteAgentSetSelectionFromServer);
        break;
      case 'server-update':
        const serverUpdateMessage = msgJson;
        this.handleServerUpdateMessage(serverUpdateMessage);
        break;
      case 'update-active-user-list':
        const updateActiveUserListForDocMessage = msgJson;
        this.handleUpdateActiveUserListForDoc(updateActiveUserListForDocMessage);
        break;
      default:
        console.warn('error detecting type of websocket message', msgJson);
        break;
    }
  };

  // Placeholder when ready for gutter stuff
  renderEditor = (_props: RenderAttributes, next) => {
    const children = next();
    return <>{children}</>;
  };

  hasSeenRemoteCursorMarkBefore = new Set();
  renderNode = (props, next) => {
    const { attributes, children, node, editor, ...rest } = props;
    console.log('renderNode', props);

    // Clear per node, only keep memory while rendering an individual node
    // This is used to talk to renderMark because I couldn't find a good way otherwise.
    // renderNode will run first, then all the marks inside the node will be rendered via renderMark
    this.hasSeenRemoteCursorMarkBefore.clear();

    const nodeKey = node.key;
    const nodePath = node.path;
    const previosNode = editor.value.document.getPreviousNode(nodePath);

    switch (node.type) {
      case 'block-quote':
        return <blockquote {...attributes}>{children}</blockquote>;
      case 'bulleted-list':
        return <ul {...attributes}>{children}</ul>;
      case 'heading-one':
        return (
          <h1 style={{ fontSize: '30px' }} {...attributes}>
            {children}
          </h1>
        );
      case 'heading-two':
        return (
          <h2 style={{ fontSize: '24px' }} {...attributes}>
            {children}
          </h2>
        );
      case 'list-item':
        return <li {...attributes}>{children}</li>;
      case 'numbered-list':
        return <ol {...attributes}>{children}</ol>;
      default:
        return next();
    }
  };

  decorateNode = (node, next?: Function): void => {
    // in the next version the params are (node, editor, next)
    next();
  };

  renderMark = (props: RenderMarkProps, next: Function) => {
    // Note: You must spread the props.attributes onto the top-level DOM node you use to render the mark.
    console.log('renderMark', props);
    const { children, mark, marks, text, attributes, node, ...rest } = props;

    if (mark.type === `remote-agent-setselection-${this.props.clientId}`) {
      return (
        <span {...attributes} data-self-selection={true}>
          {children}
        </span>
      );
    }
    if (
      mark.type.startsWith('remote-agent-setselection-') &&
      mark.type !== `remote-agent-setselection-${this.props.clientId}`
    ) {
      let hasSeenMarkBefore = this.hasSeenRemoteCursorMarkBefore.has(mark.type);
      if (!hasSeenMarkBefore) {
        this.hasSeenRemoteCursorMarkBefore.add(mark.type);
      }
      const isCollapsed = mark.data.get('isCollapsed');
      const isCollapsedAtEnd = mark.data.get('isCollapsedAtEnd');

      const remoteSelectionMarkId = mark.type;
      let userId: string | null | undefined = mark.data.get('userId');
      if (!userId) {
        console.error(`remote selection data userId not set...`, userId, mark.data.toJS());
        userId = 'need_to_fix_this_if_it_happens';
      }
      const adjective = generateItemFromHash(userId, ADJECTIVES);
      const animal = generateItemFromHash(userId, ANIMALS);
      const highlightColor = generateItemFromHash(userId, COLORS);

      console.log(`User ${userId} assigned named alias '${adjective} ${animal}' with color: ${highlightColor}`);
      const remoteCursorKey = `${remoteSelectionMarkId}-anchor-element`;
      const remoteCursorIdAlias = `${adjective} ${animal}`;

      if (isCollapsed) {
        return (
          <SpanRelativeAnchor {...attributes}>
            <AbsoluteFullWidth>
              <RemoteCursorRangeMark
                markerColor={highlightColor}
                isCollapsed={isCollapsed}
                isCollapsedAtEnd={isCollapsedAtEnd}
              />
            </AbsoluteFullWidth>
            {children}
          </SpanRelativeAnchor>
        );
      } else {
        const show = this.remoteCursorTimers.has(userId);
        console.log('yeeeeeeet1', show);
        return (
          <SpanRelativeAnchorWithBackgroundColor markerColor={highlightColor} {...attributes}>
            <AbsoluteFullWidth unselectable="on" style={{ userSelect: 'none' }}>
              {!hasSeenMarkBefore && this.state.showTooltip && (
                <>
                  <ToolTip
                    tooltipContainerStyles={{ backgroundColor: highlightColor }}
                    active={this.state.showTooltip}
                    position="top"
                    group={remoteCursorKey}
                    align="left"
                    parent={`#${remoteCursorKey}`}
                    autoHide={true}
                  >
                    <div>
                      <p style={{ textTransform: 'lowercase', color: '#ffffff' }}>{remoteCursorIdAlias}</p>
                    </div>
                  </ToolTip>
                  <CursorMarker
                    id={remoteCursorKey}
                    markerColor={highlightColor}
                    isCollapsed={isCollapsed}
                    isCollapsedAtEnd={isCollapsedAtEnd}
                  />
                </>
              )}
            </AbsoluteFullWidth>
            {children}
          </SpanRelativeAnchorWithBackgroundColor>
        );
      }
    }

    switch (mark.type) {
      case 'bold':
        return (
          <strong style={{ fontWeight: 700 }} {...attributes}>
            {children}
          </strong>
        );
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
    const {
      loading,
      error,
      isHistorySidebarOpen,
      isConnectedToDocument,
      isSyncedWithServer,
      activeUserIds,
    } = this.state;
    if (error) {
      return (
        <div>
          error <pre>{JSON.stringify(error)}</pre>
        </div>
      );
    }

    const isLoading = loading || !isConnectedToDocument || !isSyncedWithServer;

    return (
      <FullViewportAppContainer>
        <MainContainer>
          {/* <Sidebar /> */}
          <ContentContainer>
            {/* <button onClick={this.handleUndo}>undo</button> */}
            {/* <button onClick={this.handleRedo}>redo</button> */}
            <EditorContainer>
              <Websocket
                ref={this.websocket}
                debug={true}
                url={this.props.wsEndpoint}
                onMessage={this.handleMessage}
                onClose={() => console.warn('websocket closed')}
              />
              <EditorToolbar>
                <EditorToolbarLeftGroup>
                  <EditorToolbarBackIcon />
                  <EditorToolbarBackText>Back</EditorToolbarBackText>
                </EditorToolbarLeftGroup>
                <EditorToolbarRightGroup>
                  {activeUserIds.length && <div>{activeUserIds.length}</div>}
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
              {isLoading && <div>loading...</div>}
              {!isLoading && (
                <Toolbar>
                  {this.renderMarkButton('bold', 'bold_icon')}
                  {this.renderMarkButton('italic', 'italic_icon')}
                  {this.renderMarkButton('underlined', 'underline_icon')}
                  {this.renderMarkButton('code', 'code_icon')}
                  {this.renderBlockButton('heading-one', 'h1_icon')}
                  {this.renderBlockButton('heading-two', 'h2_icon')}
                  {this.renderBlockButton('block-quote', 'quote_icon')}
                  {/* {this.renderBlockButton(
                        'numbered-list',
                        'format_list_numbered',
                      )}
                      {this.renderBlockButton(
                        'bulleted-list',
                        'format_list_bulleted',
                      )} */}
                </Toolbar>
              )}
              {!isLoading && (
                <SlateEditorContainer>
                  {/* <FakeTitle>Welcome to the Jot Editor</FakeTitle> */}
                  <Editor
                    decorateNode={this.decorateNode}
                    ref={this.editor}
                    placeholder="Go ahead and jot something down..."
                    autoCorrect={false}
                    autoFocus={true}
                    spellCheck={false}
                    value={this.state.value}
                    onChange={this.onChange}
                    renderEditor={this.renderEditor}
                    renderNode={this.renderNode}
                    renderMark={this.renderMark as any}
                  />
                </SlateEditorContainer>
              )}
              {this.state.activeUserIds.map(x => (
                <div key={x}>{x}</div>
              ))}
            </EditorContainer>
          </ContentContainer>
          {/* {isHistorySidebarOpen && (
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
          )} */}
        </MainContainer>
      </FullViewportAppContainer>
    );
  }

  hasMark = (type: string): boolean => {
    const { value } = this.state;
    return value.activeMarks.some(mark => mark.type == type);
  };

  // Check if the any of the currently selected blocks are of `type`.
  hasBlock = (type: string): boolean => {
    const { value } = this.state;
    return value.blocks.some(node => node.type == type);
  };

  //When a block button is clicked, toggle the block type.
  onClickBlock = (event: Event, type: string) => {
    event.preventDefault();

    const editor = this.editor.current;
    const { value } = editor;

    editor.change(change => {
      const { value } = change;
      const { document } = value;

      // Handle everything but list buttons.
      if (type != 'bulleted-list' && type != 'numbered-list') {
        const isActive = this.hasBlock(type);
        const isList = this.hasBlock('list-item');

        if (isList) {
          change
            .setBlocks(isActive ? DEFAULT_NODE : type)
            .unwrapBlock('bulleted-list')
            .unwrapBlock('numbered-list');
        } else {
          change.setBlocks(isActive ? DEFAULT_NODE : type);
        }
      } else {
        // Handle the extra wrapping required for list buttons.
        const isList = this.hasBlock('list-item');
        const isType = value.blocks.some(block => {
          return !!document.getClosest(block.key, parent => parent.type == type);
        });

        if (isList && isType) {
          change
            .setBlocks(DEFAULT_NODE)
            .unwrapBlock('bulleted-list')
            .unwrapBlock('numbered-list');
        } else if (isList) {
          change.unwrapBlock(type == 'bulleted-list' ? 'numbered-list' : 'bulleted-list').wrapBlock(type);
        } else {
          change.setBlocks('list-item').wrapBlock(type);
        }
      }
    });
  };

  renderBlockButton = (type, icon) => {
    let isActive = this.hasBlock(type);

    if (['numbered-list', 'bulleted-list'].includes(type)) {
      const { value } = this.state;
      const parent = value.document.getParent(value.blocks.first().key);
      isActive = this.hasBlock('list-item') && parent && (parent as any).type === type;
    }

    return (
      <Button active={isActive} onMouseDown={event => this.onClickBlock(event, type)}>
        {icon === 'h1_icon' ? <FontIcon size="lg" /> : icon === 'h2_icon' ? <FontIcon /> : <QuoteIcon />}
      </Button>
    );
  };

  onClickMark = (event: Event, type: string) => {
    event.preventDefault();
    this.editor.current.command('toggleMark', type);
  };

  renderMarkButton = (type: string, icon: string) => {
    const isActive = this.hasMark(type);
    return (
      <Button active={isActive} onMouseDown={event => this.onClickMark(event, type)}>
        {icon === 'bold_icon' ? (
          <BoldIcon />
        ) : icon === 'underline_icon' ? (
          <UnderlineIcon />
        ) : icon === 'code_icon' ? (
          <CodeIcon />
        ) : (
          <ItalicIcon />
        )}
      </Button>
    );
  };
}

const createRemoteCursorDecoration = (selection: Selection, agentId: string) => {
  invariant(!!agentId, 'selection for remote cursor range missing');
  invariant(!!agentId, 'remote cursor agentId missing');
  const decoration = {
    anchor: selection.anchor,
    focus: selection.focus,
    mark: {
      type: `remote-agent-setselection-${agentId}`,
    },
  };
  return decoration;
};
