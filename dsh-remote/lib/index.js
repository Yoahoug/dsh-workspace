/**
 * dsh-remote — serve the native DSH Web UI to a remote browser.
 *
 * The plugin opens a second HTTP listener beside the DSH web server and reverse
 * proxies it to the loopback origin. The remote browser therefore runs the
 * *unmodified* DSH client: no RPC is re-implemented here, so a DSH upgrade
 * cannot break the remote surface.
 *
 * Two authorities are involved and they must never be confused:
 *
 *   public authority    what the remote browser sees (the `publicUrl` root set
 *                       by the tunnel, or the bind address when unset). Requests
 *                       carry this Host, and the browser holds a cookie named
 *                       for it.
 *   upstream authority  what the local DSH web server sees (its own bind address
 *                       and port). Requests must carry this Host, or the /api
 *                       request-trust fence rejects them with 403.
 *
 * The proxy rewrites Host and Origin to the upstream authority (DSH requires the
 * pair to agree) and replaces the `Cookie` header wholesale with an upstream
 * session obtained from DSH's own token exchange. No cookie ever crosses between
 * the two authorities, and DSH's growing per-authority cookie jar is never
 * exercised from the outside.
 *
 * Authentication on the public side is one long random token, in the shape of
 * ZCode's `hash=` link: `GET /?token=…` exchanges the token for a signed,
 * HttpOnly cookie and redirects to the clean path, exactly as DSH's own browser
 * session does. Rotating the token invalidates every issued link and every
 * cookie signed with the previous secret.
 */
import { createServer as createHttpServer, request as httpRequest } from 'node:http'
import { createServer as createHttpsServer, request as httpsRequest } from 'node:https'
import { readFileSync } from 'node:fs'
import { connect } from 'node:net'
import { randomBytes, createHash, createHmac, timingSafeEqual } from 'node:crypto'
import z from '@deepseek-ai/schemastery'

export const name = 'dsh-remote'

/** Services this plugin needs: the local web server to answer the panel, and credentials to hold the token. */
export const inject = ['webServer', 'credentials']

/** The plugin's live configuration. Volatile fields are what the settings UI edits. */
export const Config = z.object({
  enabled: z.boolean().default(false).volatile(),
  host: z.string().default('127.0.0.1').volatile(),
  port: z.natural().min(1).max(65535).default(17800).volatile(),
  /** The tunnel's public root, e.g. `https://dsh.example.com`. Empty until a tunnel exists. */
  publicUrl: z.string().default('').volatile(),
  /** Optional PEM material; when both are set the listener itself serves TLS. */
  tlsCertFile: z.string().default('').volatile(),
  tlsKeyFile: z.string().default('').volatile(),
  /** Browser cookie lifetime in days; the panel can always hand out a fresh link. */
  cookieMaxAgeDays: z.natural().min(1).default(14).volatile(),
})

/** Public API prefix for the panel's own routes, served by the local DSH web server. */
export const API_PREFIX = '/api/dsh-remote'

/** Credential record holding the token, the cookie-signing secret, and the access log. */
const CREDENTIAL_KEY = 'dsh-remote/access'

const COOKIE_PREFIX = 'dsh-remote-'
const COOKIE_PAYLOAD_VERSION = 1
const TOKEN_BYTES = 32
const SECRET_BYTES = 32
const ACCESS_LOG_LIMIT = 200
const MAX_BODY_BYTES = 64 * 1024
const UPSTREAM_SESSION_TTL_MS = 6 * 60 * 60 * 1000

/** Hop-by-hop headers; never forwarded (RFC 9110 §7.6.1). */
const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
])

/** Response headers that must not be copied verbatim from upstream. */
const RESPONSE_SKIP = new Set(['connection', 'keep-alive', 'transfer-encoding', 'trailer', 'content-length'])

const base64url = (buffer) => Buffer.from(buffer).toString('base64')
  .replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '')

/**
 * Decode base64url strictly, so a tampered cookie fails instead of decoding to garbage.
 * @param {string} value - base64url text.
 * @returns {Buffer | undefined} decoded bytes, or undefined when the text is not canonical.
 */
function decodeBase64Url(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]*$/u.test(value) || value.length % 4 === 1) return undefined
  const padding = '='.repeat((4 - (value.length % 4)) % 4)
  const decoded = Buffer.from(value.replaceAll('-', '+').replaceAll('_', '/') + padding, 'base64')
  return base64url(decoded) === value ? decoded : undefined
}

/**
 * Compare two strings without leaking length or content through timing.
 * @param {string} actual - caller-supplied value.
 * @param {string} expected - stored value.
 * @returns {boolean} whether they are equal.
 */
