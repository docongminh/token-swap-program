use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{ Mint, Token };

use crate::constants::{ POOL_CONFIG_ACCOUNT_SEED, POOL_NATIVE_ACCOUNT_SEED };
use crate::error::CustomError;
use crate::state::*;
use crate::utils::*;

#[derive(Accounts)]
pub struct WithdrawNative<'info> {
    ///CHECK:
    #[account(mut,
        seeds=[
            POOL_NATIVE_ACCOUNT_SEED,
            authority.key().as_ref(),
            token_mint_address.key().as_ref(),
            pool_config_account.key().as_ref()
        ],
        bump = pool_config_account.pool_native_account_bump
    )]
    pub pool_native_account: AccountInfo<'info>,

    #[account(mut,
        seeds = [
            POOL_CONFIG_ACCOUNT_SEED,
            authority.key().as_ref(),
            token_mint_address.key().as_ref(),
        ],
        bump = pool_config_account.pool_config_account_bump,
        has_one = master_authority  @ CustomError::WithdrawPermission,
        has_one = authority @ CustomError::InvalidAuthority
    )]
    pub pool_config_account: Account<'info, PoolConfigAccount>,
    // CHECK: this mint use to validate account
    pub token_mint_address: Account<'info, Mint>,
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(mut)]
    pub master_authority: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

pub fn handler_withdraw_native<'info>(
    ctx: Context<'_, '_, '_, 'info, WithdrawNative<'info>>,
    lamports: u64
) -> Result<()> {
    let lamports_balance = **ctx.accounts.pool_native_account.lamports.borrow_mut();

    require_gte!(lamports_balance, lamports, CustomError::InsufficientFunds);

    ctx.accounts.withdraw_native(lamports)?;

    Ok(())
}

pub fn handler_drain_native<'info>(
    ctx: Context<'_, '_, '_, 'info, WithdrawNative<'info>>
) -> Result<()> {
    let lamports = **ctx.accounts.pool_native_account.lamports.borrow_mut();
    ctx.accounts.withdraw_native(lamports)?;
    Ok(())
}

impl<'info> WithdrawNative<'info> {
    fn withdraw_native(&self, lamports: u64) -> Result<()> {
        let authority = self.authority.key();
        let mint = self.token_mint_address.key();
        let pool_config_account = self.pool_config_account.key();
        let pool_native_account_bump = self.pool_config_account.pool_native_account_bump;
        let seeds = &[
            &[
                POOL_NATIVE_ACCOUNT_SEED,
                authority.as_ref(),
                mint.as_ref(),
                pool_config_account.as_ref(),
                bytemuck::bytes_of(&pool_native_account_bump),
            ][..],
        ];
        transfer_native_to_account(
            self.pool_native_account.to_account_info(),
            self.master_authority.to_account_info(),
            lamports,
            self.system_program.to_account_info(),
            Some(seeds)
        )?;

        Ok(())
    }
}