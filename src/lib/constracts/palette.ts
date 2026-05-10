export const GRID_INITIAL_SIZE = 8;
export const GRID_MAX_SIZE = 64;
// アプリ固有のnull絵文字（透明・正方形）。shortcodeとURLが確定したら差し替える
export const NULL_EMOJI_SHORTCODE = 'empty';
export const NULL_EMOJI_URL =
	'https://github.com/uchijo/my-emoji/blob/main/general/empty.png?raw=true';
// アプリ用 kind 30030 をホストするpubkeyとリレー。確定したら差し替える
export const APP_30030_PUBKEY = 'e62f27d2814a25171c466d2d7612ad1a066db1362b4e259db5c076f9e6b21cb7';
export const APP_30030_DTAG = 'emoji-edit-empty-only';
export const APP_30030_RELAY = 'wss://nos.lol';
export const APP_30030_ATAG = `30030:${APP_30030_PUBKEY}:${APP_30030_DTAG}`;