function constantTimeEqual(actual, expected) {
  const a = Buffer.from(String(actual), 'utf8')
  const b = Buffer.from(String(expected), 'utf8')
  return a.byteLength === b.byteLength && timingSafeEqual(a, b)
}

/**
 * Extract one cookie value from a Cookie header without general decoding.
 * @param {string | undefined} header - raw Cookie header.
 * @param {string} cookieName - exact cookie name to find.
 * @returns {string | undefined} the value, when present.
 */
function cookieValue(header, cookieName) {
  if (typeof header !== 'string') return undefined
  for (const segment of header.split(';')) {
    const at = segment.indexOf('=')
    if (at === -1 || segment.slice(0, at).trim() !== cookieName) continue
    return segment.slice(at + 1).trim()
  }
  return undefined
}

/**
 * Serialize the public session cookie.
 *
 * `Secure` follows this listener's own transport, never the advertised tunnel:
 * when a tunnel terminates TLS the hop to us is plain HTTP, and marking the
 * cookie Secure there would make the browser drop it.
 * @param {string} cookieName - authority-derived name.
 * @param {string} value - signed payload.
 * @param {number} maxAgeSeconds - lifetime.
 * @param {boolean} secure - whether this listener serves TLS.
 * @returns {string} Set-Cookie value.
 */
function sessionCookie(cookieName, value, maxAgeSeconds, secure) {
  const attributes = `${cookieName}=${value}; Max-Age=${String(maxAgeSeconds)}; Path=/; HttpOnly; SameSite=Lax`
  return secure ? `${attributes}; Secure` : attributes
}

/**
 * Sign one cookie payload.
 * @param {Buffer} secret - signing secret.
 * @param {object} payload - JSON-safe payload.
 * @returns {string} `v1.<body>.<signature>`.
 */
function encodeCookie(secret, payload) {
  const body = base64url(Buffer.from(JSON.stringify(payload), 'utf8'))
  const signature = base64url(createHmac('sha256', secret).update(body).digest())
  return `v1.${body}.${signature}`
}

/**
 * Verify and decode one cookie payload.
 * @param {Buffer} secret - signing secret.
 * @param {string} value - cookie value.
 * @returns {any | undefined} the payload when the signature and shape hold.
 */
function decodeCookie(secret, value) {
  const parts = String(value).split('.')
  if (parts.length !== 3 || parts[0] !== 'v1') return undefined
  const [, body, encodedSignature] = parts
  const actual = decodeBase64Url(encodedSignature)
  if (actual === undefined) return undefined
  const expected = createHmac('sha256', secret).update(body).digest()
  if (actual.byteLength !== expected.byteLength || !timingSafeEqual(actual, expected)) return undefined
  const decoded = decodeBase64Url(body)
  if (decoded === undefined) return undefined
  try {
    const payload = JSON.parse(decoded.toString('utf8'))
    if (payload === null || typeof payload !== 'object') return undefined
    if (payload.version !== COOKIE_PAYLOAD_VERSION) return undefined
    if (typeof payload.aud !== 'string' || typeof payload.iat !== 'number' || typeof payload.exp !== 'number') return undefined
    return payload
  } catch {
    return undefined
  }
}

/**
 * Authority-scoped cookie name, so two tunnels on one origin never collide.
 * @param {string} audience - origin-shaped audience key.
 * @returns {string} cookie name.
 */
function cookieNameFor(audience) {
  return COOKIE_PREFIX + base64url(createHash('sha256').update(audience).digest())
}

/**
 * Normalize a configured public URL to a root.
 * A tunnel that mounts DSH under a path prefix is unsupported: the DSH client
 * resolves every asset and API path against the document root.
 * @param {string} value - configured publicUrl.
 * @returns {{origin: string} | {error: string}} parsed root or a reason.
 */
