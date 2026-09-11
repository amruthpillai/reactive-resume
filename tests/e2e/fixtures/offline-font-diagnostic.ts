export function assertPdfDownloadReceived(downloadStatus: string): asserts downloadStatus is "received" {
	if (downloadStatus !== "received") {
		throw new Error(`PDF download diagnostic did not receive a download: ${downloadStatus}`);
	}
}
