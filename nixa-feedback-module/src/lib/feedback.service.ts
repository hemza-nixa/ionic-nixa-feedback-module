import { HttpClient, HttpHeaders } from "@angular/common/http";
import { EventEmitter, Injectable } from "@angular/core";

import { Device } from "@ionic-native/device/ngx";
import { Shake } from "@ionic-native/shake/ngx";

import { Logger, LoggingService, LogMessage } from "ionic-logging-service";

import { AppInfo } from "./app-info.model";
import { AttachmentState } from "./attachment-state.model";
import { FeedbackConfiguration } from "./feedback-configuration.model";
import { FeedbackContact } from "./feedback-contact.model";

/**
 * Service providing all the functionality needed for handling shake events.
 */
@Injectable({
	providedIn: "root",
})
export class FeedbackService {

	/**
	 * Event which gets emitted when the device gets shakren.
	 */
	public shaken: EventEmitter<void>;

	private configuration: FeedbackConfiguration;
	private contact: FeedbackContact;

	private logger: Logger;

	/**
	 * Creates a new instance of the service.
	 */
	constructor(
		private httpClient: HttpClient,
		private shake: Shake,
		loggingService: LoggingService,
	) {

		console.log('im module constructor');
		this.logger = loggingService.getLogger("Ionic.Feedback.Service");
		const methodName = "ctor";
		this.logger.entry(methodName);

		this.shaken = new EventEmitter<void>();
		this.configuration = {
			isEnabled: false,
		};

		this.logger.exit(methodName);
	}

	/**
	 * Start watching for shake events.
	 * When the device gets shaken, the onShaken event is triggered.
	 */
	public startWatchForShake(): void {
		const methodName = "startWatchForShake";
		this.logger.entry(methodName);

		if (!this.configuration.isEnabled) {
			this.logger.warn(methodName, "feedback is disabled");
		} else {
			try {
				this.shake.startWatch().subscribe(() => this.onShaken());
				this.logger.debug(methodName, "subscribed for shake events");
			} catch (e) {
				this.logger.warn(methodName, "shaking is not supported", e);
			}
		}

		this.logger.exit(methodName);
	}

	/**
	 * Sends feedback to the configured backend.
	 *
	 * @param timestamp timestamp of the shake, in ISO format.
	 * @param category category of the feedback, one of the configured categories
	 * @param message message the user entered
	 * @param name name of the user
	 * @param email email of the user
	 * @param screenshot base64 encoded screenshot
	 * @param deviceInfo info of the device
	 * @param appInfo info of the app
	 * @param logMessages the last loig messages
	 */
	public async sendFeedback(
		timestamp: string, category: string, message: string, name: string,
		email: string, screenshot: string | undefined, deviceInfo: Device | undefined, appInfo: AppInfo | undefined,
		logMessages: LogMessage[] | undefined): Promise<void> {

		const methodName = "sendFeedback";
		this.logger.entry(methodName);

		const headers = new HttpHeaders()
			.append("Accept", "application/json")
			.append("Authorization", "Basic " + btoa(this.configuration.appKey + ":" + this.configuration.appSecret))
			.append("Content-Type", "application/json");
		const body = {
			appInfo,
			category,
			deviceInfo,
			email,
			logMessages,
			message,
			name,
			screenshot,
			timestamp,
		};

		try {
			this.logger.debug(methodName, `before POST ${this.configuration.url}`, body);
			await this.httpClient.post<void>(this.configuration.url, JSON.stringify(body),
				{ headers, withCredentials: true }).toPromise();
			this.logger.debug(methodName, `after POST ${this.configuration.url}`);
		} catch (e) {
			this.logger.error(methodName, e);
			throw e;
		}

		this.logger.exit(methodName);
	}

	/**
	 * Configures the feedback depending on the given configuration.
	 * @param configuration configuration data.
	 */
	public configure(configuration: FeedbackConfiguration): void {
		const methodName = "configure";
		this.logger.entry(methodName, configuration);

		if (typeof configuration === "undefined") {
			this.logger.error(methodName, "configuration missing");
			throw new Error("FeedbackService: configuration missing");
		}

		// map enum values
		if (typeof configuration.attachLogMessages === "string") {
			configuration.attachLogMessages = AttachmentState[configuration.attachLogMessages as any] as any as AttachmentState;
		}
		if (typeof configuration.attachDeviceInfo === "string") {
			configuration.attachDeviceInfo = AttachmentState[configuration.attachDeviceInfo as any] as any as AttachmentState;
		}
		if (typeof configuration.attachAppInfo === "string") {
			configuration.attachAppInfo = AttachmentState[configuration.attachAppInfo as any] as any as AttachmentState;
		}
		if (typeof configuration.attachScreenshot === "string") {
			configuration.attachScreenshot = AttachmentState[configuration.attachScreenshot as any] as any as AttachmentState;
		}

		this.configuration = configuration;
		this.contact = {};

		this.logger.exit(methodName);
	}

	/**
	 * Retrieve the current configuration.
	 * For internal use only.
	 */
	public getConfiguration(): { configuration: FeedbackConfiguration, contact: FeedbackContact } {
		const methodName = "getConfiguration";
		this.logger.entry(methodName);

		const result = {
			configuration: this.configuration,
			contact: this.contact
		};

		this.logger.exit(methodName, result);
		return result;
	}

	private async onShaken(): Promise<void> {
		const methodName = "onShaken";
		this.logger.entry(methodName);

		this.shaken.emit();

		this.logger.exit(methodName);
	}
}
