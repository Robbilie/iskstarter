
	"use strict";

	process.env.NODE_PATH = __dirname;
	require("module").Module._initPaths();

	const http 						= require("http");
	const express 					= require("express");
	const { Router } 				= require("express");
	const cookieParser 				= require("cookie-parser");
	const bodyParser 				= require("body-parser");
	const expressSession 			= require("express-session");
	const RedisStore 				= require("connect-redis")(expressSession);

	const config 					= require("config/");

	const routes = Router({ mergeParams: true })
		.get("/", async (req, res) => res.render("index"))
		.get("/campaigns/", async (req, res) => res.render("campaigns"))
		.post("/campaigns/", async (req, res) => {})
		.get("/campaigns/:id/", async (req, res) => res.render("campaign"))
		.get("/login/", async (req, res) => {})
		.get("/profile/", async (req, res) => res.render("me"))
		.get("/profile/:id/", async (req, res) => res.render("profile"));

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
		.use(routes);

	const server = http
		.createServer(app)
		.listen(config.site.port);