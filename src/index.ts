import { ApiPromise, WsProvider } from "@polkadot/api";
import BN from "bn.js";
import { Keyring, } from "@polkadot/keyring"
import { KeyringPair } from "@polkadot/keyring/types"
import { mnemonicGenerate } from "@polkadot/util-crypto"
import { readFileSync, stat } from "fs"
import { CodecHash } from "@polkadot/types/interfaces/runtime/"
import { EventRecord } from "@polkadot/types/interfaces/"
import { SubmittableExtrinsic } from "@polkadot/api/submittable/types"
import { ISubmittableResult } from "@polkadot/types/types/"
import yargs from 'yargs';
import { hideBin } from "yargs/helpers"
import { assert } from "console";

// TODO linter command + lint on save

const options = yargs(hideBin(process.argv))
	.option('dust', {
		alias: 'd',
		type: 'number',
		description: 'The amount of dust allowed when trying to deplete an account. Do not set it too low, or else the execution might stall. Something like 100 is perfectly small.',
		required: true,
	})
	.option('id', {
		type: 'string',
		description: 'The id of your target egg',
		required: true,
	})
	.option('emotes', {
		type: 'array',
		description: 'array of emojis, space separated',
		required: true,
	})
	.option('endpoint', {
		alias: 'e',
		type: 'string',
		description: 'the wss endpoint. It must allow unsafe RPCs.',
		required: true,
	})
	.option('final-account', {
		alias: 'f',
		type: 'string',
		description: 'An account to send all the leftover accounts to. If left blank, the funds remain in the last generated account. Make sure to check the logs for the raw seed of this account, and save it! It can also be set to be the account that you begin with.',
		required: true,
	})
	.option('seed', {
		alias: 's',
		type: 'string',
		description: 'path to a file that contains your raw or mnemonic seed. This is where your initial funds may live.',
		required: true,
	})
	.argv

async function main() {
	const provider = new WsProvider(options.endpoint);
	const api = await ApiPromise.create({ provider });
	console.log(`Connected to node: ${(await api.rpc.system.chain()).toHuman()} [ss58: ${api.registry.chainSS58}]`)
	const keyring = new Keyring({ type: 'sr25519', ss58Format: api.registry.chainSS58 });

	// application params
	const ID = options.id
	const emotes = options.emotes.map((e) => e.toString())
	const seed = readFileSync(options.seed).toString().trim();
	const finalAccount = options["final-account"]

	let account = keyring.addFromUri(seed);
	console.log("emotes", emotes);
	console.log(`account`, account.address)

	while (true) {
		let emoji = emotes.pop();
		if (emoji) {
			let utf8 = emoji.codePointAt(0)?.toString(16);
			console.log(`🏁 round account = ${account.address} / ${(await api.query.system.account(account.address)).data.free.toHuman()}`)
			console.log(`🏁 round emoji = ${emoji} / ${utf8}`)
			if (utf8) {
				await emote(utf8, ID, account, api)
			} else {
				throw Error("Failed to create utf8 of emoji.")
			}

			if (emotes.length == 0) {
				// transfer the leftover of `account` into the final account.
				if (finalAccount) {
					let destination = finalAccount
					console.log(`🎉 Done! Sending all funds back to ${destination}`);
					if (destination === account.address) {
						console.log("Well.. seems like the destination is the current account. You probably had a single emote to send?")
					} else {
						let _ = await transferAll(account, destination, api);
					}
				} else {
					console.log(`🎉 Done! leftover funds are placed in ${account.address}. Make sure to save the seed!`, )
				}
				break
			} else {
				const mnemonic = mnemonicGenerate();
				const next = keyring.addFromUri(mnemonic, { name: `dontcare` }, 'sr25519');
				console.log(`🔜 next account is ${next.address} [${mnemonic}]`)
				var __ = await transferAll(account, next.address, api);
				account = next
			}
		} else {
			throw Error("Unreachable code reached.")
		}
	}
}