function parsePublicRoot(value) {
  const text = String(value ?? '').trim().replace(/\/+$/u, '')
  if (text === '') return { error: '' }
  let url
  try {
    url = new URL(text)
  } catch {
    return { error: `publicUrl 不是合法 URL：${text}` }
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return { error: `publicUrl 必须是 http(s) 地址：${text}` }
  if (url.username !== '' || url.password !== '') return { error: 'publicUrl 不能携带用户名或密码' }
  if (url.search !== '' || url.hash !== '') return { error: 'publicUrl 不能带查询串或片段' }
  if (url.pathname !== '/') return { error: 'publicUrl 必须是站点根地址，不能带路径前缀（DSH 客户端按根路径解析资源）' }
  return { origin: url.origin }
}

/**
 * The live token / signing secret / access log.
 *
 * Everything here is something a remote browser could otherwise forge, so it
 * lives in the credential store rather than the settings document: the login
 * token, the cookie-signing secret, and the log naming which remote addresses
 * authenticated. Rotating the record revokes every link and session at once.
 */
class RemoteAccessStore {
  /** @param {any} credentials - credential provider service. */
  constructor(credentials) {
    this.credentials = credentials
    this.state = undefined
    this.loading = undefined
  }

  /** @returns {Promise<any>} live state, loading it once. */
  async load() {
    if (this.state !== undefined) return this.state
    if (this.loading === undefined) {
      // A failed read must not be cached: a transient credential-store error
      // would otherwise poison the plugin until the next restart.
      this.loading = this.read()
      this.loading.catch(() => { this.loading = undefined })
    }
    return this.loading
  }

  /** @returns {Promise<any>} state read from the credential store, created when absent. */
  async read() {
    let record
    try {
      record = await this.credentials.readRecord(CREDENTIAL_KEY)
    } catch (error) {
      throw new Error(`dsh-remote: 无法读取凭据记录 ${CREDENTIAL_KEY}：${error instanceof Error ? error.message : String(error)}`)
    }
    const payload = record?.kind === 'grant' ? record.payload : undefined
    const secret = typeof payload?.secret === 'string' ? decodeBase64Url(payload.secret) : undefined
    const usable = typeof payload?.token === 'string' && payload.token !== '' && secret?.byteLength === SECRET_BYTES
    if (usable) {
      this.state = {
        token: payload.token,
        secret,
        createdAt: typeof payload.createdAt === 'number' ? payload.createdAt : Date.now(),
        rotatedAt: typeof payload.rotatedAt === 'number' ? payload.rotatedAt : 0,
        access: Array.isArray(payload.access) ? payload.access : [],
      }
      return this.state
    }
    return this.reset()
  }

  /**
   * Replace the token and signing secret. Every existing link and cookie stops working.
   * @returns {Promise<any>} the fresh state.
   */
  async reset() {
    const secret = randomBytes(SECRET_BYTES)
    const fresh = {
      token: base64url(randomBytes(TOKEN_BYTES)),
      secret,
      createdAt: this.state?.createdAt ?? Date.now(),
      rotatedAt: Date.now(),
      access: this.state?.access ?? [],
    }
    this.state = fresh
    this.loading = Promise.resolve(fresh)
    await this.persist(fresh)
    return fresh
  }

  /**
   * Write the whole record through the only write path the seam offers.
   * @param {any} state - live state.
   * @returns {Promise<void>} completion.
   */
  async persist(state) {
    await this.credentials.modifyRecord(CREDENTIAL_KEY, async () => ({
      kind: 'grant',
      payload: {
        version: 1,
        token: state.token,
        secret: base64url(state.secret),
        createdAt: state.createdAt,
        rotatedAt: state.rotatedAt,
        access: state.access,
      },
    }))
  }

  /**
   * Append one authenticated access to the bounded log.
   * @param {any} state - live state.
   * @param {{address?: string, agent?: string}} entry - who connected.
   * @returns {Promise<void>} completion; failures stay invisible to the request.
   */
  async record(state, entry) {
    state.access = [...state.access.slice(-(ACCESS_LOG_LIMIT - 1)), {
      at: Date.now(),
      address: entry.address ?? 'unknown',
      agent: String(entry.agent ?? '').slice(0, 160),
    }]
    try {
      await this.persist(state)
    } catch {
      /* the audit trail is best effort: never fail a request that already authenticated */
    }
  }
}

/**
 * Read a small JSON body.
 * @param {import('node:http').IncomingMessage} req - request.
 * @returns {Promise<any>} parsed body, or an empty object.
 */
async function readJsonBody(req) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > MAX_BODY_BYTES) throw new Error('请求体过大')
    chunks.push(chunk)
  }
  if (chunks.length === 0) return {}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

/**
 * Send a JSON response with caching disabled.
 * @param {import('node:http').ServerResponse} res - response.
 * @param {number} status - HTTP status.
 * @param {unknown} value - JSON body.
 * @returns {void}
 */
function writeJson(res, status, value) {
  if (res.headersSent) {
    res.destroy()
    return
  }
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(JSON.stringify(value))
}

/**
 * The proxy: one listener carrying both HTTP and WebSocket traffic.
 */
class RemoteProxy {
  /**
   * @param {object} options - services and live readers.
   * @param {() => any} options.config - live configuration reader.
   * @param {any} options.webServer - DSH web server service (origin source).
   * @param {() => any} options.connection - DSH connection service (launch token source).
   * @param {RemoteAccessStore} options.store - token state.
   * @param {(request: import('node:http').IncomingMessage) => void} options.onAuthenticated - audit hook.
   */
  constructor(options) {
    this.options = options
    this.server = undefined
    this.sockets = new Set()
    this.starting = undefined
    this.lastError = undefined
    this.stats = { requests: 0, upgrades: 0, rejected: 0, since: Date.now() }
    this.upstream = undefined
    this.upstreamCookie = undefined
    this.upstreamExpiry = 0
    this.upstreamPending = undefined
  }

