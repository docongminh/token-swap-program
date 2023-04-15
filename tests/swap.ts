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
  let userTokenAccount: anchor.web3.PublicKey;
  const decimals = 6;
  const tokenPrice = 10;
  const addLiquidAmount = 10000;
  const withdrawAmount = 100;
  const swapSolValue = 1;

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
    userTokenAccount = await getAssociatedTokenAddress(
      mintAddress,
      user.publicKey
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

    console.log({
      poolConfigAccount: poolConfigAccount.toString(),
      poolNativeAccount: poolNativeAccount.toString(),
      poolTokenAccount: poolTokenAccount.toString(),
    });
  });

  it("Is initialized!", async () => {
    // Add your test here.
    const rawAmount = parseUnits(tokenPrice.toString(), decimals).toNumber();
    await program.methods
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

    const poolConfigAccountData = await program.account.poolConfigAccount.fetch(
      poolConfigAccount
    );
    assert.equal(Number(poolConfigAccountData.tokenPrice), rawAmount);
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

  it("[Fail case] Add liquid insufficient funds", async () => {
    // add liquid amount
    const rawAmount =
      Number((await getAccount(connection, associatedAccount)).amount) + 1;
    let sig: string | null;
    try {
      sig = await program.methods
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
    } catch (error) {
      assert.equal(error.error.errorCode.code, "InsufficientFunds");
      assert.equal(error.error.errorCode.number, 6000);
      assert.equal(error.error.errorMessage, "user insufficient funds");
    }
    assert.equal(sig, null);
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

  it("[Success] Swap Token", async () => {
    await program.methods
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
    const userTokenBalance = await getAccount(connection, userTokenAccount);
    const rawTokenPrice = parseUnits(
      tokenPrice.toString(),
      decimals
    ).toNumber();
    const tokenReceive =
      (rawTokenPrice * swapSolValue * anchor.web3.LAMPORTS_PER_SOL) /
      anchor.web3.LAMPORTS_PER_SOL;
    assert.equal(Number(userTokenBalance.amount), tokenReceive);
  });

  it("deactivate pool config", async () => {
    await program.methods
      .updateConfigInstruction(false)
      .accounts({
        poolConfigAccount: poolConfigAccount,
        tokenMintAddress: mintAddress,
        authority: authority.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    const poolConfigAccountData = await program.account.poolConfigAccount.fetch(
      poolConfigAccount
    );
    assert.equal(poolConfigAccountData.isActive, false);
  });

  it("[Fail case] Without permission deactivate pool config", async () => {
    let sig: string | null;
    try {
      sig = await program.methods
        .updateConfigInstruction(false)
        .accounts({
          poolConfigAccount: poolConfigAccount,
          tokenMintAddress: mintAddress,
          authority: user.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([user])
        .rpc();
    } catch (error) {
      assert.equal(error.error.errorCode.code, "ConstraintSeeds");
    }
    assert.equal(sig, null);
  });

  it("[Fail swap after update config] Swap Token", async () => {
    let sig: string | null;
    try {
      sig = await program.methods
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
    } catch (error) {
      assert.equal(error.error.errorCode.code, "DeactivatePool");
      assert.equal(error.error.errorCode.number, 6002);
      assert.equal(error.error.errorMessage, "Deactive Pool");
    }
    assert.equal(sig, null);
  });

  it("[Fail case] Without permission activate pool config", async () => {
    let sig: string | null;
    try {
      sig = await program.methods
        .updateConfigInstruction(true)
        .accounts({
          poolConfigAccount: poolConfigAccount,
          tokenMintAddress: mintAddress,
          authority: user.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([user])
        .rpc();
    } catch (error) {
      assert.equal(error.error.errorCode.code, "ConstraintSeeds");
    }
    assert.equal(sig, null);
  });

  it("Activate pool config", async () => {
    await program.methods
      .updateConfigInstruction(true)
      .accounts({
        poolConfigAccount: poolConfigAccount,
        tokenMintAddress: mintAddress,
        authority: authority.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    const poolConfigAccountData = await program.account.poolConfigAccount.fetch(
      poolConfigAccount
    );
    assert.equal(poolConfigAccountData.isActive, true);
  });

  it("Swap Token", async () => {
    const beforeBalance = (await getAccount(connection, userTokenAccount))
      .amount;
    await program.methods
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
    const userTokenBalance = await getAccount(connection, userTokenAccount);
    const rawTokenPrice = parseUnits(
      tokenPrice.toString(),
      decimals
    ).toNumber();
    const tokenReceive =
      (rawTokenPrice * swapSolValue * anchor.web3.LAMPORTS_PER_SOL) /
      anchor.web3.LAMPORTS_PER_SOL;
    assert.equal(
      Number(userTokenBalance.amount) - Number(beforeBalance),
      tokenReceive
    );
  });

  it("[fail case] Swap Token insufficient funds", async () => {
    const userBalance = await connection.getBalance(user.publicKey);
    let sig: string | null;
    try {
      sig = await program.methods
        .swapToken(new anchor.BN(userBalance + 1))
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
    } catch (error) {
      assert.equal(error.error.errorCode.code, "InsufficientFunds");
      assert.equal(error.error.errorCode.number, 6000);
      assert.equal(error.error.errorMessage, "user insufficient funds");
    }
    assert.equal(sig, null);
  });

  //////////// WITHDRAW TOKEN

  it("[Fail case ] User withdraw token without permission", async () => {
    // add liquid amount
    let sig: string | null;
    try {
      const rawAmount = parseUnits(
        addLiquidAmount.toString(),
        decimals
      ).toNumber();
      sig = await program.methods
        .withdrawTokenInstruction(new anchor.BN(rawAmount - 100))
        .accounts({
          poolConfigAccount: poolConfigAccount,
          poolTokenAccount: poolTokenAccount,
          tokenMintAddress: mintAddress,
          masterAuthorityTokenAccount: userTokenAccount,
          masterAuthority: user.publicKey,
          authority: authority.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([user])
        .rpc();
    } catch (error) {
      assert.equal(error.error.errorCode.code, "WithdrawPermission");
      assert.equal(error.error.errorCode.number, 6004);
      assert.equal(error.error.errorMessage, "without withdraw permission");
    }
    assert.equal(sig, null);
  });

  it("[Fail case ] Withdraw token insufficient funds", async () => {
    // add liquid amount
    let sig: string | null;
    try {
      const rawAmount = parseUnits(
        addLiquidAmount.toString() + 1,
        decimals
      ).toNumber();
      sig = await program.methods
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
    } catch (error) {
      assert.equal(error.error.errorCode.code, "InsufficientFunds");
      assert.equal(error.error.errorCode.number, 6000);
      assert.equal(error.error.errorMessage, "user insufficient funds");
    }
    assert.equal(sig, null);
  });

  it("Withdraw token", async () => {
    // add liquid amount
    const rawAmount = parseUnits(
      withdrawAmount.toString(),
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

  //////////// WITHDRAW NATIVE

  it("[Fail case] Withdraw native without permission ", async () => {
    let sig: string | null;
    try {
      sig = await program.methods
        .withdrawNativeInstruction(
          new anchor.BN(0.01 * anchor.web3.LAMPORTS_PER_SOL)
        )
        .accounts({
          poolConfigAccount: poolConfigAccount,
          poolNativeAccount: poolNativeAccount,
          tokenMintAddress: mintAddress,
          masterAuthority: user.publicKey,
          authority: authority.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([user])
        .rpc();
    } catch (error) {
      assert.equal(error.error.errorCode.code, "WithdrawPermission");
      assert.equal(error.error.errorCode.number, 6004);
      assert.equal(error.error.errorMessage, "without withdraw permission");
    }
    assert.equal(sig, null);
  });

  it("[Fail case] Withdraw native insufficient funds ", async () => {
    let sig: string | null;
    try {
      sig = await program.methods
        .withdrawNativeInstruction(
          new anchor.BN(10 * anchor.web3.LAMPORTS_PER_SOL)
        )
        .accounts({
          poolConfigAccount: poolConfigAccount,
          poolNativeAccount: poolNativeAccount,
          tokenMintAddress: mintAddress,
          masterAuthority: masterAuthority.publicKey,
          authority: authority.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([masterAuthority])
        .rpc();
    } catch (error) {
      assert.equal(error.error.errorCode.code, "InsufficientFunds");
      assert.equal(error.error.errorCode.number, 6000);
      assert.equal(error.error.errorMessage, "user insufficient funds");
    }
    assert.equal(sig, null);
  });
  it("Withdraw native", async () => {
    // add liquid amount
    const masterAuthorityBalanceBefore = await connection.getBalance(
      masterAuthority.publicKey
    );
    await program.methods
      .withdrawNativeInstruction(
        new anchor.BN(0.5 * anchor.web3.LAMPORTS_PER_SOL)
      )
      .accounts({
        poolConfigAccount: poolConfigAccount,
        poolNativeAccount: poolNativeAccount,
        tokenMintAddress: mintAddress,
        masterAuthority: masterAuthority.publicKey,
        authority: authority.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([masterAuthority])
      .rpc();
    const masterAuthorityBalanceAfter = await connection.getBalance(
      masterAuthority.publicKey
    );
    assert.equal(
      masterAuthorityBalanceBefore + 0.5 * anchor.web3.LAMPORTS_PER_SOL,
      masterAuthorityBalanceAfter
    );
  });

  it("Drain Native", async () => {
    await program.methods
      .drainNativeInstruction()
      .accounts({
        poolConfigAccount: poolConfigAccount,
        poolNativeAccount: poolNativeAccount,
        tokenMintAddress: mintAddress,
        masterAuthority: masterAuthority.publicKey,
        authority: authority.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([masterAuthority])
      .rpc();
    const poolBalance = await connection.getBalance(poolNativeAccount);
    assert.equal(poolBalance, 0);
  });
});
