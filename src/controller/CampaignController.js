
	"use strict";

	const { DBUtil } 			= require("util/");
	const {
		EntityController,
		WalletController,
		CharacterController
	} 	= require("controller/");
	const { ObjectID } 			= require("mongodb");
	const valid_url 			= require("valid-url");
	const request 				= require("request");

	class CampaignController extends EntityController {

		static async create (name, description, owner, header, goal, start, end, ip) {
			let data = CampaignController.sanitize(name, description, owner, header, goal, start, end, ip);

			if(await CharacterController.is_banned(owner))
				throw "You are banned from creating new campaigns";
			if(await CampaignController.count_by_owner(owner) >= 6)
				throw "You already have 6 running campaigns";

			if(end < Date.now())
				throw "Campaigns in the past are useless";

			let entities = await DBUtil.get_collection("entities");
			let doc = await entities.insertOne(Object.assign(data, { created: Date.now() }));
			if(!doc.result.ok)
				throw "something went wrong";

			request({
				method: "POST",
				uri: process.env.WEBHOOK_URL,
				json: {
					text: `New Campaign Created by '${owner.name}'`,
					attachments: [
						{
							title: name,
							title_link: `https://isk-starter.com/unapproved/`,
							text: `${description}\n\nGoal: ${goal.toLocaleString("en-US", { maximumFractionDigits: 2 })} ISK`
						}
					]
				}
			});

			return data;
		}

		static update (_id, name, description, owner, header, goal, start, end, character) {
			return super.update(_id, this.sanitize(name, description, owner, header, goal, start, end), { is_admin: character });
		}

		static sanitize (name, description, owner, header, goal, start, end, ip) {
			let res = super.sanitize("campaign", name, description, owner, ip);

			if(
				!header ||
				header.trim() === "" ||
				!valid_url.is_web_uri(header) ||
				!goal ||
				goal === 0 ||
				Number.isNaN(goal) ||
				!start ||
				Number.isNaN(start) ||
				!end ||
				Number.isNaN(end)
			)
				throw "not all fields set/valid";

			return Object.assign(res, {
				data: {
					header,
					goal,
					start,
					end
				}
			});
		}

		static approve (_id, character) {
			return super.update(_id, { approved: true }, { is_admin: character });
		}

		static reject (_id, description, { id, name }) {
			return super.update(_id, { rejected: { description, character: { id, name }, timestamp: Date.now() } }, { is_admin: { id, name } });
		}

		static rejected (options = {}, config = {}) {
			return this.find(
				Object.assign({ rejected: { $exists: true } }, options),
				Object.assign({ sort: { "rejected.timestamp": -1 } }, config)
			);
		}

		static completed (options = {}, config = {}) {
			return this.find(
				Object.assign({ approved: true, "data.end": { $lt: Date.now() } }, options),
				Object.assign({ sort: { "data.end": -1 } }, config)
			);
		}

		static unapproved (options = {}, config = {}, character) {
			return this.find(
				Object.assign({ rejected: { $exists: false }, approved: { $exists: false} }, options),
				Object.assign({ is_admin: character, sort: { "data.start": 1 } }, config)
			);
		}

		static async page (options = {}, config = {}) {
			let campaigns = await this.find(
				Object.assign({ approved: true }, options),
				Object.assign({ sort: { "data.end": 1 } }, config)
			);
			return await WalletController.assign_balance(campaigns);
		}

		static find_by_owner (owner, options = {}, config = {}) {
			return super.find_by_owner("campaign", owner, options, config);
		}

		static async findOne (_id) {
			let campaign = await super.findOne(_id, "campaign");

			let io = await WalletController.in_and_out(campaign._id);

			return Object.assign(campaign, {
				wallet: io.wallet_in,
				payout: io.wallet_out
			});
		}

		static find (options, config) {
			return super.find("campaign", options, config);
		}

		static async donate (_id, amount, owner) {
			if(amount === 0)
				return;
			if(Number.isNaN(amount))
				throw "something went wrong";
			if(amount > owner.balance)
				throw "not enough money";

			const now = Date.now();

			let entities = await DBUtil.get_collection("entities");
			let entity = await entities.findOne({
				_id,
				"data.start": { $lt: now },
				"data.end": { $gt: now }
			});
			if(!entity)
				throw "no such entity";

			let transactions = await DBUtil.get_collection("transactions");
			let data = {
				from_id: 	owner.id,
				from_name: 	owner.name,
				to_id: 		entity._id,
				to_name: 	entity.name,
				ref_id: 	new ObjectID(),
				amount: 	amount,
				reason: 	"[donation]",
				timestamp: 	now
			};

			let doc = await transactions.insert(data);
			if(!doc.result.ok)
				throw "Something went wrong";

			let balance = await WalletController.balance(owner.id);
			if(balance < 0) {
				await transactions.remove({ _id: data._id });
				throw "not enough money";
			}
		}

	}

	module.exports = CampaignController;
