# IRC722 NFT コントラクトの発行サンプル

## ローカルIOSTノードの起動

```shell
cd localnet
docker compose up -d
```

## インストール

```shell
yarn create vite iost-nft-sample --template react-ts
cd iost-nft-sample
yarn add @mui/material @emotion/react @emotion/styled @mui/x-data-grid
yarn add iost
yarn add react-hook-form
yarn add uuid
```

## NFT コントラクトのコンパイル

このソースでは、公式サイトのABIファイルを利用しているので、この操作は不要です。

```shell
docker exec -t iserver iwallet compile iostnft.js
```

## Gas のプレッジ

トークン発行等に GAS 代がかかるので、IOST をステークして、使用できる GAS を増やしておく。

```shell
docker exec -t iserver iwallet sys pledge 1000 -a alice --chain_id 1020
```

## NFT コントラクトのデプロイ

GAS 代がかかるので、GasLimit を`4000000`にして実行します。かなりの確率で、失敗しますので、成功するまで試すと成功します。

```shell
docker exec -t iserver iwallet publish iostnft.js iostnft.abi -a alice --chain_id 1020 -l 4000000
```

## NFT コントラクトの更新

以下、コントラクトID `ContractG8uc3Dqe7mVgHRCGH6VJTED1a1vDFCx7EndXWePgxnAB` は、上のコマンドでデプロイしたコントラクトIDに置き換えてください。

```shell
docker exec -t iserver iwallet publish iostnft.js iostnft.js.abi ContractG8uc3Dqe7mVgHRCGH6VJTED1a1vDFCx7EndXWePgxnAB -u -a alice --chain_id 1020 -l 4000000
```

## NFTの作成

```shell
docker exec -t iserver iwallet call "ContractG8uc3Dqe7mVgHRCGH6VJTED1a1vDFCx7EndXWePgxnAB" "create" "[999,\"97d00fa6-4a46-46e5-8d23-b8bdb0872fb\",\"ART\",\"TestNFT\",\"http://test.com/img/999\",\"[{\\\"info\\\":\\\"Sample info.\\\"]}}]\",\"False\",\"0.0\",0,0,\"s\"]" -a alice --chain_id 1020
```

## NFT 一覧の取得

```shell
curl -X POST http://127.0.0.1:30001/getContractStorage -d '{"id":"ContractG8uc3Dqe7mVgHRCGH6VJTED1a1vDFCx7EndXWePgxnAB","key":"userdata.alice","by_longest_chain":true}' | jq .
```

## トークンの発行

```shell
docker exec -t iserver iwallet call "ContractG8uc3Dqe7mVgHRCGH6VJTED1a1vDFCx7EndXWePgxnAB" "issue" "[1,\"bobby\"]" -a alice --chain_id 1020
```

## トークン一覧の取得

```shell
curl -X POST http://127.0.0.1:30001/getContractStorage -d '{"id":"ContractG8uc3Dqe7mVgHRCGH6VJTED1a1vDFCx7EndXWePgxnAB","key":"userdata.bobby","by_longest_chain":true}' | jq .
```

### トークン情報の取得

