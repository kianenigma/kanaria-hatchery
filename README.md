# Kanaria Hatchery

A sybil-like took that sends an array of emojis to [Kanaria](https://kanaria.rmrk.app/) eggs from
different randomly generated accounts.

### Disclaimer

I have used this tool to emote my own eggs at scale. Nonetheless, this is hacky tool that should
be used only with care and at your own risk. To make sure everything is correct:

1. First, try it out in Westend. You can do everything there as well, there's just not egg to hatch
   and your `remark` transaction will be in vein
2. On Kusama, first try it with a small number of emojis.
3. Don't send too much funds to the initial account.
4. Read this file carefully before you do anything.

## How it works under the hood

I build this took when the requirement for each egg to hatch was 10 🐣 emojis, from different
accounts (recall the emotes get reverted if resubmitted from the same account). The process of
desire was:

Given some initial funds in a random account: send emote from it, transfer all the funds to a new
random account, send the next emote, transfer all the funds to a new
random account, send the next emote, repeat...

and this bot does exactly that under the hood. It is rather slow, because in each step, the bot
waits until the action is **finalized**. This is usually 10-20 seconds.

Each newly created account is generated on the fly and not saved anywhere. If things go fine, you
will never need them. Nonetheless, their mnemonic seed is printed to the console in each round. You
only might need the last, if you don't specify a destination account. This is the account that any
leftover is sent to.

A reasonable usage of this bot is to:

1. send a small amount of KSM to a dummy account that the bot can access.
2. set the final destination of any leftover to your original, safe account.

#### Dust

Note that substrate chains don't have an easy way to transfer all of the tokens out an account, and
there will inevitably be a very small amount of tokens in the dying account, called the dust. This
tools makes sure that **you lose the least amount of tokens in this process**. To do this, you need
to connect to a node that exposes unsafe RPC calls, namely `system_dryRun`. We use this RPC call,
combined with a binary search, to find the a curated `transfer` call that you creates the least
amount of `dust`. You can configure the maximum allowed dust. This is why events of the block at
which your `transfer` is included is printed, so you can see the `DustLost` event, if any.

## Usage

```
Options:
      --help           Show help                                       [boolean]
      --version        Show version number                             [boolean]
  -d, --dust           The amount of dust allowed when trying to deplete an
                       account. Do not set it too low, or else the execution
                       might stall. Something like 100 is perfectly small.
                                                             [number] [required]
      --id             The id of your target egg             [string] [required]
      --emotes         array of emojis, space separated       [array] [required]
  -e, --endpoint       the wss endpoint. It must allow unsafe RPCs.
                                                             [string] [required]
  -f, --final-account  An account to send all the leftover accounts to. If left
                       blank, the funds remain in the last generated account.
                       Make sure to check the logs for the raw seed of this
                       account, and save it! It can also be set to be the
                       account that you begin with.          [string] [required]
  -s, --seed           path to a file that contains your raw or mnemonic seed.
                       This is where your initial funds may live.
                                                             [string] [required]
```

So overall, you'd always do:

```
kanaria-hatcher --dust 100 --emotes 💸 😬 --endpoint <where-rpc-node-is> --final-account <your-safe-account> --id <your-egg-id> --seed <file-containing-initial-seed>
```

## Full Example

```
[kanaria-hatchery] yarn run start --dust 100 --emotes 💸 😬 🐣 💻 📆 😈 --endpoint ws://localhost:9944 --final-account 5EeFvbEf8zAxPJ5QM6gJUwCvqiFBRWN3cQFXv4gC6k6XwVmc --id <your-id-here> --seed key
$ ./node_modules/.bin/ts-node ./src/index.ts --dust 10 --emotes 💸 😬 🐣 💻 📆 😈 --endpoint ws://localhost:9944 --final-account 5EeFvbEf8zAxPJ5QM6gJUwCvqiFBRWN3cQFXv4gC6k6XwVmc --id DONT_CARE --seed key
Connected to node: Westend [ss58: 42]
emotes [ '💸', '😬', '🐣', '💻', '📆', '😈' ]
account 5GgEUtmk6bnL78cmmi9P8w1jNkeE6BSmJwphEDbq7tn2HfLN
🏁 round account = 5GgEUtmk6bnL78cmmi9P8w1jNkeE6BSmJwphEDbq7tn2HfLN / 9.7052 WND
🏁 round emoji = 😈 / 1f608
🚀 Transaction broadcasted.
📀 Transaction remark(0x524d524b3a3a454d4f54453a3a312e302e303a3a444f4e545f434152453a3a3166363038) included at blockHash 0x2736ed4d84d0ef8ab0a47546c21669a2fdc1402d73cfaae8d08c129c7aacb8b1 [success = true]
💯 Transaction remark(..) Finalized at blockHash 0x2736ed4d84d0ef8ab0a47546c21669a2fdc1402d73cfaae8d08c129c7aacb8b1
🔜 next account is 5CWwy6YAoVw2DCuL9L8b4fvicRHsNYD3TpX2Vmw2ahC4ziiT [main clean jelly little manage army best multiply forget chimney buyer hurt]
⏳ trying round 39: leftover = 9.6898 WND / fee = 5.4000 mWND / epsilon = 10.3000 mWND[10300000008, 4] / trying to send 9.6741 WND🚀 Transaction broadcasted.
📀 Transaction transfer(5CWwy6YAoVw2DCuL9L8b4fvicRHsNYD3TpX2Vmw2ahC4ziiT,9674199987115) included at blockHash 0x901bdc213190c11bf29c3893932805eaaca69c2a0006dcb5bbad93a1c39c5cd7 [success = true]
💯 Transaction transfer(..) Finalized at blockHash 0x901bdc213190c11bf29c3893932805eaaca69c2a0006dcb5bbad93a1c39c5cd7
	Events at the inclusion block:
	' {"applyExtrinsic":2}: system.KilledAccount:: ["5GgEUtmk6bnL78cmmi9P8w1jNkeE6BSmJwphEDbq7tn2HfLN"]
	' {"applyExtrinsic":2}: system.NewAccount:: ["5CWwy6YAoVw2DCuL9L8b4fvicRHsNYD3TpX2Vmw2ahC4ziiT"]
	' {"applyExtrinsic":2}: balances.Endowed:: ["5CWwy6YAoVw2DCuL9L8b4fvicRHsNYD3TpX2Vmw2ahC4ziiT",9674199987115]
	' {"applyExtrinsic":2}: balances.DustLost:: ["5GgEUtmk6bnL78cmmi9P8w1jNkeE6BSmJwphEDbq7tn2HfLN",8]
	' {"applyExtrinsic":2}: balances.Transfer:: ["5GgEUtmk6bnL78cmmi9P8w1jNkeE6BSmJwphEDbq7tn2HfLN","5CWwy6YAoVw2DCuL9L8b4fvicRHsNYD3TpX2Vmw2ahC4ziiT",9674199987115]
	' {"applyExtrinsic":2}: balances.Deposit:: ["5CFPcUJgYgWryPaV1aYjSbTpbTLu42V32Ytw1L9rfoMAsfGh",15700001585]
	' {"applyExtrinsic":2}: system.ExtrinsicSuccess:: [{"weight":198207000,"class":"Normal","paysFee":"Yes"}]
🏁 round account = 5CWwy6YAoVw2DCuL9L8b4fvicRHsNYD3TpX2Vmw2ahC4ziiT / 9.6741 WND
🏁 round emoji = 📆 / 1f4c6
🚀 Transaction broadcasted.
📀 Transaction remark(0x524d524b3a3a454d4f54453a3a312e302e303a3a444f4e545f434152453a3a3166346336) included at blockHash 0x16cc45d32eea553e25ac6e5337d75d4cf90b3c140c1419ca59dd6ab172159ac9 [success = true]
💯 Transaction remark(..) Finalized at blockHash 0x16cc45d32eea553e25ac6e5337d75d4cf90b3c140c1419ca59dd6ab172159ac9
🔜 next account is 5GZ92dGLkdjq33emPQ9uisVsHJC4QWEUne8iSyGfHf3pvSFx [beauty junk misery virtual settle yellow noodle endorse neither duck stadium wheel]
⏳ trying round 39: leftover = 9.6587 WND / fee = 5.4000 mWND / epsilon = 10.3000 mWND[10300000004, 4] / trying to send 9.6430 WND🚀 Transaction broadcasted.
📀 Transaction transfer(5GZ92dGLkdjq33emPQ9uisVsHJC4QWEUne8iSyGfHf3pvSFx,9643099985516) included at blockHash 0xb3663854bf6b25fc01ab63dc4207625c71f30189201d62964d214e1e932fbe8a [success = true]
🤷 Other status {"retracted":"0xb3663854bf6b25fc01ab63dc4207625c71f30189201d62964d214e1e932fbe8a"}
📀 Transaction transfer(5GZ92dGLkdjq33emPQ9uisVsHJC4QWEUne8iSyGfHf3pvSFx,9643099985516) included at blockHash 0xe1ec756ba18ed160d9157acae394c665af642e607d2ad0114fe19c35be556962 [success = true]
💯 Transaction transfer(..) Finalized at blockHash 0xe1ec756ba18ed160d9157acae394c665af642e607d2ad0114fe19c35be556962
	Events at the inclusion block:
	' {"applyExtrinsic":2}: system.KilledAccount:: ["5CWwy6YAoVw2DCuL9L8b4fvicRHsNYD3TpX2Vmw2ahC4ziiT"]
	' {"applyExtrinsic":2}: system.NewAccount:: ["5GZ92dGLkdjq33emPQ9uisVsHJC4QWEUne8iSyGfHf3pvSFx"]
	' {"applyExtrinsic":2}: balances.Endowed:: ["5GZ92dGLkdjq33emPQ9uisVsHJC4QWEUne8iSyGfHf3pvSFx",9643099985516]
	' {"applyExtrinsic":2}: balances.DustLost:: ["5CWwy6YAoVw2DCuL9L8b4fvicRHsNYD3TpX2Vmw2ahC4ziiT",4]
	' {"applyExtrinsic":2}: balances.Transfer:: ["5CWwy6YAoVw2DCuL9L8b4fvicRHsNYD3TpX2Vmw2ahC4ziiT","5GZ92dGLkdjq33emPQ9uisVsHJC4QWEUne8iSyGfHf3pvSFx",9643099985516]
	' {"applyExtrinsic":2}: balances.Deposit:: ["5FZoQhgUCmqBxnkHX7jCqThScS2xQWiwiF61msg63CFL3Y8f",15700001585]
	' {"applyExtrinsic":2}: system.ExtrinsicSuccess:: [{"weight":198207000,"class":"Normal","paysFee":"Yes"}]
🏁 round account = 5GZ92dGLkdjq33emPQ9uisVsHJC4QWEUne8iSyGfHf3pvSFx / 9.6430 WND
🏁 round emoji = 💻 / 1f4bb
🚀 Transaction broadcasted.
📀 Transaction remark(0x524d524b3a3a454d4f54453a3a312e302e303a3a444f4e545f434152453a3a3166346262) included at blockHash 0x05c82f684224d82187fd9c92a57eaeb0a51ff42d4c54375639dd4b5127fb99e1 [success = true]
💯 Transaction remark(..) Finalized at blockHash 0x05c82f684224d82187fd9c92a57eaeb0a51ff42d4c54375639dd4b5127fb99e1
🔜 next account is 5HKeeEdMis29uRwcJYsjXaXm1qbC1rZyDcMgqmaTZs7L8bch [month depth boring power million under protect oak boat bid cry auto]
⏳ trying round 39: leftover = 9.6276 WND / fee = 5.4000 mWND / epsilon = 10.3000 mWND[10300000008, 4] / trying to send 9.6119 WND🚀 Transaction broadcasted.
🚀 Transaction broadcasted.
📀 Transaction transfer(5HKeeEdMis29uRwcJYsjXaXm1qbC1rZyDcMgqmaTZs7L8bch,9611999983913) included at blockHash 0x776cc0d2eb0c2057e4dd340ccab9e9f27de6384cfc52204e434b5fe341971976 [success = true]
💯 Transaction transfer(..) Finalized at blockHash 0x776cc0d2eb0c2057e4dd340ccab9e9f27de6384cfc52204e434b5fe341971976
	Events at the inclusion block:
	' {"applyExtrinsic":2}: system.KilledAccount:: ["5GZ92dGLkdjq33emPQ9uisVsHJC4QWEUne8iSyGfHf3pvSFx"]
	' {"applyExtrinsic":2}: system.NewAccount:: ["5HKeeEdMis29uRwcJYsjXaXm1qbC1rZyDcMgqmaTZs7L8bch"]
	' {"applyExtrinsic":2}: balances.Endowed:: ["5HKeeEdMis29uRwcJYsjXaXm1qbC1rZyDcMgqmaTZs7L8bch",9611999983913]
	' {"applyExtrinsic":2}: balances.DustLost:: ["5GZ92dGLkdjq33emPQ9uisVsHJC4QWEUne8iSyGfHf3pvSFx",8]
	' {"applyExtrinsic":2}: balances.Transfer:: ["5GZ92dGLkdjq33emPQ9uisVsHJC4QWEUne8iSyGfHf3pvSFx","5HKeeEdMis29uRwcJYsjXaXm1qbC1rZyDcMgqmaTZs7L8bch",9611999983913]
	' {"applyExtrinsic":2}: balances.Deposit:: ["5G1ojzh47Yt8KoYhuAjXpHcazvsoCXe3G8LZchKDvumozJJJ",15700001585]
	' {"applyExtrinsic":2}: system.ExtrinsicSuccess:: [{"weight":198207000,"class":"Normal","paysFee":"Yes"}]
🏁 round account = 5HKeeEdMis29uRwcJYsjXaXm1qbC1rZyDcMgqmaTZs7L8bch / 9.6119 WND
🏁 round emoji = 🐣 / 1f423
🚀 Transaction broadcasted.
📀 Transaction remark(0x524d524b3a3a454d4f54453a3a312e302e303a3a444f4e545f434152453a3a3166343233) included at blockHash 0x8d982f2e0239be446f2ec0c4c23e09ad9e22cba0e52ba337b140247f6b0a0c42 [success = true]
💯 Transaction remark(..) Finalized at blockHash 0x8d982f2e0239be446f2ec0c4c23e09ad9e22cba0e52ba337b140247f6b0a0c42
🔜 next account is 5G9ormp9yctjcu9zcyZpGnbzhvP2YHupToeMv3Vk8cZn4XhD [fossil local hero liquid economy concert harsh cream eight proof surround month]
⏳ trying round 39: leftover = 9.5965 WND / fee = 5.4000 mWND / epsilon = 10.3000 mWND[10300000001, 4] / trying to send 9.5808 WND🚀 Transaction broadcasted.
📀 Transaction transfer(5G9ormp9yctjcu9zcyZpGnbzhvP2YHupToeMv3Vk8cZn4XhD,9580899982317) included at blockHash 0xe91d7629b67fdf45b1caee654fff8cd383ece8ae5187987b40ead570bcceac6c [success = true]
💯 Transaction transfer(..) Finalized at blockHash 0xe91d7629b67fdf45b1caee654fff8cd383ece8ae5187987b40ead570bcceac6c
	Events at the inclusion block:
	' {"applyExtrinsic":2}: system.KilledAccount:: ["5HKeeEdMis29uRwcJYsjXaXm1qbC1rZyDcMgqmaTZs7L8bch"]
	' {"applyExtrinsic":2}: system.NewAccount:: ["5G9ormp9yctjcu9zcyZpGnbzhvP2YHupToeMv3Vk8cZn4XhD"]
	' {"applyExtrinsic":2}: balances.Endowed:: ["5G9ormp9yctjcu9zcyZpGnbzhvP2YHupToeMv3Vk8cZn4XhD",9580899982317]
	' {"applyExtrinsic":2}: balances.DustLost:: ["5HKeeEdMis29uRwcJYsjXaXm1qbC1rZyDcMgqmaTZs7L8bch",1]
	' {"applyExtrinsic":2}: balances.Transfer:: ["5HKeeEdMis29uRwcJYsjXaXm1qbC1rZyDcMgqmaTZs7L8bch","5G9ormp9yctjcu9zcyZpGnbzhvP2YHupToeMv3Vk8cZn4XhD",9580899982317]
	' {"applyExtrinsic":2}: balances.Deposit:: ["5CFPcUJgYgWryPaV1aYjSbTpbTLu42V32Ytw1L9rfoMAsfGh",15700001585]
	' {"applyExtrinsic":2}: system.ExtrinsicSuccess:: [{"weight":198207000,"class":"Normal","paysFee":"Yes"}]
🏁 round account = 5G9ormp9yctjcu9zcyZpGnbzhvP2YHupToeMv3Vk8cZn4XhD / 9.5808 WND
🏁 round emoji = 😬 / 1f62c
🚀 Transaction broadcasted.
🚀 Transaction broadcasted.
📀 Transaction remark(0x524d524b3a3a454d4f54453a3a312e302e303a3a444f4e545f434152453a3a3166363263) included at blockHash 0x553d26fd2ba62d111041d4b438feafdc4b4c01598e1696a3db90ddb1670d9428 [success = true]
💯 Transaction remark(..) Finalized at blockHash 0x553d26fd2ba62d111041d4b438feafdc4b4c01598e1696a3db90ddb1670d9428
🔜 next account is 5C4sJTDHtKoyD7ZHMoKJBpP9DHhAhSgTwxiX7qbgkf9NQN6L [point certain vague coach pencil jar exact spare sugar cloth ice solution]
⏳ trying round 41: leftover = 9.5654 WND / fee = 5.4000 mWND / epsilon = 10.3000 mWND[10300000001, 1] / trying to send 9.5497 WND🚀 Transaction broadcasted.
📀 Transaction transfer(5C4sJTDHtKoyD7ZHMoKJBpP9DHhAhSgTwxiX7qbgkf9NQN6L,9549799980721) included at blockHash 0xab050b92386152335150fa9e1c96c4723b5eedf72752c4a405795482708a52ef [success = true]
💯 Transaction transfer(..) Finalized at blockHash 0xab050b92386152335150fa9e1c96c4723b5eedf72752c4a405795482708a52ef
	Events at the inclusion block:
	' {"applyExtrinsic":2}: system.KilledAccount:: ["5G9ormp9yctjcu9zcyZpGnbzhvP2YHupToeMv3Vk8cZn4XhD"]
	' {"applyExtrinsic":2}: system.NewAccount:: ["5C4sJTDHtKoyD7ZHMoKJBpP9DHhAhSgTwxiX7qbgkf9NQN6L"]
	' {"applyExtrinsic":2}: balances.Endowed:: ["5C4sJTDHtKoyD7ZHMoKJBpP9DHhAhSgTwxiX7qbgkf9NQN6L",9549799980721]
	' {"applyExtrinsic":2}: balances.DustLost:: ["5G9ormp9yctjcu9zcyZpGnbzhvP2YHupToeMv3Vk8cZn4XhD",1]
	' {"applyExtrinsic":2}: balances.Transfer:: ["5G9ormp9yctjcu9zcyZpGnbzhvP2YHupToeMv3Vk8cZn4XhD","5C4sJTDHtKoyD7ZHMoKJBpP9DHhAhSgTwxiX7qbgkf9NQN6L",9549799980721]
	' {"applyExtrinsic":2}: balances.Deposit:: ["5G1ojzh47Yt8KoYhuAjXpHcazvsoCXe3G8LZchKDvumozJJJ",15700001585]
	' {"applyExtrinsic":2}: system.ExtrinsicSuccess:: [{"weight":198207000,"class":"Normal","paysFee":"Yes"}]
🏁 round account = 5C4sJTDHtKoyD7ZHMoKJBpP9DHhAhSgTwxiX7qbgkf9NQN6L / 9.5497 WND
🏁 round emoji = 💸 / 1f4b8
🚀 Transaction broadcasted.
📀 Transaction remark(0x524d524b3a3a454d4f54453a3a312e302e303a3a444f4e545f434152453a3a3166346238) included at blockHash 0x46f63d96d03582ca8e9d70f243ac0437d2580db508410bc935e7957bf65594b7 [success = true]
💯 Transaction remark(..) Finalized at blockHash 0x46f63d96d03582ca8e9d70f243ac0437d2580db508410bc935e7957bf65594b7
🎉 Done! Sending all funds back to 5EeFvbEf8zAxPJ5QM6gJUwCvqiFBRWN3cQFXv4gC6k6XwVmc
⏳ trying round 39: leftover = 9.5343 WND / fee = 5.4000 mWND / epsilon = 10.3000 mWND[10300000001, 4] / trying to send 9.5186 WND🚀 Transaction broadcasted.
📀 Transaction transfer(5EeFvbEf8zAxPJ5QM6gJUwCvqiFBRWN3cQFXv4gC6k6XwVmc,9518699979125) included at blockHash 0x2aa4c56d50af03d8c74440f8e71bfb24f9ab33c8efc3ea18b04dd60e9e1b7cf9 [success = true]
💯 Transaction transfer(..) Finalized at blockHash 0x2aa4c56d50af03d8c74440f8e71bfb24f9ab33c8efc3ea18b04dd60e9e1b7cf9
	Events at the inclusion block:
	' {"applyExtrinsic":2}: system.KilledAccount:: ["5C4sJTDHtKoyD7ZHMoKJBpP9DHhAhSgTwxiX7qbgkf9NQN6L"]
	' {"applyExtrinsic":2}: system.NewAccount:: ["5EeFvbEf8zAxPJ5QM6gJUwCvqiFBRWN3cQFXv4gC6k6XwVmc"]
	' {"applyExtrinsic":2}: balances.Endowed:: ["5EeFvbEf8zAxPJ5QM6gJUwCvqiFBRWN3cQFXv4gC6k6XwVmc",9518699979125]
	' {"applyExtrinsic":2}: balances.DustLost:: ["5C4sJTDHtKoyD7ZHMoKJBpP9DHhAhSgTwxiX7qbgkf9NQN6L",1]
	' {"applyExtrinsic":2}: balances.Transfer:: ["5C4sJTDHtKoyD7ZHMoKJBpP9DHhAhSgTwxiX7qbgkf9NQN6L","5EeFvbEf8zAxPJ5QM6gJUwCvqiFBRWN3cQFXv4gC6k6XwVmc",9518699979125]
	' {"applyExtrinsic":2}: balances.Deposit:: ["5FZoQhgUCmqBxnkHX7jCqThScS2xQWiwiF61msg63CFL3Y8f",15700001585]
	' {"applyExtrinsic":2}: system.ExtrinsicSuccess:: [{"weight":198207000,"class":"Normal","paysFee":"Yes"}]
✨  Done in 261.30s.

```

#### TODOs:

- [ ] Unit tests
- [ ] Extract the `transfer_all` and `submit_finalized` into their own package.

