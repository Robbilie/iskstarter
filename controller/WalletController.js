
	"use strict";

	const { DBUtil } = require("util/");

	class WalletController {

		/*
		static all () {
			return DBUtil.getCollection("transactions")
				.then(collection =>
					collection.aggregate([
						{ $match: {} },
						{ $project: {
							transaction: [
								{
									id: "$toName",
									amount: "$amount"
								},
								{
									id: "$fromName",
									amount: { $subtract: [0, "$amount"] }
								}
							]
						} },
						{ $unwind: {
							path: "$transaction"
						} },
						{ $project: {
							id: "$transaction.id",
							amount: "$transaction.amount"
						} },
						{ $group: {
							_id: "$id",
							amount: { $sum: "$amount" }
						} }
					]).toArray()
				);
		}
		*/

		static async in_and_out (id) {
			let transactions = await DBUtil.getCollection("transactions");
			let entries = await transactions.aggregate([
				{ $match: { $or: [{ fromID: id }, { toID: id }] } },
				{ $group: {
					_id: "wallet",
					walletIn: { $sum: { $cond: [{ $eq: ["$toID", id] }, "$amount", 0] } },
					walletOut: { $sum: { $cond: [{ $eq: ["$fromID", id] }, "$amount", 0] } }
				} }
			]).toArray();

			return entries[0] || { walletIn: 0, walletOut: 0 };
		}

		static async balance (id) {
			let io = await WalletController.in_and_out(id);
			return io.walletIn - io.walletOut;
		}

		static async paidOut (id) {
			let transactions = await DBUtil.getCollection("transactions");
			let result = await transactions.findOne({ fromName: "EVE System", toName: "ISKstarter", reason: id.toString() });
			return !!result;
		}

	}

	module.exports = WalletController;
