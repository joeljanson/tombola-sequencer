import React, { useEffect, useRef } from "react";
import Matter from "matter-js";
import { ToneAudioBuffer } from "tone";
import CirclePlayer from "./CirclePlayer";
import { constrain, map } from "./utils";

const ShapeAndBall: React.FC = () => {
	const sceneRef = useRef<HTMLDivElement>(null);
	const engineRef = useRef<Matter.Engine | null>(null); // Ref to store the engine
	const keyCircleMapRef = useRef<
		Map<string, { body: Matter.Body; player: CirclePlayer }>
	>(new Map()); // Ref to store key-circle map
	const pressedKeys = useRef<Set<string>>(new Set()); // Ref to track pressed keys
	const audioBufferRef = useRef<ToneAudioBuffer | null>(null); // Ref to store the audio buffer

	useEffect(() => {
		const { Engine, Render, Bodies, Composite, Runner, Events } = Matter;

		const engine = Engine.create();
		engineRef.current = engine; // Store engine in ref
		const render = Render.create({
			element: sceneRef.current!,
			engine: engine,
			options: {
				width: 800,
				height: 600,
				wireframes: false,
				background: "#252525", // Set background to ensure visibility
			},
		});

		// Load the audio buffer
		const buffer = new ToneAudioBuffer("/singleNote.mp3", () => {
			console.log("Audio loaded!");
			audioBufferRef.current = buffer;
		});

		// Set the gravity of the world
		engine.gravity.y = 0.4; // Set gravity to zero or adjust as needed
		//engine.timing.timeScale = 0.9; // Adjust this value to change the speed of the simulation
		//engine.world.gravity.x = 0; // Optional, if you want to change the gravity in the x-axis as well

		// Create a polygon with a random number of sides between 3 and 8
		//const sides = Math.floor(Math.random() * 6) + 3;
		const sides = 6;
		const radius = 150;
		const cornerRadius = 1.25; // Radius of the rounded corners
		const angleStep = (2 * Math.PI) / sides;
		const vertices = Array.from({ length: sides }).map((_, i) => {
			const angle = i * angleStep;
			return {
				x: 400 + radius * Math.cos(angle),
				y: 300 + radius * Math.sin(angle),
			};
		});

		const walls = vertices.map((v, i) => {
			const nextV = vertices[(i + 1) % sides];
			return Bodies.rectangle(
				(v.x + nextV.x) / 2,
				(v.y + nextV.y) / 2,
				Matter.Vector.magnitude(Matter.Vector.sub(nextV, v)),
				2,
				{
					isStatic: true,
					angle: Math.atan2(nextV.y - v.y, nextV.x - v.x),
					restitution: 1.0, // Ensure the walls are also bouncy
					friction: 0,
					frictionStatic: 0,
					render: { fillStyle: "white" },
				}
			);
		});

		// Create small circles at each vertex for rounded corners
		const corners = vertices.map((v) =>
			Bodies.circle(v.x, v.y, cornerRadius, {
				isStatic: true,
				render: { fillStyle: "white" },
			})
		);

		// Calculate leftmost and rightmost x values of the polygon
		const leftmostX = Math.min(...vertices.map((v) => v.x));
		const rightmostX = Math.max(...vertices.map((v) => v.x));

		// Combine walls into a single composite body
		const rotatingShape = Composite.create({ bodies: [...walls, ...corners] });

		// Add the shapes to the world
		Composite.add(engine.world, [rotatingShape]);

		const rotationSpeed = 0.007; // Adjust this value to change the rotation speed

		// Apply constant angular velocity to rotate the shape
		Events.on(engine, "beforeUpdate", () => {
			Composite.rotate(rotatingShape, rotationSpeed, { x: 400, y: 300 });

			// Track x position of each ball
			for (let [key, object] of keyCircleMapRef.current.entries()) {
				const pan = Math.max(
					-1,
					Math.min(
						1,
						((object.body.position.x - leftmostX) / (rightmostX - leftmostX)) *
							2 -
							1
					)
				);
				object.player.panner.pan.rampTo(pan, 0.1); // Set the pan value
			}
		});

		// Function to trigger when ball hits a polygon wall
		const handleCollision = (body: Matter.Body) => {
			// Get the entries iterator of the map
			const entries = keyCircleMapRef.current.entries();

			// Iterate over the entries
			let entry = entries.next();
			while (!entry.done) {
				const [key, circle] = entry.value;

				if (circle.body === body) {
					//console.log(`Ball hit a polygon wall! Associated letter: ${key}`);
					const arrayOfKeys = "awsedftgyhujkolpöä".split("");
					const mapping = new Map();
					arrayOfKeys.forEach((a, index) => mapping.set(a, index - 12));
					const pitch = mapping.get(key);
					circle.player.play(0, pitch); // Play the sound
					break;
				}

				entry = entries.next();
			}
		};

		// Collision handling
		Events.on(engine, "collisionStart", function (event) {
			const pairs = event.pairs;
			pairs.forEach((pair) => {
				if (pair.bodyA.isStatic && !pair.bodyB.isStatic) {
					// Ball hit a static body (polygon wall)
					handleCollision(pair.bodyB);

					// Invert velocity for bouncing effect
					Matter.Body.setVelocity(pair.bodyB, {
						x: pair.bodyB.velocity.x * -1,
						y: pair.bodyB.velocity.y * -1,
					});
				}
				if (pair.bodyB.isStatic && !pair.bodyA.isStatic) {
					// Ball hit a static body (polygon wall)
					handleCollision(pair.bodyA);

					// Invert velocity for bouncing effect
					Matter.Body.setVelocity(pair.bodyA, {
						x: pair.bodyA.velocity.x * -1,
						y: pair.bodyA.velocity.y * -1,
					});
				}
			});
		});

		// Run the engine and renderer
		const runner = Runner.create();
		Runner.run(runner, engine);
		Render.run(render);

		// Handle key presses to add circles
		const handleKeyDown = (event: KeyboardEvent) => {
			const key = event.key;
			if (pressedKeys.current.has(key)) return; // If key is already pressed, do nothing
			pressedKeys.current.add(key); // Add key to the set of pressed keys
			const arrayOfKeys = "awsedftgyhujkolpöä".split("");
			const mapping = new Map();
			arrayOfKeys.forEach((a, index) => mapping.set(a, index - 12));
			if (mapping.has(key)) {
				addCircle(key);
			}
		};

		// Handle key up to remove from pressed keys
		const handleKeyUp = (event: KeyboardEvent) => {
			const key = event.key;
			pressedKeys.current.delete(key); // Remove key from the set of pressed keys
			const arrayOfKeys = "awsedftgyhujkolpöä".split("");
			const mapping = new Map();
			arrayOfKeys.forEach((a, index) => mapping.set(a, index - 12));
			if (mapping.has(key)) {
				removeCircle(key);
			}
		};

		// Add event listener for key presses
		window.addEventListener("keydown", handleKeyDown);
		window.addEventListener("keyup", handleKeyUp);

		// Cleanup function
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
			window.removeEventListener("keyup", handleKeyUp);
			Render.stop(render);
			Engine.clear(engine);
			render.canvas.remove();
			render.textures = {};
		};
	}, []); // Empty dependency array to ensure this effect runs only once on mount

	const addCircle = (key: string) => {
		const { Bodies, Composite } = Matter;

		// Create a ball with increased restitution (bounciness)
		const ball = Bodies.circle(400, 200, 10, {
			restitution: 1.0, // Increase this value to make the ball more bouncy
			friction: 0,
			frictionAir: 0.001, // Slight air friction to keep the motion realistic
			render: {
				fillStyle: "white",
			},
		});

		// Log the ball creation for debugging
		console.log(`Adding ball for key ${key}`, ball);

		// Add the circle to the world
		if (engineRef.current) {
			Composite.add(engineRef.current.world, ball);
		}

		const circlePlayer = new CirclePlayer({
			buffer: audioBufferRef.current!,
			offset: "random",
			pitch: 0,
		});

		const object = {
			body: ball as Matter.Body,
			player: circlePlayer as CirclePlayer,
		};

		// Update the map with the new circle
		keyCircleMapRef.current.set(key, object);
	};

	const removeCircle = (key: string) => {
		const { Composite } = Matter;

		// Get the ball associated with the key
		const ball = keyCircleMapRef.current.get(key);

		// If the ball exists, remove it from the world
		if (ball && engineRef.current) {
			Composite.remove(engineRef.current.world, ball.body);
			console.log(`Removing ball for key ${key}`, ball);
			keyCircleMapRef.current.delete(key);
		}
	};

	return <div ref={sceneRef}></div>;
};

export default ShapeAndBall;
