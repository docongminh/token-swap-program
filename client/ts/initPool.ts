import * as anchor from "@coral-xyz/anchor";
import { parseUnits } from "@ethersproject/units";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { setup, delay } from "./setup";

(async () => {
  const authority = anchor.web3.Keypair.fromSecretKey(
    new Uint8Array(require("../keys/authority.json"))
  ) as anchor.web3.Keypair;
  const masterAuthority = anchor.web3.Keypair.fromSecretKey(
    new Uint8Array(require("../keys/masterAuthority.json"))
  ) as anchor.web3.Keypair;

  const TOKEN_PRICE = 10; // rate 1 SOL -> 10 TOKEN
  const decimals = 6;
  const {
    program,
    mintAddress,
    poolConfigAccount,
    poolNativeAccount,
    poolTokenAccount,
  } = setup(authority);
  const rawAmount = parseUnits(TOKEN_PRICE.toString(), decimals).toNumber();
  const signature = await program.methods
    .initInstruction(new anchor.BN(rawAmount))
    .accounts({
      poolConfigAccount: poolConfigAccount,
      poolNativeAccount: poolNativeAccount,
      poolTokenAccount: poolTokenAccount,
      tokenMintAddress: mintAddress,
      authority: authority.publicKey,
      masterAuthority: masterAuthority.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: anchor.web3.SystemProgram.programId,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    })
    .rpc();

  console.log("signature: ", signature);
  
  await delay(30000);
  const poolConfigAccountData = await program.account.poolConfigAccount.fetch(
    poolConfigAccount
  );

  console.log("Pool config data: ", {
    poolConfigAccount: poolConfigAccount.toString(),
    poolNativeAccount: poolConfigAccountData.poolNativeAccount.toString(),
    poolTokenAccount: poolConfigAccountData.poolTokenAccount.toString(),
    masterAuthority: poolConfigAccountData.masterAuthority.toString(),
    price: Number(poolConfigAccountData.tokenPrice),
  });
})();
