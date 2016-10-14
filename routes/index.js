
	"use strict";

	const { Router } 	= require("express");
	const config 		= require("config/");
	const m 			= { mergeParams: true };

	const {
		WalletController,
		CampaignController,
		CharacterController
	} = require("controller/");

	const { CRESTUtil, WalletUtil } = require("util/");

	const user 			= async (req) => (req.session.user ? console.log(req.session.user) || {
		id: 		req.session.user.id,
		name: 		req.session.user.name,
		balance: 	await WalletController.balance(req.session.user.id)
	} : {});

	const loggedIn 		= async (req) => !!(await user(req)).id;

	module.exports = Router(m)
		.get("/",
			async (req, res) => res.render("index", {
				user: 		await user(req),
				campaigns: 	[],
				error: 		req.query.error || "",
				next: 		await WalletUtil.next()
			}))
		.get("/campaigns/",
			async (req, res) => res.render("campaigns", {
				user: 	await user(req),
				campaigns: 	[],
				error: 		req.query.error || "",
				next: 		await WalletUtil.next()
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
						new Date(req.body.start),
						new Date(req.body.end),
						await user(req)
					);
					console.log(campaign);
					res.redirect("/campaigns/" + campaign._id + "/");
				} catch (e) {
					res.redirect("/campaigns/?error=Error");
				}
			})
		.get("/campaigns/:id/",
			async (req, res) => res.render("campaign", {
				user: 		await user(req),
				campaign: 	await CampaignController.find(req.params.id)
			}))
		.get("/login/",
			async (req, res) => res.redirect(await CRESTUtil.generateLoginUrl([], "/")))
		.get("/login/callback/",
			async (req, res) => {
				try {
					req.session.user = await CharacterController.login(req.query.code);
					res.redirect("/");
				} catch (e) {
					res.redirect("/?error=Something+went+wrong.");
				}
			})
		.get("/logout/",
			async (req, res) => !(delete req.session.user) || res.redirect("/"))
		.get("/profile/",
			async (req, res) => res.render("me", { user: await user(req) }))
		.get("/profile/:id/",
			async (req, res) => res.render("profile", { user: await user(req) }));
