import { createGlobalState } from './globalRunes.svelte';
import type { Event as NostrEvent } from 'nostr-typedef';
//リレーリスト
export const kind10002 = createGlobalState<NostrEvent>(null, 'KIND10002_KEY');
