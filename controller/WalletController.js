
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

		static balance (id) {
			return DBUtil.getCollection("transactions")
				.then(collection =>
					collection.aggregate([
						{ $match: { $or: [{ fromID: id }, { toID: id }] } },
						{ $group: {
							_id: "wallet",
							walletIn: { $sum: { $cond: [{ $eq: ["$toID", id] }, "$amount", 0] } },
							walletOut: { $sum: { $cond: [{ $eq: ["$fromID", id] }, "$amount", 0] } }
						} },
						{ $project: { wallet: { $subtract: ["$walletIn", "$walletOut"] } } }
					]).toArray()
				)
				.then(array => (array[0] || { wallet: 0 }).wallet);
		}

	}

	module.exports = WalletController;
