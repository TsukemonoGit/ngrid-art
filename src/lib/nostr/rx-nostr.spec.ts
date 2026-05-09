import { beforeEach, describe, expect, it, vi } from 'vitest';

type PublishPayload = {
	kind: number;
	content: string;
	tags: string[][];
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const castMock = vi.fn(async (_event: PublishPayload) => {});

vi.mock('@rx-nostr/crypto', () => ({
	verifier: {}
}));

vi.mock('$lib/constracts/relays', () => ({
	initRelays: []
}));

vi.mock('rx-nostr', () => {
	class MockStream {
		pipe() {
			return this;
		}

		subscribe() {
			return { unsubscribe: vi.fn() };
		}
	}

	return {
		createRxNostr: vi.fn(() => ({
			setDefaultRelays: vi.fn(),
			createConnectionStateObservable: vi.fn(() => new MockStream()),
			use: vi.fn(() => new MockStream()),
			cast: castMock
		})),
		createRxForwardReq: vi.fn(() => ({ emit: vi.fn() })),
		createRxBackwardReq: vi.fn(() => ({ emit: vi.fn(), over: vi.fn() })),
		uniq: vi.fn(() => (stream: unknown) => stream),
		latest: vi.fn(() => (stream: unknown) => stream)
	};
});

const ownerPubkey = 'a'.repeat(64);
const otherPubkey = 'b'.repeat(64);
const atagA = `30030:${ownerPubkey}:alpha`;
const atagB = `30030:${ownerPubkey}:beta`;
const atagC = `30030:${otherPubkey}:gamma`;

async function setupModuleState(kind10030Tags: string[][]) {
	const rxNostrModule = await import('./rx-nostr');
	const { kind10030 } = await import('$lib/stores/storages');
	const { loginUser } = await import('$lib/stores/user');

	loginUser.value = ownerPubkey;
	kind10030.value = {
		pubkey: ownerPubkey,
		content: 'my list',
		created_at: 100,
		tags: kind10030Tags
	} as never;

	return rxNostrModule;
}

describe('rx-nostr kind10030 update payload', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.resetModules();
	});

	it('addKind30030ToMyKind10030 generates kind:10030 event with merged a-tags', async () => {
		expect.assertions(3);

		const { addKind30030ToMyKind10030 } = await setupModuleState([
			['d', 'my-emoji-list'],
			['a', atagA],
			['p', otherPubkey]
		]);

		await addKind30030ToMyKind10030(atagB);

		expect(castMock).toHaveBeenCalledTimes(1);
		expect(castMock).toHaveBeenCalledWith({
			kind: 10030,
			content: 'my list',
			tags: [
				['d', 'my-emoji-list'],
				['p', otherPubkey],
				['a', atagA],
				['a', atagB]
			]
		});
		const firstCall = castMock.mock.calls[0];
		if (!firstCall) {
			throw Error('cast was not called');
		}
		expect(firstCall[0].tags.filter((tag) => tag[0] === 'a')).toHaveLength(2);
	});

	it('addKind30030ToMyKind10030 does not publish when atag already exists', async () => {
		expect.assertions(1);

		const { addKind30030ToMyKind10030 } = await setupModuleState([
			['d', 'my-emoji-list'],
			['a', atagA]
		]);

		await addKind30030ToMyKind10030(atagA);

		expect(castMock).not.toHaveBeenCalled();
	});

	it('removeKind30030FromMyKind10030 generates kind:10030 event without removed a-tag', async () => {
		expect.assertions(2);

		const { removeKind30030FromMyKind10030 } = await setupModuleState([
			['d', 'my-emoji-list'],
			['p', otherPubkey],
			['a', atagA],
			['a', atagB]
		]);

		await removeKind30030FromMyKind10030(atagA);

		expect(castMock).toHaveBeenCalledWith({
			kind: 10030,
			content: 'my list',
			tags: [
				['d', 'my-emoji-list'],
				['p', otherPubkey],
				['a', atagB]
			]
		});
		expect(castMock).toHaveBeenCalledTimes(1);
	});

	it('removeKind30030FromMyKind10030 does not publish when target atag does not exist', async () => {
		expect.assertions(1);

		const { removeKind30030FromMyKind10030 } = await setupModuleState([
			['d', 'my-emoji-list'],
			['a', atagA]
		]);

		await removeKind30030FromMyKind10030(atagB);

		expect(castMock).not.toHaveBeenCalled();
	});
});

describe('rx-nostr kind10030 guard and tag extraction', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.resetModules();
	});

	it('addKind30030ToMyKind10030 throws on invalid atag', async () => {
		expect.assertions(2);

		const { addKind30030ToMyKind10030 } = await setupModuleState([['a', atagA]]);

		await expect(addKind30030ToMyKind10030('invalid-atag')).rejects.toThrow('Invalid atag');
		expect(castMock).not.toHaveBeenCalled();
	});

	it('removeKind30030FromMyKind10030 throws on invalid atag', async () => {
		expect.assertions(2);

		const { removeKind30030FromMyKind10030 } = await setupModuleState([['a', atagA]]);

		await expect(removeKind30030FromMyKind10030('invalid-atag')).rejects.toThrow('Invalid atag');
		expect(castMock).not.toHaveBeenCalled();
	});

	it('addKind30030ToMyKind10030 throws when kind10030 is not loaded', async () => {
		expect.assertions(2);

		const { addKind30030ToMyKind10030 } = await import('./rx-nostr');
		const { kind10030 } = await import('$lib/stores/storages');
		const { loginUser } = await import('$lib/stores/user');

		loginUser.value = ownerPubkey;
		kind10030.value = null;

		await expect(addKind30030ToMyKind10030(atagA)).rejects.toThrow(
			'Current kind10030 is not loaded'
		);
		expect(castMock).not.toHaveBeenCalled();
	});

	it('removeKind30030FromMyKind10030 throws when kind10030 owner differs from login user', async () => {
		expect.assertions(2);

		const { removeKind30030FromMyKind10030 } = await import('./rx-nostr');
		const { kind10030 } = await import('$lib/stores/storages');
		const { loginUser } = await import('$lib/stores/user');

		loginUser.value = ownerPubkey;
		kind10030.value = {
			pubkey: otherPubkey,
			content: 'not mine',
			created_at: 100,
			tags: [['a', atagC]]
		} as never;

		await expect(removeKind30030FromMyKind10030(atagC)).rejects.toThrow(
			'Current kind10030 does not belong to login user'
		);
		expect(castMock).not.toHaveBeenCalled();
	});

	it('getCurrentKind10030ATags returns only valid replaceable event specifier a-tags', async () => {
		expect.assertions(1);

		const { getCurrentKind10030ATags } = await import('./rx-nostr');
		const { kind10030 } = await import('$lib/stores/storages');

		kind10030.value = {
			pubkey: ownerPubkey,
			content: 'my list',
			created_at: 100,
			tags: [['a', atagA], ['a', atagC], ['a', '30030:too-short:bad'], ['a'], ['e', 'event-id']]
		} as never;

		expect(getCurrentKind10030ATags()).toEqual([atagA, atagC]);
	});
});
