
	"use strict";

	const { Router } 	= require("express");
	const m 			= { mergeParams: true };

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
		isAdmin: 	await CharacterController.isAdmin(req.session.user)
	} : {});

	const data 			= async (req) => ({
		user: 		await user(req),
		error: 		req.query.error || "",
		total: 		(await WalletController.balance(98479854)) + (await WalletController.balance(1)),
		next: 		await WalletUtil.next()
	});

	const loggedIn 		= async (req) => !!(await user(req)).id;

	module.exports = Router(m)
		.get("/",
			async (req, res) => res.render("index", {
				campaigns: 	await CampaignController.page({ "data.start": { $lt: Date.now() }, "data.end": { $gt: Date.now() } }, 1, 9),
				data: 		await data(req)
			}))
		.get("/campaigns/",
			async (req, res) => res.render("campaigns", {
				campaigns: 	await CampaignController.page({ "data.start": { $lt: Date.now() }, "data.end": { $gt: Date.now() } }),
				data: 		await data(req),
				page: 		1
			}))
		.get("/campaigns/page/:page/",
			async (req, res) => res.render("campaigns", {
				campaigns: 	await CampaignController.page({ "data.start": { $lt: Date.now() }, "data.end": { $gt: Date.now() } }, req.params.page - 0),
				data: 		await data(req),
				page: 		req.params.page - 0
			}))
		.post("/campaigns/",
			async (req, res) => {
				console.log(req.body);
				try {
					if (!(await loggedIn(req)))
						throw new Error("not logged in");
					let campaign = await CampaignController.create(
						req.body.name,
						req.body.description,
						req.body.header,
						req.body.goal - 0,
						new Date(req.body.start).getTime(),
						new Date(req.body.end).getTime(),
						await user(req)
					);
					console.log(campaign);
					res.redirect("/campaigns/" + campaign._id + "/");
				} catch (e) {
					res.redirect("/campaigns/?error=" + (e.message || e));
				}
			})
		.get("/campaigns/:id/",
			async (req, res) => {
				try {
					res.render("campaign", {
						campaign: 	await CampaignController.find(req.params.id),
						data: 		await data(req)
					});
				} catch (error) {
					res.render("error", {
						data: Object.assign(await data(req), { error })
					});
				}
			})
		.post("/campaigns/:id/",
			async (req, res) => {
				try {
					await CampaignController.update(
						DBUtil.to_id(req.params.id),
						req.body.name,
						req.body.description,
						req.body.header,
						req.body.goal - 0,
						new Date(req.body.start).getTime(),
						new Date(req.body.end).getTime(),
						{ id: req.body.ownerID, name: req.body.ownerName },
						await user(req)
					);
					res.redirect("/campaigns/" + req.params.id + "/");
				} catch (e) {
					res.redirect("/campaigns/" + req.params.id + "/?error=" + (e.message || e));
				}
			})
		.post("/campaigns/:id/donate/",
			async (req, res) => {
				try {
					await CampaignController.donate(req.params.id, Math.max(req.body.amount - 0, 0), await user(req));
					res.redirect("/campaigns/" + req.params.id + "/");
				} catch (e) {
					res.redirect("/campaigns/" + req.params.id + "/?error=" + (e.message || e));
				}
			})
		.get("/login/",
			async (req, res) => res.redirect(await CRESTUtil.generateLoginUrl([], "/")))
		.get("/login/callback/",
			async (req, res) => {
				try {
					req.session.user = await CharacterController.login(req.query.code);
					res.redirect("/");
				} catch (e) {
					res.redirect("/?error=" + (e.message || e));
				}
			})
		.get("/logout/",
			async (req, res) => !(delete req.session.user) || res.redirect("/"))
		.get("/profile/",
			async (req, res) => res.render("me", {
				data: await data(req)
			}))
		.get("/profile/:id/",
			async (req, res) => res.render("profile", {
				data: await data(req)
			}))
		.get("/disclaimer/",
			async (req, res) => res.render("disclaimer", {
				data: await data(req)
			}))
		.get("/artwork/",
			async (req, res) => res.render("artwork", {
				data: await data(req)
			}));
