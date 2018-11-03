export interface AutomergeConnection {
    open: () => void;
    close: () => void;
    receiveMsg: (msg: any) => void;
}