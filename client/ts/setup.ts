import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Swap } from "../../target/types/swap";

export function setup(authority: anchor.web3.Keypair) {
  const connection = new anchor.web3.Connection(
    anchor.web3.clusterApiUrl("devnet")
  );
  const mintAddress = new anchor.web3.PublicKey(
    "HVTEudbUMJaMRzCnQ2fo1cq6vL9gqHD9mYbvYhfkmQuh"
  );
  const idl = require("../target/idl/swap.json");
  const wallet = new anchor.Wallet(authority);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "processed",
  });

  const Program_ID = new anchor.web3.PublicKey(
    "swapEsYJ7iLDbYeg9154yR1dsUjumanS7LF9KEiJQae"
  );
  const program = new anchor.Program(
    idl,
    Program_ID,
    provider
  ) as Program<Swap>;
  const poolConfigAccount = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("pool_config_account_seed"),
      authority.publicKey.toBuffer(),
      mintAddress.toBuffer(),
    ],
    program.programId
  )[0];

  const poolTokenAccount = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("pool_token_account_seed"),
      authority.publicKey.toBuffer(),
      mintAddress.toBuffer(),
      poolConfigAccount.toBuffer(),
    ],
    program.programId
  )[0];

  const poolNativeAccount = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("pool_native_account_seed"),
      authority.publicKey.toBuffer(),
      mintAddress.toBuffer(),
      poolConfigAccount.toBuffer(),
    ],
    program.programId
  )[0];

  return {
    program,
    mintAddress,
    poolConfigAccount,
    poolNativeAccount,
    poolTokenAccount,
  };
}

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
