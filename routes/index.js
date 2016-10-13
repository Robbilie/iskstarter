
	"use strict";

	const { Router } 	= require("express");
	const config 		= require("config/");
	const m 			= { mergeParams: true };

	const {
		WalletController,
		CampaignController,
		CharacterController
	} = require("controller/");

	const { CRESTUtil } = require("util/");

	const user 			= async (req) => (req.session.user ? {
		id: 		req.session.user.id,
		name: 		req.session.user.name,
		balance: 	await WalletController.balance(req.session.user.id)
	} : {});

	module.exports = Router(m)
		.get("/",
			async (req, res) => res.render("index", { user: await user(), campaigns: [] }))
		.get("/campaigns/",
			async (req, res) => res.render("campaigns", { user: await user(), campaigns: [] }))
		.post("/campaigns/",
			async (req, res) => CampaignController.create())
		.get("/campaigns/:id/",
			async (req, res) => res.render("campaign", { user: await user() }))
		.get("/login/",
			async (req, res) => res.redirect(CRESTUtil.generateLoginUrl([], "/")))
		.get("/login/callback/",
			async (req, res) => !(req.session.user = await CharacterController.login(req.query.code)) || res.redirect("/"))
		.get("/logout/",
			async (req, res) => !(delete req.session.user) || res.redirect("/"))
		.get("/profile/",
			async (req, res) => res.render("me", { user: await user() }))
		.get("/profile/:id/",
			async (req, res) => res.render("profile", { user: await user() }));
