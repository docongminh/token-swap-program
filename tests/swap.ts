import * as anchor from "@coral-xyz/anchor";
import {
  getAccount,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { formatUnits, parseUnits } from "@ethersproject/units";
import { assert } from "chai";
import { airDrop, createToken, mintTo, setup } from "./setup";

describe("swap", async () => {
  const connection = new anchor.web3.Connection(
    "http://127.0.0.1:8899",
    "processed"
  );
  const authority = anchor.web3.Keypair.generate();
  const user = anchor.web3.Keypair.generate();
  const masterAuthority = anchor.web3.Keypair.generate();

  const program = await setup(connection, authority);
  let mintAddress: anchor.web3.PublicKey;
  let associatedAccount: anchor.web3.PublicKey;
  let poolTokenAccount: anchor.web3.PublicKey;
  let poolNativeAccount: anchor.web3.PublicKey;
  let poolConfigAccount: anchor.web3.PublicKey;
  let masterAuthorityTokenAccount: anchor.web3.PublicKey;
  const decimals = 6;
  const tokenPrice = 10;
  const addLiquidAmount = 10000;
  const withdrawAmount = 100;

  before(async () => {
    // airdrop 10 SOL for each wallet
    await airDrop(connection, authority.publicKey);
    await airDrop(connection, user.publicKey);
    await airDrop(connection, masterAuthority.publicKey);
    const authorityBalance = await connection.getBalance(authority.publicKey);
    const userBalance = await connection.getBalance(user.publicKey);
    const masterAuthorityBalance = await connection.getBalance(
      masterAuthority.publicKey
    );
    assert.equal(authorityBalance, 10 * anchor.web3.LAMPORTS_PER_SOL);
    assert.equal(userBalance, 10 * anchor.web3.LAMPORTS_PER_SOL);
    assert.equal(masterAuthorityBalance, 10 * anchor.web3.LAMPORTS_PER_SOL);

    // init and mint token
    mintAddress = await createToken(connection, authority, decimals);
    associatedAccount = await mintTo(
      connection,
      authority,
      authority,
      mintAddress,
      10000000000
    );
    masterAuthorityTokenAccount = await getAssociatedTokenAddress(
      mintAddress,
      masterAuthority.publicKey
    );
    // find pda accounts
    poolConfigAccount = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("pool_config_account_seed"),
        authority.publicKey.toBuffer(),
        mintAddress.toBuffer(),
      ],
      program.programId
    )[0];

    poolTokenAccount = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("pool_token_account_seed"),
        authority.publicKey.toBuffer(),
        mintAddress.toBuffer(),
        poolConfigAccount.toBuffer(),
      ],
      program.programId
    )[0];

    poolNativeAccount = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("pool_native_account_seed"),
        authority.publicKey.toBuffer(),
        mintAddress.toBuffer(),
        poolConfigAccount.toBuffer(),
      ],
      program.programId
    )[0];
  });

  it("Is initialized!", async () => {
    // Add your test here.
    await program.methods
      .initInstruction(new anchor.BN(tokenPrice))
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
    const poolConfigAccountData = await program.account.poolConfigAccount.fetch(
      poolConfigAccount
    );
    assert.equal(Number(poolConfigAccountData.tokenPrice), tokenPrice);
    assert.equal(
      poolConfigAccountData.tokenMintAddress.toString(),
      mintAddress.toString()
    );
    assert.equal(
      poolConfigAccountData.poolTokenAccount.toString(),
      poolTokenAccount.toString()
    );

    assert.equal(
      poolConfigAccountData.poolNativeAccount.toString(),
      poolNativeAccount.toString()
    );
  });

  it("Add liquid", async () => {
    // add liquid amount
    const rawAmount = parseUnits(
      addLiquidAmount.toString(),
      decimals
    ).toNumber();
    await program.methods
      .addLiquidInstruction(new anchor.BN(rawAmount))
      .accounts({
        poolConfigAccount: poolConfigAccount,
        poolTokenAccount: poolTokenAccount,
        tokenMintAddress: mintAddress,
        authority: authority.publicKey,
        depositorTokenAccount: associatedAccount,
        depositor: authority.publicKey, // reuse authority as a depositor to liquid pool
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    const info = await getAccount(connection, poolTokenAccount);
    assert.equal(Number(info.amount), rawAmount);
  });

  it("Withdraw token", async () => {
    // add liquid amount
    const rawAmount = parseUnits(
      addLiquidAmount.toString(),
      decimals
    ).toNumber();

    const poolBalanceBefore = (await getAccount(connection, poolTokenAccount))
      .amount;
    await program.methods
      .withdrawTokenInstruction(new anchor.BN(rawAmount))
      .accounts({
        poolConfigAccount: poolConfigAccount,
        poolTokenAccount: poolTokenAccount,
        tokenMintAddress: mintAddress,
        masterAuthorityTokenAccount: masterAuthorityTokenAccount,
        masterAuthority: masterAuthority.publicKey,
        authority: authority.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([masterAuthority])
      .rpc();
    const poolBalanceAfter = (await getAccount(connection, poolTokenAccount))
      .amount;
    const masterAuthorityTokenBalanceAfter = (
      await getAccount(connection, masterAuthorityTokenAccount)
    ).amount;
    assert.equal(
      Number(poolBalanceBefore) - Number(poolBalanceAfter),
      rawAmount
    );
    assert.equal(Number(masterAuthorityTokenBalanceAfter), rawAmount);
  });

  it("Drain Token", async () => {
    const poolBalanceBefore = (await getAccount(connection, poolTokenAccount))
      .amount;
    const masterAuthorityTokenBalanceBefore = (
      await getAccount(connection, masterAuthorityTokenAccount)
    ).amount;
    await program.methods
      .drainTokenInstruction()
      .accounts({
        poolConfigAccount: poolConfigAccount,
        poolTokenAccount: poolTokenAccount,
        tokenMintAddress: mintAddress,
        masterAuthorityTokenAccount: masterAuthorityTokenAccount,
        masterAuthority: masterAuthority.publicKey,
        authority: authority.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([masterAuthority])
      .rpc();
    const poolBalanceAfter = (await getAccount(connection, poolTokenAccount))
      .amount;
    const masterAuthorityTokenBalanceAfter = (
      await getAccount(connection, masterAuthorityTokenAccount)
    ).amount;
    assert.equal(Number(poolBalanceAfter), 0);
    assert.equal(
      Number(masterAuthorityTokenBalanceAfter) -
        Number(masterAuthorityTokenBalanceBefore),
      Number(poolBalanceBefore)
    );
  });
});
