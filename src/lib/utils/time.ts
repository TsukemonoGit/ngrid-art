/**
 * 日付の表示オプションを生成
 */
function getDateFormatOptions(date: Date, now: Date, full: boolean): Intl.DateTimeFormatOptions {
	const sameYear = date.getFullYear() === now.getFullYear();
	const sameMonth = sameYear && date.getMonth() === now.getMonth();
	const sameDay = sameMonth && date.getDate() === now.getDate();

	const options: Intl.DateTimeFormatOptions = {
		hour: '2-digit',
		minute: '2-digit'
	};

	if (full || !sameDay) {
		options.month = '2-digit';
		options.day = '2-digit';
	}

	if (full || !sameYear) {
		options.year = 'numeric';
	}

	return options;
}

/**
 * 汎用フォーマット関数（Date）
 */
function formatDateWithOptions(date: Date, options: Intl.DateTimeFormatOptions): string {
	return date.toLocaleString([], options);
}

/**
 * Unix秒からフォーマット
 */
export function formatAbsoluteDateFromUnix(unixTime: number, full: boolean = false): string {
	const date = new Date(unixTime * 1000);
	return formatAbsoluteDateFromDate(date, full);
}

/**
 * Dateからフォーマット
 */
export function formatAbsoluteDateFromDate(date: Date, full: boolean = false): string {
	const now = new Date();
	const options = getDateFormatOptions(date, now, full);
	return formatDateWithOptions(date, options);
}

// 日付フォーマット関数
export const formatDate = (date: Date): string => {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
};
