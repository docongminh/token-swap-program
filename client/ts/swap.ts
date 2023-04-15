import * as anchor from "@coral-xyz/anchor";
import { parseUnits } from "@ethersproject/units";
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { setup, delay } from "./setup";

(async () => {
  const authority = anchor.web3.Keypair.fromSecretKey(
    new Uint8Array(require("./keys/authority.json"))
  ) as anchor.web3.Keypair;
  const user = anchor.web3.Keypair.fromSecretKey(
    new Uint8Array(require("./keys/user.json"))
  ) as anchor.web3.Keypair;
  const {
    program,
    mintAddress,
    poolConfigAccount,
    poolNativeAccount,
    poolTokenAccount,
  } = setup(authority);

  const userTokenAccount = await getAssociatedTokenAddress(
    mintAddress,
    user.publicKey
  );

  const swapSolValue = 0.5;
  const signature = await program.methods
    .swapToken(new anchor.BN(swapSolValue * anchor.web3.LAMPORTS_PER_SOL))
    .accounts({
      poolConfigAccount: poolConfigAccount,
      poolTokenAccount: poolTokenAccount,
      poolNativeAccount: poolNativeAccount,
      tokenMintAddress: mintAddress,
      authority: authority.publicKey,
      userTokenAccount: userTokenAccount,
      user: user.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([user])
    .rpc();

  console.log("swap signature: ", signature);
})();
