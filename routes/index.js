
	"use strict";

	const {
		DBUtil,
		CRESTUtil,
		WalletUtil } 			= require("util/");
	const {
		WalletController,
		CampaignController,
		CharacterController } 	= require("controller/");

	const { Router } 			= require("express");
	const { ensureLoggedIn } 	= require("connect-ensure-login");
	const csrf 					= require("csurf");
	const csrfProtection 		= csrf({ cookie: true });

	const m 					= { mergeParams: true };

	const is_authenticated 		= () => (req, res, next) => {
		const isAuthenticated 	= req.session && req.session.character;
		req.isAuthenticated 	= () => isAuthenticated;
		return next();
	};

	const assign_data 			= () => async (req, res, next) => {
		if(req.isAuthenticated && req.isAuthenticated())
			req.character 		= Object.assign({}, req.session.character, {
				balance: 		await WalletController.balance(req.session.character.id),
				is_admin: 		await CharacterController.is_admin(req.session.character)
			});
		req.error 				= req.query.error || "";
		req.api_update 			= await WalletUtil.next();
		req.total_deposits 		= (await WalletController.in_and_out(1)).wallet_out;
		return next();
	};

	const render_data 			= ({ character, error, api_update, total_deposits }, data = {}) => Object.assign({ character, error, api_update, total_deposits }, data);

	const ensureIsAdmin 		= () => async (req, res, next) => req.character.is_admin ? next() : res.redirect("/?error=You are not an admin");

	module.exports = Router(m)
		// will be used on all routes
		.use(is_authenticated())
		.use(assign_data())
		// normal router
		.get("/", async (req, res) =>
			res.render("index", render_data(req, {
				campaigns: await CampaignController.page({ "data.start": { $lt: Date.now() }, "data.end": { $gt: Date.now() } }, { page: 1, limit: 9 })
			}))
		)
		.get("/disclaimer/", (req, res) =>
			res.render("disclaimer", render_data(req))
		)
		.get("/artwork/", (req, res) =>
			res.render("artwork", render_data(req))
		)
		.use("/login", Router(m)
			.get("/", async (req, res) =>
				res.redirect(await CRESTUtil.generateLoginUrl([], req.session.returnTo || "/"))
			)
			.get("/callback/", async (req, res) => {
				try {
					req.session.character = await CharacterController.login(req.query.code);
					res.redirect(req.query.state || "/");
				} catch (e) {
					console.log(e);
					res.redirect("/?error=" + (e.message || e));
				}
			})
		)
		.get("/logout/", (req, res) => !(delete req.session.character) || res.redirect("/"))
		.use("/me", ensureLoggedIn("/login/"), Router(m)
			.get("/", (req, res) => res.render("me", render_data(req)))
			.get("/campaigns/", async (req, res) =>
				res.render("me_campaigns", render_data(req, {
					campaigns: 	await CampaignController.find_by_owner(req.character, {}, { page: req.query.page - 0 || 1 }),
					page: 		req.query.page || 1
				}))
			)
			.get("/transactions/", async (req, res) =>
				res.render("me_transactions", render_data(req, {
					transactions: 	await WalletController.transactions(req.character.id, {}, { page: req.query.page - 0 || 1 }),
					page: 			req.query.page || 1
				}))
			)
		)
		.use("/campaigns", csrfProtection, Router(m)
			.get("/", async (req, res) =>
				res.render("campaigns", render_data(req, {
					campaigns: 	await CampaignController.page({ "data.start": { $lt: Date.now() }, "data.end": { $gt: Date.now() } }, { page: req.query.page - 0 || 1 }),
					page: 		req.query.page || 1,
					csrf_token: req.csrfToken()
				}))
			)
			.post("/", ensureLoggedIn("/login/"), async (req, res) => {
				try {
					let campaign = await CampaignController.create(
						req.body.name,
						req.body.description,
						req.character,
						req.body.header,
						parseFloat(req.body.goal),
						new Date(req.body.start).getTime(),
						new Date(req.body.end).getTime()
					);
					console.log(campaign);
					res.redirect(`/campaigns/${campaign._id}/`);
				} catch (e) {
					console.log(e);
					res.redirect(`/campaigns/?error=${e.message || e}`);
				}
			})
			.use("/:id", Router(m)
				.get("/", async (req, res) => {
					try {
						res.render("campaign", render_data(req, {
							campaign: 	await CampaignController.findOne(DBUtil.to_id(req.params.id)),
							tax: 		parseFloat(process.env.TAX),
							csrf_token: req.csrfToken()
						}));
					} catch (error) {
						console.log(error);
						res.render("error", render_data(req, { error }));
					}
				})
				.post("/", ensureLoggedIn("/login/"), ensureIsAdmin(), async (req, res) => {
					try {
						await CampaignController.update(
							DBUtil.to_id(req.params.id),
							req.body.name,
							req.body.description,
							{ id: req.body.owner_id - 0, name: req.body.owner_name },
							req.body.header,
							parseFloat(req.body.goal),
							new Date(req.body.start).getTime(),
							new Date(req.body.end).getTime(),
							req.character
						);
						res.redirect(`/campaigns/${req.params.id}/`);
					} catch (e) {
						console.log(e);
						res.redirect(`/campaigns/${req.params.id}/?error=${e.message || e}`);
					}
				})
				.post("/donate/", ensureLoggedIn("/login/"), async (req, res) => {
					try {
						await CampaignController.donate(DBUtil.to_id(req.params.id), Math.max(req.body.amount - 0, 0), req.character);
						res.redirect(`/campaigns/${req.params.id}/`);
					} catch (e) {
						console.log(e);
						res.redirect(`/campaigns/${req.params.id}/?error=${e.message || e}`);
					}
				})
				.post("/accept/", ensureLoggedIn("/login/"), ensureIsAdmin(), async (req, res) => {
					try {
						await CampaignController.approve(DBUtil.to_id(req.params.id), req.character);
						res.redirect(`/campaigns/${req.params.id}/`);
					} catch (e) {
						console.log(e);
						res.redirect(`/campaigns/${req.params.id}/?error=${e.message || e}`);
					}
				})
				.post("/reject/", ensureLoggedIn("/login/"), ensureIsAdmin(), async (req, res) => {
					try {
						await CampaignController.reject(DBUtil.to_id(req.params.id), req.body.description, req.character);
						res.redirect(`/campaigns/${req.params.id}/`);
					} catch (e) {
						console.log(e);
						res.redirect(`/campaigns/${req.params.id}/?error=${e.message || e}`);
					}
				})
			)
		)
		.get("/completed/", async (req, res) =>
			res.render("completed", render_data(req, {
				campaigns: 	await CampaignController.completed({}, { page: req.query.page - 0 || 1 }),
				page: 		req.query.page || 1
			}))
		)
		.get("/rejected/", async (req, res) =>
			res.render("rejected", render_data(req, {
				campaigns: 	await CampaignController.rejected({}, { page: req.query.page - 0 || 1 }),
				page: 		req.query.page || 1
			}))
		)
		.get("/unapproved/", ensureLoggedIn("/login/"), ensureIsAdmin(), csrfProtection, async (req, res) =>
			res.render("unapproved", render_data(req, {
				campaigns: 	await CampaignController.unapproved({}, { page: req.query.page - 0 || 1 }),
				page: 		req.query.page || 1,
				csrf_token: req.csrfToken()
			}))
		);