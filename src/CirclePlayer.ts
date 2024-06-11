import * as Tone from "tone";

interface CirclePlayerOptions {
	detune?: number | "random";
	offset?: number | "random";
	length?: number | "random";
	fadeIn?: number;
	fadeOut?: number;
	offsetRange?: [number, number];
	buffer?: Tone.ToneAudioBuffer;
	pitch: number;
}

class CirclePlayer {
	private detune: number | "random" = 0;
	private offset: number | "random" = 0;
	private length: number | "random" = 0;
	private fadeIn: number = 0.01;
	private fadeOut: number = 0.01;
	private offsetRange: [number, number] = [0, 1];
	private buffer: Tone.ToneAudioBuffer | null = null;
	private channel: Tone.Volume;
	public panner: Tone.Panner;
	private activeSources: Tone.ToneBufferSource[];
	private pitch: number = 0;

	constructor(options: CirclePlayerOptions) {
		this.getDefaults(options);
		this.channel = new Tone.Volume(0).toDestination();
		this.activeSources = [];
		this.panner = new Tone.Panner(0); // Set initial pan to center
		this.panner.connect(this.channel);
	}

	private getDefaults(options: CirclePlayerOptions): void {
		Object.assign(
			this,
			{
				detune: 0,
				offset: 0,
				length: 0,
				fadeIn: 0.01,
				fadeOut: 0.01,
				offsetRange: [0, 1],
				buffer: "",
			},
			options
		);
	}

	private getRandomElementFromArray<T>(array: T[]): T {
		return array[Math.floor(Math.random() * array.length)];
	}

	private get detuneValue(): number {
		if (this.detune === "random") {
			return (-50 + Math.round(Math.random() * 100)) / 100;
		} else {
			return this.detune;
		}
	}

	private get offsetValue(): number {
		const duration = Math.min(this.bufferDuration, this.lengthValue);
		if (this.offset === "random") {
			return (
				this.offsetRange[0] + Math.random() * (duration * this.offsetRange[1])
			);
		} else {
			return this.offset * duration;
		}
	}

	private get lengthValue(): number {
		const duration = this.bufferDuration;
		if (this.length === "random") {
			return Math.random() * duration;
		} else if (this.length) {
			return Math.min(this.length * duration, 4);
		}
		return duration;
	}

	private get bufferDuration(): number {
		if (!this.buffer) {
			return 0;
		} else {
			return this.buffer.duration;
		}
	}

	public play(pan: number, pitch: number): void {
		const connections: Tone.ToneAudioNode[] = [];

		const ampEnv = new Tone.AmplitudeEnvelope({
			attack: this.fadeIn,
			decay: 0.01,
			sustain: 1.0,
			release: this.fadeOut,
		});
		connections.push(ampEnv);
		console.log(pan);

		//this.panner.pan.rampTo(pan, 0.3); // Set the pan value

		const playbackRate = Tone.intervalToFrequencyRatio(
			pitch - this.detuneValue
		);
		if (this.buffer) {
			const source = new Tone.ToneBufferSource({
				url: this.buffer,
				playbackRate: playbackRate,
				onended: () => {
					connections.forEach((connection) => connection.dispose());
					const index = this.activeSources.indexOf(source);
					if (index !== -1) {
						this.activeSources.splice(index, 1);
					}
					source.dispose();
				},
			}).chain(this.panner);

			this.activeSources.push(source);
			//ampEnv.triggerAttackRelease(this.lengthValue - 0.1);
			source.start(0);
			//source.stop(`+${this.lengthValue}`);
		}
	}
}

export default CirclePlayer;
