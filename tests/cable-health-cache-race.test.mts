import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import type { GetCableHealthResponse } from '../src/generated/server/worldmonitor/infrastructure/v1/service_server';
import { getCachedJson, __resetKeyPrefixCacheForTests } from '../server/_shared/redis';
import { getCableHealth } from '../server/worldmonitor/infrastructure/v1/get-cable-health';
import { __testing__ as health } from '../api/health.js';
import { cableHealthToDigestInput } from '../shared/analysis-composite-adapters';

const CACHE_KEY = 'cable-health-v1';
const NGA_CACHE_KEY = 'cable-health-nga-warnings-v2';
const META_KEY = 'seed-meta:cable-health';
const NEG_SENTINEL = '__WM_NEG__';
const originalFetch = globalThis.fetch;
const originalNow = Date.now;
const originalEnv = new Map<string, string | undefined>();

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function currentNgaDate() {
  const now = new Date();
  const month = now.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase();
  const day = String(now.getUTCDate()).padStart(2, '0');
  const time = `${String(now.getUTCHours()).padStart(2, '0')}${String(now.getUTCMinutes()).padStart(2, '0')}`;
  return `${day}${time}Z ${month} ${now.getUTCFullYear()}`;
}

describe('getCableHealth cache publication', { concurrency: 1 }, () => {
  beforeEach(() => {
    for (const key of ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'VERCEL_ENV', 'VERCEL_GIT_COMMIT_SHA']) {
      originalEnv.set(key, process.env[key]);
    }
    process.env.UPSTASH_REDIS_REST_URL = 'https://redis.cable-health.test';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
    process.env.VERCEL_ENV = 'production';
    delete process.env.VERCEL_GIT_COMMIT_SHA;
    __resetKeyPrefixCacheForTests();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    Date.now = originalNow;
    for (const [key, value] of originalEnv) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    originalEnv.clear();
    __resetKeyPrefixCacheForTests();
  });

  it('awaits fallback publication before health can read the served snapshot', async () => {
    const store = new Map<string, unknown>();
    const delayedKeys = new Map<string, ReturnType<typeof deferred<void>>>();
    const writesStarted = deferred<void>();
    let delayedWriteCount = 0;
    let upstreamAvailable = true;

    globalThis.fetch = (async (input, init) => {
      const url = String(input);
      if (url.startsWith('https://redis.cable-health.test/get/')) {
        const key = decodeURIComponent(url.slice('https://redis.cable-health.test/get/'.length));
        const value = store.get(key);
        return Response.json({ result: value === undefined ? null : JSON.stringify(value) });
      }
      if (url === 'https://redis.cable-health.test/') {
        const command = JSON.parse(String(init?.body)) as [string, string, string, string, string];
        assert.equal(command[0], 'SET');
        const key = command[1];
        const value = JSON.parse(command[2]);
        const gate = delayedKeys.get(key);
        if (gate && value !== NEG_SENTINEL) {
          delayedWriteCount += 1;
          if (delayedWriteCount === delayedKeys.size) writesStarted.resolve();
          await gate.promise;
        }
        store.set(key, value);
        return Response.json({ result: 'OK' });
      }
      if (url.startsWith('https://msi.nga.mil/')) {
        return upstreamAvailable
          ? Response.json([{ text: 'FAULT REPORTED ON SUBMARINE CABLE MAREA', issueDate: currentNgaDate() }])
          : new Response('upstream unavailable', { status: 503 });
      }
      throw new Error(`unexpected fetch: ${url}`);
    }) as typeof fetch;

    const first = await getCableHealth({} as never, {} as never);
    assert.ok(Object.keys(first.cables).length > 0);
    assert.deepEqual(Object.keys(first).sort(), ['cables', 'generatedAt']);
    assert.deepEqual(cableHealthToDigestInput(first), [{ name: 'marea', status: first.cables.marea!.status }]);

    store.delete(CACHE_KEY);
    store.delete(NGA_CACHE_KEY);
    upstreamAvailable = false;
    delayedKeys.set(CACHE_KEY, deferred<void>());

    let responseSettled = false;
    const secondPromise = getCableHealth({} as never, {} as never).then((response) => {
      responseSettled = true;
      return response;
    });

    await writesStarted.promise;
    assert.equal(store.get(NGA_CACHE_KEY), NEG_SENTINEL);
    const healthDuringFormerWindow = await getCachedJson(CACHE_KEY);
    assert.equal(healthDuringFormerWindow, null);
    await Promise.resolve();
    assert.equal(responseSettled, false);

    for (const gate of delayedKeys.values()) gate.resolve();
    const fallback = await secondPromise;
    const published = await getCachedJson(CACHE_KEY) as GetCableHealthResponse;
    const metadata = await getCachedJson(META_KEY) as { recordCount: number };

    assert.deepEqual(fallback, first);
    assert.deepEqual(published, fallback);
    assert.equal(metadata.recordCount, Object.keys(fallback.cables).length);
    assert.notEqual(published, NEG_SENTINEL);
  });

  it('keeps a legitimate empty computation as positive data', async () => {
    const store = new Map<string, unknown>();
    let upstreamCalls = 0;

    globalThis.fetch = (async (input, init) => {
      const url = String(input);
      if (url.startsWith('https://redis.cable-health.test/get/')) {
        const key = decodeURIComponent(url.slice('https://redis.cable-health.test/get/'.length));
        const value = store.get(key);
        return Response.json({ result: value === undefined ? null : JSON.stringify(value) });
      }
      if (url === 'https://redis.cable-health.test/') {
        const command = JSON.parse(String(init?.body)) as [string, string, string];
        store.set(command[1], JSON.parse(command[2]));
        return Response.json({ result: 'OK' });
      }
      if (url.startsWith('https://msi.nga.mil/')) {
        upstreamCalls += 1;
        return Response.json([]);
      }
      throw new Error(`unexpected fetch: ${url}`);
    }) as typeof fetch;

    const response = await getCableHealth({} as never, {} as never);

    assert.deepEqual(response.cables, {});
    assert.deepEqual(store.get(CACHE_KEY), response);
    assert.equal(upstreamCalls, 1);
    assert.equal(store.get(META_KEY).recordCount, 0);
  });

  let clockSequence = 0;
  function clockFixture() {
    let now = originalNow() + (++clockSequence) * 86_400_000;
    const start = now;
    const store = new Map<string, { value: string; expiresAt: number }>();
    let upstreamAvailable = true;
    let upstreamGate: Promise<void> | undefined;
    let upstreamStarted = deferred<void>();
    let rejectPublication = false;
    const read = (key: string) => {
      const entry = store.get(key);
      return entry && entry.expiresAt > now ? JSON.parse(entry.value) : null;
    };
    Date.now = () => now;
    globalThis.fetch = (async (input, init) => {
      const url = String(input);
      if (url.startsWith('https://redis.cable-health.test/get/')) {
        const value = read(decodeURIComponent(url.split('/get/')[1]!));
        return Response.json({ result: value === null ? null : JSON.stringify(value) });
      }
      if (url === 'https://redis.cable-health.test/') {
        const [command, key, value, expiryKind, seconds, condition] = JSON.parse(String(init?.body));
        assert.equal(command, 'SET');
        assert.equal(expiryKind, 'EX');
        if (key === CACHE_KEY && rejectPublication) return Response.json({ error: 'fixture write failed' });
        if (condition === 'NX' && read(key) !== null) return Response.json({ result: null });
        store.set(key, { value, expiresAt: now + Number(seconds) * 1000 });
        return Response.json({ result: 'OK' });
      }
      if (url.startsWith('https://msi.nga.mil/')) {
        upstreamStarted.resolve();
        await upstreamGate;
        return upstreamAvailable ? Response.json([]) : new Response('unavailable', { status: 503 });
      }
      throw new Error(`unexpected fetch: ${url}`);
    }) as typeof fetch;
    return {
      start, store, read,
      advance(minutes: number) { now = start + minutes * 60_000; },
      failUpstream() { upstreamAvailable = false; store.delete(NGA_CACHE_KEY); },
      gateUpstream(gate: Promise<void>) {
        upstreamGate = gate;
        upstreamStarted = deferred<void>();
        store.delete(NGA_CACHE_KEY);
        return upstreamStarted.promise;
      },
      failPublication() { rejectPublication = true; },
      verdict() {
        const payload = read(CACHE_KEY);
        return health.classifyKey('cableHealth', CACHE_KEY, { allowOnDemand: false }, {
          keyStrens: new Map([[CACHE_KEY, payload === null ? 0 : JSON.stringify(payload).length]]),
          keyErrors: new Map(),
          keyMetaValues: new Map([[META_KEY, JSON.stringify(read(META_KEY))]]),
          keyMetaErrors: new Map(), now,
        });
      },
    };
  }

  it('keeps health OK across the refresh deadline without renewing metadata on cache hits', async () => {
    const f = clockFixture();
    const first = await getCableHealth({} as never, {} as never);
    assert.equal(f.verdict().status, 'OK');
    f.advance(29);
    assert.deepEqual(await getCableHealth({} as never, {} as never), first);
    assert.equal(f.read(META_KEY).fetchedAt, f.start);

    f.advance(30 + 1 / 60);
    assert.equal(f.verdict().status, 'OK', 'payload survives until a late warm-ping can refresh it');
    const second = await getCableHealth({} as never, {} as never);
    assert.ok(second.generatedAt > first.generatedAt, 'recompute at 30 minutes despite retained data');
    assert.equal(f.read(META_KEY).fetchedAt, second.generatedAt);
  });

  it('serves the old canonical snapshot to health while refresh is in flight', async () => {
    const f = clockFixture();
    const first = await getCableHealth({} as never, {} as never);
    f.advance(31);
    const gate = deferred<void>();
    const started = f.gateUpstream(gate.promise);
    const refreshing = getCableHealth({} as never, {} as never);
    await started;
    const duringRefresh = { status: f.verdict().status, payload: f.read(CACHE_KEY) };
    gate.resolve();
    await refreshing;
    assert.equal(duringRefresh.status, 'OK');
    assert.deepEqual(duringRefresh.payload, first);
    assert.equal(f.verdict().status, 'OK');
  });

  it('failed refreshes keep the last-good deadline and cannot create immortal fallback data', async () => {
    const f = clockFixture();
    const first = await getCableHealth({} as never, {} as never);
    const expiry = f.store.get(CACHE_KEY)!.expiresAt;
    f.advance(31);
    f.failUpstream();
    assert.deepEqual(await getCableHealth({} as never, {} as never), first);
    assert.equal(f.verdict().status, 'OK');
    f.advance(61);
    assert.deepEqual(await getCableHealth({} as never, {} as never), first);
    assert.equal(f.read(META_KEY).fetchedAt, f.start);
    assert.equal(f.store.get(CACHE_KEY)!.expiresAt, expiry);

    f.advance(90);
    await getCableHealth({} as never, {} as never);
    assert.equal(f.read(CACHE_KEY), null);
    assert.notEqual(f.verdict().status, 'OK');
    assert.equal(f.read(META_KEY).fetchedAt, f.start);
  });

  it('does not claim a successful empty observation when the first upstream fetch fails', async () => {
    const f = clockFixture();
    f.failUpstream();
    await getCableHealth({} as never, {} as never);
    assert.equal(f.read(CACHE_KEY), null);
    assert.equal(f.read(META_KEY), null);
    assert.notEqual(f.verdict().status, 'OK');
  });

  it('does not advance success metadata if the canonical write fails', async () => {
    const f = clockFixture();
    f.failPublication();
    await getCableHealth({} as never, {} as never);
    assert.equal(f.read(CACHE_KEY), null);
    assert.equal(f.read(META_KEY), null);
  });

  it('cannot overwrite a concurrent fresh publication while repairing an evicted fallback', async () => {
    const f = clockFixture();
    await getCableHealth({} as never, {} as never);
    f.advance(31);
    f.store.delete(CACHE_KEY);
    f.failUpstream();
    const gate = deferred<void>();
    const started = f.gateUpstream(gate.promise);
    const repairing = getCableHealth({} as never, {} as never);
    await started;
    const winner = { generatedAt: Date.now(), cables: {} };
    f.store.set(CACHE_KEY, { value: JSON.stringify(winner), expiresAt: Date.now() + 90 * 60_000 });
    f.store.set(META_KEY, { value: JSON.stringify({ fetchedAt: winner.generatedAt, recordCount: 0 }), expiresAt: Infinity });
    gate.resolve();
    await repairing;
    assert.deepEqual(f.read(CACHE_KEY), winner);
    assert.equal(f.read(META_KEY).fetchedAt, winner.generatedAt);
  });
});
