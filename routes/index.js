
	"use strict";

	const { Router } 		= require("express");
	const m 				= { mergeParams: true };
	const csrf 				= require("csurf");
	const csrfProtection 	= csrf({ cookie: true });

	const {
		WalletController,
		CampaignController,
		CharacterController
	} = require("controller/");

	const { DBUtil, CRESTUtil, WalletUtil } = require("util/");

	const user 			= async (req) => (req.session.user ? console.log(req.session.user) || {
		id: 		req.session.user.id,
		name: 		req.session.user.name,
		balance: 	await WalletController.balance(req.session.user.id),
		is_admin: 	await CharacterController.is_admin(req.session.user)
	} : {});

	const data 			= async (req) => ({
		user: 		await user(req),
		error: 		req.query.error || "",
		total: 		(await WalletController.in_and_out(1)).wallet_out,
		next: 		await WalletUtil.next()
	});

	const logged_in 		= (req) => req.session && req.session.user && req.session.user.id;

	module.exports = Router(m)
		.get("/",
			async (req, res) => res.render("index", {
				campaigns: 	await CampaignController.page({ "data.start": { $lt: Date.now() }, "data.end": { $gt: Date.now() } }, { page: 1, limit: 9 }),
				data: 		await data(req)
			}))
		.get("/campaigns/", csrfProtection,
			async (req, res) => res.render("campaigns", {
				campaigns: 	await CampaignController.page({ "data.start": { $lt: Date.now() }, "data.end": { $gt: Date.now() } }, { page: req.query.page - 0 || 1 }),
				data: 		await data(req),
				page: 		req.query.page || 1,
				csrf_token: req.csrfToken()
			}))
		.post("/campaigns/", csrfProtection,
			async (req, res) => {
				console.log(req.body);
				try {
					if (!logged_in(req))
						throw new Error("not logged in");
					let campaign = await CampaignController.create(
						req.body.name,
						req.body.description,
						await user(req),
						req.body.header,
						req.body.goal - 0,
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
		.get("/campaigns/:id/", csrfProtection,
			async (req, res) => {
				try {
					res.render("campaign", {
						campaign: 	await CampaignController.findOne(DBUtil.to_id(req.params.id)),
						data: 		await data(req),
						tax: 		parseFloat(process.env.TAX),
						csrf_token: req.csrfToken()
					});
				} catch (error) {
					console.log(error);
					res.render("error", {
						data: Object.assign(await data(req), { error })
					});
				}
			})
		.post("/campaigns/:id/", csrfProtection,
			async (req, res) => {
				try {
					await CampaignController.update(
						DBUtil.to_id(req.params.id),
						req.body.name,
						req.body.description,
						{ id: req.body.owner_id - 0, name: req.body.owner_name },
						req.body.header,
						req.body.goal - 0,
						new Date(req.body.start).getTime(),
						new Date(req.body.end).getTime(),
						await user(req)
					);
					res.redirect(`/campaigns/${req.params.id}/`);
				} catch (e) {
					console.log(e);
					res.redirect(`/campaigns/${req.params.id}/?error=${e.message || e}`);
				}
			})
		.post("/campaigns/:id/donate/", csrfProtection,
			async (req, res) => {
				try {
					await CampaignController.donate(DBUtil.to_id(req.params.id), Math.max(req.body.amount - 0, 0), await user(req));
					res.redirect(`/campaigns/${req.params.id}/`);
				} catch (e) {
					console.log(e);
					res.redirect(`/campaigns/${req.params.id}/?error=${e.message || e}`);
				}
			})
		.post("/campaigns/:id/accept/", csrfProtection,
			async (req, res) => {
				try {
					await CampaignController.approve(DBUtil.to_id(req.params.id), await user(req));
					res.redirect(`/campaigns/${req.params.id}/`);
				} catch (e) {
					console.log(e);
					res.redirect(`/campaigns/${req.params.id}/?error=${e.message || e}`);
				}
			})
		.post("/campaigns/:id/reject/", csrfProtection,
			async (req, res) => {
				try {
					await CampaignController.reject(DBUtil.to_id(req.params.id), req.body.description, await user(req));
					res.redirect(`/campaigns/${req.params.id}/`);
				} catch (e) {
					console.log(e);
					res.redirect(`/campaigns/${req.params.id}/?error=${e.message || e}`);
				}
			})
		.get("/rejected/",
			async (req, res) => res.render("rejected", {
				campaigns: 	await CampaignController.rejected({}, { page: req.query.page - 0 || 1 }),
				data: 		await data(req),
				page: 		req.query.page || 1
			}))
		.get("/completed/",
			async (req, res) => res.render("completed", {
				campaigns: 	await CampaignController.completed({}, { page: req.query.page - 0 || 1 }),
				data: 		await data(req),
				page: 		req.query.page || 1
			}))
		.get("/unapproved/", csrfProtection,
			async (req, res) => res.render("unapproved", {
				campaigns: 	await CampaignController.unapproved({}, { page: req.query.page - 0 || 1 }, await user(req)),
				data: 		await data(req),
				page: 		req.query.page || 1,
				csrf_token: req.csrfToken()
			}))
		.get("/login/",
			async (req, res) => res.redirect(await CRESTUtil.generateLoginUrl([], "/")))
		.get("/login/callback/",
			async (req, res) => {
				try {
					req.session.user = await CharacterController.login(req.query.code);
					res.redirect("/");
				} catch (e) {
					console.log(e);
					res.redirect("/?error=" + (e.message || e));
				}
			})
		.get("/logout/",
			async (req, res) => !(delete req.session.user) || res.redirect("/"))
		.get("/me/",
			async (req, res) => {
				try {
					if (!logged_in(req))
						throw new Error("not logged in");
					res.render("me", {
						data: await data(req)
					});
				} catch (e) {
					console.log(e);
					res.redirect(`/?error=${e.message || e}`);
				}
			})
		.get("/me/campaigns/",
			async (req, res) => {
				try {
					if (!logged_in(req))
						throw new Error("not logged in");
					res.render("me_campaigns", {
						campaigns: 	await CampaignController.find_by_owner(await user(req), {}, { page: req.query.page - 0 || 1 }),
						data: 		await data(req),
						page: 		req.query.page || 1
					});
				} catch (e) {
					console.log(e);
					res.redirect(`/?error=${e.message || e}`);
				}
			})
		.get("/me/transactions/",
			async (req, res) => {
				try {
					if (!logged_in(req))
						throw new Error("not logged in");
					res.render("me_transactions", {
						transactions: 	await WalletController.transactions(req.session.user.id, {}, { page: req.query.page - 0 || 1 }),
						data: 			await data(req),
						page: 			req.query.page || 1
					});
				} catch (e) {
					console.log(e);
					res.redirect(`/?error=${e.message || e}`);
				}
			})
		.get("/disclaimer/",
			async (req, res) => res.render("disclaimer", {
				data: await data(req)
			}))
		.get("/artwork/",
			async (req, res) => res.render("artwork", {
				data: await data(req)
			}));
