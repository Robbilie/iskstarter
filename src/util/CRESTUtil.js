
	"use strict";

	const request 			= require("request");
	const querystring 		= require("querystring");

	class CRESTUtil {

		static getBase64 () {
			return new Buffer(config.crest.clientID + ":" + config.crest.secretKey).toString("base64");
		}

		static generateLoginUrl (scopes, state) {
			return Promise.resolve(
				process.env.LOGIN_URL + "/oauth/authorize" +
				"?" + decodeURI(querystring.stringify({
					response_type: 	"code",
					redirect_uri: 	`https://${process.env.HOST}${process.env.CREST_CALLBACK}`,
					client_id: 		config.crest.clientID,
					scope: 			scopes.join(" "),
					state: 			state
				}))
			);
		}

		// { 'grant_type' : 'authorization_code', 'code': "code" }
		static getTokens (data) {
			return new Promise((resolve, reject) => {
				request(
					{
						method: 		"POST",
						url: 			`${process.env.LOGIN_URL}/oauth/token`,
						headers: {
							"User-Agent": process.env.UA,
							"Authorization": "Basic " + CRESTUtil.getBase64()
						},
						form: data
					},
					(err, _, body) => {
						if(err)
							return reject(err);
						let res 			= JSON.parse(body);
						if(res.error)
							return reject(res.error);
						let accessToken 	= res.access_token;
						let refreshToken 	= res.refresh_token;
						let accessUntil		= new Date().getTime() + (res.expires_in * 1000);
						return resolve({ accessToken: accessToken, refreshToken: refreshToken, accessUntil: accessUntil });
					}
				).on("error", e => reject(e));
			});
		}

		static getInfo (accessToken) {
			return new Promise((resolve, reject) => {
				request({
						method: 		"GET",
						url: 			`${process.env.LOGIN_URL}/oauth/verify`,
						headers: {
							"User-Agent": 		process.env.UA,
							"Authorization": 	"Bearer " + accessToken
						}
					},
					(err, _, body) => {
						if(err)
							return reject(err);
						let res = JSON.parse(body);
						if(res.error)
							return reject(res.error);
						console.log("#### VERIFY ####", JSON.stringify(res));
						return resolve({
							id: 		res.CharacterID,
							name: 		res.CharacterName,
							scopes: 	res.Scopes ? res.Scopes.split(" ") : [],
							tokenType: 	res.TokenType,
							ownerHash: 	res.CharacterOwnerHash
						});
					}).on("error", e => reject(e));
			});
		}

	}

	module.exports = CRESTUtil;
