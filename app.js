
	"use strict";

	process.env.NODE_PATH = __dirname;
	require("module").Module._initPaths();

	const http 						= require("http");
	const express 					= require("express");
	const cookieParser 				= require("cookie-parser");
	const bodyParser 				= require("body-parser");
	const expressSession 			= require("express-session");
	const RedisStore 				= require("connect-redis")(expressSession);

	const config 					= require("config/");

	const { WalletUtil } 			= require("util/");

	WalletUtil.startUpdater();

	const app = express()
		.enable("trust proxy")
		.set("json spaces", 2)
		.set("view engine", "ejs")
		.use("/static", express.static(process.env.NODE_PATH + "/public"))
		.use(bodyParser.json())
		.use(bodyParser.urlencoded({ extended: false }))
		.use(cookieParser(config.cookies.secret))
		.use(expressSession({
			store: 		new RedisStore({
				host: 	config.redis.host,
				port: 	config.redis.port,
				ttl: 	config.cookies.time
			}),
			cookie: 	{ maxAge: config.cookies.time },
			secret: 	config.cookies.secret,
			resave: 	true,
			saveUninitialized: true,
			key: 		config.cookies.name
		}))
		.use(require("routes/"));

	const server = http
		.createServer(app)
		.listen(config.site.port);

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
