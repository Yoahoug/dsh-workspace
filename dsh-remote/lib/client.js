/**
 * dsh-remote — browser half.
 *
 * Contributes one sidebar entry and the panel it opens: the current listening
 * state, the switch-on/off control, the copyable remote link, the access log,
 * and the token rotation that invalidates every issued link at once.
 *
 * The panel never talks to the proxy port. Every call goes to the local DSH web
 * server (same origin as this page) at `/api/dsh-remote/*`, so the remote side
 * of the tunnel has no way to reach the control surface even if its token leaks.
 */
window.__ModuleLoader__.load({
  id: 'dsh-remote',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })
    let react_jsx_runtime = require('react/jsx-runtime')
    let react = require('react')

    // #region src/client/locales.ts
    const NS = 'dsh-remote'

    /** Simplified Chinese dictionary; the key set is the source of truth. */
    const zh = {
      title: '远程操控',
      subtitle: '内网穿透 · 令牌鉴权 · 访问记录',
      enable: '启用远程入口',
      disable: '关闭远程入口',
      entry: '远程入口',
      enabledOn: '运行中',
      enabledOff: '已停止',
      listen: '监听',
      upstream: '本机 DSH',
      since: '启动于',
      requests: '请求',
      upgrades: '长连接',
      rejected: '已拒绝',
      link: '远程链接',
      linkHint: '这条链接本身就是凭据。拿到它的人可以完全操作这台机器上的 DSH。',
      copy: '复制链接',
      copied: '已复制',
      open: '本机打开',
      rotate: '轮换令牌',
      rotateHint: '轮换后，所有旧链接和已登录的远端会话立即失效。',
      tokenStale: '令牌已在别处被轮换，正在获取当前链接…',
      rotateConfirm: '确认轮换',
      rotating: '轮换中',
      access: '访问记录',
      accessEmpty: '还没有远端访问过。',
      accessAddress: '来源',
      accessTime: '时间',
      accessAgent: '客户端',
      refresh: '刷新',
      refreshing: '刷新中',
      loading: '正在读取远程入口状态…',
      failed: '操作失败',
      noLink: '先启用远程入口，或在设置里填好公网地址。',
      needPublicUrl: '还没有公网地址。请在本插件设置里填 publicUrl（穿透给你的 https 地址），或者复制下面的本机地址测试。',
      localLink: '本机地址（仅本机可用）',
      tls: 'TLS',
      on: '开',
      off: '关',
      dismiss: '知道了',
      warningTitle: '这是整台机器的远程控制入口',
      warningBody: '启用后，任何持有链接的人都能在这台机器上执行命令、读写文件。请只通过 HTTPS 隧道暴露，并且不要转发到不受信任的地方。',
      restartHint: '修改监听地址或端口后需要重新启用才会生效。',
      settingsHint: '端口、公网地址、Cookie 时长在「设置 → 插件 → dsh-remote」里配置。',
    }

    /** English dictionary, checked complete against the zh key set. */
    const en = {
      title: 'Remote Access',
      subtitle: 'Tunnel · token auth · access log',
      enable: 'Enable remote entry',
      entry: 'Remote entry',
      disable: 'Stop remote entry',
      enabledOn: 'Running',
      enabledOff: 'Stopped',
      listen: 'Listening',
      upstream: 'Local DSH',
      since: 'Since',
      requests: 'Requests',
      upgrades: 'Sockets',
      rejected: 'Rejected',
      link: 'Remote link',
      linkHint: 'The link is the credential. Whoever holds it can fully operate DSH on this machine.',
      copy: 'Copy link',
      copied: 'Copied',
      open: 'Open here',
      rotate: 'Rotate token',
      rotateHint: 'Rotating invalidates every issued link and every signed-in remote session immediately.',
      tokenStale: 'The token was rotated elsewhere; fetching the current link…',
      rotateConfirm: 'Confirm rotation',
      rotating: 'Rotating',
      access: 'Access log',
      accessEmpty: 'No remote access yet.',
      accessAddress: 'Source',
      accessTime: 'Time',
      accessAgent: 'Client',
      refresh: 'Refresh',
      refreshing: 'Refreshing',
      loading: 'Reading the remote entry state…',
      failed: 'Operation failed',
      noLink: 'Enable the remote entry first, or set a public URL in settings.',
      needPublicUrl: 'No public URL yet. Set publicUrl in this plugin’s settings (the https address your tunnel gives you), or copy the local address below to test.',
      localLink: 'Local address (this machine only)',
      tls: 'TLS',
      on: 'on',
      off: 'off',
      dismiss: 'Got it',
      warningTitle: 'This is remote control of the whole machine',
      warningBody: 'Once enabled, anyone holding the link can run commands and read or write files here. Expose it only through an HTTPS tunnel you trust.',
      restartHint: 'After changing the listen address or port, disable and enable again.',
      settingsHint: 'Port, public URL and cookie lifetime live in Settings → Plugins → dsh-remote.',
    }
    // #endregion

    // #region src/client/api.ts
    const API = '/api/dsh-remote'

    /**
     * One panel API call on the local DSH origin.
     * @param path - suffix under `/api/dsh-remote`.
     * @param init - fetch init.
     * @returns parsed JSON body.
     */
    async function request(path, init) {
      const response = await fetch(`${API}${path}`, {
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        ...init,
      })
      const body = await response.json().catch(() => ({ ok: false, message: `HTTP ${response.status}` }))
      if (!response.ok && body?.ok !== false) return { ok: false, message: `HTTP ${response.status}` }
      return body
    }
    // #endregion

    // #region src/client/styles.ts
    const css = `
.dsh-remote { --dsh-remote-accent: #4d6bfe; --dsh-remote-ok: #2ea043; --dsh-remote-bad: #cf4747; --dsh-remote-warn: #bf8700;
  --dsh-remote-border: color-mix(in srgb, currentColor 13%, transparent);
  --dsh-remote-border-strong: color-mix(in srgb, currentColor 22%, transparent);
  --dsh-remote-fill: color-mix(in srgb, currentColor 5%, transparent);
  --dsh-remote-fill-strong: color-mix(in srgb, currentColor 10%, transparent);
  display: flex; flex-direction: column; gap: 16px;
  padding: 22px clamp(16px, 3vw, 32px) 40px;
  height: 100%; overflow-y: auto; box-sizing: border-box;
  /* Children must keep their natural height: a fixed-height scroll container that
     also shrinks its children clips the bottom of every card. */
  flex: none;
}
.dsh-remote > * { flex: 0 0 auto; }
.dsh-remote-head { display: flex; align-items: flex-start; gap: 12px; flex-wrap: wrap; }
.dsh-remote-titles { flex: 1 1 auto; min-width: 0; }
.dsh-remote h2 { margin: 0; font-size: 19px; font-weight: 620; letter-spacing: -.01em; }
.dsh-remote-sub { margin: 3px 0 0; font-size: 12.5px; opacity: .55; }
.dsh-remote-actions { display: flex; gap: 8px; flex-wrap: wrap; }

.dsr-btn {
  display: inline-flex; align-items: center; gap: 6px;
  font: inherit; font-size: 12.5px; font-weight: 500;
  padding: 6px 13px; border-radius: 8px; cursor: pointer;
  border: 1px solid var(--dsh-remote-border-strong);
  background: transparent; color: inherit;
  white-space: nowrap;
  transition: background .13s ease, border-color .13s ease, opacity .13s ease;
}
.dsr-btn:hover:not(:disabled) { background: var(--dsh-remote-fill-strong); }
.dsr-btn:disabled { opacity: .42; cursor: default; }
.dsr-btn.primary { background: var(--dsh-remote-accent); border-color: transparent; color: #fff; }
.dsr-btn.primary:hover:not(:disabled) { filter: brightness(1.07); }
.dsr-btn.danger:hover:not(:disabled) { background: rgba(207,71,71,.1); color: var(--dsh-remote-bad); border-color: rgba(207,71,71,.35); }
.dsr-btn.sm { padding: 4px 10px; font-size: 12px; border-radius: 6px; }

.dsr-spin {
  width: 11px; height: 11px; border-radius: 50%;
  border: 1.6px solid currentColor; border-top-color: transparent;
  animation: dsr-rot .7s linear infinite; flex: none;
}
@keyframes dsr-rot { to { transform: rotate(360deg); } }

.dsr-card { border: 1px solid var(--dsh-remote-border); border-radius: 12px; overflow: hidden; }
.dsr-cardHead { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-bottom: 1px solid var(--dsh-remote-border); background: var(--dsh-remote-fill); }
.dsr-cardHead h3 { margin: 0; font-size: 13px; font-weight: 620; }
.dsr-spacer { flex: 1 1 auto; }
.dsr-cardBody { padding: 14px 16px; display: flex; flex-direction: column; gap: 12px; }

.dsr-pill { display: inline-flex; align-items: center; gap: 5px; padding: 2px 9px; border-radius: 999px; font-size: 11.5px; font-weight: 500; white-space: nowrap; border: 1px solid transparent; }
.dsr-pill .dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; flex: none; }
.dsr-pill.on { color: var(--dsh-remote-ok); background: rgba(46,160,67,.11); border-color: rgba(46,160,67,.3); }
.dsr-pill.off { color: inherit; opacity: .5; border-color: var(--dsh-remote-border); }
.dsr-pill.bad { color: var(--dsh-remote-bad); background: rgba(207,71,71,.11); border-color: rgba(207,71,71,.3); }

.dsr-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; }
.dsr-stat { border: 1px solid var(--dsh-remote-border); border-radius: 9px; padding: 9px 11px; min-width: 0; }
.dsr-statLabel { font-size: 10.5px; letter-spacing: .02em; text-transform: uppercase; opacity: .45; white-space: nowrap; }
.dsr-statValue { margin-top: 3px; font-size: 14px; font-weight: 600; font-variant-numeric: tabular-nums; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsr-statValue.mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12.5px; font-weight: 500; }
/* The upstream is a full origin. Keep it on one line with an ellipsis and a
   title tooltip: a mid-string break reads like corruption ("http://127.0.0.1:582" / "68"). */
.dsr-statValue.wrap { font-size: 12px; letter-spacing: -.01em; }

.dsr-linkRow { display: flex; gap: 8px; align-items: stretch; flex-wrap: wrap; }
.dsr-link {
  flex: 1 1 260px; min-width: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px;
  padding: 8px 11px; border-radius: 8px;
  border: 1px solid var(--dsh-remote-border-strong);
  background: var(--dsh-remote-fill); color: inherit;
  /* Long links must stay copyable by eye: wrap instead of clipping the token. */
  overflow-wrap: anywhere; word-break: break-all; white-space: normal;
  line-height: 1.5;
}
.dsr-note { font-size: 12px; opacity: .55; line-height: 1.55; }
.dsr-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }

.dsr-msg { display: flex; gap: 9px; align-items: flex-start; padding: 10px 13px; border-radius: 9px; font-size: 12.5px; border: 1px solid transparent; }
.dsr-msgText { flex: 1 1 auto; min-width: 0; word-break: break-word; }
.dsr-msg.error { color: var(--dsh-remote-bad); background: rgba(207,71,71,.08); border-color: rgba(207,71,71,.25); }
.dsr-msg.ok { color: var(--dsh-remote-ok); background: rgba(46,160,67,.07); border-color: rgba(46,160,67,.22); }
.dsr-msg.warn { color: var(--dsh-remote-warn); background: rgba(191,135,0,.08); border-color: rgba(191,135,0,.25); }

.dsr-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
.dsr-table th { text-align: left; font-size: 10.5px; font-weight: 600; letter-spacing: .02em; text-transform: uppercase; opacity: .45; padding: 0 10px 8px; white-space: nowrap; }
.dsr-table th:first-child, .dsr-table td:first-child { padding-left: 0; }
.dsr-table th:last-child, .dsr-table td:last-child { padding-right: 0; }
.dsr-table td { padding: 7px 10px; border-top: 1px solid var(--dsh-remote-border); font-size: 12px; vertical-align: top; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dsr-table col.c-time { width: 132px; }
.dsr-table col.c-addr { width: 150px; }
.dsr-table col.c-agent { width: 210px; }
.dsr-table td.dsr-agent { color: inherit; opacity: .8; }
.dsr-table tbody tr:hover { background: var(--dsh-remote-fill); }

.dsr-empty { padding: 20px 4px; text-align: center; font-size: 12.5px; opacity: .45; }
.dsr-skeleton { display: flex; flex-direction: column; gap: 10px; }
.dsr-skelRow { height: 20px; border-radius: 6px; background: linear-gradient(90deg, var(--dsh-remote-fill) 25%, var(--dsh-remote-fill-strong) 37%, var(--dsh-remote-fill) 63%); background-size: 400% 100%; animation: dsr-shimmer 1.3s ease infinite; }
@keyframes dsr-shimmer { 0% { background-position: 100% 50%; } 100% { background-position: 0 50%; } }

@media (max-width: 720px) {
  .dsh-remote { padding: 16px 14px 32px; }
  .dsr-table th:nth-child(3), .dsr-table td:nth-child(3) { display: none; }
}
`

    /** Inject the panel stylesheet once per document. */
    function ensureStyles() {
      if (typeof document === 'undefined') return
      if (document.getElementById('dsh-remote-style') !== null) return
      const element = document.createElement('style')
      element.id = 'dsh-remote-style'
      element.textContent = css
      document.head.appendChild(element)
    }
    // #endregion

    // #region src/client/icons.tsx
    const { jsx, jsxs, Fragment } = react_jsx_runtime

    /** Shared svg wrapper so every icon keeps identical stroke settings. */
    function Svg({ size = 14, children }) {
      return jsx('svg', {
        width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
        stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round',
        'aria-hidden': 'true', children,
      })
    }
    const PowerIcon = () => jsxs(Svg, { children: [
      jsx('path', { d: 'M12 3v9' }),
      jsx('path', { d: 'M6.4 6.4a8 8 0 1 0 11.2 0' }),
    ] })
    const CopyIcon = () => jsxs(Svg, { children: [
      jsx('rect', { x: 9, y: 9, width: 11, height: 11, rx: 2 }),
      jsx('path', { d: 'M5 15V5a2 2 0 0 1 2-2h10' }),
    ] })
    const RotateIcon = () => jsxs(Svg, { children: [
      jsx('path', { d: 'M21 12a9 9 0 1 1-2.64-6.36' }),
      jsx('path', { d: 'M21 3v6h-6' }),
    ] })
    const RefreshIcon = () => jsxs(Svg, { children: [
      jsx('path', { d: 'M3 12a9 9 0 0 1 15.36-6.36' }),
      jsx('path', { d: 'M3 21v-6h6' }),
      jsx('path', { d: 'M21 12a9 9 0 0 1-15.36 6.36' }),
      jsx('path', { d: 'M21 3v6h-6' }),
    ] })
    const AlertIcon = () => jsxs(Svg, { children: [
      jsx('path', { d: 'M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z' }),
      jsx('path', { d: 'M12 9v4' }),
      jsx('path', { d: 'M12 17h.01' }),
    ] })
    const CheckIcon = () => jsx(Svg, { children: jsx('path', { d: 'M20 6 9 17l-5-5' }) })
    const LinkIcon = () => jsxs(Svg, { children: [
      jsx('path', { d: 'M10 13a5 5 0 0 0 7.1 0l3-3a5 5 0 0 0-7.1-7.1L11.8 4' }),
      jsx('path', { d: 'M14 11a5 5 0 0 0-7.1 0l-3 3a5 5 0 0 0 7.1 7.1L12.2 20' }),
    ] })
    // #endregion

    // #region src/client/panel.tsx
    const { useState, useEffect, useCallback, useRef } = react

    /**
     * Format an epoch instant as a short local date-time.
     * @param value - epoch milliseconds.
     * @returns display text.
     */
    function formatTime(value) {
      if (typeof value !== 'number' || value <= 0) return '—'
      const date = new Date(value)
      const pad = (n) => String(n).padStart(2, '0')
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
    }

    /**
     * Reduce a User-Agent to something readable in a table cell: a full UA string
     * is ~120 characters and would be truncated to noise in every row.
     * @param value - raw User-Agent header.
     * @returns short label such as `Chrome · Windows` or `node`.
     */
    function describeAgent(value) {
      const text = String(value ?? '').trim()
      if (text === '') return '—'
      if (/^node$/iu.test(text) || /node-fetch|undici/iu.test(text)) return 'node'
      const browser = /Edg\//u.test(text) ? 'Edge'
        : /HeadlessChrome\//u.test(text) ? 'Headless Chrome'
          : /Chrome\//u.test(text) ? 'Chrome'
            : /Firefox\//u.test(text) ? 'Firefox'
              : /Safari\//u.test(text) ? 'Safari'
                : 'Browser'
      const system = /Windows/iu.test(text) ? 'Windows'
        : /Android/iu.test(text) ? 'Android'
          : /iPhone|iPad|iPod/iu.test(text) ? 'iOS'
            : /Mac OS X|Macintosh/iu.test(text) ? 'macOS'
              : /Linux/iu.test(text) ? 'Linux'
                : '未知系统'
      return `${browser} · ${system}`
    }

    /** Copy text, falling back to a hidden textarea on insecure origins. */
    async function copyText(value) {
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(value)
          return true
        } catch {
          /* fall through */
        }
      }
      if (typeof document.execCommand !== 'function') return false
      const area = document.createElement('textarea')
      area.value = value
      area.setAttribute('readonly', '')
      area.style.position = 'fixed'
      area.style.left = '-9999px'
      document.body.appendChild(area)
      area.select()
      try {
        return document.execCommand('copy')
      } finally {
        area.remove()
      }
    }

    /**
     * The panel body.
     * @param props - the bound translator.
     * @returns the panel element.
     */
    function RemotePanel({ t }) {
      const [status, setStatus] = useState(null)
      const [access, setAccess] = useState([])
      const [loading, setLoading] = useState(true)
      const [busy, setBusy] = useState(null)
      const [error, setError] = useState(null)
      const [notice, setNotice] = useState(null)
      const [link, setLink] = useState(null)
      const [pendingRotate, setPendingRotate] = useState(false)
      const timer = useRef(undefined)

      const load = useCallback(async (quiet) => {
        if (!quiet) setLoading(true)
        try {
          const body = await request('/status')
          if (!body.ok) {
            setError(body.message ?? t('failed'))
            setStatus(null)
          } else {
            setStatus(body)
            setError(null)
          }
          const log = await request('/access')
          if (log.ok) setAccess(log.access ?? [])
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : String(cause))
        } finally {
          setLoading(false)
        }
      }, [t])

      const makeLink = useCallback(async (origin) => {
        const body = await request('/link', { method: 'POST', body: JSON.stringify(origin === undefined ? {} : { origin }) })
        if (body.ok) setLink(body)
        return body
      }, [])

      useEffect(() => { void load(false) }, [load])

      // Refresh the running counters while the panel is open; the query is cheap
      // and never leaves this machine.
      useEffect(() => {
        timer.current = setInterval(() => { void load(true) }, 5000)
        return () => clearInterval(timer.current)
      }, [load])

      // Refetch the link whenever anything that goes into it changes. `rotatedAt`
      // matters as much as the address: a rotation creates a new token and kills
      // the old one, so a panel still showing the previous token hands out a link
      // that answers 401 while the status line happily says "running".
      useEffect(() => {
        if (status === null) {
          setLink(null)
          return
        }
        void makeLink()
      }, [status?.publicRoot, status?.publicRootError, status?.host, status?.port, status?.rotatedAt])

      const toggle = async (next) => {
        setBusy('toggle')
        setError(null)
        try {
          // The switch is a settings write, so the value survives a restart and
          // the host reconciles the listener from the same event.
          const body = await request('/enabled', { method: 'POST', body: JSON.stringify({ enabled: next }) })
          if (!body.ok) setError(body.message ?? t('failed'))
          else if (body.restartHint === true) setNotice(t('restartHint'))
          await load(false)
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : String(cause))
        } finally {
          setBusy(null)
        }
      }

      const rotate = async () => {
        if (pendingRotate !== true) {
          setPendingRotate(true)
          return
        }
        setPendingRotate(false)
        setBusy('rotate')
        setError(null)
        try {
          const body = await request('/rotate', { method: 'POST' })
          if (!body.ok) setError(body.message ?? t('failed'))
          else {
            setNotice(t('rotateHint'))
            await makeLink()
            await load(true)
          }
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : String(cause))
        } finally {
          setBusy(null)
        }
      }

      const doCopy = async () => {
        const value = link?.link ?? ''
        if (value === '') return
        const ok = await copyText(value)
        setNotice(ok ? t('copied') : value)
      }

      const running = status?.listening === true && status?.enabled === true
      const hasPublic = typeof status?.publicRoot === 'string' && status.publicRoot !== ''
      // A link fetched before the current token generation is a dead credential:
      // it answers 401. Never show or copy it as if it worked.
      const linkStale = link !== null
        && typeof link.rotatedAt === 'number'
        && typeof status?.rotatedAt === 'number'
        && link.rotatedAt !== status.rotatedAt

      // A stale link means the panel is showing a credential that will fail. Say
      // so plainly and fetch the current one, rather than waiting for a click
      // that only produces a 401 on the far end.
      useEffect(() => {
        if (!linkStale) return
        setNotice(t('tokenStale'))
        void makeLink()
      }, [linkStale, makeLink, t])

      if (loading && status === null) {
        return jsx('div', {
          className: 'dsh-remote',
          children: jsx('div', { className: 'dsr-skeleton', children: [
            jsx('div', { className: 'dsr-skelRow', style: { height: 26 } }),
            jsx('div', { className: 'dsr-skelRow' }),
            jsx('div', { className: 'dsr-skelRow' }),
          ] }),
        })
      }

      const currentLink = linkStale ? null : link

      return jsx('div', {
        className: 'dsh-remote',
        children: [
          jsxs('div', { className: 'dsh-remote-head', children: [
            jsxs('div', { className: 'dsh-remote-titles', children: [
              jsx('h2', { children: t('title') }),
              jsx('p', { className: 'dsh-remote-sub', children: t('subtitle') }),
            ] }),
            jsxs('div', { className: 'dsh-remote-actions', children: [
              jsx('button', {
                className: 'dsr-btn sm',
                disabled: busy !== null,
                onClick: () => { void load(false) },
                children: jsx('span', { children: t('refresh') }),
              }),
              jsx('button', {
                className: running ? 'dsr-btn danger' : 'dsr-btn primary',
                disabled: busy !== null,
                onClick: () => { void toggle(!running) },
                children: [
                  busy === 'toggle' ? jsx('span', { className: 'dsr-spin' }) : jsx(PowerIcon, {}),
                  jsx('span', { children: running ? t('disable') : t('enable') }),
                ],
              }),
            ] }),
          ] }),

          error !== null ? jsx('div', { className: 'dsr-msg error', children: [
            jsx('span', { children: jsx(AlertIcon, {}) }),
            jsx('span', { className: 'dsr-msgText', children: error }),
          ] }) : null,

          notice !== null ? jsx('div', { className: 'dsr-msg ok', children: [
            jsx('span', { children: jsx(CheckIcon, {}) }),
            jsx('span', { className: 'dsr-msgText', children: notice }),
            jsx('button', { className: 'dsr-btn sm', onClick: () => setNotice(null), children: t('dismiss') }),
          ] }) : null,

          jsxs('div', { className: 'dsr-card', children: [
            jsxs('div', { className: 'dsr-cardHead', children: [
              jsx('h3', { children: t('entry') }),
              jsx('span', { className: 'dsr-spacer' }),
              jsxs('span', {
                className: running ? 'dsr-pill on' : status?.lastError ? 'dsr-pill bad' : 'dsr-pill off',
                children: [jsx('span', { className: 'dot' }), running ? t('enabledOn') : t('enabledOff')],
              }),
            ] }),
            jsxs('div', { className: 'dsr-cardBody', children: [
              status?.lastError
                ? jsx('div', { className: 'dsr-msg warn', children: [
                    jsx('span', { children: jsx(AlertIcon, {}) }),
                    jsx('span', { className: 'dsr-msgText mono', children: status.lastError }),
                  ] })
                : null,
              jsxs('div', { className: 'dsr-grid', children: [
                jsxs('div', { className: 'dsr-stat', children: [
                  jsx('div', { className: 'dsr-statLabel', children: t('listen') }),
                  jsx('div', {
                    className: 'dsr-statValue mono',
                    title: `${status?.protocol ?? ''}//${status?.host ?? ''}:${status?.port ?? ''}`,
                    children: `${status?.host ?? '—'}:${status?.port ?? '—'}`,
                  }),
                ] }),
                jsxs('div', { className: 'dsr-stat', children: [
                  jsx('div', { className: 'dsr-statLabel', children: t('upstream') }),
                  jsx('div', { className: 'dsr-statValue mono wrap', title: status?.upstream ?? '', children: status?.upstream ?? '—' }),
                ] }),
                jsxs('div', { className: 'dsr-stat', children: [
                  jsx('div', { className: 'dsr-statLabel', children: t('requests') }),
                  jsx('div', { className: 'dsr-statValue', children: status?.stats?.requests ?? 0 }),
                ] }),
                jsxs('div', { className: 'dsr-stat', children: [
                  jsx('div', { className: 'dsr-statLabel', children: t('upgrades') }),
                  jsx('div', { className: 'dsr-statValue', children: status?.stats?.upgrades ?? 0 }),
                ] }),
                jsxs('div', { className: 'dsr-stat', children: [
                  jsx('div', { className: 'dsr-statLabel', children: t('rejected') }),
                  jsx('div', { className: 'dsr-statValue', children: status?.stats?.rejected ?? 0 }),
                ] }),
                jsxs('div', { className: 'dsr-stat', children: [
                  jsx('div', { className: 'dsr-statLabel', children: t('since') }),
                  jsx('div', { className: 'dsr-statValue', children: formatTime(status?.stats?.since) }),
                ] }),
              ] }),
            ] }),
          ] }),

          jsxs('div', { className: 'dsr-card', children: [
            jsxs('div', { className: 'dsr-cardHead', children: [
              jsx('h3', { children: t('link') }),
              jsx('span', { className: 'dsr-spacer' }),
              link?.local ? null : jsx(LinkIcon, {}),
            ] }),
            jsxs('div', { className: 'dsr-cardBody', children: [
              jsx('div', { className: 'dsr-note', children: t('linkHint') }),
              currentLink === null || currentLink.link === undefined || currentLink.link === ''
                ? jsx('div', { className: 'dsr-note', children: hasPublic ? t('noLink') : t('needPublicUrl') })
                : jsxs(Fragment, { children: [
                    jsx('div', { className: 'dsr-linkRow', children: [
                      jsx('div', { className: 'dsr-link', title: currentLink.link, children: currentLink.link }),
                      jsx('button', {
                        className: 'dsr-btn primary',
                        onClick: () => { void doCopy() },
                        children: [jsx(CopyIcon, {}), jsx('span', { children: t('copy') })],
                      }),
                      currentLink.local === true
                        ? jsx('a', { className: 'dsr-btn', href: currentLink.link, target: '_blank', rel: 'noreferrer', children: t('open') })
                        : null,
                    ] }),
                    currentLink.local === true
                      ? jsx('div', { className: 'dsr-note', children: `${t('localLink')} · ${t('needPublicUrl')}` })
                      : null,
                  ] }),
            ] }),
            jsxs('div', { className: 'dsr-cardBody', style: { borderTop: '1px solid var(--dsh-remote-border)' }, children: [
              jsx('div', { className: 'dsr-note', children: t('rotateHint') }),
              jsxs('div', { className: 'dsr-linkRow', children: [
                jsx('button', {
                  className: pendingRotate ? 'dsr-btn danger' : 'dsr-btn',
                  disabled: busy !== null,
                  onClick: () => { void rotate() },
                  children: [
                    busy === 'rotate' ? jsx('span', { className: 'dsr-spin' }) : jsx(RotateIcon, {}),
                    jsx('span', { children: pendingRotate ? t('rotateConfirm') : t('rotate') }),
                  ],
                }),
                pendingRotate
                  ? jsx('button', { className: 'dsr-btn sm', onClick: () => setPendingRotate(false), children: t('dismiss') })
                  : null,
              ] }),
              jsx('div', { className: 'dsr-note', children: t('settingsHint') }),
            ] }),
          ] }),

          jsxs('div', { className: 'dsr-card', children: [
            jsxs('div', { className: 'dsr-cardHead', children: [
              jsx('h3', { children: t('access') }),
              jsx('span', { className: 'dsr-spacer' }),
              jsx('span', { className: 'dsr-note', children: String(access.length) }),
            ] }),
            access.length === 0
              ? jsx('div', { className: 'dsr-empty', children: t('accessEmpty') })
              : jsx('div', { className: 'dsr-cardBody', style: { padding: '10px 16px 14px' }, children: jsxs('table', {
                  className: 'dsr-table',
                  children: [
                    jsx('colgroup', { children: [
                      jsx('col', { className: 'c-time' }),
                      jsx('col', { className: 'c-addr' }),
                      jsx('col', { className: 'c-agent' }),
                    ] }),
                    jsx('thead', { children: jsx('tr', { children: [
                      jsx('th', { children: t('accessTime') }),
                      jsx('th', { children: t('accessAddress') }),
                      jsx('th', { children: t('accessAgent') }),
                    ] }) }),
                    jsx('tbody', { children: access.map((row, index) => jsx('tr', {
                      children: [
                        jsx('td', { children: formatTime(row.at) }),
                        jsx('td', { className: 'dsr-mono', title: row.address, children: row.address }),
                        jsx('td', { className: 'dsr-agent', title: row.agent, children: describeAgent(row.agent) }),
                      ],
                    }, `${row.at}-${String(index)}`)) }),
                  ],
                }) }),
          ] }),

          jsx('div', { className: 'dsr-msg warn', children: [
            jsx('span', { children: jsx(AlertIcon, {}) }),
            jsxs('span', { className: 'dsr-msgText', children: [
              jsx('strong', { children: t('warningTitle') }),
              jsx('div', { children: t('warningBody') }),
            ] }),
          ] }),
        ],
      })
    }
    // #endregion

    // #region src/client/index.ts
    const inject = ['slots', 'locale']

    /** Shared panel identity: the sidebar entry id and the main panel key. */
    const PANEL_ID = 'dsh-remote'

    /** Build stamp shown in the console, so a stale browser artifact is identifiable. */
    const BUILD = 'v0.1.0+2026-10-20'

    let boundTranslate = (key) => key

    /**
     * Sidebar list icon; the host passes the requested edge size.
     * @param props - the sidebar's icon share.
     * @returns the icon element.
     */
    function PanelIcon({ size }) {
      const edge = typeof size === 'number' ? size : 18
      return jsxs('svg', {
        width: edge, height: edge, viewBox: '0 0 24 24', fill: 'none',
        stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round',
        children: [
          jsx('rect', { x: 2.5, y: 4, width: 19, height: 13, rx: 2 }),
          jsx('path', { d: 'M8 20.5h8' }),
          jsx('path', { d: 'M12 17v3.5' }),
          jsx('path', { d: 'M9 10.5h.01M15 10.5h.01' }),
        ],
      })
    }

    /**
     * The panel body. `main` invokes this as a render function, so it must
     * RETURN an element rather than BE a component reference.
     * @returns the panel element.
     */
    function renderPanel() {
      return jsx(RemotePanel, { t: boundTranslate })
    }

    /**
     * Client entry: register dictionaries, then contribute the sidebar entry and
     * the panel it opens.
     * @param ctx - client root context.
     */
    function apply(ctx) {
      ensureStyles()
      const t = ctx.locale.bind(NS)
      boundTranslate = t
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-remote: dictionaries')

      // The sidebar id and the main panel key must match, or selecting the entry
      // has nothing to open.
      ctx.effect(() => ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
        name: 'sidebar.panellist',
        id: PANEL_ID,
        order: 45,
        label: () => t('title'),
        locale: NS,
      }, PanelIcon)), 'dsh-remote: sidebar entry')

      ctx.effect(() => ctx.slots.inject('main', () => ctx.slots.register({
        name: 'main',
        key: PANEL_ID,
        locale: NS,
      }, renderPanel)), 'dsh-remote: main panel')

      if (typeof console !== 'undefined') console.info(`[dsh-remote] client ${BUILD}`)
    }

    exports.NS = NS
    exports.apply = apply
    exports.inject = inject
    return module.exports
  },
})
