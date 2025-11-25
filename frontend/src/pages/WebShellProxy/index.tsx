import {useCallback, useEffect, useLayoutEffect, useRef} from 'react';
import {returnLine} from './utils';
import WebShellComponent from './WebShell';
import {useQuery} from './hooks';


/**
 * 将文本编码为webShell编码格式
 *
 * @param text 需要编码的文本
 * @returns 编码后的Uint8Array
 */
function webShellEncode(text: string) {
    const textEncoder = window.TextEncoder ? new TextEncoder() : null;
    if (textEncoder) {
        return textEncoder.encode(text);
    }
    const utf8 = encodeURIComponent(text);
    const textArray = utf8.split('').map(item => item.charCodeAt(0));
    return new Uint8Array(textArray);
}

const GENERAL_LINK = 1;
const PENDING_LINK = 0;
const SUCCESS_LINK = -1;

export default function WebShellProxy() {
    const pingTimer = useRef<number>(0);
    const socket = useRef<WebSocket | null>(null);
    const webshellRef = useRef<any>(null);
    const linkStatus = useRef(GENERAL_LINK);
    const {url, jobId, podName, region = 'cd', test} = useQuery();
    const schema = window.location.protocol === 'https:' ? 'wss' : 'ws';

    // 如果提供了 url 参数，直接使用；否则使用默认的代理 URL
    let socketUrl: string;
    if (url) {
        socketUrl = decodeURIComponent(url);
    } else {
        socketUrl = `${schema}://cce-webshell-bj.baidubce.com${window.location.pathname}${window.location.search ? `?${window.location.search}` : ''}`;
        if (test === '1') {
            // 测试需要连不同地域，用之前的代理
            socketUrl = `${schema}://cce-webshell-${region}.bce.baidu.com${window.location.pathname}${window.location.search ? `?${window.location.search}` : ''}`;
        }
    }

    const closeSocket = useCallback( // 断开websocket
        (code?: number, reason?: any) => {
            clearInterval(pingTimer.current);
            socket.current?.close(code, reason);
        },
        []
    );

    const safeSend = (data: string | Uint8Array) => {
        if (socket.current && socket.current.readyState === WebSocket.OPEN) {
            socket.current.send(data);
        } else {
            console.error('WebSocket还没有建立连接. 当前状态: ' + socket.current?.readyState);
        }
    };

    const resize = () => {
        webshellRef.current?.resize(safeSend);
    };

    /**
     * 心跳包
     */
    const ping = () => {
        safeSend(webShellEncode('\x00\x00\x00'));
    };

    const setUpSocket = useCallback( // 获取token后连接websocket
        () => {
            if (!socketUrl) {
                webshellRef.current?.writeln('错误: 未提供终端连接地址');
                return;
            }

            linkStatus.current = PENDING_LINK;
            try {
                socket.current = new WebSocket(socketUrl);
                socket.current.binaryType = 'arraybuffer';
            } catch (e) {
                webshellRef.current?.writeln(`连接失败: ${e}`);
            }
            if (socket.current) {
                socket.current.onopen = () => {
                    webshellRef.current?.writeln('连接成功');
                    linkStatus.current = SUCCESS_LINK;
                    pingTimer.current = window.setInterval(() => {
                        ping();
                    }, 30000);
                    resize();
                };
                socket.current.onmessage = e => {
                    if (typeof e.data === 'string') {
                        webshellRef.current?.terminalRef?.write(returnLine(e.data.toString()));
                    } else if (typeof e.data === 'object' && e.data instanceof ArrayBuffer) {
                        const decoder = new TextDecoder('utf-8');
                        const text = decoder.decode(new Uint8Array(e.data));
                        webshellRef.current?.terminalRef?.write(returnLine(text.toString()));
                    }
                };
                socket.current.onclose = () => {
                    clearInterval(pingTimer.current);
                    linkStatus.current = GENERAL_LINK;
                    webshellRef.current?.writeln('连接已关闭');
                };
                socket.current.onerror = ({code}: any) => {
                    closeSocket(code);
                    linkStatus.current = GENERAL_LINK;
                    webshellRef.current?.writeln(`连接失败: ${code || '未知错误'}`);
                };
            }
        },
        [socketUrl, resize, ping, closeSocket]
    );

    const sendMessageToWebsock = useCallback( // 发送消息
        (data: string) => {
            safeSend(webShellEncode(`\x00${data}`));
        },
        []
    );

    const connectWebSSH = useCallback(
        () => {
            if (linkStatus.current === PENDING_LINK) { // 当前 正在连接中
                return;
            }
            if (linkStatus.current === SUCCESS_LINK) { // 当前 连接成功 先关掉 再连接
                closeSocket();
                setUpSocket();
                return;
            }
            if (linkStatus.current === GENERAL_LINK) { // 当前 未连接 去连接
                setUpSocket();
            }
        },
        [linkStatus, closeSocket, setUpSocket]
    );

    useEffect(
        () => {
            if (!socket.current) {
                return;
            }
            window.addEventListener('resize', resize, false);
            return () => {
                window.removeEventListener('resize', resize);
            };
        },
        [socket.current]
    );

    useLayoutEffect(
        () => {
            connectWebSSH();
            return () => {
                closeSocket();
            };
        },
        []
    );

    return (
        <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column' }}>
            {jobId && podName && (
                <div style={{ padding: '8px 16px', background: '#f0f0f0', borderBottom: '1px solid #d9d9d9' }}>
                    <strong>任务ID:</strong> {jobId} | <strong>Pod:</strong> {podName}
                </div>
            )}
            <div style={{ flex: 1, overflow: 'hidden' }}>
                <WebShellComponent
                    onChange={sendMessageToWebsock}
                    ref={webshellRef}
                />
            </div>
        </div>
    );
}
