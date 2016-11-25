
	"use strict";

	process.env.NODE_PATH = `${__dirname}/src`;
	require("module").Module._initPaths();

	// import the k8s secrets into a global variable
	global.config = require("js-yaml").safeLoad(new Buffer(require("fs").readFileSync("/etc/secrets/config.yaml"), "base64"));

	// setup sentry if dsn is set
	global.err = {};
	if(config.sentry.dsn && config.sentry.dsn != "") {
		const { Client } = require("raven");
		let client = new Client(config.sentry.dsn);
		client.patchGlobal();
		client.setUserContext({
			app: process.env.APP_NAME
		});
		err.raven = client;
	}

	const { WalletUtil } = require("util/");

	if(process.env.APP_NAME == "Wallet") {

		WalletUtil.load_updates();

	} else {

		WalletUtil.load_next();

		const http 						= require("http");
		const express 					= require("express");
		const cookieParser 				= require("cookie-parser");
		const bodyParser 				= require("body-parser");
		const expressSession 			= require("express-session");
		const RedisStore 				= require("connect-redis")(expressSession);
		const helmet 					= require("helmet");

		const app = express()
			.enable("trust proxy")
			.set("json spaces", 2)
			.set("view engine", "ejs")
			.use("/static", express.static(`${__dirname}/public`))
			.use(bodyParser.json())
			.use(bodyParser.urlencoded({ extended: false }))
			.use(cookieParser(config.cookie.secret))
			.use(expressSession({
				store: 		new RedisStore({
					host: 	process.env.REDIS_HOST,
					port: 	parseInt(process.env.REDIS_PORT),
					ttl: 	parseInt(process.env.COOKIE_TTL),
					logErrors: true
				}),
				cookie: 	{ maxAge: parseInt(process.env.COOKIE_TTL) },
				secret: 	config.cookie.secret,
				resave: 	true,
				saveUninitialized: true,
				key: 		process.env.COOKIE_NAME
			}))
			.use(helmet())
			.use(helmet.contentSecurityPolicy({
				directives: {
					defaultSrc: ["'self'"],
					scriptSrc: ["'unsafe-inline'", '*.google-analytics.com'],
					styleSrc: ["'unsafe-inline'"],
					connectSrc: ["'none'"],
					fontSrc: ["fonts.googleapis.com"],
					objectSrc: ["'none'"],
					mediaSrc: ["'none'"],
					frameSrc: ["'none'"]
				}
			}))
			.use(require(`${__dirname}/routes/`));

		const server = http
			.createServer(app)
			.listen(parseInt(process.env.APP_PORT));

		/* REPL */

		const repl = require("repl");
		const r = repl.start({
			prompt: 'Node.js via stdin> ',
			input: process.stdin,
			output: process.stdout,
			useGlobal: true,
			replMode: repl.REPL_MODE_SLOPPY
		});
		r.context.app = app;
		r.context.server = server;

	}