async function emote(emoji: string, id: string, from: KeyringPair, api: ApiPromise) {
	let rmrk = `RMRK::EMOTE::1.0.0::${id}::${emoji}`
	let emote = api.tx.system.remark(rmrk);
	var _ = await sendAndFinalize(emote, from);
}

async function transferAll(from: KeyringPair, to: string, api: ApiPromise): Promise<CodecHash> {
	return new Promise(async resolve => {
		let leftover = (await api.query.system.account(from.address)).data.free
		// we start with a very large epsilon that we know is too much: half of the initial amount.
		let epsilon = leftover.div(new BN(2));
		let previousEpsilon = new BN(0);
		let mockTransfer = api.tx.balances.transfer(to, leftover);
		let transferFee = (await api.rpc.payment.queryInfo(mockTransfer.toHex())).partialFee
		let round = 0;
		while (true) {
			let toSend = leftover.sub(transferFee).sub(epsilon);
			let change = previousEpsilon.sub(epsilon).abs().div(new BN(2));
			process.stdout.write(`\r⏳ trying round ${round}: leftover = ${leftover.toHuman()} / fee = ${transferFee.toHuman()} / epsilon = ${api.createType('Balance', epsilon).toHuman()}[${epsilon.toNumber()}, ${change.toNumber()}] / trying to send ${api.createType('Balance', toSend).toHuman()}`)
			round += 1
			let bail = await api.tx.balances.transfer(to, toSend).signAsync(from);
			let dryRun = await api.rpc.system.dryRun(bail.toHex())
			let success = dryRun.isOk && dryRun.asOk.isOk
			if (success && epsilon.sub(previousEpsilon).abs().lte(new BN(options.dust))) {
				// it worked, and the amount that we spared was less than the dust.
				let { hash, success, included } = await sendAndFinalize(bail, from);
				console.log("\tEvents at the inclusion block:")
				included.forEach(({ phase, event: { data, method, section } }) => {
					console.log(`\t' ${phase}: ${section}.${method}:: ${data}`);
				});
				if (!success) {
					throw Error("dryRun indicated that the transfer will NOT fail, but seemingly it did. I better stop now...");
				}
				resolve(hash);
				break
			} else {
				previousEpsilon = epsilon.clone();
				if (success) {
					// it worked, but epsilon was too much. Now we need to reduce epsilon
					epsilon = epsilon.sub(change);
				} else {
					// it didn't work. we need to increase epsilon.
					epsilon = epsilon.add(change);
				}
			}
		}
	})
}

interface ISubmitResult {
	hash: CodecHash,
	success: boolean,
	included: EventRecord[],
	finalized: EventRecord[],
}

async function sendAndFinalize(tx: SubmittableExtrinsic<"promise", ISubmittableResult>, account: KeyringPair): Promise<ISubmitResult> {
	return new Promise(async resolve => {
		let success = false;
		let included: EventRecord[] = []
		let finalized: EventRecord[] = []
		let unsubscribe = await tx.signAndSend(account, ({ events = [], status, dispatchError }) => {
			if (status.isInBlock) {
				success = dispatchError ? false : true;
				console.log(`📀 Transaction ${tx.meta.name}(${tx.args.toString()}) included at blockHash ${status.asInBlock} [success = ${success}]`);
				included = [...events]
			} else if (status.isBroadcast) {
				console.log(`🚀 Transaction broadcasted.`);
			} else if (status.isFinalized) {
				console.log(`💯 Transaction ${tx.meta.name}(..) Finalized at blockHash ${status.asFinalized}`);
				finalized = [...events]
				let hash = status.hash;
				unsubscribe();
				resolve({ success, hash, included, finalized })
			} else if (status.isReady) {
				// let's not be too noisy..
			} else {
				console.log(`🤷 Other status ${status}`)
			}
		})
	})
}

main().catch(console.error).finally(() => process.exit());