  /** @returns {URL} the upstream DSH web origin. */
  resolveUpstream() {
    if (this.upstream !== undefined) return this.upstream
    this.upstream = new URL(this.options.webServer.getOrigin())
    return this.upstream
  }

  /** @returns {boolean} whether this listener serves TLS. */
  get secure() {
    return this.server?.dshRemoteTls === true
  }

  /**
   * Obtain an upstream session from DSH itself.
   *
   * The launch token comes from DSH's own `authenticatedUrl()` and is exchanged at
   * the documented `GET /?token=` door, so this never hard-codes DSH's cookie
   * format or its signing secret: if DSH changes either, the exchange still works.
   * @returns {Promise<string>} `name=value` pair for the upstream Cookie header.
   */
  async upstreamSession() {
    if (this.upstreamCookie !== undefined && Date.now() < this.upstreamExpiry) return this.upstreamCookie
    if (this.upstreamPending !== undefined) return this.upstreamPending
    this.upstreamPending = (async () => {
      const upstream = this.resolveUpstream()
      const connection = this.options.connection()
      if (connection === undefined || typeof connection.authenticatedUrl !== 'function') {
        throw new Error('dsh-remote: 当前组合没有 DSH connection 服务，无法换发本机 web 会话')
      }
      const launch = new URL(connection.authenticatedUrl('http://dsh.invalid/'))
      const token = launch.searchParams.get('token')
      if (token === null || token === '') throw new Error('dsh-remote: 无法取得本进程的 web 访问令牌')
      const exchange = new URL('/', upstream)
      exchange.searchParams.set('token', token)
      const response = await fetch(exchange, { redirect: 'manual' })
      const issued = response.headers.getSetCookie().find((value) => value.startsWith('dsh-auth-'))
      if (issued === undefined) {
        throw new Error(`dsh-remote: 本机 DSH 拒绝换发 web 会话（HTTP ${String(response.status)}）`)
      }
      const pair = issued.split(';', 1)[0]
      this.upstreamCookie = pair
      this.upstreamExpiry = Date.now() + UPSTREAM_SESSION_TTL_MS
      return pair
    })().finally(() => { this.upstreamPending = undefined })
    return this.upstreamPending
  }

  /**
   * The audience this listener answers on: the configured tunnel root, or the
   * bind address when no tunnel exists yet.
   * @param {import('node:http').IncomingMessage} request - public request.
   * @returns {string} origin-shaped audience, or an empty string when unknowable.
   */
  audience(request) {
    const root = parsePublicRoot(this.options.config().publicUrl)
    if ('origin' in root) return root.origin
    const host = request.headers.host
    if (host === undefined) return ''
    return `${this.secure ? 'https:' : 'http:'}//${host}`
  }

  /**
   * Decide whether a public request carries a valid session.
   * @param {import('node:http').IncomingMessage} request - public request.
   * @param {any} state - live token state.
   * @returns {boolean} whether the request is authenticated.
   */
  isAuthenticated(request, state) {
    const audience = this.audience(request)
    if (audience === '') return false
    const value = cookieValue(request.headers.cookie, cookieNameFor(audience))
    if (value === undefined) return false
    const payload = decodeCookie(state.secret, value)
    if (payload === undefined || payload.aud !== audience) return false
    const now = Date.now()
    return payload.iat <= now && payload.exp > now
  }

