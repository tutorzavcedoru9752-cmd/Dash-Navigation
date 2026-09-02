declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      remove: (widgetId: string) => void;
    };
  }
}

let scriptPromise: Promise<void> | null = null;

const loadTurnstile = () => {
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-dash-turnstile]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('安全验证加载失败，请重试。')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.dataset.dashTurnstile = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('安全验证加载失败，请重试。'));
    document.head.appendChild(script);
  });
  return scriptPromise;
};

export const getTurnstileToken = async (action: string): Promise<string | undefined> => {
  const sitekey = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim();
  if (!sitekey) return undefined;
  await loadTurnstile();
  if (!window.turnstile) throw new Error('安全验证暂不可用，请重试。');

  return new Promise<string>((resolve, reject) => {
    const container = document.createElement('div');
    container.className = 'fixed bottom-4 right-4 z-[200] min-h-[65px] min-w-[300px]';
    document.body.appendChild(container);
    let widgetId = '';
    let settled = false;
    const cleanup = () => {
      if (widgetId) window.turnstile?.remove(widgetId);
      container.remove();
    };
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      callback();
    };
    const timeout = window.setTimeout(() => finish(() => reject(new Error('安全验证超时，请重试。'))), 30000);
    widgetId = window.turnstile!.render(container, {
      sitekey,
      action,
      execution: 'render',
      appearance: 'interaction-only',
      callback: (token: string) => {
        window.clearTimeout(timeout);
        finish(() => resolve(token));
      },
      'error-callback': (errorCode: string) => {
        window.clearTimeout(timeout);
        finish(() => reject(new Error(`安全验证失败，请重试。${errorCode ? ` (${errorCode})` : ''}`)));
      },
      'expired-callback': () => {
        window.clearTimeout(timeout);
        finish(() => reject(new Error('安全验证已过期，请重试。')));
      },
      'timeout-callback': () => {
        window.clearTimeout(timeout);
        finish(() => reject(new Error('安全验证超时，请重试。')));
      },
      'unsupported-callback': () => {
        window.clearTimeout(timeout);
        finish(() => reject(new Error('当前浏览器不支持安全验证，请更换浏览器后重试。')));
      },
    });
  });
};
