import { useEffect, useState } from "react";
import { Refresh2 } from "iconsax-reactjs";
import { RichEditor } from "./RichEditor";
import styles from "./SoapNoteCard.module.scss";

function ShimmerBlock() {
	return (
		<div className={styles.shimmerWrap}>
			<div className={[styles.shimmerLine, styles.shimmerH].join(" ")} />
			<div className={styles.shimmerLine} />
			<div className={styles.shimmerLine} />
			<div className={[styles.shimmerLine, styles.shimmerShort].join(" ")} />
			<div className={[styles.shimmerLine, styles.shimmerH].join(" ")} />
			<div className={styles.shimmerLine} />
			<div className={[styles.shimmerLine, styles.shimmerShort].join(" ")} />
			<div className={[styles.shimmerLine, styles.shimmerH].join(" ")} />
			<div className={styles.shimmerLine} />
		</div>
	);
}

export function SoapNoteCard({ status, html: htmlProp, onRetry, onChange }) {
	const [html, setHtml] = useState(htmlProp || "");

	useEffect(() => {
		if (typeof htmlProp === "string") setHtml(htmlProp);
	}, [htmlProp]);

	const handleChange = (next) => {
		setHtml(next);
		onChange?.(next);
	};

	if (status === "pending") {
		return (
			<div className={styles.root}>
				<ShimmerBlock />
			</div>
		);
	}

	if (status === "rejected") {
		return (
			<div className={styles.root}>
				<div className={styles.errorState}>
					<p className={styles.errorMsg}>SOAP note could not be generated.</p>
					{onRetry ? (
						<button type="button" className={["vrx-cn-secondary-blue", styles.retryBtn].join(" ")} onClick={onRetry}>
							<Refresh2 size={15} variant="Linear" color="currentColor" />
							Retry
						</button>
					) : null}
				</div>
			</div>
		);
	}

	if (!html) {
		return (
			<div className={styles.root}>
				<div className={styles.errorState}>
					<p className={styles.errorMsg}>No SOAP note available for this visit.</p>
				</div>
			</div>
		);
	}

	return (
		<div className={styles.root}>
			<RichEditor html={html} onChange={handleChange} placeholder="SOAP note will appear here…" />
		</div>
	);
}
