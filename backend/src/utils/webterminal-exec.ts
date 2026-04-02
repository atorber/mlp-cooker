import WebSocket from 'ws';

const te = new TextEncoder();

export interface RunWebShellOptions {
  /** 整体超时（毫秒） */
  timeoutMs?: number;
  /** 收到最后一段输出后等待多久再结束（多段下行时聚合） */
  settleMs?: number;
}

/**
 * 与前端 WebShellProxy 一致：连接 WebTerminal WebSocket，发送 resize、\x00 前缀的用户输入。
 * @see frontend/src/pages/WebShellProxy/WebShellProxyWithProps.tsx
 */
export async function runWebShellCommand(
  wsUrl: string,
  command: string,
  options?: RunWebShellOptions,
): Promise<string> {
  const timeoutMs = options?.timeoutMs ?? 20000;
  const settleMs = options?.settleMs ?? 800;

  return new Promise((resolve, reject) => {
    let done = false;
    const chunks: Buffer[] = [];
    let settleTimer: ReturnType<typeof setTimeout> | null = null;
    const ws = new WebSocket(wsUrl);

    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(hardTimer);
      if (settleTimer) clearTimeout(settleTimer);
      try {
        ws.close();
      } catch {
        /* ignore */
      }
      resolve(Buffer.concat(chunks).toString('utf-8'));
    };

    const bumpSettle = () => {
      if (settleTimer) clearTimeout(settleTimer);
      settleTimer = setTimeout(finish, settleMs);
    };

    const hardTimer = setTimeout(finish, timeoutMs);

    ws.on('open', () => {
      ws.send(te.encode('\x04' + JSON.stringify({ Height: 24, Width: 160 })));
      setTimeout(() => {
        ws.send(te.encode('\x00' + command + '\r'));
        bumpSettle();
      }, 300);
    });

    ws.on('message', (data: Buffer | ArrayBuffer | Buffer[]) => {
      if (Array.isArray(data)) {
        for (const d of data) {
          chunks.push(Buffer.isBuffer(d) ? d : Buffer.from(d));
        }
      } else {
        const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);
        chunks.push(buf);
      }
      bumpSettle();
    });

    ws.on('error', (e) => {
      if (!done) {
        done = true;
        clearTimeout(hardTimer);
        if (settleTimer) clearTimeout(settleTimer);
        try {
          ws.close();
        } catch {
          /* ignore */
        }
        reject(e);
      }
    });
  });
}

export function stripAnsi(text: string): string {
  return text.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
}