```shell
docker exec -t iserver iwallet call "ContractG8uc3Dqe7mVgHRCGH6VJTED1a1vDFCx7EndXWePgxnAB" "tokenInfo" "[10000001]" -a bobby --chain_id 1020
Connecting to server localhost:30002 ...
Sending transaction...
Transaction:
{
    "time": "1676442949376996000",
    "expiration": "1676443039376996000",
    "gasRatio": 1,
    "gasLimit": 1000000,
    "delay": "0",
    "chainId": 1020,
    "actions": [
        {
            "contract": "Contract9ggUSExgmhDaEyYsZW35yAjKbJ9wmq1axpE9CZLni1MH",
            "actionName": "tokenInfo",
            "data": "[10000001]"
        }
    ],
    "amountLimit": [
        {
            "token": "*",
            "value": "unlimited"
        }
    ],
    "signers": [
    ],
    "signatures": [
    ],
    "publisher": "alice",
    "publisherSigs": [
        {
            "algorithm": "ED25519",
            "signature": "C1GBPjFxJH+toLxapvICziHdi5b7NQDBqzal0f1ussvmFgNUYyKCbL3uMxLPjcVCw0jgA+v9U6+UIxxhzJqPBA==",
            "publicKey": "dP8FEXRmeuN0RBP3s0XJnbut7rjeDVUXQtYfDFnlnFM="
        }
    ]
}
Transaction has been sent.
The transaction hash is: 6WqQEuT41apuoJnAqN4VLZPDmB4nQxsS1JE9ZXzRJMDE
Checking transaction receipt...
Transaction receipt:
{
    "txHash": "6WqQEuT41apuoJnAqN4VLZPDmB4nQxsS1JE9ZXzRJMDE",
    "gasUsage": 41826,
    "ramUsage": {
    },
    "statusCode": "SUCCESS",
    "message": "",
    "returns": [
        "[\"{\\\"code\\\":200,\\\"message\\\":\\\"success\\\",\\\"success\\\":true,\\\"object\\\":{\\\"id\\\":10000001,\\\"uuid\\\":\\\"10000001\\\",\\\"category\\\":\\\"ART\\\",\\\"name\\\":\\\"サンプル#1\\\",\\\"imageUrl\\\":\\\"https://explorer.iost.io/static/img/christmas.png\\\",\\\"meta\\\":\\\"[{\\\\\\\"info\\\\\\\":\\\\\\\"Sample info.\\\\\\\"]}}]\\\",\\\"lock\\\":\\\"False\\\",\\\"ext\\\":\\\"0.0\\\",\\\"owner\\\":\\\"alice\\\",\\\"level\\\":0,\\\"quality\\\":0,\\\"parvalue\\\":\\\"s\\\"}}\"]"
    ],
    "receipts": [
    ]
}

SUCCESS! Transaction has been irreversible
```

### トークンの転送

```shell
docker exec -t iserver iwallet call "Contract9ggUSExgmhDaEyYsZW35yAjKbJ9wmq1axpE9CZLni1MH" "transfer" "[10000001, \"alice\", \"bobby\", \"1\", \"transfer\"]" -a alice --chain_id 1020
Connecting to server localhost:30002 ...
Sending transaction...
Transaction:
{
    "time": "1676444122391779000",
    "expiration": "1676444212391779000",
    "gasRatio": 1,
    "gasLimit": 1000000,
    "delay": "0",
    "chainId": 1020,
    "actions": [
        {
            "contract": "Contract9ggUSExgmhDaEyYsZW35yAjKbJ9wmq1axpE9CZLni1MH",
            "actionName": "transfer",
            "data": "[10000001,\"alice\",\"bobby\",\"1\",\"transfer\"]"
        }
    ],
    "amountLimit": [
        {
            "token": "*",
            "value": "unlimited"
        }
    ],
    "signers": [
    ],
    "signatures": [
    ],
    "publisher": "alice",
    "publisherSigs": [
        {
            "algorithm": "ED25519",
            "signature": "XFQleV61UNFAFYq1BkAOrgGjHbH8PpJ8naGBW48Vl8/36YE2NFwpLEX6fIxPudnBnjnLfk0Rt5dzbk8GAMJIDQ==",
            "publicKey": "dP8FEXRmeuN0RBP3s0XJnbut7rjeDVUXQtYfDFnlnFM="
        }
    ]
}
Transaction has been sent.
The transaction hash is: 2i7CF8haT7X5sGwBXX9DNHYdrZiq5DFTYPeHKfPFNmBw
Checking transaction receipt...
Transaction receipt:
{
    "txHash": "2i7CF8haT7X5sGwBXX9DNHYdrZiq5DFTYPeHKfPFNmBw",
    "gasUsage": 50266,
    "ramUsage": {
        "Contract9ggUSExgmhDaEyYsZW35yAjKbJ9wmq1axpE9CZLni1MH": "489"
    },
    "statusCode": "SUCCESS",
    "message": "",
    "returns": [
        "[\"{\\\"code\\\":200,\\\"message\\\":\\\"success\\\",\\\"success\\\":true}\"]"
    ],
    "receipts": [
    ]
}

SUCCESS! Transaction has been irreversible
```