  /**
   * Answer an unauthenticated public request. Nothing is proxied and nothing is
   * read from the query string except the token exchange itself.
   * @param {import('node:http').IncomingMessage} request - public request.
   * @param {import('node:http').ServerResponse} response - public response.
   * @returns {void}
   */
  writeUnauthorized(request, response) {
    this.stats.rejected += 1
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      writeJson(response, 401, { ok: false, message: 'dsh-remote：远程会话未认证，请用面板里的完整链接重新打开' })
      return
    }
    response.writeHead(401, {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'referrer-policy': 'no-referrer',
    })
    if (request.method === 'HEAD') {
      response.end()
      return
    }
    response.end(`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>DSH Remote</title>
<style>body{font:15px/1.65 system-ui,-apple-system,"Segoe UI",sans-serif;margin:0;display:grid;place-items:center;min-height:100vh;background:#0f1115;color:#e6e8eb}
main{max-width:34rem;padding:2rem}h1{font-size:1.15rem;margin:0 0 .8rem}p{margin:.5rem 0;opacity:.8}</style>
<main><h1>需要远程访问令牌</h1>
<p>这是 DSH 的远程入口，必须用带令牌的完整链接打开。令牌会在首次访问时换成会话 Cookie，之后地址栏里不会留下它。</p>
<p>请在 DSH 的「远程操控」面板里复制链接重新打开；如果链接已经轮换过，旧链接不会再生效。</p></main></html>`)
  }

  /**
   * Exchange `?token=` for a signed cookie, mirroring DSH's own index exchange.
   * @param {import('node:http').IncomingMessage} request - public request.
   * @param {import('node:http').ServerResponse} response - public response.
   * @param {URL} url - parsed public URL.
   * @param {any} state - live token state.
   * @returns {boolean} true when the request was fully answered here.
   */
  exchangeToken(request, response, url, state) {
    if (!url.searchParams.has('token')) return false
    const tokens = url.searchParams.getAll('token')
    const audience = this.audience(request)
    const method = request.method ?? 'GET'
    const valid = method === 'GET'
      && tokens.length === 1
      && audience !== ''
      && constantTimeEqual(tokens.join(''), state.token)
    if (!valid) {
      this.stats.rejected += 1
      writeJson(response, 401, { ok: false, message: 'dsh-remote：令牌无效或已被轮换，请在面板里重新复制链接' })
      return true
    }
    url.searchParams.delete('token')
    const rest = `${url.pathname}${url.search}`
    const location = rest === '/' ? './' : rest
    const now = Date.now()
    const days = this.options.config().cookieMaxAgeDays
    const expiresAt = now + days * 86_400_000
    response.writeHead(303, {
      'cache-control': 'no-store',
      location,
      'referrer-policy': 'no-referrer',
      'set-cookie': sessionCookie(
        cookieNameFor(audience),
        encodeCookie(state.secret, { version: COOKIE_PAYLOAD_VERSION, aud: audience, iat: now, exp: expiresAt }),
        days * 86_400,
        this.secure,
      ),
    })
    response.end()
    this.options.onAuthenticated(request)
    return true
  }

  /**
   * Build the header set the upstream DSH web server accepts.
   * @param {import('node:http').IncomingMessage} request - public request.
   * @param {URL} upstream - upstream origin.
   * @param {string} cookie - upstream `name=value` pair.
   * @returns {Record<string, string | string[]>} outgoing headers.
   */
  upstreamHeaders(request, upstream, cookie) {
    const headers = {}
    for (const [key, value] of Object.entries(request.headers)) {
      if (value === undefined || HOP_BY_HOP.has(key)) continue
      if (key === 'cookie' || key === 'host' || key === 'origin') continue
      headers[key] = value
    }
    headers.host = upstream.host
    headers.cookie = cookie
    // DSH requires Origin to equal Host when a browser sends one; same-origin
    // fetches omit it and must keep omitting it.
    if (request.headers.origin !== undefined) headers.origin = upstream.origin
    headers['x-forwarded-for'] = request.socket.remoteAddress ?? 'unknown'
    headers['x-forwarded-proto'] = this.secure ? 'https' : 'http'
    const root = parsePublicRoot(this.options.config().publicUrl)
    if ('origin' in root) headers['x-forwarded-host'] = new URL(root.origin).host
    return headers
  }

  /**
   * Rewrite an upstream redirect target onto the public origin.
   * @param {string} location - upstream Location value.
   * @param {URL} upstream - upstream origin.
   * @returns {string} public-facing location.
   */
  publicRedirect(location, upstream) {
    let target
    try {
      target = new URL(location, upstream)
    } catch {
      return location
    }
    if (target.origin !== upstream.origin) return location
    const root = parsePublicRoot(this.options.config().publicUrl)
    if ('origin' in root) return `${root.origin}${target.pathname}${target.search}`
    return `${target.pathname}${target.search}`
  }

  /**
   * Proxy one authenticated HTTP request.
   * @param {import('node:http').IncomingMessage} request - public request.
   * @param {import('node:http').ServerResponse} response - public response.
   * @returns {Promise<void>} completion.
   */
  async forward(request, response) {
    this.stats.requests += 1
    const upstream = this.resolveUpstream()
    const cookie = await this.upstreamSession()
    const headers = this.upstreamHeaders(request, upstream, cookie)
    const send = upstream.protocol === 'https:' ? httpsRequest : httpRequest

    await new Promise((resolve) => {
      const proxied = send({
        protocol: upstream.protocol,
        hostname: upstream.hostname,
        port: upstream.port === '' ? undefined : Number(upstream.port),
        path: request.url ?? '/',
        method: request.method ?? 'GET',
        headers,
      }, (upstreamResponse) => {
        const outgoing = {}
        for (const [key, value] of Object.entries(upstreamResponse.headers)) {
          if (RESPONSE_SKIP.has(key) || value === undefined) continue
          outgoing[key] = value
        }
        if (typeof outgoing.location === 'string') outgoing.location = this.publicRedirect(outgoing.location, upstream)
        // Upstream Set-Cookie belongs to the upstream authority; the browser must
        // never receive it, because it would never be valid on the public origin.
        delete outgoing['set-cookie']
        response.writeHead(upstreamResponse.statusCode ?? 502, outgoing)
        upstreamResponse.pipe(response)
        upstreamResponse.on('end', resolve)
        upstreamResponse.on('error', resolve)
      })
      proxied.on('error', (error) => {
        this.lastError = error instanceof Error ? error.message : String(error)
        if (!response.headersSent) writeJson(response, 502, { ok: false, message: `dsh-remote：连不上本机 DSH web（${this.lastError}）` })
        else response.destroy()
        resolve()
      })
      // A cancelled tab must not leave the upstream request running.
      response.on('close', () => {
        if (!response.writableFinished) proxied.destroy()
      })
      request.on('error', () => proxied.destroy())
      request.pipe(proxied)
    })
  }

  /**
   * Proxy one WebSocket upgrade: replay the handshake at the upstream with
   * corrected authority headers, then pipe both sockets.
   * @param {import('node:http').IncomingMessage} request - public upgrade request.
   * @param {import('node:stream').Duplex} socket - public socket.
   * @param {Buffer} head - bytes already read from the public socket.
   * @returns {Promise<void>} completion of the attempt.
   */
  async upgrade(request, socket, head) {
    this.stats.upgrades += 1
    const upstream = this.resolveUpstream()
    const cookie = await this.upstreamSession().catch(() => undefined)
    socket.on('error', () => undefined)
    const port = upstream.port === '' ? (upstream.protocol === 'https:' ? 443 : 80) : Number(upstream.port)

    const target = connect(port, upstream.hostname, () => {
      const lines = [`GET ${request.url ?? '/'} HTTP/1.1`]
      for (const [key, value] of Object.entries(request.headers)) {
        if (value === undefined) continue
        if (key === 'host') lines.push(`host: ${upstream.host}`)
        else if (key === 'origin') lines.push(`origin: ${upstream.origin}`)
        else if (key === 'cookie') continue
        else if (Array.isArray(value)) for (const item of value) lines.push(`${key}: ${item}`)
        else lines.push(`${key}: ${value}`)
      }
      if (cookie !== undefined) lines.push(`cookie: ${cookie}`)
      target.write(`${lines.join('\r\n')}\r\n\r\n`)
      if (head.length > 0) target.write(head)
      target.pipe(socket)
      socket.pipe(target)
    })
    target.on('error', () => socket.destroy())
    socket.on('close', () => target.destroy())
    socket.on('error', () => target.destroy())
  }

  /**
   * Route one public request: token exchange, session check, then proxy.
   * Everything on the public listener is remote traffic, so there is no local
   * bypass path here.
   * @param {import('node:http').IncomingMessage} request - public request.
   * @param {import('node:http').ServerResponse} response - public response.
   * @returns {Promise<void>} completion.
   */
  async handleHttp(request, response) {
    const url = new URL(request.url ?? '/', 'http://dsh.invalid')
    const state = await this.options.store.load()
    if (this.exchangeToken(request, response, url, state)) return
    if (!this.isAuthenticated(request, state)) {
      this.writeUnauthorized(request, response)
      return
    }
    await this.forward(request, response)
  }

  /**
   * Gate one upgrade on the same session the HTTP side requires.
   * @param {import('node:http').IncomingMessage} request - public upgrade request.
   * @param {import('node:stream').Duplex} socket - public socket.
   * @param {Buffer} head - bytes already read.
   * @returns {Promise<void>} completion.
   */
  async handleUpgrade(request, socket, head) {
    const state = await this.options.store.load()
    if (!this.isAuthenticated(request, state)) {
      this.stats.rejected += 1
      socket.end('HTTP/1.1 401 Unauthorized\r\nconnection: close\r\ncontent-length: 0\r\n\r\n')
      return
    }
    await this.upgrade(request, socket, head)
  }

  /** @returns {Promise<void>} bind the listener and begin serving. */
  async start() {
    if (this.starting !== undefined) return this.starting
    this.starting = this.open().finally(() => { this.starting = undefined })
    return this.starting
  }

  /** @returns {Promise<void>} open the socket. */
  async open() {
    const config = this.options.config()
    const hasCert = config.tlsCertFile !== ''
    const hasKey = config.tlsKeyFile !== ''
    if (hasCert !== hasKey) throw new Error('dsh-remote：tlsCertFile 和 tlsKeyFile 必须同时设置')
    const handler = (request, response) => {
      this.handleHttp(request, response).catch((error) => {
        if (!response.headersSent) writeJson(response, 500, { ok: false, message: error instanceof Error ? error.message : String(error) })
        else response.destroy()
      })
    }
    const server = hasCert && hasKey
      ? createHttpsServer({ cert: readFileSync(config.tlsCertFile), key: readFileSync(config.tlsKeyFile) }, handler)
      : createHttpServer(handler)
    server.dshRemoteTls = hasCert && hasKey
    server.on('upgrade', (request, socket, head) => {
      this.handleUpgrade(request, socket, head).catch(() => socket.destroy())
    })
    server.on('connection', (socket) => {
      this.sockets.add(socket)
      socket.on('close', () => this.sockets.delete(socket))
    })
    await new Promise((resolve, reject) => {
      const failed = (error) => { server.off('listening', listening); reject(error) }
      const listening = () => { server.off('error', failed); resolve() }
      server.once('error', failed)
      server.once('listening', listening)
      server.listen(config.port, config.host)
    })
    this.server = server
    this.lastError = undefined
    this.stats = { requests: 0, upgrades: 0, rejected: 0, since: Date.now() }
  }

  /** @returns {Promise<void>} stop the listener and drop every proxied socket. */
  async stop() {
    const server = this.server
    this.server = undefined
    if (server === undefined) return
    await new Promise((resolve) => server.close(() => resolve()))
    for (const socket of this.sockets) socket.destroy()
    this.sockets.clear()
  }

  /**
   * The authority the listener is bound to and whether it matches one host:port.
   * @param {string} host - desired bind address.
   * @param {number} port - desired port.
   * @returns {boolean} whether the live socket already matches.
   */
  matches(host, port) {
    const server = this.server
    if (server === undefined) return false
    const address = server.address()
    return address !== null && typeof address === 'object' && address.address === host && address.port === port
  }

  /** @returns {object} a snapshot for the panel. */
  snapshot() {
    const config = this.options.config()
    const root = parsePublicRoot(config.publicUrl)
    // Read the upstream eagerly: the panel should show the real local DSH address
    // even before the first proxied request, not "—" until traffic happens.
    let upstream = null
    try {
      upstream = this.resolveUpstream().origin
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error)
    }
    return {
      enabled: config.enabled,
      listening: this.server !== undefined,
      host: config.host,
      port: config.port,
      protocol: this.secure ? 'https:' : 'http:',
      publicRoot: 'origin' in root ? root.origin : '',
      publicRootError: 'error' in root ? root.error : '',
      upstream,
      lastError: this.lastError ?? null,
      stats: { ...this.stats },
    }
  }
}

