# solana program swap token


## Overview

<p align="center">
  <img width="460" height="300" src="https://github.com/docongminh/token-swap-program/blob/master/resources/overview.png">
</p>

## Install
  ```bash
    npm install
  ```
  
## Run unitest
Run solana vadidator local:
```bash
  solana-test-validator --reset
```

Run Unit test

```bash
  anchor test --skip-local-validator
```


Result example:

<p align="center">
  <img width="460" height="300" src="https://github.com/docongminh/token-swap-program/blob/master/resources/unittest.png">
</p>


## Run test Swap SOL -> Token
- The program deployed on [devnet](https://explorer.solana.com/address/swapEsYJ7iLDbYeg9154yR1dsUjumanS7LF9KEiJQae?cluster=devnet).

[Program ID](https://explorer.solana.com/address/swapEsYJ7iLDbYeg9154yR1dsUjumanS7LF9KEiJQae?cluster=devnet):
```ts
  const programId = swapEsYJ7iLDbYeg9154yR1dsUjumanS7LF9KEiJQae
```
[Token mint address](https://explorer.solana.com/address/HVTEudbUMJaMRzCnQ2fo1cq6vL9gqHD9mYbvYhfkmQuh?cluster=devnet):
```ts
  const mintAddress = HVTEudbUMJaMRzCnQ2fo1cq6vL9gqHD9mYbvYhfkmQuh
```

Run swap:
```bash
  npx ts-node client/swap.ts
```
 
## Notes:
  - Currently, I have sat default SOL value to swap: 0.5 SOL -> receive 5 Token. use specify value at [here](https://github.com/docongminh/token-swap-program/blob/master/client/swap.ts#L26-L41)
  - I public `authority`, `master authority`, and `user` [private key](https://github.com/docongminh/token-swap-program/tree/master/client/keys) for convenient testing. All wallet already airdrop SOL for network fee
