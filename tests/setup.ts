import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Swap } from "../target/types/swap";
import {
  MintLayout,
  TOKEN_PROGRAM_ID,
  createInitializeMintInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createMintToInstruction,
} from "@solana/spl-token";

export async function setup(
  connection: anchor.web3.Connection,
  authority: anchor.web3.Keypair
) {
  const idl = require("../target/idl/swap.json");

  const wallet = new anchor.Wallet(authority);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "processed",
  });

  const Program_ID = new anchor.web3.PublicKey(idl.metadata.address);
  const program = new anchor.Program(
    idl,
    Program_ID,
    provider
  ) as Program<Swap>;
  return program;
}

export async function createToken(
  connection: anchor.web3.Connection,
  authority: anchor.web3.Keypair,
  decimals: number
): Promise<anchor.web3.PublicKey> {
  const mintAddress = anchor.web3.Keypair.generate();
  const lamportsForMint = await connection.getMinimumBalanceForRentExemption(
    MintLayout.span
  );
  let tx = new anchor.web3.Transaction();

  // Allocate mint
  tx.add(
    anchor.web3.SystemProgram.createAccount({
      programId: TOKEN_PROGRAM_ID,
      space: MintLayout.span,
      fromPubkey: authority.publicKey,
      newAccountPubkey: mintAddress.publicKey,
      lamports: lamportsForMint,
    })
  );
  // Allocate wallet account
  tx.add(
    createInitializeMintInstruction(
      mintAddress.publicKey,
      decimals,
      authority.publicKey,
      authority.publicKey,
      TOKEN_PROGRAM_ID
    )
  );

  const providerPaidTokenAccount = await getAssociatedTokenAddress(
    mintAddress.publicKey,
    mintAddress.publicKey,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  tx.add(
    createAssociatedTokenAccountInstruction(
      authority.publicKey,
      providerPaidTokenAccount,
      mintAddress.publicKey,
      mintAddress.publicKey
    )
  );

  await anchor.web3.sendAndConfirmTransaction(connection, tx, [
    authority,
    mintAddress,
  ]);
  return mintAddress.publicKey;
}

export async function mintTo(
  connection: anchor.web3.Connection,
  owner: anchor.web3.Keypair,
  authority: anchor.web3.Keypair,
  mintAddress: anchor.web3.PublicKey,
  amount: number
): Promise<anchor.web3.PublicKey> {
  // Create a token account for the user and mint some tokens
  const associatedTokenAccount = await getAssociatedTokenAddress(
    mintAddress,
    owner.publicKey,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  let tx = new anchor.web3.Transaction();
  const accountInfo = await connection.getAccountInfo(associatedTokenAccount);
  if (!accountInfo || !accountInfo.data) {
    tx.add(
      createAssociatedTokenAccountInstruction(
        owner.publicKey,
        associatedTokenAccount,
        owner.publicKey,
        mintAddress,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );
  }

  tx.add(
    createMintToInstruction(
      mintAddress,
      associatedTokenAccount,
      authority.publicKey,
      amount,
      [],
      TOKEN_PROGRAM_ID
    )
  );
  await anchor.web3.sendAndConfirmTransaction(connection, tx, [authority]);
  return associatedTokenAccount;
}

export async function transferSOL(
  connection: anchor.web3.Connection,
  authority: anchor.web3.Keypair,
  to: anchor.web3.PublicKey,
  amount: number
): Promise<void> {
  const tx = new anchor.web3.Transaction();
  tx.add(
    anchor.web3.SystemProgram.transfer({
      fromPubkey: authority.publicKey,
      toPubkey: to,
      lamports: amount * anchor.web3.LAMPORTS_PER_SOL,
    })
  );
  await anchor.web3.sendAndConfirmTransaction(connection, tx, [authority]);
}

export async function airDrop(
  connection: anchor.web3.Connection,
  to: anchor.web3.PublicKey,
  amount = 10
) {
  const sig = await connection.requestAirdrop(
    to,
    amount * anchor.web3.LAMPORTS_PER_SOL
  );
  await connection.confirmTransaction(sig);
}
