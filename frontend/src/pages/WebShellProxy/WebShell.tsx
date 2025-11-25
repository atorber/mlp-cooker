import {
  CSSProperties,
  useRef,
  forwardRef,
  useImperativeHandle,
  Ref,
  useCallback,
  useLayoutEffect,
} from 'react';
import {Terminal} from 'xterm';
import {FitAddon} from 'xterm-addon-fit';
// CanvasAddon 是可选的，暂时移除以避免初始化问题
// import {CanvasAddon} from 'xterm-addon-canvas';
import 'xterm/css/xterm.css';
import {css} from '@emotion/css';

interface WebShellProps {
  style?: CSSProperties;
  width?: number|string;
  height?: number|string;
  onChange: (data: string) => void;
}

function WebShell(props: WebShellProps, ref: Ref<unknown> | undefined) {
  const {onChange} = props;

  const isTerminalSetup = useRef(false);
  const exposeTerminalRef = useRef<any>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const xtermContainerRef = useRef<HTMLDivElement>(null);

  function setUpTerminal() {
      // 检查容器是否已准备好
      if (!xtermContainerRef.current) {
          console.error('Terminal container is not ready');
          return;
      }

      // 如果终端已经初始化，先销毁
      if (exposeTerminalRef.current) {
          try {
              exposeTerminalRef.current.dispose();
          } catch (e) {
              console.warn('Error disposing terminal:', e);
          }
      }

      // 创建新的 fitAddon 实例
      const fitAddon = new FitAddon();
      fitAddonRef.current = fitAddon;

      // 创建 Terminal 实例
      const terminal = new Terminal({
          cursorBlink: true, // 光标闪烁
          cursorStyle: 'block', // 光标样式 null | 'block' | 'underline' | 'bar'
          tabStopWidth: 4, // 制表符宽度
          theme: {
              background: '#1e1e1e',
              foreground: '#d4d4d4',
              cursor: '#d4d4d4',
          },
      });

      exposeTerminalRef.current = terminal;

      // 先加载 fitAddon，它可以在 open 之前加载
      terminal.loadAddon(fitAddon);

      // 设置 onData 处理器
      terminal.onData((data: string) => {
          onChange(data);
      });

      // Terminal.open() 必须在加载 addon 之后调用
      terminal.open(xtermContainerRef.current);

      // 延迟执行 fit 和 focus，确保 DOM 完全渲染
      requestAnimationFrame(() => {
          try {
              // 检查 terminal 和容器是否还存在
              if (!exposeTerminalRef.current || !xtermContainerRef.current) {
                  return;
              }

              // 执行 fit 和 focus
              if (fitAddonRef.current) {
                  fitAddonRef.current.fit();
              }
              if (exposeTerminalRef.current) {
                  exposeTerminalRef.current.focus();
              }
          } catch (e) {
              console.error('Error setting up terminal:', e);
              // 即使出错，也尝试执行基本的 fit 和 focus
              try {
                  if (fitAddonRef.current) {
                      fitAddonRef.current.fit();
                  }
                  if (exposeTerminalRef.current) {
                      exposeTerminalRef.current.focus();
                  }
              } catch (e2) {
                  console.warn('Error in terminal fallback setup:', e2);
              }
          }
      });
  }

  const disposeTerminal = useCallback(
      () => {
          if (exposeTerminalRef.current) {
              try {
                  exposeTerminalRef.current.dispose();
              } catch (e) {
                  console.warn('Error disposing terminal:', e);
              }
              exposeTerminalRef.current = null;
          }
          fitAddonRef.current = null;
      },
      []
  );

  const wirtelnTerminal = (data: string) => {
      exposeTerminalRef.current?.writeln(data);
  };

  const mutationObserver = useRef<MutationObserver|null>(null);

  useLayoutEffect(
      () => {
          if (isTerminalSetup.current) {
              return;
          }

          // 确保容器元素已准备好
          if (!xtermContainerRef.current) {
              return;
          }

          isTerminalSetup.current = true;
          setUpTerminal();

          // 第一次加载terminal时，需要注册高度
          const callback = () => {
              if (fitAddonRef.current) {
                  try {
                      fitAddonRef.current.fit();
                  } catch (e) {
                      console.warn('Error fitting terminal on mutation:', e);
                  }
              }
          };

          mutationObserver.current = new window.MutationObserver(callback);
          if (xtermContainerRef.current) {
              mutationObserver.current.observe(xtermContainerRef.current, {childList: true, subtree: false});
          }

          return () => {
              mutationObserver?.current?.disconnect();
              disposeTerminal();
          };
      },
      [disposeTerminal]
  );

  const resize = useCallback(
      (socketSendData: (data: Uint8Array) => void, sizeArgs?: {rows: number, cols: number}) => {
          if (fitAddonRef.current) {
              try {
                  fitAddonRef.current.fit();
              } catch (e) {
                  console.warn('Error fitting terminal on resize:', e);
              }
          }
          const size = sizeArgs ? sizeArgs : {
              rows: exposeTerminalRef.current?.rows || 0,
              cols: (exposeTerminalRef.current?.cols) || 0,
          };
          const sizeMsg = {Height: size.rows, Width: size.cols};
          // // 前后端通过4号通道来传递terminal size
          const textEncoder = new TextEncoder();
          socketSendData(textEncoder.encode('\x04' + JSON.stringify(sizeMsg)));
      },
      []
  );

  useImperativeHandle(ref, () => ({
      setup: setUpTerminal,
      dispose: disposeTerminal,
      writeln: wirtelnTerminal,
      fit: () => {
          if (fitAddonRef.current) {
              try {
                  fitAddonRef.current.fit();
              } catch (e) {
                  console.warn('Error fitting terminal:', e);
              }
          }
      },
      resize: resize,
      terminalRef: exposeTerminalRef.current,
  }));

  return (
      <div
          className={css`
              height: 100%;
              width: 100%;
          `}
          ref={xtermContainerRef}
      />
  );
}

export default forwardRef(WebShell);
