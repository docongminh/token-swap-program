use crate::error::CustomError;

use anchor_lang::prelude::*;
use anchor_spl::token::{ InitializeAccount, Transfer };

pub fn transfer_native_pda_to_account<'info>(
    escrow_vault: AccountInfo<'info>,
    receive_account: AccountInfo<'info>,
    amount: u64
) -> Result<()> {
    if **escrow_vault.try_borrow_lamports()? < amount.into() {
        return Err(CustomError::InsufficientFunds.into());
    }
    **escrow_vault.try_borrow_mut_lamports()? -= amount;
    **receive_account.try_borrow_mut_lamports()? += amount;
    Ok(())
}

pub fn transfer_native_to_account<'info>(
    sender: AccountInfo<'info>,
    receiver: AccountInfo<'info>,
    amount: u64,
    system_program: AccountInfo<'info>,
    seeds: Option<&[&[&[u8]]]>
) -> Result<()> {
    let transfer_sol_instruction = anchor_lang::system_program::Transfer {
        from: sender.to_account_info(),
        to: receiver.to_account_info(),
    };
    match seeds {
        Some(seeds) => {
            let cpi_ctx_sol = CpiContext::new_with_signer(
                system_program.to_account_info(),
                transfer_sol_instruction,
                seeds
            );
            anchor_lang::system_program::transfer(cpi_ctx_sol, amount)?;
        }
        None => {
            let cpi_ctx_sol = CpiContext::new(
                system_program.to_account_info(),
                transfer_sol_instruction
            );
            anchor_lang::system_program::transfer(cpi_ctx_sol, amount)?;
        }
    }
    return Ok(());
}

// transfer fungible token & nft token
pub fn transfer_token_to_account<'info>(
    sender: AccountInfo<'info>,
    receiver: AccountInfo<'info>,
    authority: AccountInfo<'info>,
    amount: u64,
    token_program: AccountInfo<'info>,
    seeds: Option<&[&[&[u8]]]>
) -> Result<()> {
    let transfer_instruction_account = Transfer {
        from: sender.to_account_info(),
        to: receiver.to_account_info(),
        authority: authority.to_account_info(),
    };
    let cpi_ctx;
    match seeds {
        Some(seeds) => {
            cpi_ctx = CpiContext::new_with_signer(
                token_program.to_account_info(),
                transfer_instruction_account,
                seeds
            );
        }
        None => {
            cpi_ctx = CpiContext::new(
                token_program.to_account_info(),
                transfer_instruction_account
            );
        }
    }
    anchor_spl::token::transfer(cpi_ctx, amount)?;
    Ok(())
}

pub fn create_account<'info>(
    from_pubkey: AccountInfo<'info>,
    to_pubkey: AccountInfo<'info>,
    space: usize,
    signers_seeds: &[&[&[u8]]],
    program: AccountInfo<'info>,
    rent: Sysvar<'info, Rent>
) -> Result<()> {
    let lamports = rent.minimum_balance(space);
    anchor_lang::solana_program::program::invoke_signed(
        &anchor_lang::solana_program::system_instruction::create_account(
            from_pubkey.key,
            to_pubkey.key,
            lamports,
            space as u64,
            &program.key()
        ),
        &[from_pubkey, to_pubkey, program],
        signers_seeds
    )?;
    Ok(())
}

pub fn initialize_token_account<'info>(
    account: AccountInfo<'info>,
    mint: AccountInfo<'info>,
    authority: AccountInfo<'info>,
    token_program: AccountInfo<'info>,
    rent: Sysvar<'info, Rent>
) -> Result<()> {
    let cpi_accounts = InitializeAccount {
        account: account.to_account_info(),
        mint,
        authority: authority.to_account_info(),
        rent: rent.to_account_info(),
    };

    let cpi_program = token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    anchor_spl::token::initialize_account(cpi_ctx)?;
    Ok(())
}

pub fn close_token_account<'info>(
    account: AccountInfo<'info>,
    destination: AccountInfo<'info>,
    authority: AccountInfo<'info>,
    signers_seeds: &[&[&[u8]]],
    token_program: AccountInfo<'info>
) -> Result<()> {
    let cpi_accounts = anchor_spl::token::CloseAccount {
        account: account.to_account_info(),
        destination: destination.to_account_info(),
        authority: authority.to_account_info(),
    };
    let cpi_ctx = CpiContext::new_with_signer(
        token_program.to_account_info(),
        cpi_accounts,
        signers_seeds
    );
    anchor_spl::token::close_account(cpi_ctx)?;
    Ok(())
}

pub fn close_native_account<'info>(
    from_pubkey: AccountInfo<'info>,
    to_pubkey: AccountInfo<'info>,
    signers_seeds: &[&[&[u8]]],
    system_program: AccountInfo<'info>
) -> Result<()> {
    anchor_lang::solana_program::program::invoke_signed(
        &anchor_lang::solana_program::system_instruction::transfer(
            from_pubkey.key,
            to_pubkey.key,
            from_pubkey.lamports()
        ),
        &[
            from_pubkey.to_account_info(),
            to_pubkey.to_account_info(),
            system_program.to_account_info(),
        ],
        signers_seeds
    )?;
    Ok(())
}