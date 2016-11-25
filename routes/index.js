
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
		is_admin: 	await CharacterController.is_admin(req.session.user)
	} : {});

	const data 			= async (req) => ({
		user: 		await user(req),
		error: 		req.query.error || "",
		total: 		(await WalletController.in_and_out(1)).walletOut,
		next: 		await WalletUtil.next()
	});

	const loggedIn 		= async (req) => !!(await user(req)).id;

	module.exports = Router(m)
		.get("/",
			async (req, res) => res.render("index", {
				campaigns: 	await CampaignController.page({ "data.start": { $lt: Date.now() }, "data.end": { $gt: Date.now() } }, { page: 1, limit: 9 }),
				data: 		await data(req)
			}))
		.get("/campaigns/",
			async (req, res) => res.render("campaigns", {
				campaigns: 	await CampaignController.page({ "data.start": { $lt: Date.now() }, "data.end": { $gt: Date.now() } }, { page: req.query.page - 0 || 1 }),
				data: 		await data(req),
				page: 		req.query.page || 1
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
						await user(req),
						req.body.header,
						req.body.goal - 0,
						new Date(req.body.start).getTime(),
						new Date(req.body.end).getTime()
					);
					console.log(campaign);
					res.redirect(`/campaigns/${campaign._id}/`);
				} catch (e) {
					res.redirect(`/campaigns/?error=${e.message || e}`);
				}
			})
		.get("/campaigns/:id/",
			async (req, res) => {
				try {
					res.render("campaign", {
						campaign: 	await CampaignController.findOne(DBUtil.to_id(req.params.id)),
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
						{ id: req.body.ownerID, name: req.body.ownerName },
						req.body.header,
						req.body.goal - 0,
						new Date(req.body.start).getTime(),
						new Date(req.body.end).getTime(),
						await user(req)
					);
					res.redirect(`/campaigns/${req.params.id}/`);
				} catch (e) {
					res.redirect(`/campaigns/${req.params.id}/?error=${e.message || e}`);
				}
			})
		.post("/campaigns/:id/donate/",
			async (req, res) => {
				try {
					await CampaignController.donate(DBUtil.to_id(req.params.id), Math.max(req.body.amount - 0, 0), await user(req));
					res.redirect(`/campaigns/${req.params.id}/`);
				} catch (e) {
					res.redirect(`/campaigns/${req.params.id}/?error=${e.message || e}`);
				}
			})
		.post("/campaigns/:id/accept/",
			async (req, res) => {
				try {
					await CampaignController.approve(DBUtil.to_id(req.params.id), await user(req));
					res.redirect(`/campaigns/${req.params.id}/`);
				} catch (e) {
					res.redirect(`/campaigns/${req.params.id}/?error=${e.message || e}`);
				}
			})
		.post("/campaigns/:id/reject/",
			async (req, res) => {
				try {
					await CampaignController.reject(DBUtil.to_id(req.params.id), req.body.description, await user(req));
					res.redirect(`/campaigns/${req.params.id}/`);
				} catch (e) {
					res.redirect(`/campaigns/${req.params.id}/?error=${e.message || e}`);
				}
			})
		.get("/rejected/",
			async (req, res) => res.render("rejected", {
				campaigns: 	await CampaignController.rejected({}, { page: req.query.page - 0 || 1 }),
				data: 		await data(req),
				page: 		req.query.page || 1
			}))
		.get("/unapproved/",
			async (req, res) => res.render("unapproved", {
				campaigns: 	await CampaignController.unapproved({}, { page: req.query.page - 0 || 1 }, await user(req)),
				data: 		await data(req),
				page: 		req.query.page || 1
			}))
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