/**
 * Mount the plugin.
 *
 * The proxy gets its own listener because DSH's web server is loopback-bound by
 * construction (`dsh web` rejects a wildcard bind) and this plugin must never
 * widen that: the proxy is the only surface a tunnel reaches, and it
 * authenticates before a single byte is forwarded.
 * @param {any} ctx - plugin context.
 * @param {any} [section] - resolved configuration section.
 */
export function apply(ctx, section) {
  /**
   * Read one live field. A volatile field is a schema cell with `.get()`; a
   * plain composition value is used as-is.
   * @param {string} key - field name.
   * @param {any} fallback - value when the field is absent.
   * @returns {any} live value.
   */
  const read = (key, fallback) => {
    const cell = section?.[key]
    if (cell !== undefined && cell !== null && typeof cell.get === 'function') return cell.get()
    return cell ?? fallback
  }

  /** @returns {object} current configuration values. */
  const readConfig = () => ({
    enabled: read('enabled', false) === true,
    host: String(read('host', '127.0.0.1')),
    port: Number(read('port', 17800)),
    publicUrl: String(read('publicUrl', '')),
    tlsCertFile: String(read('tlsCertFile', '')),
    tlsKeyFile: String(read('tlsKeyFile', '')),
    cookieMaxAgeDays: Number(read('cookieMaxAgeDays', 14)),
  })

  const store = new RemoteAccessStore(ctx.credentials)
  const proxy = new RemoteProxy({
    config: readConfig,
    webServer: ctx.webServer,
    connection: () => ctx.get('connection'),
    store,
    onAuthenticated: (request) => {
      void store.load().then((state) => store.record(state, {
        address: request.socket.remoteAddress ?? 'unknown',
        agent: request.headers['user-agent'],
      })).catch(() => undefined)
    },
  })

  /**
   * Reconcile the listener with the live configuration: disabling stops it,
   * changing host or port rebinds, and an unchanged address is left alone.
   * @returns {Promise<void>} completion.
   */
  const reconcile = async () => {
    const current = readConfig()
    if (!current.enabled) {
      await proxy.stop()
      return
    }
    if (proxy.matches(current.host, current.port)) return
    await proxy.stop()
    try {
      await proxy.start()
    } catch (error) {
      proxy.lastError = error instanceof Error ? error.message : String(error)
      ctx.logger?.warn?.(`dsh-remote: 远程入口启动失败：${proxy.lastError}`)
    }
  }

  // One listener owned by this fiber: unloading the plugin closes the port.
  ctx.effect(() => {
    void reconcile()
    return async () => { await proxy.stop() }
  }, 'dsh-remote: public listener')

  // A settings write is how the panel toggles the entry and how a user changes
  // the port, so the same event drives the listener.
  ctx.effect(() => ctx.on('settings/document-updated', (ns) => {
    if (ns === name) void reconcile()
  }), 'dsh-remote: settings reconcile')

  /** @returns {Promise<any>} live token state, failing the response when unreadable. */
  const loadState = async (response) => {
    try {
      return await store.load()
    } catch (error) {
      writeJson(response, 503, { ok: false, message: error instanceof Error ? error.message : String(error) })
      return undefined
    }
  }

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: `${API_PREFIX}/status`,
    handler: async (request, response) => {
      if (request.method !== 'GET') return writeJson(response, 405, { ok: false, message: 'GET only' })
      const state = await loadState(response)
      if (state === undefined) return
      writeJson(response, 200, { ok: true, ...proxy.snapshot(), rotatedAt: state.rotatedAt, createdAt: state.createdAt })
    },
  }), 'dsh-remote: status route')

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: `${API_PREFIX}/access`,
    handler: async (request, response) => {
      if (request.method !== 'GET') return writeJson(response, 405, { ok: false, message: 'GET only' })
      const state = await loadState(response)
      if (state === undefined) return
      writeJson(response, 200, { ok: true, access: state.access.slice().reverse() })
    },
  }), 'dsh-remote: access route')

  // The link is only ever handed out to the local page, which is already behind
  // DSH's own browser session; the tunnel never serves this route itself.
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: `${API_PREFIX}/link`,
    handler: async (request, response) => {
      if (request.method !== 'POST') return writeJson(response, 405, { ok: false, message: 'POST only' })
      const state = await loadState(response)
      if (state === undefined) return
      const config = readConfig()
      const root = parsePublicRoot(config.publicUrl)
      // `rotatedAt` travels with the link so the panel can tell a fresh token
      // from one it fetched before some other rotation invalidated it.
      const rotatedAt = state.rotatedAt
      if ('error' in root) {
        if (root.error !== '') return writeJson(response, 400, { ok: false, message: root.error })
        return writeJson(response, 200, {
          ok: true,
          local: true,
          rotatedAt,
          link: `http://${config.host}:${String(config.port)}/?token=${state.token}`,
        })
      }
      writeJson(response, 200, { ok: true, local: false, rotatedAt, link: `${root.origin}/?token=${state.token}` })
    },
  }), 'dsh-remote: link route')

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: `${API_PREFIX}/rotate`,
    handler: async (request, response) => {
      if (request.method !== 'POST') return writeJson(response, 405, { ok: false, message: 'POST only' })
      try {
        const rotated = await store.reset()
        writeJson(response, 200, { ok: true, rotatedAt: rotated.rotatedAt })
      } catch (error) {
        writeJson(response, 500, { ok: false, message: error instanceof Error ? error.message : String(error) })
      }
    },
  }), 'dsh-remote: rotate route')

  // The panel's switch is a settings write, so the choice survives a restart and
  // the reconcile above is the single place that owns the listener.
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: `${API_PREFIX}/enabled`,
    handler: async (request, response) => {
      if (request.method !== 'POST') return writeJson(response, 405, { ok: false, message: 'POST only' })
      const settings = ctx.get('settings')
      if (settings === undefined || typeof settings.mutate !== 'function') {
        return writeJson(response, 503, { ok: false, message: '当前组合没有设置服务，无法从面板切换开关' })
      }
      try {
        const body = await readJsonBody(request)
        if (typeof body?.enabled !== 'boolean') return writeJson(response, 400, { ok: false, message: 'enabled 必须是布尔值' })
        await settings.mutate(name, [{ op: 'set', path: ['enabled'], value: body.enabled }])
        // Give the settings event a turn so the listener is up before the panel
        // asks for a link, without making the toggle wait on a rebind.
        await reconcile()
        writeJson(response, 200, { ok: true, ...proxy.snapshot() })
      } catch (error) {
        writeJson(response, 500, { ok: false, message: error instanceof Error ? error.message : String(error) })
      }
    },
  }), 'dsh-remote: enabled route')
}
